"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Dashboard", symbol: "✦" },
  { href: "/todos", label: "To-Do List", symbol: "⚜" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside style={{
      width: "220px",
      minWidth: "220px",
      background: "var(--sidebar-bg)",
      borderRight: "1px solid var(--sidebar-border)",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    }}>
      {/* Title */}
      <div style={{
        padding: "28px 20px 22px",
        borderBottom: "1px solid var(--sidebar-border)",
      }}>
        <div style={{
          fontFamily: "var(--font-cinzel)",
          fontSize: "10px",
          letterSpacing: "0.25em",
          color: "var(--gold)",
          opacity: 0.55,
          marginBottom: "10px",
          textAlign: "center",
        }}>
          ✧ ✦ ✧
        </div>
        <div style={{
          fontFamily: "var(--font-cinzel)",
          fontSize: "15px",
          letterSpacing: "0.1em",
          color: "var(--text)",
          fontWeight: "700",
          lineHeight: "1.35",
          textAlign: "center",
        }}>
          My Dashboard
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: "16px 10px", flex: 1 }}>
        <div style={{
          fontSize: "9px",
          letterSpacing: "0.22em",
          color: "var(--text-muted)",
          textTransform: "uppercase",
          fontFamily: "var(--font-cinzel)",
          padding: "0 10px",
          marginBottom: "10px",
          opacity: 0.7,
        }}>
          Pages
        </div>

        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-link${pathname === item.href ? " active" : ""}`}
          >
            <span style={{ fontSize: "11px", opacity: 0.75 }}>{item.symbol}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Bottom decoration */}
      <div style={{
        padding: "18px 20px",
        borderTop: "1px solid var(--sidebar-border)",
        textAlign: "center",
        fontFamily: "var(--font-cinzel)",
        fontSize: "11px",
        color: "var(--gold)",
        opacity: 0.3,
        letterSpacing: "0.2em",
      }}>
        ✦ ✦ ✦
      </div>
    </aside>
  );
}
