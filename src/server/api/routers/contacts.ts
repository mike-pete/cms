import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { TRPCError } from "@trpc/server";
import { desc, eq, sql } from "drizzle-orm";
import { createInterface } from "readline";
import { type Readable } from "stream";
import invariant from "tiny-invariant";
import { z } from "zod";
import { type InputSchema } from "~/app/api/v1/queue/handle-chunks/InputSchems";
import { env } from "~/env";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import pusher from "~/server/connections/pusher";
import qstash from "~/server/connections/qstash";
import s3 from "~/server/connections/s3";
import { chunks, contacts, files } from "~/server/db/schema";

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
  getFileProcessingStatus: protectedProcedure.query(async ({ ctx }) => {
    const fileStatuses = await ctx.db
      .select({
        fileId: files.id,
        fileName: files.fileName,
        totalChunks: sql<number>`count(${chunks.id})`.as("total_chunks"),
        pendingChunks:
          sql<number>`sum(case when ${chunks.status} = 'PENDING' then 1 else 0 end)`.as(
            "pending_chunks",
          ),
        doneChunks:
          sql<number>`sum(case when ${chunks.status} = 'DONE' then 1 else 0 end)`.as(
            "done_chunks",
          ),
        createdAt: files.createdAt,
      })
      .from(files)
      .leftJoin(chunks, eq(files.id, chunks.fileId))
      .where(eq(files.createdById, ctx.session.user.id))
      .groupBy(files.id)
      .having(
        sql`sum(case when ${chunks.status} = 'PENDING' then 1 else 0 end) > 0`,
      )
      .orderBy(desc(files.createdAt));

    return fileStatuses.map((file) => ({
      ...file,
      completionPercentage:
        file.totalChunks > 0
          ? Math.round((file.doneChunks / file.totalChunks) * 100)
          : 0,
    }));
  }),
});
