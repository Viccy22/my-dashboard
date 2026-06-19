"use client";

import { usePathname } from "next/navigation";

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/todos": "To-Do List",
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
      padding: "22px 32px 0",
      flexShrink: 0,
    }}>
      <div style={{
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
        paddingBottom: "18px",
      }}>
        <h1 style={{
          fontFamily: "var(--font-cinzel)",
          fontSize: "20px",
          letterSpacing: "0.1em",
          color: "var(--gold)",
          margin: 0,
          fontWeight: "700",
        }}>
          {title}
        </h1>
        <span style={{
          fontFamily: "var(--font-crimson)",
          fontSize: "15px",
          color: "var(--text-muted)",
          fontStyle: "italic",
        }}>
          {today}
        </span>
      </div>
      <div style={{
        height: "1px",
        background: "linear-gradient(to right, var(--gold) 0%, rgba(201,164,74,0.15) 60%, transparent 100%)",
        marginLeft: "-32px",
        marginRight: "-32px",
        opacity: 0.45,
      }} />
    </header>
  );
}
