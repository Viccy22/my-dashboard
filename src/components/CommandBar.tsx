"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

type Item = { label: string; sub: string; href: string };

const ALL_ITEMS: Item[] = [
  { label: "Home",              sub: "Overview",  href: "/" },
  { label: "Contacts",          sub: "Productivity", href: "/contacts" },
  { label: "Tasks",             sub: "Productivity", href: "/todos" },
  { label: "Habits",            sub: "Productivity", href: "/habits" },
  { label: "Finances",          sub: "Bills & Budget", href: "/finances" },
  { label: "Subscriptions",     sub: "Finances",  href: "/subscriptions" },
  { label: "Dogs",              sub: "Pets",       href: "/dogs" },
  { label: "Maintenance",       sub: "Home",       href: "/maintenance" },
  { label: "Garage",            sub: "Home",       href: "/garage" },
  { label: "Measurements",      sub: "Home",       href: "/measurements" },
  { label: "Health & Wellness", sub: "Personal",   href: "/health" },
  { label: "Dental Health",     sub: "Personal",   href: "/dental" },
  { label: "Running",           sub: "Personal",   href: "/running" },
  { label: "School",            sub: "Personal",   href: "/school" },
  { label: "Vacations",         sub: "Plans",      href: "/vacations" },
  { label: "Festivals",         sub: "Plans",      href: "/festivals" },
  { label: "Holidays",          sub: "Plans",      href: "/holidays" },
  { label: "Orlando Magic",     sub: "Plans",      href: "/magic" },
];

export default function CommandBar() {
  const [open,    setOpen]    = useState(false);
  const [query,   setQuery]   = useState("");
  const [cursor,  setCursor]  = useState(0);
  const inputRef  = useRef<HTMLInputElement>(null);
  const router    = useRouter();

  const close = useCallback(() => { setOpen(false); setQuery(""); setCursor(0); }, []);

  // Open on Ctrl+K / Cmd+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") { e.preventDefault(); setOpen(v => !v); }
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [close]);

  // Focus input when opened
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 50); }, [open]);

  const filtered = query.trim()
    ? ALL_ITEMS.filter(i =>
        i.label.toLowerCase().includes(query.toLowerCase()) ||
        i.sub.toLowerCase().includes(query.toLowerCase())
      )
    : ALL_ITEMS;

  const navigate = (href: string) => { router.push(href); close(); };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setCursor(c => Math.min(c + 1, filtered.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)); }
    if (e.key === "Enter" && filtered[cursor]) navigate(filtered[cursor].href);
  };

  // Reset cursor when query changes
  useEffect(() => setCursor(0), [query]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div onClick={close} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9998, backdropFilter: "blur(2px)" }} />

      {/* Panel */}
      <div style={{
        position: "fixed", top: "20vh", left: "50%", transform: "translateX(-50%)",
        width: "min(560px, calc(100vw - 32px))",
        background: "var(--surface-overlay)", borderRadius: "12px",
        border: "1px solid var(--border)", boxShadow: "0 24px 64px rgba(0,0,0,0.4)",
        zIndex: 9999, overflow: "hidden",
      }}>
        {/* Search input */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "14px 16px", borderBottom: "1px solid var(--border)" }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--text-3)" strokeWidth="1.5">
            <circle cx="6.5" cy="6.5" r="4.5" /><path d="M10.5 10.5l3 3" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={onKey}
            placeholder="Go to…"
            style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: "15px", color: "var(--text)", fontFamily: "inherit" }}
          />
          <kbd style={{ fontSize: "11px", color: "var(--text-3)", background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: "4px", padding: "2px 6px" }}>Esc</kbd>
        </div>

        {/* Results */}
        <div style={{ maxHeight: "340px", overflowY: "auto" }}>
          {filtered.length === 0 ? (
            <p style={{ padding: "20px 16px", color: "var(--text-3)", fontSize: "13.5px", margin: 0, textAlign: "center" }}>No results</p>
          ) : (
            filtered.map((item, i) => (
              <div key={item.href} onClick={() => navigate(item.href)}
                onMouseEnter={() => setCursor(i)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "10px 16px", cursor: "pointer",
                  background: i === cursor ? "var(--surface-raised)" : "transparent",
                  transition: "background 0.08s",
                }}>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: 500, color: "var(--text)" }}>{item.label}</div>
                  <div style={{ fontSize: "11.5px", color: "var(--text-3)", marginTop: "1px" }}>{item.sub}</div>
                </div>
                {i === cursor && (
                  <kbd style={{ fontSize: "11px", color: "var(--text-3)", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "4px", padding: "2px 6px" }}>↵</kbd>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div style={{ display: "flex", gap: "16px", padding: "8px 16px", borderTop: "1px solid var(--border)" }}>
          {[["↑↓", "navigate"], ["↵", "go"], ["Esc", "close"]].map(([key, label]) => (
            <span key={key} style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", color: "var(--text-3)" }}>
              <kbd style={{ background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: "3px", padding: "1px 5px", fontSize: "10px" }}>{key}</kbd>
              {label}
            </span>
          ))}
        </div>
      </div>
    </>
  );
}
