import Col from "~/app/_components/col";
import { ContactsTable } from "~/app/_components/ContactsTable";
import { CsvUpload } from "~/app/_components/CsvUpload";
import Row from "~/app/_components/row";
import { api, HydrateClient } from "~/trpc/server";
import Push from "../../_components/Push";

export default async function DashboardPage() {
  await api.contact.getContacts.prefetch({
    page: 1,
    limit: 50,
  });
  return (
    <Row className="flex-grow">
      <Col className="max-w-md flex-grow gap-4 border-r border-neutral-700 p-8">
        <CsvUpload />
        <Col className="rounded-md border border-neutral-700 p-4">
          <Col>No files being processed</Col>
        </Col>
      </Col>
      <Col className="flex-grow p-8">
        <div>
          <Push />
          <HydrateClient>
            <ContactsTable />
          </HydrateClient>
        </div>
      </Col>
    </Row>
  );
}
