"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import invariant from "tiny-invariant";
import { Button } from "~/components/ui/button";
import { Progress } from "~/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import Col from "../../components/Col";

type ColumnMapping = {
  firstName: string;
  lastName: string;
  email: string;
};

export function CsvUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Partial<ColumnMapping>>(
    {},
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { mutateAsync: getUploadUrl } = api.contact.getUploadURL.useMutation();
  const { mutateAsync: processFile } = api.contact.processFile.useMutation();

  const parseHeaders = async (file: File) => {
    const text = await file.text();
    const firstLine = text.split("\n")[0];
    invariant(firstLine, "First line is required");
    const headers = firstLine.split(",").map((header) => header.trim());
    setHeaders(headers);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile?.type === "text/csv") {
      setFile(selectedFile);
      await parseHeaders(selectedFile);
    } else {
      alert("Please select a CSV file");
      e.target.value = "";
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile?.type === "text/csv") {
      setFile(droppedFile);
      await parseHeaders(droppedFile);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } else {
      alert("Please drop a CSV file");
    }
  };

  const handleColumnMap = (field: keyof ColumnMapping, value: string) => {
    // Remove the selected value from other mappings to ensure exclusivity
    const newMapping = { ...columnMapping };
    Object.keys(newMapping).forEach((key) => {
      if (newMapping[key as keyof ColumnMapping] === value) {
        delete newMapping[key as keyof ColumnMapping];
      }
    });
    newMapping[field] = value;
    setColumnMapping(newMapping);
  };

  const getAvailableColumns = (currentField: keyof ColumnMapping) => {
    const mappedColumns = Object.entries(columnMapping)
      .filter(([key, value]) => key !== currentField && value !== undefined)
      .map(([_, value]) => value);
    return headers.filter((header) => !mappedColumns.includes(header));
  };

  const handleUpload = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!file || !isColumnMappingComplete) return;

    try {
      setIsUploading(true);

      // Get the presigned URL
      const { presignedURL, fileId } = await getUploadUrl({
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

      // We need to cast the columnMapping as complete since we've already validated it
      await processFile({
        fileId,
        columnMapping: columnMapping as ColumnMapping,
      });

      alert("Upload completed successfully!");
      setFile(null);
      setHeaders([]);
      setColumnMapping({});
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

  const isColumnMappingComplete =
    columnMapping.firstName !== undefined &&
    columnMapping.lastName !== undefined &&
    columnMapping.email !== undefined;

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <label>
        <Col
          className={cn(
            "cursor-pointer items-center justify-center gap-4 rounded-lg border-2 border-dashed bg-neutral-900 p-8 transition-colors",
            file || isDragging
              ? "border-emerald-500"
              : "border-neutral-700 hover:border-neutral-600",
          )}
        >
          {!file ? (
            <>
              <Col className="max-h-[100px] items-center justify-center overflow-hidden">
                <Image src="/upload.png" alt="CSV" width={200} height={200} />
              </Col>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                disabled={isUploading}
                className="hidden"
              />
              <p className="text-center text-sm text-gray-500">
                Drag a CSV file here, or click to select
              </p>
            </>
          ) : (
            <>
              <p className="text-center text-sm font-medium">
                Map your CSV columns
              </p>
              <div className="w-full space-y-4">
                <div className="space-y-2">
                  <p className="text-sm text-neutral-400">First Name</p>
                  <Select
                    value={columnMapping.firstName}
                    onValueChange={(value) =>
                      handleColumnMap("firstName", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a column" />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableColumns("firstName").map((header) => (
                        <SelectItem key={header} value={header}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-neutral-400">Last Name</p>
                  <Select
                    value={columnMapping.lastName}
                    onValueChange={(value) =>
                      handleColumnMap("lastName", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a column" />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableColumns("lastName").map((header) => (
                        <SelectItem key={header} value={header}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-neutral-400">Email</p>
                  <Select
                    value={columnMapping.email}
                    onValueChange={(value) => handleColumnMap("email", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a column" />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableColumns("email").map((header) => (
                        <SelectItem key={header} value={header}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}

          {isUploading && (
            <div className="space-y-2">
              <Progress value={uploadProgress} />
              <p className="text-center text-sm text-gray-500">
                {Math.round(uploadProgress)}%
              </p>
            </div>
          )}

          {file && (
            <Button
              onClick={handleUpload}
              disabled={!file || isUploading || !isColumnMappingComplete}
              className="w-full"
            >
              {isUploading ? "Uploading..." : "Upload CSV"}
            </Button>
          )}
        </Col>
      </label>
    </div>
  );
}
