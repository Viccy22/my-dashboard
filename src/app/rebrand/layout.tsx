"use client";

// Shared sub-navigation for every Rebrand page. The tabs scroll horizontally on
// mobile so a narrow phone never overflows the page (spec §20).

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS: { href: string; label: string }[] = [
  { href: "/rebrand", label: "Hub" },
  { href: "/rebrand/today", label: "Today" },
  { href: "/rebrand/home-systems", label: "Home Systems" },
  { href: "/rebrand/body", label: "Body" },
  { href: "/rebrand/beauty", label: "Beauty" },
  { href: "/rebrand/roadmap", label: "Roadmap" },
  { href: "/rebrand/dental", label: "Dental" },
  { href: "/rebrand/mindset", label: "Mindset" },
  { href: "/rebrand/milestones", label: "Milestones" },
];

export default function RebrandLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div>
      <div className="mobile-scroll-x" style={{ marginBottom: "20px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", gap: "2px", paddingBottom: "0" }}>
          {TABS.map((tab) => {
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                style={{
                  fontSize: "13px",
                  fontWeight: active ? 600 : 500,
                  color: active ? "var(--accent-text)" : "var(--text-2)",
                  padding: "8px 12px",
                  whiteSpace: "nowrap",
                  textDecoration: "none",
                  borderBottom: active ? "2px solid var(--accent)" : "2px solid transparent",
                  marginBottom: "-1px",
                }}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>
      {children}
    </div>
  );
}
