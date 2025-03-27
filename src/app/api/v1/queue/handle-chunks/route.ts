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

type ContactRow = {
  email: string;
  firstName?: string;
  lastName?: string;
};

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
    const { csv, chunkNumber, fileId, createdById, columnMapping } =
      InputSchema.parse(await req.json());

    // Parse the CSV string
    const { data, errors: parseErrors } = Papa.parse(csv, {
      header: true,
      skipEmptyLines: "greedy", // Skip empty rows more aggressively
      transformHeader: (header) => header.trim(),
      delimitersToGuess: [",", ";", "\t"], // Try to guess the delimiter
    });

    // Cast the parsed data as an array of records
    const rawData = data as Record<string, string>[];

    if (parseErrors.length > 0) {
      console.error("CSV parsing errors:", JSON.stringify(parseErrors));
      // TODO: save errors to db
    }

    // Validate each row
    const validationResults: ValidationResult[] = [];

    for (let index = 0; index < rawData.length; index++) {
      const row = rawData[index];

      try {
        // TODO: save errors to db
        invariant(row, "Row is required");
        invariant(row[columnMapping.email], "Email is required");

        const email = z.string().email().parse(row[columnMapping.email]);
        const firstName = columnMapping.firstName
          ? row[columnMapping.firstName]
          : undefined;
        const lastName = columnMapping.lastName
          ? row[columnMapping.lastName]
          : undefined;

        validationResults.push({
          data: {
            email,
            firstName,
            lastName,
          },
          error: null,
          rowIndex: index,
        });
      } catch (error) {
        validationResults.push({
          data: null,
          error,
          rowIndex: index,
        });
      }
    }

    const validRows = validationResults.filter(
      (result): result is ValidationResult & { data: ContactRow } =>
        result.data !== null,
    );

    const invalidRows = validationResults.filter(
      (result): result is ValidationResult & { error: unknown } =>
        result.error !== null,
    );

    if (invalidRows.length > 0) {
      console.log(`${invalidRows.length} invalid rows found`);
    }

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

    return new Response(null, {
      status: invalidRows.length > 0 ? 206 : 200, // Partial content if some rows failed
      headers: {
        "Content-Type": "application/json",
      },
    });
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
