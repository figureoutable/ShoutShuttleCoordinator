import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AppNav } from "@/components/coordinator/app-nav";
import { ShuttleProvider } from "@/context/shuttle-context";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Shout Shuttle Coordinator",
  description:
    "Internal shuttle logistics dashboard for Heathrow ↔ Guildford conference runs.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-white text-[#111827]">
        <ShuttleProvider>
          <AppNav />
          <main className="flex-1">{children}</main>
        </ShuttleProvider>
      </body>
    </html>
  );
}
