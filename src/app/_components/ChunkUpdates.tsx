"use client";
import { useEffect } from "react";
import { api } from "~/trpc/react";
import usePusherSub from "../_hooks/userPusherSub";

export default function ChunkUpdates() {
  const { subscribe, isConnected } = usePusherSub();
  const utils = api.useUtils();

  // Query for file processing status
  const { data: fileStatuses, isLoading } =
    api.contact.getFileProcessingStatus.useQuery(undefined, {
      // Ensure we don't show stale data
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    });

  useEffect(() => {
    if (!isConnected) {
      console.log("Waiting for Pusher connection...");
      return;
    }

    console.log("Setting up chunk update subscription");
    const sub = subscribe<string>("x", (data) => {
      console.log("Received chunk update:", data);
      // Invalidate the query when we receive an update
      void utils.contact.getFileProcessingStatus.invalidate();
    });

    return () => {
      console.log("Cleaning up chunk update subscription");
      sub?.unbind();
    };
  }, [subscribe, utils.contact.getFileProcessingStatus, isConnected]);

  if (!isConnected) {
    return <div className="p-4">Connecting to update service...</div>;
  }

  if (isLoading) {
    return <div className="p-4">Loading file statuses...</div>;
  }

  if (!fileStatuses || fileStatuses.length === 0) {
    return <div className="p-4">No files currently being processed</div>;
  }

  return (
    <div className="space-y-4 p-4">
      <h2 className="text-lg font-semibold">Processing Files</h2>
      <div className="space-y-4">
        {fileStatuses.map((file) => (
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
                  {file.completionPercentage}% Complete
                </p>
                <p className="text-sm text-gray-500">
                  {file.doneChunks} of {file.totalChunks} chunks processed
                </p>
              </div>
            </div>
            <div className="mt-4 h-2 w-full rounded-full bg-gray-200">
              <div
                className="h-2 rounded-full bg-blue-600 transition-all duration-500"
                style={{ width: `${file.completionPercentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
