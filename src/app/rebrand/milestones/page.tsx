"use client";

// ============================================================================
// /rebrand/milestones — §13. Projected weight (static from the plan) vs your
// actual logged weight nearest each date. A quiet timeline, no gamification.
// ============================================================================

import { useRebrand } from "@/lib/rebrand/useRebrand";
import { todayStr } from "@/lib/rebrand/engine";
import { MILESTONES } from "@/lib/rebrand/seed";

export default function MilestonesPage() {
  const { data, loading } = useRebrand();
  const today = todayStr();
  if (loading) return <p className="empty" style={{ padding: "32px 0" }}>Loading…</p>;
  if (!data) return <p className="empty" style={{ padding: "32px 0" }}>Could not load.</p>;

  // Closest logged weight on or before a milestone date.
  const actualAt = (date: string): number | null => {
    const onOrBefore = data.weightLog.filter((e) => e.loggedOn <= date).sort((a, b) => b.loggedOn.localeCompare(a.loggedOn))[0];
    return onOrBefore?.weightLb ?? null;
  };

  return (
    <div style={{ maxWidth: "720px" }}>
      <p style={{ fontSize: "13px", color: "var(--text-3)", margin: "0 0 20px", lineHeight: 1.5 }}>
        The projection is honest, not motivational — it decays as you get lighter. Actual is your nearest logged weigh-in. The gap between them is just information.
      </p>

      <div style={{ position: "relative" }}>
        {MILESTONES.map((m) => {
          const past = m.date < today;
          const isNext = !past && MILESTONES.filter((x) => x.date >= today)[0]?.date === m.date;
          const actual = actualAt(m.date);
          return (
            <div key={m.date} style={{ display: "flex", gap: "14px", marginBottom: "4px" }}>
              {/* Rail + dot */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                <div style={{ width: "12px", height: "12px", borderRadius: "50%", marginTop: "4px", background: isNext ? "var(--accent)" : past ? "var(--text-3)" : "var(--surface-overlay)", border: isNext ? "none" : "1px solid var(--border-strong)" }} />
                <div style={{ width: "1px", flex: 1, background: "var(--border)", minHeight: "24px" }} />
              </div>
              {/* Content */}
              <div className="card" style={{ flex: 1, marginBottom: "12px", padding: "12px 16px", opacity: past ? 0.7 : 1, borderColor: isNext ? "var(--accent)" : "var(--border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "10px", marginBottom: "3px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: isNext ? "var(--accent-text)" : "var(--text-2)" }}>
                    {new Date(m.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                  <span style={{ fontSize: "12px", color: "var(--text-3)", whiteSpace: "nowrap" }}>
                    proj <strong style={{ color: "var(--text-2)" }}>{m.projectedWeight}</strong>
                    {actual != null && <> · actual <strong style={{ color: "var(--text)" }}>{actual}</strong></>}
                  </span>
                </div>
                <div style={{ fontSize: "13px", color: "var(--text)", lineHeight: 1.45 }}>{m.title}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
