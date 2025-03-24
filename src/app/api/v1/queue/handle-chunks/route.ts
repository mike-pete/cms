import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { sql } from "drizzle-orm";
import type { PgInsertValue } from "drizzle-orm/pg-core";
import Papa from "papaparse";
import { z } from "zod";
import { db } from "~/server/db";
import { chunks, contacts } from "~/server/db/schema";
import { InputSchema } from "./InputSchems";

// Define the schema for CSV rows
const ContactRowSchema = z
  .object({
    email: z.string().email("Invalid email format"),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
  })
  .transform((data) => ({
    email: data.email.toLowerCase(),
    firstName: data.first_name,
    lastName: data.last_name,
  }));

type ContactRow = z.infer<typeof ContactRowSchema>;
type ValidationResult =
  | { data: ContactRow; error: null; rowIndex: number }
  | { data: null; error: unknown; rowIndex: number };

type NewContact = Omit<
  PgInsertValue<typeof contacts>,
  "id" | "createdAt" | "updatedAt"
>;

const BATCH_SIZE = 5_000;

export const POST = verifySignatureAppRouter(async (req: Request) => {
  try {
    const { csv, chunkNumber, fileId, createdById } = InputSchema.parse(
      await req.json(),
    );

    // Parse the CSV string
    const {
      data: rawData,
      errors: parseErrors,
      // meta,
    } = Papa.parse(csv, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toLowerCase(),
    });

    // TODO: log csv parsing errors
    if (parseErrors.length > 0) {
      console.error("CSV parsing errors:", parseErrors);
      return new Response(
        JSON.stringify({ error: "CSV parsing errors", details: parseErrors }),
        { status: 400 },
      );
    }

    // Validate and transform each row
    const validationResults: ValidationResult[] = rawData.map((row, index) => {
      try {
        return {
          data: ContactRowSchema.parse(row),
          error: null,
          rowIndex: index,
        };
      } catch (error) {
        return {
          data: null,
          error: error instanceof z.ZodError ? error.errors : error,
          rowIndex: index,
        };
      }
    });

    const validRows = validationResults.filter(
      (result): result is ValidationResult & { data: ContactRow } =>
        result.data !== null,
    );

    const invalidRows = validationResults.filter(
      (result): result is ValidationResult & { error: unknown } =>
        result.error !== null,
    );

    // Process valid rows in batches
    console.log(`Starting to process ${validRows.length} valid rows`);
    const batchStart = performance.now();

    const results = await db.transaction(async (tx) => {
      const batches: Promise<unknown>[] = [];
      for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
        const batch = validRows.slice(i, i + BATCH_SIZE).map(
          (row) =>
            ({
              ...row.data,
              createdById,
            }) satisfies NewContact,
        );
        // Don't await here, just prepare the insert promise using the transaction
        batches.push(tx.insert(contacts).values(batch));
      }

      // Wait for all batches to complete
      const results = await Promise.allSettled(batches);
      
      // Update chunk status to DONE
      await tx
      .update(chunks)
      .set({ status: "DONE" as const })
      .where(
        sql`${chunks.fileId} = ${fileId} AND ${chunks.chunkNumber} = ${chunkNumber}`,
      );
      
      return results;
    });
    const batchEnd = performance.now();

    const successfulBatches = results.filter(
      (r): r is PromiseFulfilledResult<unknown> => r.status === "fulfilled",
    ).length;
    const failedBatches = results.filter(
      (r): r is PromiseRejectedResult => r.status === "rejected",
    ).length;

    console.log(`Database insertions completed:
      - Total time: ${batchEnd - batchStart}ms
      - Successful batches: ${successfulBatches}
      - Failed batches: ${failedBatches}
    `);

    return new Response(
      JSON.stringify({
        message: "CSV processed and contacts inserted",
        totalRows: rawData.length,
        validRows: validRows.length,
        invalidRows: invalidRows.length,
        validationErrors: invalidRows,
        chunkNumber,
        fileId,
      }),
      {
        status: invalidRows.length > 0 ? 206 : 200, // Partial content if some rows failed
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error) {
    console.error("Error in webhook handler:", error);
    return new Response(
      JSON.stringify({
        error: "Error processing message",
        details: String(error),
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  }
});
