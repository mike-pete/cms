"use client";
import dayjs from "dayjs";
import calendar from "dayjs/plugin/calendar";
import relativeTime from "dayjs/plugin/relativeTime";
import Col from "~/components/Col";
import Row from "~/components/Row";
import { cn } from "~/lib/utils";
import useFileStatuses from "../_hooks/useFileStatuses";
dayjs.extend(relativeTime);
dayjs.extend(calendar);

export default function ChunkUpdates() {
  const files = useFileStatuses();

  if (!files || Object.values(files).length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {Object.values(files)
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
        .map((file) => {
          const completionPercentage = Math.round(
            (file.doneChunks / file.totalChunks) * 100,
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
              {/* {completionPercentage < 100 && (
                <Col className="flex-1 gap-1">
                  <p className="text-xs text-neutral-500">
                    Uploading {completionPercentage}%
                  </p>
                  <ProgressBar completionPercentage={completionPercentage} />
                </Col>
              )} */}
              {/* {completionPercentage < 100 && (
                <Col className="flex-1 gap-1">
                  <p className="text-xs text-neutral-500">
                    Queueing {completionPercentage}%
                  </p>
                  <ProgressBar completionPercentage={completionPercentage} />
                </Col>
              )} */}
              {completionPercentage < 100 && (
                <Col className="flex-1 gap-1">
                  <p className="text-xs text-neutral-500">
                    Processing {completionPercentage}%
                  </p>
                  <ProgressBar completionPercentage={completionPercentage} />
                </Col>
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
