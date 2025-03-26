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
        <Col className="max-w-md gap-4 border-r border-neutral-700 p-8">
          <CsvUpload />
          <Col className="rounded-md border border-neutral-700 p-4">
            <Col>
              <ChunkUpdates />
            </Col>
          </Col>
        </Col>
        <Col className="flex h-full flex-1 flex-col gap-4 p-8">
          <Col className="min-h-0 flex-1">
            <ContactsTable />
          </Col>
        </Col>
      </Row>
    </HydrateClient>
  );
}
