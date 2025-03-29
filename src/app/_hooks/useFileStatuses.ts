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
  const { data, refetch, isRefetching } = api.contact.getFilesStatus.useQuery();
  const { subscribe } = usePusherSub();

  console.log("isRefetching", isRefetching);

  console.log("files", files);

  const updateFiles = (files: ({ fileId: number, fileName: string, createdAt: Date } & Partial<FileStatus>)[]) => {
    setFiles((prev) => {
      const updatedFiles = { ...prev };
      for (const file of files) {
        const fileId = file.fileId;

        console.log("from data", data?.[fileId]);

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

  const updateFile = (file: Parameters<typeof updateFiles>[0][number]) =>
    updateFiles([file]);

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

  // TODO: sync with chunking

  //     const chunkSub = subscribe("chunkProcessed", (fileUpdate) => {
  //       updateFileProgress({
  //         ...fileUpdate,
  //         createdAt: new Date(fileUpdate.createdAt),
  //       });
  //     });
  // TODO: sync with processing
  useEffect(() => {
    const fileSub = subscribe(
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
        console.log("update", update);
        updateFile(update);
      },
    );
    return () => {
      fileSub?.unbind();
    };
  }, [subscribe]);

  return Object.values(files);
};

// const useFileStatuses = () => {
//   const { subscribe } = usePusherSub();
//   const [files, setFiles] = useState<FileStatus[]>([]);

//   const { data, refetch } = api.contact.getFilesStatus.useQuery();

//   const updateFileProgress = (
//     newFile: { fileId: string } & Partial<FileUpdate>,
//   ) => {
//     setFiles((prev) => {
//       const updatedFiles = { ...prev };

//       const fileId = newFile.fileId;
//       const prevFile = updatedFiles[fileId];
//       const chunkingCompletionPercentage =
//         prevFile?.chunkingCompletionPercentage ?? 0;

//       if (!prevFile) {
//         updatedFiles[fileId] = { ...newFile, chunkingCompletionPercentage };
//       } else {
//         const doneChunks = Math.max(prevFile.doneChunks, newFile.doneChunks);
//         const totalChunks = Math.max(
//           prevFile.totalChunks === Infinity ? 0 : prevFile.totalChunks,
//           newFile.totalChunks === Infinity ? 0 : newFile.totalChunks,
//         );
//         updatedFiles[fileId] = {
//           ...prevFile,
//           ...newFile,
//           doneChunks,
//           totalChunks,
//         };
//       }
//       return updatedFiles;
//     });
//   };

//   useEffect(() => {
//     if (data) {
//       updateFileProgress(Object.values(data));
//     }
//   }, [data]);

//   useEffect(() => {
//     const fileSub = subscribe("fileChunked", (fileUpdate) => {
//       updateFileProgress({
//         ...fileUpdate,
//         createdAt: new Date(fileUpdate.createdAt),
//       });
//     });

//     const chunkSub = subscribe("chunkProcessed", (fileUpdate) => {
//       updateFileProgress({
//         ...fileUpdate,
//         createdAt: new Date(fileUpdate.createdAt),
//       });
//     });

//     return () => {
//       fileSub?.unbind();
//       chunkSub?.unbind();
//     };
//   }, [subscribe, refetch]);

//   return files;
// };

export default useFileStatuses;
