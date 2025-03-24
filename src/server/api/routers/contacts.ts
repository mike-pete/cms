import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Client } from "@upstash/qstash";
import { desc, eq, sql } from "drizzle-orm";
import PusherServer from "pusher";
import { createInterface } from "readline";
import { type Readable } from "stream";
import invariant from "tiny-invariant";
import { z } from "zod";
import { type InputSchema } from "~/app/api/v1/queue/handle-chunks/InputSchems";
import { env } from "~/env";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { chunks, contacts, files } from "~/server/db/schema";
import { TRPCError } from "@trpc/server";

const s3 = new S3Client({
  endpoint: env.CLOUDFLARE_R2_ENDPOINT,
  region: "auto",
  credentials: {
    accessKeyId: env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  },
});

const pusher = new PusherServer({
  appId: env.PUSHER_APP_ID,
  key: env.NEXT_PUBLIC_PUSHER_KEY,
  secret: env.PUSHER_SECRET,
  cluster: env.NEXT_PUBLIC_PUSHER_CLUSTER,
  useTLS: true,
});

const qstash = new Client({
  token: env.QSTASH_TOKEN,
  baseUrl: env.QSTASH_URL,
});

async function queueChunk({
  csv,
  chunkNumber,
  fileId,
  createdById,
}: z.infer<typeof InputSchema>) {
  console.log(chunkNumber);

  // TODO update status table

  await qstash.publishJSON({
    url: `${env.NEXTAUTH_URL}/api/v1/queue/handle-chunks`,
    body: {
      csv,
      chunkNumber,
      fileId,
      createdById,
    },
  });

  await pusher.trigger(createdById, "x", "handled chunk");
}

export const contactRouter = createTRPCRouter({
  getContacts: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(50),
      }),
    )
    .query(async ({ ctx, input }) => {
      const offset = (input.page - 1) * input.limit;

      const [userContacts, totalCount] = await Promise.all([
        ctx.db.query.contacts.findMany({
          where: (contactsTable, { eq }) =>
            eq(contactsTable.createdById, ctx.session.user.id),
          orderBy: [desc(contacts.createdAt)],
          limit: input.limit,
          offset: offset,
        }),
        ctx.db
          .select({ count: sql<number>`count(*)` })
          .from(contacts)
          .where(eq(contacts.createdById, ctx.session.user.id))
          .then((result) => Number(result[0]?.count ?? 0)),
      ]);

      return {
        contacts: userContacts,
        totalPages: Math.ceil(totalCount / input.limit),
        currentPage: input.page,
      };
    }),
  getUploadURL: protectedProcedure
    .input(z.object({ fileName: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const [file] = await ctx.db
        .insert(files)
        .values({
          fileName: input.fileName,
          createdById: ctx.session.user.id,
        })
        .returning();

      invariant(file !== undefined, "expected file but got undefined");

      const command = new PutObjectCommand({
        Bucket: env.CLOUDFLARE_R2_BUCKET_NAME,
        Key: String(file.id),
      });

      const presignedURL = await getSignedUrl(s3, command, { expiresIn: 3600 });

      return { presignedURL, fileId: file.id };
    }),
  processFile: protectedProcedure
    .input(z.object({ fileId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const start = performance.now();
      const file = await ctx.db.query.files.findFirst({
        where: (files, { eq }) => eq(files.id, input.fileId),
      });

      if (!file) {
        throw new Error("File not found");
      }

      if (file.createdById !== ctx.session.user.id) {
        throw new Error("Unauthorized");
      }

      const command = new GetObjectCommand({
        Bucket: env.CLOUDFLARE_R2_BUCKET_NAME,
        Key: String(input.fileId),
      });

      const response = await s3.send(command);

      if (!response.Body) {
        throw new Error("File content is empty");
      }

      const stream = response.Body as Readable;
      const rl = createInterface({
        input: stream,
        crlfDelay: Infinity,
      });

      let headers: string | null = null;
      let currentChunk: string[] = [];
      let chunkIndex = 0;
      const CHUNK_SIZE = 10_000;

      const queue: Promise<void>[] = [];

      const queueCurrentChunk = () => {
        queue.push(
          queueChunk({
            csv: currentChunk.join("\n"),
            fileId: input.fileId,
            chunkNumber: chunkIndex,
            createdById: file.createdById,
          }),
        );
      };

      const chunkSizes: { chunkNumber: string; lineCount: number }[] = [];

      for await (const line of rl) {
        // Handle headers
        if (!headers) {
          headers = line;
          currentChunk.push(headers);
          continue;
        }

        // Add line to current chunk
        invariant(headers, "Headers should be defined");
        currentChunk.push(line);

        // If chunk is full, process it
        const numberOfRowsExcludingHeaders = currentChunk.length - 1;
        if (numberOfRowsExcludingHeaders >= CHUNK_SIZE) {
          chunkSizes.push({
            chunkNumber: String(chunkIndex),
            lineCount: numberOfRowsExcludingHeaders,
          });
          queueCurrentChunk();
          currentChunk = [headers];
          chunkIndex++;
        }
      }

      // Handle any remaining lines in the last chunk
      if (currentChunk.length > 1) {
        chunkSizes.push({
          chunkNumber: String(chunkIndex),
          lineCount: currentChunk.length - 1,
        });
        queueCurrentChunk();
      }

      await Promise.allSettled(queue);

      // Create all chunk records in a single transaction
      try {
        await ctx.db.transaction(async (tx) => {
          await tx.insert(chunks).values(
            chunkSizes.map((chunk) => ({
              fileId: input.fileId,
              chunkNumber: chunk.chunkNumber,
              lineCount: chunk.lineCount,
              status: "PENDING" as const,
            })),
          );
        });
      } catch (error) {
        console.error("Failed to create chunk records:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create chunk records in database",
        });
      }

      const end = performance.now();
      console.log(`\n\n\n\n\nAll Writes Took ${end - start} milliseconds`);
    }),
  sendNotification: protectedProcedure
    .input(
      z.object({
        event: z.string(),
        data: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await pusher.trigger(ctx.session.user.id, input.event, input.data);
    }),
});
