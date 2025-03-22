import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Client } from "@upstash/qstash";
import { createInterface } from "readline";
import { type Readable } from "stream";
import invariant from "tiny-invariant";
import { z } from "zod";
import { type InputSchema } from "~/app/api/v1/queue/handle-chunks/route";
import { env } from "~/env";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { files } from "~/server/db/schema";

const s3 = new S3Client({
  endpoint: env.CLOUDFLARE_R2_ENDPOINT,
  region: "auto",
  credentials: {
    accessKeyId: env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  },
});

const qstash = new Client({
  token: env.QSTASH_TOKEN,
  baseUrl: "http://127.0.0.1:8080",
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
    url: "http://localhost:3000/api/v1/queue/handle-chunks",
    body: {
      csv,
      chunkNumber,
      fileId,
      createdById,
    },
  });
}

export const contactRouter = createTRPCRouter({
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
      const CHUNK_SIZE = 100;

      const queue:Promise<void>[] = [];

      const queueCurrentChunk = () => {
        queue.push(
          queueChunk({
            csv: currentChunk.join('\n'),
            fileId: input.fileId,
            chunkNumber: chunkIndex,
            createdById: file.createdById
          }),
        );
      };

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
        const numberOfRowsExcludingHeaders = currentChunk.length - 1
        if (numberOfRowsExcludingHeaders >= CHUNK_SIZE) {
          queueCurrentChunk();
          currentChunk = [headers];
          chunkIndex++;
        }
      }

      // Handle any remaining lines in the last chunk
      if (currentChunk.length > 1) {
        queueCurrentChunk();
      }

      await Promise.allSettled(queue);
    }),
});
