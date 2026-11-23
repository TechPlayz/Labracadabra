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
    <html lang="en" className="dark h-full">
      <body className="min-h-full bg-[#080C15] text-slate-100 antialiased selection:bg-violet-600/30 selection:text-violet-200">
        <CampusProvider>{children}</CampusProvider>
      </body>
    </html>
  );
}
