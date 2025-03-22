"use client";

import { useRef, useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Progress } from "~/components/ui/progress";
import { api } from "~/trpc/react";

export function CsvUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { mutateAsync: getUploadUrl } = api.contact.getUploadURL.useMutation();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile?.type === "text/csv") {
      setFile(selectedFile);
    } else {
      alert("Please select a CSV file");
      e.target.value = "";
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    try {
      setIsUploading(true);

      // Get the presigned URL
      const { presignedURL } = await getUploadUrl({
        fileName: file.name,
      });

      // Upload the file using fetch with progress tracking
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", presignedURL);
      xhr.setRequestHeader("Content-Type", "text/csv");

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100;
          setUploadProgress(progress);
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

      alert("Upload completed successfully!");
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload file");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="w-full max-w-md space-y-4">
      <Input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        disabled={isUploading}
        className="cursor-pointer"
      />

      {isUploading && (
        <div className="space-y-2">
          <Progress value={uploadProgress} />
          <p className="text-center text-sm text-gray-500">
            {Math.round(uploadProgress)}%
          </p>
        </div>
      )}

      <Button
        onClick={handleUpload}
        disabled={!file || isUploading}
        className="w-full"
      >
        {isUploading ? "Uploading..." : "Upload CSV"}
      </Button>
    </div>
  );
}
