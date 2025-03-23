import { auth } from "~/server/auth";
import { api } from "~/trpc/server";
import Col from "../_components/col";

export default async function Home() {
  const session = await auth();

  if (session?.user) {
    void api.post.getLatest.prefetch();
  }

  return (
    <Col className="flex-grow items-center justify-center">
      <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem]">
          CMS
        </h1>
        <h2>Not you&apos;re granny&apos;s rolladex</h2>
        <div className="flex flex-col items-center gap-2"></div>
      </div>
    </Col>
  );
}
