import type { ColumnMapping } from "~/app/api/v1/queue/handle-chunks/InputSchems";
import { api } from "~/trpc/react";
import type useFileStatuses from "./useFileStatuses";

export function useFileUpload({
  updateFile,
}: {
  updateFile: ReturnType<typeof useFileStatuses>["updateFile"];
}) {
  const { mutateAsync: getUploadUrl } = api.contact.getUploadURL.useMutation();
  const { mutateAsync: processFile } = api.contact.processFile.useMutation();

  const uploadFile = async (file: File, columnMapping: ColumnMapping) => {
    if (!file) return;

    try {
      // Get the presigned URL
      const { presignedURL, fileId } = await getUploadUrl({
        fileName: file.name,
      });

      const createdAt = new Date();

      updateFile({
        fileId,
        fileName: file.name,
        createdAt,
      });

      // Upload the file using fetch with progress tracking
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", presignedURL);
      xhr.setRequestHeader("Content-Type", "text/csv");

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100;
          updateFile({
            fileId,
            fileName: file.name,
            createdAt,
            upload: {
              percentage: progress,
            },
          });
        }
      };

      await new Promise((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status === 200) {
            resolve(xhr.response);
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        };
        xhr.onerror = () => reject(new Error("Upload failed"));
        xhr.send(file);
      });

      await processFile({
        fileId,
        columnMapping,
      });

      return { success: true };
    } catch (error) {
      console.error("Upload error:", error);
      throw error;
    }
  };

  return uploadFile;
}
