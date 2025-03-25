"use client";
import { useEffect, useState } from "react";
import { api, type RouterOutputs } from "~/trpc/react";
import usePusherSub from "../_hooks/userPusherSub";

type ChunkUpdate = {
  type: "CHUNK_PROCESSED";
  fileId: number;
  chunkNumber: string;
  timestamp: string;
};

const useFileProgress = () => {
  const { subscribe } = usePusherSub();
  const [files, setFiles] = useState<
    RouterOutputs["contact"]["getFilesStatus"]
  >({});

  console.log("\n\nfiles", files);

  const { data, refetch } = api.contact.getFilesStatus.useQuery();

  useEffect(() => {
    if (data) {
      setFiles(data);
    }
  }, [data]);

  useEffect(() => {
    console.log("Setting up chunk update subscription");
    const fileSub = subscribe<ChunkUpdate>("file-chunked", (newFile) => {
      console.log("Received file chunked update:", newFile);
      setFiles((currentFiles) => ({
        ...currentFiles,
        [newFile.fileId]: newFile,
      }));
      void refetch();
    });

    const chunkSub = subscribe<ChunkUpdate>("chunk-processed", (data) => {
      console.log("Received chunk update:", data);
      const { fileId, chunkNumber } = data;

      if (!files[fileId]) {
        void refetch();
      } else {
        const file = files[fileId];
        if (file.pendingChunks.has(Number(chunkNumber))) {
          setFiles((currentFiles) => {
            currentFiles[fileId]?.pendingChunks.delete(Number(chunkNumber));
            return {
              ...currentFiles,
              [fileId]: {
                ...file,
                doneChunks: file.doneChunks + 1,
              },
            };
          });
        }
      }
    });

    return () => {
      console.log("cleaning up subscriptions");
      fileSub?.unbind();
      chunkSub?.unbind();
    };
  }, [subscribe]);

  return files;
};

export default function ChunkUpdates() {
  const files = useFileProgress();

  return (
    <div className="space-y-4 p-4">
      <h2 className="text-lg font-semibold">Processing Files</h2>

      {Object.values(files).map((file) => {
        return (
          <div key={file.fileId}>
            <div>
              <h3 className="font-medium">{file.fileName}</h3>
              <p className="text-sm text-gray-500">
                Created {file.createdAt.toLocaleString()}
              </p>
            </div>

            <p>
              {file.doneChunks} of {file.totalChunks} chunks processed
            </p>
            <p>{file.pendingChunks.size} pending chunks</p>
          </div>
        );
      })}
      {/* <div className="space-y-4">
        {Object.values(fileProgress).map((file) => {
          const completionPercentage = Math.round(
            (file.doneChunks / file.totalChunks) * 100,
          );

          return (
            <div key={file.fileId} className="rounded-lg border p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">{file.fileName}</h3>
                  <p className="text-sm text-gray-500">
                    Created {file.createdAt.toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">
                    {completionPercentage}% Complete
                  </p>
                  <p className="text-sm text-gray-500">
                    {file.doneChunks} of {file.totalChunks} chunks processed
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
      </div> */}
    </div>
  );
}
