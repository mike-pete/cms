"use client";
import dayjs from "dayjs";
import calendar from "dayjs/plugin/calendar";
import relativeTime from "dayjs/plugin/relativeTime";
import { useEffect, useState } from "react";
import { api, type RouterOutputs } from "~/trpc/react";
import usePusherSub from "../_hooks/userPusherSub";
dayjs.extend(relativeTime);
dayjs.extend(calendar);

export type FileStatus = RouterOutputs["contact"]["getFilesStatus"][number];

type FileUpdate = RouterOutputs["contact"]["getFilesStatus"][number];

const useFileStatuses = () => {
  const { subscribe } = usePusherSub();
  const [files, setFiles] = useState<FileStatus[]>([]);

  const { data, refetch } = api.contact.getFilesStatus.useQuery();

  const updateFileProgress = (newFiles: FileUpdate[]) => {
    setFiles((prev) => {
      const updatedFiles = { ...prev };

      for (const newFile of newFiles) {
        const fileId = newFile.fileId;
        const prevFile = updatedFiles[fileId];

        if (!prevFile) {
          updatedFiles[fileId] = { ...newFile };
        } else {
          const doneChunks = Math.max(prevFile.doneChunks, newFile.doneChunks);
          const totalChunks = Math.max(
            prevFile.totalChunks === Infinity ? 0 : prevFile.totalChunks,
            newFile.totalChunks === Infinity ? 0 : newFile.totalChunks,
          );
          updatedFiles[fileId] = {
            ...prevFile,
            ...newFile,
            doneChunks,
            totalChunks,
          };
        }
      }
      return updatedFiles;
    });
  };

  useEffect(() => {
    if (data) {
      updateFileProgress(Object.values(data));
    }
  }, [data]);

  useEffect(() => {
    const fileSub = subscribe("fileChunked", (fileUpdate) => {
      updateFileProgress([
        { ...fileUpdate, createdAt: new Date(fileUpdate.createdAt) },
      ]);
    });

    const chunkSub = subscribe("chunkProcessed", (fileUpdate) => {
      updateFileProgress([
        { ...fileUpdate, createdAt: new Date(fileUpdate.createdAt) },
      ]);
    });

    return () => {
      fileSub?.unbind();
      chunkSub?.unbind();
    };
  }, [subscribe, refetch]);

  return files;
};

export default useFileStatuses;
