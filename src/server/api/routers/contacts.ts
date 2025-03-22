import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
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

      return { presignedURL };
    }),
});
