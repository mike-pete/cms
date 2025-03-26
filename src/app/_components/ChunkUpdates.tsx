"use client";
import { useEffect, useState } from "react";
import { api, type RouterOutputs } from "~/trpc/react";
import usePusherSub from "../_hooks/userPusherSub";

type FileUpdate = RouterOutputs["contact"]["getFilesStatus"][number];

const useFileProgress = () => {
  const { subscribe } = usePusherSub();
  const [files, setFiles] = useState<
    RouterOutputs["contact"]["getFilesStatus"]
  >({});

  console.log("\n\nfiles", files);

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
    console.log("Setting up chunk update subscription");
    const fileSub = subscribe<FileUpdate>("file-chunked", (fileUpdate) => {
      console.log("Received file chunked update:", fileUpdate);
      updateFileProgress([fileUpdate]);
    });

    const chunkSub = subscribe<FileUpdate>("chunk-processed", (fileUpdate) => {
      console.log("Received chunk update:", fileUpdate);
      updateFileProgress([fileUpdate]);
    });

    return () => {
      console.log("cleaning up subscriptions");
      fileSub?.unbind();
      chunkSub?.unbind();
    };
  }, [subscribe, refetch]);

  return files;
};

export default function ChunkUpdates() {
  const files = useFileProgress();

  return (
    <div className="space-y-4 p-4">
      <h2 className="text-lg font-semibold">Processing Files</h2>
      <div className="space-y-4">
        {Object.values(files).map((file) => {
          const completionPercentage = Math.round(
            (file.doneChunks / file.totalChunks) * 100,
          );

          return (
            <div key={file.fileId} className="rounded-lg border p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">{file.fileName}</h3>
                  <p className="text-sm text-gray-500">
                    Created {new Date(file.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">
                    {completionPercentage}% Complete
                  </p>
                </div>
              </div>
              <div className="mt-4 h-2 w-full rounded-full bg-gray-200">
                <div
                  className="h-2 rounded-full bg-blue-600 transition-all duration-500"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
