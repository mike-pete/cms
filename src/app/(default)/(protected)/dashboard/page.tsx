"use server";
import { api, HydrateClient } from "~/trpc/server";
import PageContent from "./pageContent";
export default async function DashboardPage() {
  await api.contact.getContacts.prefetch({
    page: 1,
    limit: 50,
  });
  await api.contact.getFilesStatus.prefetch();

  return (
    <HydrateClient>
      <PageContent />
    </HydrateClient>
  );
}
