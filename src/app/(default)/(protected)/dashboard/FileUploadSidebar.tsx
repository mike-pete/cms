"use client";

import { CsvUpload } from "~/app/_components/CsvUpload";
import UploadedFiles from "~/app/_components/UploadedFiles";
import useFileStatuses from "~/app/_hooks/useFileStatuses";
import Col from "~/components/Col";
import Row from "~/components/Row";

export default function FileUploadSidebar() {
  const { files, updateFile } = useFileStatuses();

  return (
    <>
      <CsvUpload updateFile={updateFile} />
      <Col className="flex min-h-0 flex-1 overflow-y-auto rounded-md border border-neutral-700">
        <Row className="sticky top-0 border-b border-neutral-700 bg-neutral-950 px-4 py-2">
          <h2 className="text-sm text-neutral-500">uploaded files</h2>
        </Row>
        <Col className="gap-4 p-4">
          <UploadedFiles files={files} />
        </Col>
      </Col>
    </>
  );
}
