import Col from "../_components/Col";
import NavBar from "../_components/NavBar";

export default function DefaultLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Col className="h-screen">
      <NavBar />
      {children}
    </Col>
  );
}
