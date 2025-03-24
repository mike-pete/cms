import { z } from "zod";

export const InputSchema = z.object({
  csv: z.string(),
  chunkNumber: z.number(),
  fileId: z.number(),
  createdById: z.string(),
  userId: z.string()
});
