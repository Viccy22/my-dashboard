"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

// ── Icons (inline SVG) ────────────────────────────────────────────────────────

const HomeIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M3 9.5L10 3l7 6.5V17a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M7 18v-6h6v6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const FinanceIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="10" cy="10" r="8" />
    <path d="M10 5v10M7.5 7a2.5 2.5 0 0 1 5 0c0 1.3-1.3 1.9-2.5 2.5S7.5 11 7.5 12.5a2.5 2.5 0 0 0 5 0" strokeLinecap="round" />
  </svg>
);
const HealthIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M10 17S2 12 2 7a4 4 0 0 1 8-1 4 4 0 0 1 8 1c0 5-8 10-8 10z" strokeLinejoin="round" />
  </svg>
);
const DogsIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
    <ellipse cx="6.5" cy="5.5" rx="2" ry="2.5" />
    <ellipse cx="13.5" cy="5.5" rx="2" ry="2.5" />
    <ellipse cx="4" cy="10.5" rx="2" ry="2.5" />
    <ellipse cx="16" cy="10.5" rx="2" ry="2.5" />
    <path d="M10 9c-3 0-5.5 1.8-5.5 5 0 1.8 2 3 5.5 3s5.5-1.2 5.5-3c0-3.2-2.5-5-5.5-5z" strokeLinejoin="round" />
  </svg>
);
const MoreIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="4" cy="10" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="10" cy="10" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="16" cy="10" r="1.2" fill="currentColor" stroke="none" />
  </svg>
);

// ── Drawer icons ──────────────────────────────────────────────────────────────

const CalIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
    <rect x="1.5" y="3" width="13" height="11.5" rx="1.5" />
    <path d="M1.5 6.5h13M5 1.5v3M11 1.5v3" strokeLinecap="round" />
  </svg>
);
const HabitIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
    <circle cx="8" cy="8" r="6.5" />
    <path d="M5 8l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const PeopleIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
    <circle cx="6" cy="5" r="2.5" />
    <path d="M1 13.5c0-2.5 2.2-4.5 5-4.5s5 2 5 4.5" strokeLinecap="round" />
    <circle cx="12" cy="5.5" r="2" />
    <path d="M14.5 13c0-2-1.5-3.5-3.5-4" strokeLinecap="round" />
  </svg>
);
const WrenchIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
    <path d="M10.5 2a3.5 3.5 0 0 1 0 7 3.5 3.5 0 0 1-3.3-2.3L2.5 11.5a1.5 1.5 0 1 0 2 2l4.8-4.7A3.5 3.5 0 0 1 10.5 2z" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const CarIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
    <path d="M2 9.5l1.5-4h9l1.5 4" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="1.5" y="9.5" width="13" height="4" rx="1" />
    <circle cx="4.5" cy="13.5" r="1" fill="currentColor" stroke="none" />
    <circle cx="11.5" cy="13.5" r="1" fill="currentColor" stroke="none" />
  </svg>
);
const RulerIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
    <rect x="1" y="5.5" width="14" height="5" rx="1" />
    <path d="M4 5.5v2M7 5.5v3M10 5.5v2M13 5.5v2" strokeLinecap="round" />
  </svg>
);
const ReceiptIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
    <path d="M3 1.5h10v13l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5V1.5z" strokeLinejoin="round" />
    <path d="M5.5 5.5h5M5.5 8h5M5.5 10.5h3" strokeLinecap="round" />
  </svg>
);
const RunIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
    <circle cx="10" cy="3" r="1.2" fill="currentColor" stroke="none" />
    <path d="M7 5.5l2-1.5 1.5 2-2 2.5H11l1.5 4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M7 5.5L5 8l1.5 1.5M6.5 9.5L5 13" strokeLinecap="round" />
  </svg>
);
const BookIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
    <path d="M3 2h7l3 3v9H3V2z" strokeLinejoin="round" />
    <path d="M10 2v3h3" strokeLinejoin="round" />
    <path d="M5.5 7h5M5.5 9.5h5M5.5 12h3" strokeLinecap="round" />
  </svg>
);
const GiftIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
    <rect x="1.5" y="6" width="13" height="8.5" rx="1" />
    <rect x="3" y="3.5" width="10" height="2.5" rx="1" />
    <path d="M8 3.5V14.5" />
    <path d="M8 3.5c0 0-1-3 1.5-2S8 3.5 8 3.5zM8 3.5c0 0 1-3-1.5-2S8 3.5 8 3.5z" />
  </svg>
);
const StarIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
    <path d="M8 1.5l1.8 3.6 4 .6-2.9 2.8.7 4-3.6-1.9-3.6 1.9.7-4L2.2 5.7l4-.6L8 1.5z" strokeLinejoin="round" />
  </svg>
);
const PlanIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
    <path d="M2 12l4-4 3 3 5-6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const BasketballIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
    <circle cx="8" cy="8" r="6.5" />
    <path d="M1.5 8h13M8 1.5v13" />
    <path d="M3 3.5c1.5 1 2 2.5 2 4.5s-.5 3.5-2 4.5M13 3.5c-1.5 1-2 2.5-2 4.5s.5 3.5 2 4.5" />
  </svg>
);

