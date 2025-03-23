import Col from "../_components/col";
import NavBar from "../_components/NavBar";

export default function DefaultLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Col className="flex-grow">
      <NavBar />
      {children}
    </Col>
  );
}
