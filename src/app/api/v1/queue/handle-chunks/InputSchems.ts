import { z } from "zod";

export const ColumnMappingSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string(),
});

export type ColumnMapping = z.infer<typeof ColumnMappingSchema>;

export const InputSchema = z.object({
  csv: z.string(),
  chunkNumber: z.number(),
  fileId: z.number(),
  createdById: z.string(),
  columnMapping: ColumnMappingSchema,
});
