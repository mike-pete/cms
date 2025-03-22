import { Client } from "@upstash/qstash";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { NextResponse } from "next/server";
import { env } from "~/env";

const client = new Client({
  token: env.QSTASH_TOKEN,
  baseUrl: "http://127.0.0.1:8080",
});

// 👇 Verify that this messages comes from QStash
export const POST = verifySignatureAppRouter(async (req: Request) => {
  try {
    const body = (await req.json()) as { timestamp?: string; message?: string };
    console.log("Received webhook from QStash with body:", body);

    return new Response("ok", { status: 200 });
  } catch (error) {
    console.error("Error in webhook handler:", error);
    return new Response("Error processing message", { status: 500 });
  }
});

export async function GET(req: Request) {
  try {
    // console.log("GET request received - queueing message");

    // Queue a message to be processed by our POST webhook handler
    const result = await client.publishJSON({
      url: "http://localhost:3000/api/v1",
      body: {
        timestamp: new Date().toISOString(),
        message: "Test message from GET endpoint",
      },
    });

    console.log("Message queued with ID:", result.messageId);

    return NextResponse.json({
      message: "Message queued successfully",
      qstashMessageId: result.messageId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error queueing message:", error);
    return NextResponse.json(
      { error: "Failed to queue message" },
      { status: 500 },
    );
  }
}