// ── Nav structure ─────────────────────────────────────────────────────────────

type DrawerLink = { href: string; label: string; icon: React.ReactNode };
type DrawerGroup = { label: string; links: DrawerLink[] };

const DRAWER_GROUPS: DrawerGroup[] = [
  {
    label: "Productivity",
    links: [
      { href: "/contacts",  label: "Contacts & Friends", icon: <PeopleIcon /> },
      { href: "/calendar",  label: "Calendar",            icon: <CalIcon /> },
      { href: "/habits",    label: "Habits",              icon: <HabitIcon /> },
      { href: "/todos",     label: "Tasks",               icon: <HabitIcon /> },
    ],
  },
  {
    label: "Home",
    links: [
      { href: "/garage",       label: "Garage",       icon: <CarIcon /> },
      { href: "/maintenance",  label: "Maintenance",  icon: <WrenchIcon /> },
      { href: "/measurements", label: "Measurements", icon: <RulerIcon /> },
    ],
  },
  {
    label: "Finances",
    links: [
      { href: "/subscriptions", label: "Subscriptions", icon: <ReceiptIcon /> },
    ],
  },
  {
    label: "Personal",
    links: [
      { href: "/running", label: "Running", icon: <RunIcon /> },
      { href: "/school",  label: "School",  icon: <BookIcon /> },
    ],
  },
  {
    label: "Plans",
    links: [
      { href: "/festivals", label: "Festivals",      icon: <StarIcon /> },
      { href: "/vacations", label: "Vacations",      icon: <PlanIcon /> },
      { href: "/holidays",  label: "Holidays",       icon: <GiftIcon /> },
      { href: "/magic",     label: "Orlando Magic",  icon: <BasketballIcon /> },
    ],
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function MobileNav() {
  const pathname  = usePathname();
  const [open, setOpen] = useState(false);

  // Close drawer on route change
  useEffect(() => { setOpen(false); }, [pathname]);

  // Close drawer on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  const isDrawerActive = DRAWER_GROUPS.flatMap(g => g.links).some(l => l.href === pathname);

  const primaryTabs = [
    { href: "/",          label: "Home",    icon: <HomeIcon /> },
    { href: "/finances",  label: "Finance", icon: <FinanceIcon /> },
    { href: "/health",    label: "Health",  icon: <HealthIcon /> },
    { href: "/dogs",      label: "Dogs",    icon: <DogsIcon /> },
  ];

  return (
    <>
      {/* Drawer overlay */}
      {open && (
        <div className="mobile-drawer-overlay" onClick={() => setOpen(false)} />
      )}

      {/* Slide-up drawer */}
      {open && (
        <div className="mobile-drawer">
          <div className="mobile-drawer-handle" />
          {DRAWER_GROUPS.map(group => (
            <div key={group.label} className="mobile-drawer-group">
              <span className="mobile-drawer-group-label">{group.label}</span>
              {group.links.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`mobile-drawer-link${pathname === link.href ? " active" : ""}`}
                >
                  {link.icon}
                  {link.label}
                </Link>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Bottom tab bar */}
      <nav className="mobile-nav">
        {primaryTabs.map(tab => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`mobile-nav-tab${pathname === tab.href ? " active" : ""}`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </Link>
        ))}

        {/* More tab */}
        <button
          className={`mobile-nav-tab${isDrawerActive || open ? " active" : ""}`}
          onClick={() => setOpen(v => !v)}
          aria-label="More sections"
        >
          <MoreIcon />
          <span>More</span>
        </button>
      </nav>
    </>
  );
}
