"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { fmt$, OT, otNetForHours } from "@/lib/finances";

type SaveStatus = "idle" | "saving" | "saved" | "error";

type Goal = {
  id: string;
  name: string;
  target: number;
  current: number;
  priority: number;      // lower = higher priority
  targetDate?: string;
  note?: string;
};

type OverdueItem = { id: string; name: string; amount: number; note?: string };

type Mortgage = {
  amountBehind: number;
  monthlyShortfall: number;
  nickContribution: number;   // per month
  herContribution: number;    // per month
  paid: number;               // caught up so far
  targetDate?: string;
  note?: string;
};

type GoalsPlan = { goals: Goal[]; overdue: OverdueItem[]; mortgage: Mortgage };

type DashData = { goalsPlan?: GoalsPlan; [key: string]: unknown };

// Seeded from the confirmed financial handoff (§8–§10). Current balances start
// at 0 — enter your real saved amounts; those live in your savings accounts and
// aren't visible to the app yet.
function seedPlan(): GoalsPlan {
  return {
    goals: [
      { id: "g_buffer",     name: "Checking buffer",              target: 1500,     current: 0, priority: 1, note: "Everyday floor (BoA checking)" },
      { id: "g_bills_ahead",name: "Bills-Ahead Fund",             target: 12939.06, current: 0, priority: 2, note: "6 months of bills so autopay never fails — TOP PRIORITY (Ally HYSA)" },
      { id: "g_ac",         name: "AC unit",                      target: 15000,    current: 0, priority: 3, note: "Portable ACs now. Dogs need a constant 76–78°F — welfare, not comfort." },
      { id: "g_water",      name: "Water heater",                 target: 1800,     current: 0, priority: 4, note: "Home repair fund" },
      { id: "g_independence",name: "Emergency / Independence Fund",target: 40000,   current: 0, priority: 5, note: "2-year runway (~$1,664/mo bare-bones)" },
      { id: "g_rav4",       name: "RAV4 (down + mods)",           target: 5000,     current: 0, priority: 6, note: "Gated on credit ≥ 700" },
      { id: "g_baby",       name: "Baby (first year)",            target: 16000,    current: 0, priority: 7, targetDate: "2027-06-01", note: "Readiness mid-2027+; no childcare (WFH)" },
    ],
    overdue: [
      { id: "o_ouc", name: "OUC electric past due", amount: 288, note: "Due now — paying 8/14" },
    ],
    mortgage: {
      amountBehind: 1860, monthlyShortfall: 560, nickContribution: 0, herContribution: 0, paid: 0,
      note: "House & mortgage are in Nick's name only; you pay no rent. Your stated position: not putting 401(k)/savings toward the arrears — Nick to pursue loss mitigation. Adjust only if you choose to.",
    },
  };
}

// Net $/month from a steady OT level (hrs per week, both checks).
function otMonthly(hrsPerWeek: number): number {
  return otNetForHours(hrsPerWeek * OT.weeksPerPeriod) * 2;
}

function InlineNum({ value, onSave, prefix = "$", width = 90 }: { value: number; onSave: (n: number) => void; prefix?: string; width?: number }) {
  const [editing, setEditing] = useState(false);
  const [raw, setRaw] = useState(String(value));
  if (!editing) {
    return (
      <button onClick={() => { setRaw(String(value)); setEditing(true); }}
        style={{ background: "none", border: "none", color: "var(--text)", fontSize: "14px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", fontVariantNumeric: "tabular-nums", padding: "2px 4px", borderRadius: "4px" }}
        title="Click to edit">{prefix}{value.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</button>
    );
  }
  const commit = () => { const n = parseFloat(raw.replace(/[,$]/g, "")); if (!isNaN(n)) onSave(n); setEditing(false); };
  return (
    <input autoFocus type="number" step="0.01" value={raw} onChange={e => setRaw(e.target.value)}
      onBlur={commit} onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }}
      style={{ width, background: "var(--surface-overlay)", border: "1px solid var(--accent)", borderRadius: "4px", color: "var(--text)", fontSize: "13px", padding: "3px 6px", fontFamily: "inherit", outline: "none" }} />
  );
}

