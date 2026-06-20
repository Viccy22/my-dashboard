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

export default function Header() {
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
      <span className="topbar-title">{title}</span>
      <span className="topbar-date">{today}</span>
    </header>
  );
}
