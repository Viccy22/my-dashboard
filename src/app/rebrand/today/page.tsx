"use client";

// ============================================================================
// /rebrand/today — the full daily checklist, and the only page where you tick
// things off besides the home widget. Also lets you look back at the past 7
// days read-only (spec §15: past 7 days viewable, nothing beyond editable).
// ============================================================================

import { useState } from "react";
import Link from "next/link";
import TodayView from "@/components/rebrand/TodayView";
import { useRebrand } from "@/lib/rebrand/useRebrand";
import { toDateStr, todayStr } from "@/lib/rebrand/engine";

// Build the last 8 calendar days (today + 7 back) as {value,label} options.
function recentDays(): { value: string; label: string }[] {
  const out: { value: string; label: string }[] = [];
  for (let i = 0; i < 8; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const value = toDateStr(d);
    const label = i === 0 ? "Today" : i === 1 ? "Yesterday" : d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    out.push({ value, label });
  }
  return out;
}

export default function RebrandTodayPage() {
  const { data, mutate, status, loading } = useRebrand();
  const today = todayStr();
  const [viewDate, setViewDate] = useState(today);
  const days = recentDays();
  const isPast = viewDate !== today;

  if (loading) return <p className="empty" style={{ padding: "32px 0" }}>Loading…</p>;
  if (!data) return <p className="empty" style={{ padding: "32px 0" }}>Could not load The Rebrand.</p>;

  return (
    <div style={{ maxWidth: "640px" }}>
      {status !== "idle" && (
        <div className={`toast${status === "error" ? " error" : ""}`}>
          {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : "Could not save — check connection."}
        </div>
      )}

      {/* Day switcher — today plus the last 7 days, read-only in the past */}
      <div className="mobile-scroll-x" style={{ marginBottom: "16px" }}>
        <div style={{ display: "flex", gap: "6px", paddingBottom: "2px" }}>
          {days.map((d) => (
            <button
              key={d.value}
              onClick={() => setViewDate(d.value)}
              className="btn"
              style={{
                fontSize: "12px",
                padding: "7px 12px",
                minHeight: "auto",
                whiteSpace: "nowrap",
                background: d.value === viewDate ? "var(--accent)" : "var(--surface-overlay)",
                color: d.value === viewDate ? "#fff" : "var(--text-2)",
                border: d.value === viewDate ? "none" : "1px solid var(--border)",
              }}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        {isPast && (
          <p style={{ fontSize: "12px", color: "var(--text-3)", margin: "0 0 12px" }}>
            Read-only — you can only check things off for today.
          </p>
        )}
        <TodayView data={data} onMutate={mutate} dateStr={viewDate} readOnly={isPast} />
      </div>

      <div style={{ marginTop: "16px" }}>
        <Link href="/rebrand" className="btn btn-secondary" style={{ fontSize: "13px" }}>
          ← The Rebrand hub
        </Link>
      </div>
    </div>
  );
}
