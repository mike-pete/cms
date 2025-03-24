import Col from "../_components/Col";

export default async function Home() {
  return (
    <Col className="flex-grow items-center justify-center">
      <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-[4rem]">
          Not you&apos;re granny&apos;s rolodex
        </h1>
        <div className="flex flex-col items-center gap-2"></div>
      </div>
    </Col>
  );
}
