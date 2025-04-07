import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";

const SuccessfulCsvProcessingEmail = ({ fileName }: { fileName: string }) => {
  return (
    <Html>
      <Tailwind>
        <Head>
          <title>CSV Processing Complete</title>
          <Preview>Your CSV file has been successfully processed</Preview>
        </Head>
        <Body className="bg-[#151516] py-[40px] font-sans">
          <Container className="mx-auto max-w-[600px] rounded-[8px] bg-[#000000] p-[48px]">
            <Heading className="m-0 mb-[24px] text-[24px] font-bold text-[#10B981]">
              CSV Processing Complete
            </Heading>

            <Text className="mb-[24px] text-[16px] leading-[24px] text-gray-300">
              Good news! We&apos;ve successfully processed your CSV file. Your
              data is now ready to use in our system.
            </Text>

            <Section className="mb-[24px] rounded-[8px] bg-[#1A1A1C] p-[24px]">
              <Text className="m-0 mb-[8px] text-[14px] leading-[20px] text-gray-300">
                <strong>File name:</strong>{" "}
                <span className="text-[#10B981]">{fileName}</span>
              </Text>
              <Text className="m-0 mb-[8px] text-[14px] leading-[20px] text-gray-300">
                <strong>Processed on:</strong>{" "}
                <span className="text-[#10B981]">
                  {new Date().toLocaleDateString()}
                </span>
              </Text>
            </Section>

            <Text className="mb-[32px] text-[16px] leading-[24px] text-gray-300">
              You can now access and work with this data in your dashboard. If
              you need to make any changes or have questions about the processed
              data, please don&apos;t hesitate to contact our support team.
            </Text>

            <Button
              className="box-border rounded-[4px] bg-[#10B981] px-[20px] py-[12px] text-center text-[14px] font-medium text-white no-underline"
              href="https://cms-five-pearl.vercel.app/dashboard"
            >
              View Your Data
            </Button>

            <Hr className="my-[32px] border-gray-700" />

            <Text className="text-[14px] leading-[24px] text-gray-400">
              Thank you for using our service. If you need any assistance,
              please reply to this email or contact our support team.
            </Text>

            <Hr className="my-[32px] border-gray-700" />

            <Text className="m-0 text-[12px] leading-[16px] text-gray-500">
              <a
                href="https://example.com/unsubscribe"
                className="text-gray-500 underline"
              >
                Unsubscribe
              </a>
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default SuccessfulCsvProcessingEmail;
