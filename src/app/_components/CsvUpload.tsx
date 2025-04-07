"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import invariant from "tiny-invariant";
import Row from "~/components/Row";
import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { cn } from "~/lib/utils";
import Col from "../../components/Col";
import type useFileStatuses from "../_hooks/useFileStatuses";
import { useFileUpload } from "../_hooks/useFileUpload";

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

export function CsvUpload({
  updateFile,
}: {
  updateFile: ReturnType<typeof useFileStatuses>["updateFile"];
}) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Partial<ColumnMapping>>(
    {},
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = useFileUpload({ updateFile });

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

  const resetForm = () => {
    setFile(null);
    setHeaders([]);
    setColumnMapping({});
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUpload = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!file || !isColumnMappingComplete) return;

    try {
      void uploadFile(file, columnMapping as ColumnMapping);
      resetForm();
    } catch (error) {
      console.error(error);
      alert("Failed to upload file");
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
            "group items-center justify-center gap-4 rounded-lg border-2 border-dashed bg-neutral-900 p-4 transition-colors",
            file || isDragging
              ? "border-emerald-500"
              : "border-neutral-700 hover:border-neutral-600",
            !file && "cursor-pointer",
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
                className="hidden"
              />
              <p className="text-center text-sm text-gray-500">
                Drag a CSV file here, or click to select
              </p>
            </>
          ) : (
            <Col className="w-full gap-4">
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

          {file && (
            <Row className="w-full gap-2">
              <Button
                onClick={handleUpload}
                disabled={!file || !isColumnMappingComplete}
                className="w-full"
              >
                Upload CSV
              </Button>
              <Button
                onClick={(e) => {
                  e.preventDefault();

                  resetForm();
                }}
                className="border border-neutral-400 bg-transparent hover:border-red-800 hover:bg-red-800"
              >
                Cancel
              </Button>
            </Row>
          )}
        </Col>
      </label>
    </div>
  );
}
