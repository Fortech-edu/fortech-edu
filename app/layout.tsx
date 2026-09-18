import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { PersistenceSync } from "@/components/persistence-sync";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Fortech",
  description: "Build a clear, practical university admission plan.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full">
        <PersistenceSync />
        {children}
      </body>
    </html>
  );
}
