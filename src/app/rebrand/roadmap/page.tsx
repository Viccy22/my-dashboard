"use client";

// ============================================================================
// /rebrand/roadmap — §10, the paid layer. The October gate is enforced HERE in
// the UI: anything with gatedUntil in the future renders locked with its unlock
// date, and its status can't be changed yet. Cheap/reversible first, expensive/
// hard-to-undo last.
// ============================================================================

import { useRebrand } from "@/lib/rebrand/useRebrand";
import { todayStr } from "@/lib/rebrand/engine";
import type { RoadmapStatus } from "@/lib/rebrand/types";

const STATUS_LABELS: Record<RoadmapStatus, string> = {
  not_started: "Not started",
  booked: "Booked",
  done: "Done",
  decided_against: "Decided against",
};

const STATUS_COLORS: Record<RoadmapStatus, { color: string; bg: string }> = {
  not_started: { color: "var(--text-3)", bg: "var(--surface-overlay)" },
  booked: { color: "var(--yellow)", bg: "var(--yellow-dim)" },
  done: { color: "var(--green)", bg: "var(--green-dim)" },
  decided_against: { color: "var(--text-3)", bg: "var(--surface-overlay)" },
};

function LockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3">
      <rect x="2.5" y="5.5" width="7" height="5" rx="1" />
      <path d="M4 5.5V4a2 2 0 0 1 4 0v1.5" />
    </svg>
  );
}

export default function RoadmapPage() {
  const { data, mutate, status, loading } = useRebrand();
  const today = todayStr();
  if (loading) return <p className="empty" style={{ padding: "32px 0" }}>Loading…</p>;
  if (!data) return <p className="empty" style={{ padding: "32px 0" }}>Could not load.</p>;

  const items = [...data.roadmapItems].sort((a, b) => a.sortOrder - b.sortOrder);
  const setStatus = (id: string, s: RoadmapStatus) =>
    mutate({ ...data, roadmapItems: data.roadmapItems.map((r) => (r.id === id ? { ...r, status: s } : r)) });

  const fmtGate = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  return (
    <div style={{ maxWidth: "760px" }}>
      {status !== "idle" && <div className={`toast${status === "error" ? " error" : ""}`}>{status === "saving" ? "Saving…" : status === "saved" ? "Saved" : "Could not save."}</div>}

      <p style={{ fontSize: "13px", color: "var(--text-3)", margin: "0 0 18px", lineHeight: 1.5 }}>
        Nothing paid happens before October — your finances improve then. Cheap, reversible and evidence-backed first; expensive and hard-to-undo last.
      </p>

      {[1, 2, 3, 4].map((phase) => {
        const phaseItems = items.filter((i) => i.phase === phase);
        if (phaseItems.length === 0) return null;
        return (
          <div key={phase} style={{ marginBottom: "20px" }}>
            <div style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-3)", marginBottom: "8px" }}>
              Phase {phase} — {phaseItems[0].targetMonth}
            </div>
            {phaseItems.map((item) => {
              const locked = !!item.gatedUntil && item.gatedUntil > today;
              return (
                <div key={item.id} className="card" style={{ marginBottom: "10px", opacity: locked ? 0.72 : 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px", marginBottom: "6px" }}>
                    <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text)", flex: 1 }}>{item.title}</div>
                    <div style={{ fontSize: "12.5px", color: "var(--text-2)", fontWeight: 600, whiteSpace: "nowrap" }}>{item.costEstimate}</div>
                  </div>
                  <p style={{ fontSize: "12.5px", color: "var(--text-3)", margin: "0 0 10px", lineHeight: 1.5, whiteSpace: "pre-line" }}>{item.detail}</p>
                  {locked ? (
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--text-3)", background: "var(--surface-overlay)", borderRadius: "99px", padding: "4px 11px" }}>
                      <LockIcon /> Unlocks {fmtGate(item.gatedUntil!)}
                    </div>
                  ) : (
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      {(Object.keys(STATUS_LABELS) as RoadmapStatus[]).map((s) => {
                        const on = item.status === s;
                        const c = STATUS_COLORS[s];
                        return (
                          <button
                            key={s}
                            onClick={() => setStatus(item.id, s)}
                            className="btn"
                            style={{ fontSize: "12px", padding: "6px 11px", minHeight: "auto", background: on ? c.bg : "transparent", color: on ? c.color : "var(--text-3)", border: `1px solid ${on ? c.color : "var(--border)"}` }}
                          >
                            {STATUS_LABELS[s]}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}

      <div className="card" style={{ background: "var(--surface-raised)" }}>
        <p className="card-title">Monthly budget from October</p>
        <p style={{ fontSize: "12.5px", color: "var(--text-2)", margin: 0, lineHeight: 1.5 }}>
          Skin $80–150 (front-load Oct–Dec, then it drops) · hair $40–80 averaged · brows/lashes $30–45 · nails $10–15 · dental: unknown until the 10 Aug exam.
        </p>
      </div>
    </div>
  );
}
