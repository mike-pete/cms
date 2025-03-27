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
  firstName?: string;
  lastName?: string;
  email: string;
};

type ColumnSelectorProps = {
  label: string;
  field: keyof ColumnMapping;
  value: string | undefined;
  availableColumns: string[];
  onChange: (field: keyof ColumnMapping, value: string) => void;
  required?: boolean;
};

function ColumnSelector({
  label,
  field,
  value,
  availableColumns,
  onChange,
  required = false,
}: ColumnSelectorProps) {
  return (
    <Col className="gap-0.5">
      <p className="text-sm text-neutral-400">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </p>
      <Select
        value={value}
        onValueChange={(newValue) => onChange(field, newValue)}
      >
        <SelectTrigger>
          <SelectValue placeholder="select a column" />
        </SelectTrigger>
        <SelectContent>
          {availableColumns.map((header) => (
            <SelectItem key={header} value={header}>
              {header}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Col>
  );
}

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

  const columnSelectors = [
    { label: "email", field: "email" as const, required: true },
    { label: "first name", field: "firstName" as const },
    { label: "last name", field: "lastName" as const },
  ];

  const isColumnMappingComplete = columnSelectors.every((selector) =>
    selector.required ? columnMapping[selector.field] !== undefined : true,
  );

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <label>
        <Col
          className={cn(
            "group cursor-pointer items-center justify-center gap-4 rounded-lg border-2 border-dashed bg-neutral-900 p-8 transition-colors",
            file || isDragging
              ? "border-emerald-500"
              : "border-neutral-700 hover:border-neutral-600",
          )}
        >
          {!file ? (
            <>
              <Col className="max-h-[100px] items-center justify-center overflow-hidden">
                <Image
                  src="/upload.png"
                  alt="CSV"
                  width={200}
                  height={200}
                  className="transition-transform duration-200 group-hover:-rotate-[8deg] group-hover:scale-105"
                />
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
            <Col className="w-full gap-2">
              {columnSelectors.map((selector) => (
                <ColumnSelector
                  key={selector.field}
                  label={selector.label}
                  field={selector.field}
                  value={columnMapping[selector.field]}
                  availableColumns={headers}
                  onChange={(field, value) =>
                    setColumnMapping({
                      ...columnMapping,
                      [field]: value,
                    })
                  }
                  required={selector.required}
                />
              ))}
            </Col>
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
