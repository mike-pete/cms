import Col from "~/app/_components/col";
import { ContactsTable } from "~/app/_components/ContactsTable";
import { CsvUpload } from "~/app/_components/CsvUpload";
import Row from "~/app/_components/row";
import { api, HydrateClient } from "~/trpc/server";
import { LatestPost } from "../../_components/post";
import Push from "../../_components/Push";

export default async function DashboardPage() {
  const hello = await api.post.hello({ text: "from tRPC" });
  return (
    <Row className="flex-grow">
      <Col className="max-w-md flex-grow gap-4 border-r border-neutral-700 p-8">
        <CsvUpload />
        <Col className="rounded-md border border-neutral-700 p-4">
          <Col>No files being processed</Col>
        </Col>
      </Col>
      <Col className="flex-grow p-8">
        <HydrateClient>
          <div>
            <p className="text-2xl text-white">
              {hello ? hello.greeting : "Loading tRPC query..."}
            </p>
            <LatestPost />
            <Push />
            <ContactsTable />
          </div>
        </HydrateClient>
      </Col>
    </Row>
  );
}
