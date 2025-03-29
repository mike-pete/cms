"use client";

import ChunkUpdates from "~/app/_components/ChunkUpdates";
import { ContactsTable } from "~/app/_components/ContactsTable";
import { CsvUpload } from "~/app/_components/CsvUpload";
import useFileStatuses from "~/app/_hooks/useFileStatuses";
import Col from "~/components/Col";
import Row from "~/components/Row";

export default function PageContent() {
  const files = useFileStatuses();

  return (
    <Row className="h-full flex-1 overflow-hidden">
      <Col className="flex h-full max-w-sm flex-1 gap-4 border-r border-neutral-700 p-8">
        <CsvUpload />
        <Col className="flex min-h-0 flex-1 overflow-y-auto rounded-md border border-neutral-700">
          <Row className="sticky top-0 border-b border-neutral-700 bg-neutral-950 px-4 py-2">
            <h2 className="text-sm text-neutral-500">uploaded files</h2>
          </Row>
          <Col className="gap-4 p-4">
            <ChunkUpdates files={files} />
          </Col>
        </Col>
      </Col>
      <Col className="flex h-full flex-1 gap-4 p-8">
        <Col className="min-h-0 flex-1">
          <ContactsTable />
        </Col>
      </Col>
    </Row>
  );
}
