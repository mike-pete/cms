import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { and, eq, sql } from "drizzle-orm";
import type { PgInsertValue } from "drizzle-orm/pg-core";
import Papa from "papaparse";
import invariant from "tiny-invariant";
import { z } from "zod";
import SuccessfulCsvProcessingEmail from "~/emails/SuccessfulCsvProcessingEmail";
import pub from "~/server/connections/pusher";
import resend from "~/server/connections/resend";
import { db } from "~/server/db";
import { chunks, contacts, files, users } from "~/server/db/schema";
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

    const { data, errors: parseErrors } = Papa.parse(csv, {
      header: true,
      skipEmptyLines: "greedy", // Skip empty rows more aggressively
      transformHeader: (header) => header.trim(),
      delimitersToGuess: [",", ";", "\t"], // Try to guess the delimiter
    });

    const rawData = data as Record<string, string>[];

    if (parseErrors.length > 0) {
      console.error("CSV parsing errors:", JSON.stringify(parseErrors));
      // TODO: save errors to db
    }

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
          chunkingCompleted: files.chunkingCompleted,
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

      if (fileStatus.chunkingCompleted) {
        const user = await db.query.users.findFirst({
          where: eq(users.id, createdById),
        });

        const email = user?.email;
        if (email) {
          await resend.emails.send({
            from: "mike@lemonshell.com",
            to: email,
            subject: "CSV Processing Complete",
            react: SuccessfulCsvProcessingEmail({
              fileName: fileStatus.fileName,
            }),
          });
        }

        await pub.chunkProcessed(createdById, {
          createdAt: fileStatus.createdAt.toISOString(),
          fileName: fileStatus.fileName,
          totalChunks: fileStatus.totalChunks,
          doneChunks: fileStatus.doneChunks,
          fileId: fileId,
          chunkingCompleted: fileStatus.chunkingCompleted,
          chunkNumber,
        });
      }
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
