"use server";
import { ContactsTable } from "~/app/_components/ContactsTable";
import Col from "~/components/Col";
import Row from "~/components/Row";
import { api, HydrateClient } from "~/trpc/server";
import FileUploadSidebar from "./FileUploadSidebar";
export default async function DashboardPage() {
  await api.contact.getContacts.prefetch({
    page: 1,
    limit: 50,
  });
  await api.contact.getFilesStatus.prefetch();

  return (
    <HydrateClient>
      <Row className="h-full flex-1 overflow-hidden">
        <Col className="flex h-full max-w-sm flex-1 gap-4 border-r border-neutral-700 p-8">
          <FileUploadSidebar />
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
