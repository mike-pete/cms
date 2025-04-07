import SkeletonBox from "~/app/_components/SkeletonBox";
import Col from "~/components/Col";
import Row from "~/components/Row";

export default function Loading() {
  return (
    <Row className="h-full flex-1 overflow-hidden">
      <Col className="flex h-full max-w-sm flex-1 gap-4 border-r border-neutral-700 p-8">
        <SkeletonBox />
      </Col>
      <Col className="flex h-full flex-1 gap-4 p-8">
        <Col className="min-h-0 flex-1">
          <SkeletonBox />
        </Col>
      </Col>
    </Row>
  );
}
