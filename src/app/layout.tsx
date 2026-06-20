import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import CommandBar from "@/components/CommandBar";
import MobileNav from "@/components/MobileNav";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Personal life dashboard",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased">
        <div className="layout-root">
          <Sidebar />
          <div className="main-area">
            <Header />
            <main className="page">{children}</main>
          </div>
        </div>
        <CommandBar />
        <MobileNav />
      </body>
    </html>
  );
}
