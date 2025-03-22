import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import type { PgInsertValue } from "drizzle-orm/pg-core";
import Papa from "papaparse";
import { z } from "zod";
import { db } from "~/server/db";
import { contacts } from "~/server/db/schema";

export const InputSchema = z.object({
  csv: z.string(),
  chunkNumber: z.number(),
  fileId: z.number(),
  createdById: z.string(),
});

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

const BATCH_SIZE = 1000;

export const POST = verifySignatureAppRouter(async (req: Request) => {
  try {

    const { csv, chunkNumber, fileId, createdById } = InputSchema.parse(
      await req.json(),
    );
    console.log("Received webhook for chunk:", chunkNumber, "of file:", fileId);

    // Parse the CSV string
    const {
      data: rawData,
      errors: parseErrors,
      meta,
    } = Papa.parse(csv, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toLowerCase(),
    });

    console.log("Parsed CSV data:", {
      rowCount: rawData.length,
      headers: meta.fields,
      errorCount: parseErrors.length,
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

    console.log("Validation results:", {
      validRowCount: validRows.length,
      invalidRowCount: invalidRows.length,
    });

    // Process valid rows in batches
    const batches = [];
    for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
      const batch = validRows.slice(i, i + BATCH_SIZE).map(
        (row) =>
          ({
            ...row.data,
            createdById,
          }) satisfies NewContact,
      );
      batches.push(batch);
    }

    console.log(`Processing ${batches.length} batches of contacts`);

    // Insert batches into database
    for (const [index, batch] of batches.entries()) {
      try {
        await db.insert(contacts).values(batch);
        console.log(`Inserted batch ${index + 1}/${batches.length}`);
      } catch (error) {
        console.error(`Error inserting batch ${index + 1}:`, error);
        throw error;
      }
    }

    return new Response(
      JSON.stringify({
        message: "CSV processed and contacts inserted",
        totalRows: rawData.length,
        validRows: validRows.length,
        invalidRows: invalidRows.length,
        validationErrors: invalidRows,
        batchesProcessed: batches.length,
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
