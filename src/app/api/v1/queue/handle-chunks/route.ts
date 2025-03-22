import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { z } from "zod";

export const InputSchema = z.object({
  csv: z.string(),
  chunkNumber: z.number(),
  fileId: z.number(),
});

export const POST = verifySignatureAppRouter(async (req: Request) => {
  try {
    const { csv, chunkNumber, fileId } = InputSchema.parse(
      await req.json(),
    );
    console.log("Received webhook:", chunkNumber, fileId, csv);

    return new Response("ok", { status: 200 });
  } catch (error) {
    console.error("Error in webhook handler:", error);
    return new Response("Error processing message", { status: 500 });
  }
});
