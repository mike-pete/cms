"use client";
import dayjs from "dayjs";
import calendar from "dayjs/plugin/calendar";
import relativeTime from "dayjs/plugin/relativeTime";
import Col from "~/components/Col";
import Row from "~/components/Row";
import { cn } from "~/lib/utils";
import { type FileStatus } from "../_hooks/useFileStatuses";
dayjs.extend(relativeTime);
dayjs.extend(calendar);

export default function UploadedFiles({ files }: { files: FileStatus[] }) {
  if (!files || Object.values(files).length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {Object.values(files)
        .filter(
          (file) => file.createdAt !== undefined && file.fileName !== undefined,
        )
        .sort(
          (a, b) =>
            new Date(b.createdAt ?? 0).getTime() -
            new Date(a.createdAt ?? 0).getTime(),
        )
        .map((file) => {
          const uploadCompletionPercentage = Number(
            file.upload.percentage.toFixed(0),
          );
          const chunkingCompletionPercentage = Number(
            file.chunking.percentage.toFixed(0),
          );
          const processingCompletionPercentage = Number(
            file.processing.percentage.toFixed(0),
          );

          return (
            <div
              key={file.fileId}
              className="flex flex-col gap-2 rounded-md border border-neutral-700 p-4"
            >
              <Row className="items-center justify-between gap-2">
                <p
                  className="max-w-[70%] truncate text-sm text-neutral-200"
                  title={file.fileName}
                >
                  {file.fileName}
                </p>
                <p
                  className="flex-shrink-0 text-xs text-neutral-400"
                  title={dayjs(file.createdAt).format("MMMM D, YYYY h:mm A")}
                >
                  {dayjs(file.createdAt).calendar(null, {
                    sameDay: "[Today at] h:mm A",
                    lastDay: "[Yesterday at] h:mm A",
                    lastWeek: "[Last] dddd [at] h:mm A",
                    sameElse: "MMM D [at] h:mm A",
                  })}
                </p>
              </Row>

              {(uploadCompletionPercentage < 100 ||
                chunkingCompletionPercentage < 100 ||
                processingCompletionPercentage < 100) && (
                <>
                  <Col className="flex-1 gap-1">
                    <p className="text-xs text-neutral-500">
                      Uploading {uploadCompletionPercentage}%
                    </p>
                    <ProgressBar
                      completionPercentage={uploadCompletionPercentage}
                    />
                  </Col>
                  <Col className="flex-1 gap-1">
                    <p className="text-xs text-neutral-500">
                      Queueing {chunkingCompletionPercentage}%
                    </p>
                    <ProgressBar
                      completionPercentage={chunkingCompletionPercentage}
                    />
                  </Col>

                  <Col className="flex-1 gap-1">
                    <p className="text-xs text-neutral-500">
                      Processing {processingCompletionPercentage}%
                    </p>
                    <ProgressBar
                      completionPercentage={processingCompletionPercentage}
                    />
                  </Col>
                </>
              )}
            </div>
          );
        })}
    </div>
  );
}

function ProgressBar({
  completionPercentage,
  className,
  title,
}: {
  completionPercentage: number;
  className?: string;
  title?: string;
}) {
  return (
    <div
      className={cn(
        "bg-neutral-8l00 h-2 flex-1 rounded-full bg-neutral-800",
        className,
      )}
      title={title}
    >
      <div
        className="h-2 rounded-full bg-emerald-600 transition-all duration-500"
        style={{ width: `${completionPercentage}%` }}
      />
    </div>
  );
}
