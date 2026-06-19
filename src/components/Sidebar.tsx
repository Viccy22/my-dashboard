"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/",      label: "Dashboard",  symbol: "✦" },
  { href: "/todos", label: "To-Do List", symbol: "⚜" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside style={{
      width: "210px",
      minWidth: "210px",
      background: "var(--aubergine)",
      borderRight: "1px solid var(--border)",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    }}>
      {/* Branding */}
      <div style={{
        padding: "22px 18px 18px",
        borderBottom: "1px solid var(--border)",
        textAlign: "center",
      }}>
        <div style={{
          fontFamily: "var(--font-cinzel)",
          fontSize: "9px",
          letterSpacing: "0.28em",
          color: "var(--gold)",
          opacity: 0.5,
          marginBottom: "8px",
        }}>
          ✦  ✦  ✦
        </div>
        <div style={{
          fontFamily: "var(--font-cinzel)",
          fontSize: "13px",
          letterSpacing: "0.12em",
          color: "var(--parchment)",
          fontWeight: 700,
          lineHeight: 1.35,
        }}>
          My Dashboard
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ padding: "14px 10px", flex: 1 }}>
        <div style={{
          fontSize: "8px",
          letterSpacing: "0.26em",
          color: "var(--parchment-dim)",
          textTransform: "uppercase",
          fontFamily: "var(--font-cinzel)",
          padding: "0 10px",
          marginBottom: "10px",
          opacity: 0.65,
        }}>
          Pages
        </div>

        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-link${pathname === item.href ? " active" : ""}`}
          >
            <span style={{ fontSize: "11px", opacity: 0.70 }}>{item.symbol}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Footer ornament */}
      <div style={{
        padding: "16px",
        borderTop: "1px solid var(--border)",
        textAlign: "center",
        fontFamily: "var(--font-cinzel)",
        fontSize: "10px",
        color: "var(--gold)",
        opacity: 0.28,
        letterSpacing: "0.22em",
      }}>
        ✧  ✦  ✧
      </div>
    </aside>
  );
}
