import Link from "next/link";
import GoogleAuthButton from "./GoogleAuthButton";
import Row from "./row";

export default function NavBar() {
  return (
    <Row className="sticky top-0 w-full items-center border-b border-neutral-700 p-4">
      <Row className="flex-1 items-center gap-4">
        <Link href="/" className="font-bold text-emerald-500">
          CMS
        </Link>
        <Link href="/dashboard" className="text-sm font-semibold">
          dashboard
        </Link>
      </Row>
      <GoogleAuthButton />
    </Row>
  );
}
