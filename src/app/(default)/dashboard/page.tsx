import { api, HydrateClient } from "~/trpc/server";
import { CsvUpload } from "../../_components/CsvUpload";
import { LatestPost } from "../../_components/post";
import Push from "../../_components/Push";

export default async function DashboardPage() {
  const hello = await api.post.hello({ text: "from tRPC" });
  return (
    <HydrateClient>
      <div>
        <p className="text-2xl text-white">
          {hello ? hello.greeting : "Loading tRPC query..."}
        </p>
        <CsvUpload />
        <LatestPost />
        <Push />
      </div>
    </HydrateClient>
  );
}
