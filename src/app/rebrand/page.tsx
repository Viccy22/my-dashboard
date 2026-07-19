"use client";

// ============================================================================
// /rebrand — the hub. Today's %, a weight sparkline, the next milestone, the
// self-trust streak, and cards to every section. NO task list here — that's
// the home widget's and /rebrand/today's job (spec §17).
// ============================================================================

import Link from "next/link";
import { useRebrand } from "@/lib/rebrand/useRebrand";
import { getTasksForDate, latestWeight, todayStr } from "@/lib/rebrand/engine";
import { nextMilestone, selfTrustStreak } from "@/lib/rebrand/queries";
import type { WeightEntry } from "@/lib/rebrand/types";

// A tiny inline sparkline of the last ~12 weight entries.
function WeightSparkline({ log }: { log: WeightEntry[] }) {
  const pts = [...log].sort((a, b) => a.loggedOn.localeCompare(b.loggedOn)).slice(-12);
  if (pts.length < 2) return <span style={{ fontSize: "12px", color: "var(--text-3)" }}>Log a few weigh-ins to see the trend.</span>;
  const w = 220, h = 40, pad = 3;
  const weights = pts.map((p) => p.weightLb);
  const min = Math.min(...weights), max = Math.max(...weights);
  const range = max - min || 1;
  const coords = pts.map((p, i) => {
    const x = pad + (i / (pts.length - 1)) * (w - pad * 2);
    const y = pad + (1 - (p.weightLb - min) / range) * (h - pad * 2);
    return `${x},${y}`;
  });
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ maxWidth: "100%" }}>
      <polyline points={coords.join(" ")} fill="none" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const CARDS: { href: string; title: string; blurb: string }[] = [
  { href: "/rebrand/home-systems", title: "Home Systems", blurb: "Daily anchors, zone rotation, the bathroom protocol, laundry & dog." },
  { href: "/rebrand/body", title: "Body", blurb: "Weight log, the honest projection curve, targets, the weekly review." },
  { href: "/rebrand/beauty", title: "Beauty", blurb: "AM/PM routines, nails, the polished checklist — honestly." },
  { href: "/rebrand/roadmap", title: "Roadmap", blurb: "The paid layer. Locked until October." },
  { href: "/rebrand/dental", title: "Dental", blurb: "Countdown to 10 Aug, the prep, what to expect." },
  { href: "/rebrand/mindset", title: "Mindset", blurb: "Mel Robbins tools, the rebrand steps, the Brand Core." },
  { href: "/rebrand/milestones", title: "Milestones", blurb: "Projected vs actual, all the way to 145." },
];

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <div style={{ fontSize: "10.5px", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-3)", marginBottom: "3px" }}>{label}</div>
      <div style={{ fontSize: "20px", fontWeight: 700, color: "var(--text)" }}>{value}</div>
      {sub && <div style={{ fontSize: "11.5px", color: "var(--text-3)", marginTop: "1px" }}>{sub}</div>}
    </div>
  );
}

export default function RebrandHubPage() {
  const { data, loading } = useRebrand();
  if (loading) return <p className="empty" style={{ padding: "32px 0" }}>Loading…</p>;
  if (!data) return <p className="empty" style={{ padding: "32px 0" }}>Could not load The Rebrand.</p>;

  const today = todayStr();
  const tasks = getTasksForDate(data.taskDefinitions, data.completions, today);
  const done = tasks.filter((t) => t.done).length;
  const pct = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0;
  const weight = latestWeight(data.weightLog);
  const milestone = nextMilestone(today);
  const streak = selfTrustStreak(data.weeklyReviews);

  return (
    <div style={{ maxWidth: "820px" }}>
      <div style={{ marginBottom: "18px" }}>
        <h1 style={{ fontSize: "20px", fontWeight: 600, margin: "0 0 3px" }}>The Rebrand</h1>
        <p style={{ fontSize: "13px", color: "var(--text-3)", margin: 0 }}>
          Starting from the beginning. Routine and structure, built around how you actually work — not willpower.
        </p>
      </div>

      {/* Stat strip */}
      <div className="card" style={{ marginBottom: "16px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "16px", marginBottom: "14px" }}>
          <Stat label="Today" value={`${pct}%`} sub={`${done} of ${tasks.length} done`} />
          <Stat label="Current weight" value={weight ? `${weight.weightLb} lb` : "—"} sub={`Goal ${data.settings.goalWeightLb} lb`} />
          <Stat
            label="Next milestone"
            value={milestone ? `${milestone.daysAway}d` : "—"}
            sub={milestone ? milestone.milestone.date : undefined}
          />
          <Stat label="Self-trust streak" value={`${streak} wk`} sub="weeks ≥ 7/10" />
        </div>
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: "12px" }}>
          <div style={{ fontSize: "10.5px", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-3)", marginBottom: "6px" }}>Weight trend</div>
          <WeightSparkline log={data.weightLog} />
        </div>
      </div>

      <Link href="/rebrand/today" className="btn btn-primary" style={{ marginBottom: "18px", fontSize: "13.5px" }}>
        Open today&apos;s checklist →
      </Link>

      {/* Section cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "12px", marginTop: "18px" }}>
        {CARDS.map((c) => (
          <Link key={c.href} href={c.href} className="card" style={{ textDecoration: "none", display: "block", transition: "border-color 0.12s" }}>
            <div style={{ fontSize: "14.5px", fontWeight: 600, color: "var(--text)", marginBottom: "4px" }}>{c.title}</div>
            <div style={{ fontSize: "12.5px", color: "var(--text-3)", lineHeight: 1.45 }}>{c.blurb}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
