import { GeistSans } from "geist/font/sans";
import { type Metadata } from "next";
import { SessionProvider } from "next-auth/react";
import { auth } from "~/server/auth";
import "~/styles/globals.css";
import { TRPCReactProvider } from "~/trpc/react";
import Col from "../components/Col";
export const metadata: Metadata = {
  title: "DEX",
  description: "Contact Management System",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();
  return (
    <html lang="en" className={`${GeistSans.variable}`}>
      <body>
        <SessionProvider session={session}>
          <TRPCReactProvider>
            <Col className="min-h-screen bg-neutral-950 text-white">
              {children}
            </Col>
          </TRPCReactProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