export default function GoalsPage() {
  const [plan, setPlan] = useState<GoalsPlan>(seedPlan());
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const rawRef = useRef<DashData>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [otLevel, setOtLevel] = useState(0); // hrs/wk for the acceleration view

  useEffect(() => {
    fetch("/api/data")
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(res => {
        const d: DashData = res.data ?? {};
        rawRef.current = d;
        if (d.goalsPlan) {
          const seeded = seedPlan();
          setPlan({
            goals: d.goalsPlan.goals?.length ? d.goalsPlan.goals : seeded.goals,
            overdue: d.goalsPlan.overdue ?? seeded.overdue,
            mortgage: { ...seeded.mortgage, ...d.goalsPlan.mortgage },
          });
        }
      })
      .catch(() => setStatus("error"))
      .finally(() => setLoading(false));
  }, []);

  const save = useCallback(async (next: GoalsPlan) => {
    setStatus("saving");
    if (timer.current) clearTimeout(timer.current);
    const newData = { ...rawRef.current, goalsPlan: next };
    rawRef.current = newData;
    try {
      const res = await fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data: newData }) });
      if (!res.ok) throw new Error();
      setStatus("saved");
    } catch { setStatus("error"); }
    finally { timer.current = setTimeout(() => setStatus("idle"), 2000); }
  }, []);

  const update = (next: GoalsPlan) => { setPlan(next); save(next); };

  const setGoal = (id: string, patch: Partial<Goal>) =>
    update({ ...plan, goals: plan.goals.map(g => g.id === id ? { ...g, ...patch } : g) });
  const addGoal = () =>
    update({ ...plan, goals: [...plan.goals, { id: crypto.randomUUID(), name: "New goal", target: 0, current: 0, priority: (Math.max(0, ...plan.goals.map(g => g.priority)) + 1) }] });
  const delGoal = (id: string) => update({ ...plan, goals: plan.goals.filter(g => g.id !== id) });

  const setOverdue = (id: string, patch: Partial<OverdueItem>) =>
    update({ ...plan, overdue: plan.overdue.map(o => o.id === id ? { ...o, ...patch } : o) });
  const addOverdue = () =>
    update({ ...plan, overdue: [...plan.overdue, { id: crypto.randomUUID(), name: "New overdue item", amount: 0 }] });
  const delOverdue = (id: string) => update({ ...plan, overdue: plan.overdue.filter(o => o.id !== id) });

  const setMortgage = (patch: Partial<Mortgage>) => update({ ...plan, mortgage: { ...plan.mortgage, ...patch } });

  const sortedGoals = useMemo(() => [...plan.goals].sort((a, b) => a.priority - b.priority), [plan.goals]);
  const totalTarget = plan.goals.reduce((s, g) => s + g.target, 0);
  const totalCurrent = plan.goals.reduce((s, g) => s + g.current, 0);
  const totalRemaining = Math.max(0, totalTarget - totalCurrent);
  const overdueTotal = plan.overdue.reduce((s, o) => s + o.amount, 0);
  const mortgageRemaining = Math.max(0, plan.mortgage.amountBehind - plan.mortgage.paid);
  const otAddedMonthly = otMonthly(otLevel);

  if (loading) return <p className="empty" style={{ padding: "32px 0" }}>Loading…</p>;

  return (
    <div style={{ maxWidth: "900px" }}>
      {status !== "idle" && (
        <div className={`toast${status === "error" ? " error" : ""}`}>
          {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : "Could not save — check connection."}
        </div>
      )}

      <div style={{ marginBottom: "16px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 700, margin: "0 0 4px" }}>Goals &amp; Catch-Up</h1>
        <p style={{ fontSize: "13px", color: "var(--text-3)", margin: 0 }}>
          Security first. What&apos;s overdue, what&apos;s behind, and what you&apos;re saving toward — competing for the same money. Click any amount to edit.
        </p>
      </div>

      {/* ── Overdue / Catch-Up ── */}
      <div className="card" style={{ marginBottom: "16px", borderLeft: "3px solid var(--red)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
          <p className="card-title" style={{ margin: 0, color: "var(--red)" }}>⚠ Overdue / Catch-Up</p>
          <button className="btn btn-secondary" style={{ fontSize: "11px", padding: "3px 10px" }} onClick={addOverdue}>+ Add</button>
        </div>
        {plan.overdue.map(o => (
          <div key={o.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "6px 0", borderTop: "1px solid var(--border)" }}>
            <input value={o.name} onChange={e => setOverdue(o.id, { name: e.target.value })}
              style={{ flex: 1, background: "none", border: "none", color: "var(--text)", fontSize: "13.5px", fontFamily: "inherit", outline: "none" }} />
            {o.note && <span style={{ fontSize: "11px", color: "var(--yellow)" }}>{o.note}</span>}
            <InlineNum value={o.amount} onSave={n => setOverdue(o.id, { amount: n })} />
            <button className="btn-icon" style={{ opacity: 0.5 }} onClick={() => delOverdue(o.id)} title="Remove">✕</button>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "10px", paddingTop: "10px", borderTop: "1px solid var(--border)", fontSize: "13px" }}>
          <span style={{ color: "var(--text-3)" }}>BNPL ($1,730.09) is tracked in Bills &amp; Budget and flows through cash flow already.</span>
          <span style={{ fontWeight: 700, color: "var(--red)" }}>Catch-up now: {fmt$(overdueTotal)}</span>
        </div>
      </div>

      {/* ── Mortgage catch-up ── */}
      <div className="card" style={{ marginBottom: "16px", borderLeft: "3px solid var(--yellow)" }}>
        <p className="card-title" style={{ marginBottom: "10px" }}>🏠 Mortgage Catch-Up (Nick)</p>
        <div style={{ display: "flex", gap: "24px", flexWrap: "wrap", marginBottom: "10px" }}>
          <div><div style={{ fontSize: "11px", color: "var(--text-3)" }}>Behind</div><InlineNum value={plan.mortgage.amountBehind} onSave={n => setMortgage({ amountBehind: n })} /></div>
          <div><div style={{ fontSize: "11px", color: "var(--text-3)" }}>Monthly shortfall</div><InlineNum value={plan.mortgage.monthlyShortfall} onSave={n => setMortgage({ monthlyShortfall: n })} /></div>
          <div><div style={{ fontSize: "11px", color: "var(--text-3)" }}>Nick / mo</div><InlineNum value={plan.mortgage.nickContribution} onSave={n => setMortgage({ nickContribution: n })} /></div>
          <div><div style={{ fontSize: "11px", color: "var(--accent-text)" }}>You / mo</div><InlineNum value={plan.mortgage.herContribution} onSave={n => setMortgage({ herContribution: n })} /></div>
          <div><div style={{ fontSize: "11px", color: "var(--text-3)" }}>Caught up so far</div><InlineNum value={plan.mortgage.paid} onSave={n => setMortgage({ paid: n })} /></div>
          <div><div style={{ fontSize: "11px", color: "var(--text-3)" }}>Remaining</div><span style={{ fontSize: "14px", fontWeight: 700, color: "var(--yellow)" }}>{fmt$(mortgageRemaining)}</span></div>
        </div>
        <ProgressBar current={plan.mortgage.paid} target={plan.mortgage.amountBehind} />
        {(plan.mortgage.nickContribution + plan.mortgage.herContribution) > 0 && (
          <p style={{ fontSize: "12px", color: "var(--text-2)", margin: "8px 0 0" }}>
            At {fmt$(plan.mortgage.nickContribution + plan.mortgage.herContribution)}/mo combined → caught up in ~{Math.ceil(mortgageRemaining / Math.max(1, plan.mortgage.nickContribution + plan.mortgage.herContribution))} months.
            {plan.mortgage.herContribution > 0 && <span style={{ color: "var(--accent-text)" }}> Your {fmt$(plan.mortgage.herContribution)}/mo is {fmt$(plan.mortgage.herContribution)} that isn&apos;t going to your top goal.</span>}
          </p>
        )}
        {plan.mortgage.note && <p style={{ fontSize: "11.5px", color: "var(--text-3)", margin: "8px 0 0", lineHeight: 1.5 }}>{plan.mortgage.note}</p>}
      </div>

      {/* ── OT acceleration control ── */}
      <div className="card" style={{ marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "13px", color: "var(--text-3)" }}>See goals with overtime:</span>
          {[0, 5, 10, 15].map(h => (
            <button key={h} onClick={() => setOtLevel(h)} style={{
              padding: "4px 12px", borderRadius: "5px", fontFamily: "inherit", fontSize: "12px", fontWeight: 500, cursor: "pointer",
              border: "1px solid var(--border)", background: otLevel === h ? "var(--accent-dim)" : "transparent",
              color: otLevel === h ? "var(--accent-text)" : "var(--text-3)",
            }}>{h === 0 ? "None" : `${h} hrs/wk`}</button>
          ))}
          {otLevel > 0 && <span style={{ fontSize: "13px", color: "var(--green)", fontWeight: 600 }}>+{fmt$(otAddedMonthly)}/mo toward goals</span>}
        </div>
      </div>

      {/* ── Summary ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px", marginBottom: "16px" }}>
        <SummaryTile label="Goal targets" value={fmt$(totalTarget)} />
        <SummaryTile label="Saved" value={fmt$(totalCurrent)} color="var(--green)" />
        <SummaryTile label="Remaining" value={fmt$(totalRemaining)} color="var(--yellow)" />
      </div>

      {/* ── Goals ── */}
      <div className="card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
          <p className="card-title" style={{ margin: 0 }}>Goals by priority</p>
          <button className="btn btn-secondary" style={{ fontSize: "11px", padding: "3px 10px" }} onClick={addGoal}>+ Add goal</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {sortedGoals.map(g => {
            const remaining = Math.max(0, g.target - g.current);
            const funded = g.current >= g.target && g.target > 0;
            const otHours = remaining / OT.otHourlyNet;
            const monthsAtOt = otLevel > 0 && remaining > 0 ? Math.ceil(remaining / otAddedMonthly) : null;
            return (
              <div key={g.id} style={{ background: "var(--surface-raised)", borderRadius: "8px", padding: "12px", border: "1px solid var(--border)" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", marginBottom: "8px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--accent-text)", background: "var(--accent-dim)", borderRadius: "4px", padding: "2px 7px", flexShrink: 0 }}>#
                    <input type="number" value={g.priority} onChange={e => setGoal(g.id, { priority: parseInt(e.target.value) || 0 })}
                      style={{ width: "26px", background: "none", border: "none", color: "var(--accent-text)", fontSize: "11px", fontWeight: 700, fontFamily: "inherit", outline: "none" }} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <input value={g.name} onChange={e => setGoal(g.id, { name: e.target.value })}
                      style={{ width: "100%", background: "none", border: "none", color: "var(--text)", fontSize: "14.5px", fontWeight: 600, fontFamily: "inherit", outline: "none" }} />
                    {g.note && <div style={{ fontSize: "11.5px", color: "var(--text-3)", marginTop: "2px" }}>{g.note}</div>}
                  </div>
                  {funded && <span style={{ fontSize: "10.5px", fontWeight: 700, color: "var(--green)", background: "var(--green-dim)", borderRadius: "4px", padding: "2px 7px" }}>FUNDED</span>}
                  <button className="btn-icon" style={{ opacity: 0.4 }} onClick={() => delGoal(g.id)} title="Delete goal">✕</button>
                </div>
                <div style={{ display: "flex", gap: "18px", flexWrap: "wrap", alignItems: "center", marginBottom: "8px" }}>
                  <div><span style={{ fontSize: "11px", color: "var(--text-3)" }}>Saved </span><InlineNum value={g.current} onSave={n => setGoal(g.id, { current: n })} /></div>
                  <div><span style={{ fontSize: "11px", color: "var(--text-3)" }}>Target </span><InlineNum value={g.target} onSave={n => setGoal(g.id, { target: n })} /></div>
                  <div><span style={{ fontSize: "11px", color: "var(--text-3)" }}>Left </span><span style={{ fontSize: "14px", fontWeight: 600, color: funded ? "var(--green)" : "var(--yellow)", fontVariantNumeric: "tabular-nums" }}>{fmt$(remaining)}</span></div>
                </div>
                <ProgressBar current={g.current} target={g.target} />
                {!funded && remaining > 0 && (
                  <p style={{ fontSize: "11.5px", color: "var(--text-3)", margin: "8px 0 0" }}>
                    ≈ <strong style={{ color: "var(--accent-text)" }}>{otHours.toFixed(0)} OT hours</strong> to fully fund ({(otHours / 5).toFixed(1)} of your 5-hr Saturdays)
                    {monthsAtOt != null && <span> · at {otLevel} hrs/wk OT → ~{monthsAtOt} mo</span>}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SummaryTile({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="card">
      <p style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 6px" }}>{label}</p>
      <p style={{ fontSize: "22px", fontWeight: 700, margin: 0, color: color ?? "var(--text)", fontVariantNumeric: "tabular-nums" }}>{value}</p>
    </div>
  );
}

function ProgressBar({ current, target }: { current: number; target: number }) {
  const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0;
  return (
    <div style={{ background: "var(--surface-overlay)", height: "6px", borderRadius: "3px", overflow: "hidden" }}>
      <div style={{ background: pct >= 100 ? "var(--green)" : "var(--accent)", height: "100%", width: `${pct}%`, transition: "width 0.2s" }} />
    </div>
  );
}
