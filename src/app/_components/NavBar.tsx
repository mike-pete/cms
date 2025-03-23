import GoogleAuthButton from "./GoogleAuthButton";
import Row from "./row";

export default function NavBar() {
  return (
    <Row className="sticky top-0 w-full border-b border-slate-700 p-2">
      <Row className="flex-1">
        <h1 className="font-bold">cms</h1>
      </Row>
      <GoogleAuthButton />
    </Row>
  );
}
