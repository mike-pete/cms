import { S3Client } from "@aws-sdk/client-s3";
import { env } from "~/env";

const s3 = new S3Client({
  endpoint: env.CLOUDFLARE_R2_ENDPOINT,
  region: "auto",
  credentials: {
    accessKeyId: env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  },
});

export default s3;
