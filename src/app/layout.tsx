import type { Metadata } from "next";
import { Cinzel, Crimson_Text } from "next/font/google";
import "./globals.css";
import Banner from "@/components/Banner";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";

const cinzel = Cinzel({
  subsets: ["latin"],
  variable: "--font-cinzel",
  weight: ["400", "700"],
  display: "swap",
});

const crimsonText = Crimson_Text({
  subsets: ["latin"],
  weight: ["400", "600"],
  style: ["normal", "italic"],
  variable: "--font-crimson",
  display: "swap",
});

export const metadata: Metadata = {
  title: "My Dashboard",
  description: "Your personal life dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${cinzel.variable} ${crimsonText.variable}`}>
      <body className="antialiased flex flex-col h-screen overflow-hidden">
        <Banner />
        {/* Below banner: sidebar + content side by side */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>
          <Sidebar />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
            <Header />
            <main style={{ flex: 1, overflowY: "auto", padding: "32px" }}>
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
