import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createInterface } from "readline";
import { type Readable } from "stream";
import invariant from "tiny-invariant";
import { z } from "zod";
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

function queueChunk({
  headers,
  lines,
  chunkNumber,
  fileId,
}: {
  headers: string;
  lines: string[];
  chunkNumber: number;
  fileId: number;
}) {
  console.log(chunkNumber)
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

      for await (const line of rl) {
        // Handle headers
        if (!headers) {
          headers = line;
          continue;
        }

        // Add line to current chunk
        currentChunk.push(line);

        // If chunk is full, process it
        if (currentChunk.length >= CHUNK_SIZE) {
          invariant(headers, "Headers should be defined");
          queueChunk({
            headers,
            fileId: input.fileId,
            lines: currentChunk,
            chunkNumber: chunkIndex,
          });

          // Reset for next chunk
          currentChunk = [];
          chunkIndex++;
        }
      }

      // Handle any remaining lines in the last chunk
      if (currentChunk.length > 0) {
        invariant(headers, "Headers should be defined");
        queueChunk({
          headers,
          fileId: input.fileId,
          lines: currentChunk,
          chunkNumber: chunkIndex,
        });
      }

      // TODO: Here you would send chunks to your queue system
      // For now, just log the chunks
      // console.log(`Created ${chunks.length} chunks`);
      // console.log(`First chunk has ${chunks[0]?.lines.length} lines`);
      // console.log(`Headers: ${chunks[0]?.headers}`);
    }),
});
