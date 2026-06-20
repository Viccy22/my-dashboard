"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import Header  from "./Header";

export default function MobileShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close drawer whenever the route changes
  useEffect(() => { setOpen(false); }, [pathname]);

  // Close drawer on Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  // Lock body scroll while drawer is open (mobile only)
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else       document.body.style.overflow = "";
    return ()  => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <div className="layout-root">
      {/* Semi-transparent backdrop — only rendered when drawer is open */}
      {open && (
        <div
          className="sidebar-backdrop"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <Sidebar isOpen={open} onClose={() => setOpen(false)} />

      <div className="main-area">
        <Header onMenuOpen={() => setOpen(true)} />
        <main className="page">{children}</main>
      </div>
    </div>
  );
}
