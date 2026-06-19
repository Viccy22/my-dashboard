"use client";

import { usePathname } from "next/navigation";

const pageTitles: Record<string, string> = {
  "/":        "Dashboard",
  "/todos":   "To-Do List",
  "/garage":  "Garage",
};

export default function Header() {
  const pathname = usePathname();
  const title = pageTitles[pathname] ?? "Dashboard";

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <header style={{
      padding: "20px 32px 0",
      flexShrink: 0,
      background: "transparent",
    }}>
      <div style={{
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
        paddingBottom: "16px",
      }}>
        <h1 style={{
          fontFamily: "var(--font-cinzel)",
          fontSize: "18px",
          letterSpacing: "0.12em",
          color: "var(--gold)",
          margin: 0,
          fontWeight: 700,
          textTransform: "uppercase",
        }}>
          {title}
        </h1>
        <span style={{
          fontFamily: "var(--font-crimson)",
          fontSize: "15px",
          color: "var(--parchment-dim)",
          fontStyle: "italic",
        }}>
          {today}
        </span>
      </div>
      {/* Gold rule — fades right */}
      <div style={{
        height: "1px",
        background: "linear-gradient(to right, var(--gold) 0%, rgba(196,146,40,0.12) 55%, transparent 100%)",
        opacity: 0.35,
        marginLeft: "-32px",
        marginRight: "-32px",
      }} />
    </header>
  );
}
