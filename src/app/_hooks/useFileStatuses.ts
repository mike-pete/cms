"use client";
import dayjs from "dayjs";
import calendar from "dayjs/plugin/calendar";
import relativeTime from "dayjs/plugin/relativeTime";
import { useEffect, useState } from "react";
import { api } from "~/trpc/react";
import usePusherSub from "./userPusherSub";
dayjs.extend(relativeTime);
dayjs.extend(calendar);

// export type FileStatus = RouterOutputs["contact"]["getFilesStatus"][number] & {
//   chunkingCompletionPercentage: number;
// };

// type FileUpdate = RouterOutputs["contact"]["getFilesStatus"][number];

export type FileStatus = {
  fileId: number;
  fileName: string;
  createdAt: Date;
  upload: {
    percentage: number;
    error?: string;
  };
  chunking: {
    percentage: number;
  };
  processing: {
    percentage: number;
    errorCount: number;
  };
};

const useFileStatuses = () => {
  const [files, setFiles] = useState<Record<number, FileStatus>>({});
  const { data, refetch } = api.contact.getFilesStatus.useQuery();
  const { subscribe, isReady } = usePusherSub();

  const updateFiles = (
    files: ({
      fileId: number;
      fileName: string;
      createdAt: Date;
    } & Partial<FileStatus>)[],
  ) => {
    setFiles((prev) => {
      const updatedFiles = { ...prev };
      for (const file of files) {
        const fileId = file.fileId;

        if (!data?.[fileId]) {
          void refetch();
        }

        const prevFile = updatedFiles?.[fileId] ?? {
          upload: {
            percentage: 0,
          },
          chunking: {
            percentage: 0,
          },
          processing: {
            percentage: 0,
            errorCount: 0,
          },
        };

        updatedFiles[fileId] = {
          fileId,
          fileName: file.fileName,
          createdAt: file.createdAt,
          upload: {
            percentage: Math.max(
              prevFile.upload.percentage,
              file.upload?.percentage ?? 0,
            ),
          },
          chunking: {
            percentage: Math.max(
              prevFile.chunking.percentage,
              file.chunking?.percentage ?? 0,
            ),
          },
          processing: {
            percentage: Math.max(
              prevFile.processing.percentage,
              file.processing?.percentage ?? 0,
            ),
            errorCount: Math.max(
              prevFile.processing.errorCount,
              file.processing?.errorCount ?? 0,
            ),
          },
        } satisfies FileStatus;
      }
      return updatedFiles;
    });
  };

  const updateFile = (file: Parameters<typeof updateFiles>[0][number]) => {
    updateFiles([file]);
  };

  useEffect(() => {
    if (data) {
      updateFiles(
        Object.values(data).map((file) => {
          return {
            fileId: file.fileId,
            fileName: file.fileName,
            createdAt: file.createdAt,
            upload: {
              percentage: 100,
            },
            chunking: {
              percentage: file.chunkingCompleted ? 100 : 0,
            },
            processing: {
              percentage: file.chunkingCompleted
                ? (file.doneChunks / file.totalChunks) * 100
                : 0,
              errorCount: 0,
            },
          };
        }),
      );
    }
  }, [data]);

  // TODO: sync with upload

  useEffect(() => {
    if (isReady) {
      const chunking = subscribe(
        "chunkQueued",
        ({
          fileId,
          fileName,
          createdAt,
          chunkingCompleted,
          chunkingPercentage,
        }) => {
          const update = {
            fileId,
            fileName,
            createdAt: new Date(createdAt),
            chunking: {
              percentage: chunkingCompleted ? 100 : chunkingPercentage,
            },
          };
          updateFile(update);
        },
      );

      const chunkProcessing = subscribe(
        "chunkProcessed",
        ({
          createdAt,
          fileName,
          fileId,
          doneChunks,
          totalChunks,
          chunkingCompleted,
        }) => {
          const update = {
            fileId,
            fileName,
            createdAt: new Date(createdAt),
            processing: {
              percentage: chunkingCompleted
                ? (doneChunks / totalChunks) * 100
                : 0,
              errorCount: 0,
            },
          };
          updateFile(update);
        },
      );

      return () => {
        chunking?.unbind();
        chunkProcessing?.unbind();
      };
    }
  }, [subscribe, isReady]);

  return Object.values(files);
};

export default useFileStatuses;
