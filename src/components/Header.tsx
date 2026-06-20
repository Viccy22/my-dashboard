"use client";

import { usePathname } from "next/navigation";

const titles: Record<string, string> = {
  "/":             "Home",
  "/todos":        "Tasks",
  "/calendar":     "Calendar",
  "/contacts":     "Contacts & Friends",
  "/habits":       "Habits",
  "/garage":       "Garage",
  "/maintenance":  "Home Maintenance",
  "/measurements": "Measurements",
  "/finances":     "Finances",
  "/subscriptions":"Subscriptions",
  "/health":       "Health & Wellness",
  "/running":      "Running",
  "/school":       "School",
  "/dogs":         "Dogs",
  "/festivals":    "Festivals",
  "/vacations":    "Vacations",
  "/holidays":     "Holidays",
  "/magic":        "Orlando Magic",
};

function HamburgerIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
      <path d="M3 5h14M3 10h14M3 15h14" />
    </svg>
  );
}

export default function Header({ onMenuOpen }: { onMenuOpen?: () => void }) {
  const pathname = usePathname();
  const title = titles[pathname] ?? "Dashboard";

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month:   "short",
    day:     "numeric",
    year:    "numeric",
  });

  return (
    <header className="topbar">
      {/* Hamburger — visible on mobile only (CSS controls display) */}
      <button
        className="hamburger-btn"
        onClick={onMenuOpen}
        aria-label="Open navigation menu"
        aria-expanded={false}
      >
        <HamburgerIcon />
      </button>

      <span className="topbar-title">{title}</span>
      <span className="topbar-date">{today}</span>
    </header>
  );
}
