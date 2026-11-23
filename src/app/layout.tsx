import type { Metadata } from "next";
import "./globals.css";
import { CampusProvider } from "@/components/layout/CampusProvider";

export const metadata: Metadata = {
  title: "Labracadabra — Campus Lab Resource Sharing",
  description:
    "Your Lab Wishes, Granted. AI-powered campus laboratory resource discovery, cross-department booking, and fair scheduling platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full antialiased">
        <CampusProvider>{children}</CampusProvider>
      </body>
    </html>
  );
}
