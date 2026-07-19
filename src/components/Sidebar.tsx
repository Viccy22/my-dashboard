"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  built?: boolean;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

function LayoutIcon() {
  return (
    <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
      <rect x="1" y="1" width="6" height="6" rx="1" />
      <rect x="9" y="1" width="6" height="6" rx="1" />
      <rect x="1" y="9" width="6" height="6" rx="1" />
      <rect x="9" y="9" width="6" height="6" rx="1" />
    </svg>
  );
}
function CalIcon() {
  return (
    <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
      <rect x="1.5" y="3" width="13" height="11.5" rx="1.5" />
      <path d="M1.5 6.5h13" />
      <path d="M5 1.5v3M11 1.5v3" strokeLinecap="round" />
    </svg>
  );
}
function WrenchIcon() {
  return (
    <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M10.5 2a3.5 3.5 0 0 1 0 7 3.5 3.5 0 0 1-3.3-2.3L2.5 11.5a1.5 1.5 0 1 0 2 2l4.8-4.7A3.5 3.5 0 0 1 10.5 2z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function DollarIcon() {
  return (
    <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
      <circle cx="8" cy="8" r="6.5" />
      <path d="M8 4v8M6 5.5a2 2 0 0 1 4 0c0 1-1 1.5-2 2s-2 1-2 2a2 2 0 0 0 4 0" strokeLinecap="round" />
    </svg>
  );
}
function HeartIcon() {
  return (
    <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M8 13.5S1.5 9.5 1.5 5.5a3 3 0 0 1 6-0.5 3 3 0 0 1 6 0.5c0 4-6.5 8-6.5 8z" strokeLinejoin="round" />
    </svg>
  );
}
function PawIcon() {
  return (
    <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
      <ellipse cx="5" cy="4.5" rx="1.5" ry="2" />
      <ellipse cx="11" cy="4.5" rx="1.5" ry="2" />
      <ellipse cx="3" cy="8.5" rx="1.5" ry="2" />
      <ellipse cx="13" cy="8.5" rx="1.5" ry="2" />
      <path d="M8 7c-2.5 0-4.5 1.5-4.5 4 0 1.5 1.5 2.5 4.5 2.5s4.5-1 4.5-2.5C12.5 8.5 10.5 7 8 7z" strokeLinejoin="round" />
    </svg>
  );
}
function StarIcon() {
  return (
    <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M8 1.5l1.8 3.6 4 .6-2.9 2.8.7 4-3.6-1.9-3.6 1.9.7-4L2.2 5.7l4-.6L8 1.5z" strokeLinejoin="round" />
    </svg>
  );
}

function RulerIcon() {
  return (
    <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
      <rect x="1" y="5.5" width="14" height="5" rx="1" />
      <path d="M4 5.5v2M7 5.5v3M10 5.5v2M13 5.5v2" strokeLinecap="round" />
    </svg>
  );
}
function ReceiptIcon() {
  return (
    <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M3 1.5h10v13l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5V1.5z" strokeLinejoin="round" />
      <path d="M5.5 5.5h5M5.5 8h5M5.5 10.5h3" strokeLinecap="round" />
    </svg>
  );
}
function GiftIcon() {
  return (
    <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
      <rect x="1.5" y="6" width="13" height="8.5" rx="1" />
      <rect x="3" y="3.5" width="10" height="2.5" rx="1" />
      <path d="M8 3.5V14.5" />
      <path d="M8 3.5c0 0-1-3 1.5-2S8 3.5 8 3.5z" />
      <path d="M8 3.5c0 0 1-3-1.5-2S8 3.5 8 3.5z" />
    </svg>
  );
}
function PeopleIcon() {
  return (
    <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
      <circle cx="6" cy="5" r="2.5" />
      <path d="M1 13.5c0-2.5 2.2-4.5 5-4.5s5 2 5 4.5" strokeLinecap="round" />
      <circle cx="12" cy="5.5" r="2" />
      <path d="M14.5 13c0-2-1.5-3.5-3.5-4" strokeLinecap="round" />
    </svg>
  );
}
function HabitIcon() {
  return (
    <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
      <circle cx="8" cy="8" r="6.5" />
      <path d="M5 8l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function BasketballIcon() {
  return (
    <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
      <circle cx="8" cy="8" r="6.5" />
      <path d="M1.5 8h13" />
      <path d="M8 1.5v13" />
      <path d="M3 3.5c1.5 1 2 2.5 2 4.5s-.5 3.5-2 4.5" />
      <path d="M13 3.5c-1.5 1-2 2.5-2 4.5s.5 3.5 2 4.5" />
    </svg>
  );
}
function PlanIcon() {
  return (
    <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M2 12l4-4 3 3 5-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function WishlistIcon() {
  return (
    <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M8 13S2 9.5 2 5.5a3 3 0 0 1 6 0 3 3 0 0 1 6 0C14 9.5 8 13 8 13z" strokeLinejoin="round" />
    </svg>
  );
}
function DiamondIcon() {
  return (
    <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M8 2l4 4-4 8-4-8 4-4z" strokeLinejoin="round" />
      <path d="M4 6h8" strokeLinecap="round" />
    </svg>
  );
}
function HomeOpsIcon() {
  return (
    <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
      <rect x="1.5" y="2" width="13" height="12" rx="1.5" />
      <path d="M4.5 6h7M4.5 8.5h5M4.5 11h3" strokeLinecap="round" />
      <path d="M1.5 5h13" />
    </svg>
  );
}
function HomeUpgradeIcon() {
  return (
    <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M2 8.5L8 2l6 6.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 7.5v6h3v-3h2v3h3V7.5" strokeLinejoin="round" />
      <path d="M11 3.5l1.5 1.5" strokeLinecap="round" />
    </svg>
  );
}
function CarIcon() {
  return (
    <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M2 9.5l1.5-4h9l1.5 4" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="1.5" y="9.5" width="13" height="4" rx="1" />
      <circle cx="4.5" cy="13.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="11.5" cy="13.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}
function BookIcon() {
  return (
    <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M3 2h7l3 3v9H3V2z" strokeLinejoin="round" />
      <path d="M10 2v3h3" strokeLinejoin="round" />
      <path d="M5.5 7h5M5.5 9.5h5M5.5 12h3" strokeLinecap="round" />
    </svg>
  );
}
function ToothIcon() {
  return (
    <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M8 2c-1.8 0-3.2 1-3.5 2.5-.2 1-.1 2 .2 4 .2 1.5.5 3.3 1.1 4.7.3.7 1.2.7 1.5 0 .3-.8.5-1.8.7-2.7.1-.5.9-.5 1 0 .2.9.4 1.9.7 2.7.3.7 1.2.7 1.5 0 .6-1.4.9-3.2 1.1-4.7.3-2 .4-3 .2-4C11.2 3 9.8 2 8 2z" strokeLinejoin="round" />
    </svg>
  );
}
function RunIcon() {
  return (
    <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
      <circle cx="10" cy="3" r="1.2" fill="currentColor" stroke="none" />
      <path d="M7 5.5l2-1.5 1.5 2-2 2.5H11l1.5 4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 5.5L5 8l1.5 1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.5 9.5L5 13" strokeLinecap="round" />
    </svg>
  );
}
function SparkIcon() {
  return (
    <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M8 1.5l1.4 3.7L13 6.5l-3.6 1.3L8 11.5 6.6 7.8 3 6.5l3.6-1.3L8 1.5z" strokeLinejoin="round" />
      <path d="M12.5 10.5l.6 1.6 1.6.6-1.6.6-.6 1.6-.6-1.6-1.6-.6 1.6-.6.6-1.6z" strokeLinejoin="round" />
    </svg>
  );
}

const groups: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { href: "/", label: "Home", icon: <LayoutIcon />, built: true },
      { href: "/rebrand", label: "The Rebrand", icon: <SparkIcon />, built: true },
    ],
  },
  {
    label: "Productivity",
    items: [
      { href: "/contacts",  label: "Contacts & Friends",  icon: <PeopleIcon />, built: true },
      { href: "/calendar", label: "Calendar", icon: <CalIcon />,     built: true },
      { href: "/habits",   label: "Habits",   icon: <HabitIcon />,   built: true },
    ],
  },
  {
    label: "Home",
    items: [
      { href: "/garage",            label: "Garage",                    icon: <CarIcon />,          built: true },
      { href: "/maintenance",       label: "Maintenance",               icon: <WrenchIcon />,       built: true },
      { href: "/measurements",      label: "Measurements",              icon: <RulerIcon />,        built: true },
      { href: "/home-ops",          label: "Home Operations",           icon: <HomeOpsIcon />,      built: true },
      { href: "/household-planner", label: "Household Upgrade Planner", icon: <HomeUpgradeIcon />,  built: true },
    ],
  },
  {
    label: "Finances",
    items: [
      { href: "/finances",     label: "Bills & Budget",     icon: <DollarIcon />,  built: true },
      { href: "/money-plan",   label: "Money Movement Plan", icon: <PlanIcon />,    built: true },
      { href: "/subscriptions",label: "Subscriptions",      icon: <ReceiptIcon />, built: true },
      { href: "/bifl",         label: "Buy It For Life",    icon: <DiamondIcon />,  built: true },
      { href: "/wishlist",     label: "Wishlist",           icon: <WishlistIcon />, built: true },
    ],
  },
  {
    label: "Personal",
    items: [
      { href: "/health",   label: "Health & Wellness", icon: <HeartIcon />, built: true },
      { href: "/dental",   label: "Dental Health",     icon: <ToothIcon />, built: true },
      { href: "/running",  label: "Running",            icon: <RunIcon />,   built: true },
      { href: "/school",   label: "School",             icon: <BookIcon />,  built: true },
    ],
  },
  {
    label: "Pets",
    items: [
      { href: "/dogs", label: "Dogs", icon: <PawIcon />, built: true },
    ],
  },
  {
    label: "Plans",
    items: [
      { href: "/festivals", label: "Festivals",     icon: <StarIcon />,       built: true },
      { href: "/vacations",  label: "Vacations",    icon: <PlanIcon />,       built: true },
      { href: "/holidays",   label: "Holidays",     icon: <GiftIcon />,       built: true },
      { href: "/magic",      label: "Orlando Magic", icon: <BasketballIcon />, built: true },
    ],
  },
];

function XIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M4 4l10 10M14 4L4 14" />
    </svg>
  );
}

export default function Sidebar({
  isOpen,
  onClose,
}: {
  isOpen?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();

  return (
    <aside className={`sidebar${isOpen ? " sidebar--open" : ""}`}>
      <div className="sidebar-logo">
        <span>Dashboard</span>
        <button className="sidebar-close-btn" onClick={onClose} aria-label="Close menu">
          <XIcon />
        </button>
      </div>

      <nav className="sidebar-nav">
        {groups.map((group) => (
          <div key={group.label}>
            <span className="nav-group-label">{group.label}</span>
            {group.items.map((item) => {
              const active = pathname === item.href;
              const cls = ["nav-link", active ? "active" : "", !item.built ? "dim" : ""].join(" ").trim();
              return (
                <Link key={item.href} href={item.href} className={cls}>
                  {item.icon}
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
