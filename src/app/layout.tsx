import type { Metadata } from "next";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import { Sidebar, MobileNav } from "@/components/Sidebar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Variable font with the optical-size axis: large headings render in the
// high-contrast display cut, small text in the sturdier text cut.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz"],
});

export const metadata: Metadata = {
  title: "Second Brain — Content OS",
  description:
    "Capture, connect, plan, publish, and track content across every platform from one place.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex">
        <Sidebar />
        <div className="flex-1 min-w-0 flex flex-col">
          <MobileNav />
          {children}
        </div>
      </body>
    </html>
  );
}
