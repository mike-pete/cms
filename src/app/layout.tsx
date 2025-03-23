import { GeistSans } from "geist/font/sans";
import { type Metadata } from "next";
import { SessionProvider } from "next-auth/react";
import "~/styles/globals.css";
import { TRPCReactProvider } from "~/trpc/react";
import Col from "./_components/col";

export const metadata: Metadata = {
  title: "CMS",
  description: "Contact Management System",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${GeistSans.variable}`}>
      <body>
        <SessionProvider>
          <TRPCReactProvider>
            <Col className="min-h-screen bg-slate-950 text-white">
              {children}
            </Col>
          </TRPCReactProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
