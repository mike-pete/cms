import Col from "~/app/_components/col";
import { ContactsTable } from "~/app/_components/ContactsTable";
import { CsvUpload } from "~/app/_components/CsvUpload";
import Push from "~/app/_components/Push";
import Row from "~/app/_components/row";
import { api, HydrateClient } from "~/trpc/server";

export default async function DashboardPage() {
  await api.contact.getContacts.prefetch({
    page: 1,
    limit: 50,
  });
  return (
    <Row className="h-full flex-1 overflow-hidden">
      <Col className="max-w-md gap-4 border-r border-neutral-700 p-8">
        <CsvUpload />
        <Col className="rounded-md border border-neutral-700 p-4">
          <Col>No files being processed</Col>
        </Col>
      </Col>
      <HydrateClient>
        <Col className="flex h-full flex-1 flex-col p-8 gap-4">
          <Push />
          <Col className="min-h-0 flex-1">
            <ContactsTable />
          </Col>
        </Col>
      </HydrateClient>
    </Row>
  );
}
