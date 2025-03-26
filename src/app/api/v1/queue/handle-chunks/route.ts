import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { and, eq, sql } from "drizzle-orm";
import type { PgInsertValue } from "drizzle-orm/pg-core";
import Papa from "papaparse";
import invariant from "tiny-invariant";
import { z } from "zod";
import pusher from "~/server/connections/pusher";
import { db } from "~/server/db";
import { chunks, contacts, files } from "~/server/db/schema";
import { type RouterOutputs } from "~/trpc/react";
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

    try {
      await db.transaction(async (tx) => {
        const writes: Promise<unknown>[] = [];
        for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
          const batch = validRows.slice(i, i + BATCH_SIZE).map(
            (row) =>
              ({
                ...row.data,
                createdById,
              }) satisfies NewContact,
          );
          // Don't await here, just prepare the insert promise using the transaction
          writes.push(tx.insert(contacts).values(batch));
        }

        writes.push(
          tx
            .update(chunks)
            .set({ status: "DONE" as const })
            .where(
              and(
                eq(chunks.fileId, fileId),
                eq(chunks.chunkNumber, chunkNumber),
              ),
            ),
        );

        await Promise.all(writes);
      });

      const [fileStatus] = await db
        .select({
          fileId: files.id,
          fileName: files.fileName,
          totalChunks: sql<number>`CAST(count(${chunks.id}) AS integer)`.as(
            "total_chunks",
          ),
          doneChunks:
            sql<number>`CAST(count(case when ${chunks.status} = 'DONE' then 1 end) AS integer)`.as(
              "done_chunks",
            ),
          createdAt: files.createdAt,
        })
        .from(files)
        .where(eq(files.id, fileId))
        .leftJoin(chunks, eq(files.id, chunks.fileId))
        .groupBy(files.id)
        .limit(1);

      invariant(fileStatus, "File not found");
      invariant(fileStatus.fileName, "File name not found");

      const message: RouterOutputs["contact"]["getFilesStatus"][number] = {
        totalChunks: fileStatus.totalChunks,
        doneChunks: fileStatus.doneChunks,
        fileName: fileStatus.fileName,
        createdAt: fileStatus.createdAt,
        fileId: fileId,
      };

      await pusher.trigger(createdById, "chunk-processed", message);
    } catch (error) {
      console.error("Error in webhook handler:", error);
      return new Response(
        JSON.stringify({
          error: "Error processing message",
          details: String(error),
        }),
      );
    }

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
