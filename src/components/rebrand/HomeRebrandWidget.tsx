"use client";

// ============================================================================
// HomeRebrandWidget — the Today block that sits directly below the existing
// home screen (spec §16). It shows ONLY today: the five non-negotiables pinned,
// the rest by time block, an optimistic checkbox on each. It does not let you
// edit tasks, show a week, or show past days — that's other pages' jobs.
//
// Self-contained: it loads its own rebrand slice so the home page doesn't need
// to know anything about the Rebrand's data shape.
// ============================================================================

import Link from "next/link";
import TodayView from "./TodayView";
import { useRebrand } from "@/lib/rebrand/useRebrand";
import { latestWeight, todayStr } from "@/lib/rebrand/engine";
import { nextMilestone, selfTrustStreak } from "@/lib/rebrand/queries";

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ flex: 1, minWidth: 0, textAlign: "center" }}>
      <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--text)" }}>{value}</div>
      <div style={{ fontSize: "10.5px", color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
    </div>
  );
}

export default function HomeRebrandWidget() {
  const { data, mutate, status, loading } = useRebrand();

  if (loading) {
    return (
      <div className="card">
        <p className="card-title" style={{ margin: 0 }}>Today — The Rebrand</p>
        <p className="empty">Loading…</p>
      </div>
    );
  }
  if (!data) return null; // fail quiet on the home page — never crash the dashboard

  const today = todayStr();
  const weight = latestWeight(data.weightLog);
  const milestone = nextMilestone(today);
  const streak = selfTrustStreak(data.weeklyReviews);

  return (
    <div className="card">
      {status === "error" && <div className="toast error">Could not save — check connection.</div>}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
        <p className="card-title" style={{ margin: 0 }}>Today — The Rebrand</p>
        <Link href="/rebrand" style={{ fontSize: "12px", color: "var(--accent-text)", textDecoration: "none" }}>
          Open The Rebrand →
        </Link>
      </div>

      <TodayView data={data} onMutate={mutate} />

      {/* Bottom strip: three compact stats only (spec §16) */}
      <div style={{ display: "flex", gap: "8px", marginTop: "14px", paddingTop: "12px", borderTop: "1px solid var(--border)" }}>
        <MiniStat label="Weight" value={weight ? `${weight.weightLb}` : "—"} />
        <MiniStat label="Next milestone" value={milestone ? `${milestone.daysAway}d` : "—"} />
        <MiniStat label="Self-trust" value={`${streak}w`} />
      </div>
    </div>
  );
}
