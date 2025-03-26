import ChunkUpdates from "~/app/_components/ChunkUpdates";
import { ContactsTable } from "~/app/_components/ContactsTable";
import { CsvUpload } from "~/app/_components/CsvUpload";
import Col from "~/components/Col";
import Row from "~/components/Row";
import { api, HydrateClient } from "~/trpc/server";

export default async function DashboardPage() {
  await api.contact.getContacts.prefetch({
    page: 1,
    limit: 50,
  });
  await api.contact.getFilesStatus.prefetch();

  return (
    <HydrateClient>
      <Row className="h-full flex-1 overflow-hidden">
        <Col className="flex h-full max-w-md flex-1 gap-4 border-r border-neutral-700 p-8">
          <CsvUpload />
          <Col className="flex min-h-0 flex-1 overflow-y-auto rounded-md border border-neutral-700">
            <Row className="sticky top-0 border-b border-neutral-700 bg-neutral-950 px-4 py-2">
              <h2 className="text-neutral-500 text-sm">uploaded files</h2>
            </Row>
            <Col className="gap-4 p-4">
              <ChunkUpdates />
            </Col>
          </Col>
        </Col>
        <Col className="flex h-full flex-1 gap-4 p-8">
          <Col className="min-h-0 flex-1">
            <ContactsTable />
          </Col>
        </Col>
      </Row>
    </HydrateClient>
  );
}
