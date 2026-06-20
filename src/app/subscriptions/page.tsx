"use client";

import { useEffect, useState, useCallback, useRef } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

type BillingCycle = "monthly" | "annual" | "weekly" | "quarterly";

type Subscription = {
  id: string;
  name: string;
  cost: number;
  cycle: BillingCycle;
  category: string;
  renewalDate: string;
  notes: string;
  active: boolean;
};

type SubsData  = { subscriptions: Subscription[] };

// Minimal types needed to sync subscriptions → finances items
type FinSchedule =
  | { type: "monthly";   dayOfMonth: number }
  | { type: "weekly";    dayOfWeek: number }
  | { type: "yearly";    month: number; day: number }
  | { type: "quarterly"; anchorDate: string }
  | { type: "biweekly";  anchorDate: string }
  | { type: "once";      date: string };
type FinItem = { id: string; name: string; amount: number; schedule: FinSchedule; category: string; active: boolean };
type FinData  = { currentBalance: number | null; items: FinItem[]; transactions: unknown[]; overrides: unknown[] };

type DashData  = { subscriptions?: SubsData; finances?: FinData; [key: string]: unknown };
type SaveStatus = "idle" | "saving" | "saved" | "error";

function subToFinItem(s: Subscription): FinItem {
  const d = s.renewalDate ? new Date(s.renewalDate + "T00:00:00") : null;
  const dom = d ? d.getDate() : 1;
  const dow = d ? d.getDay()  : 0;
  const month = d ? d.getMonth() + 1 : 1;
  let schedule: FinSchedule;
  switch (s.cycle) {
    case "monthly":   schedule = { type: "monthly",   dayOfMonth: dom }; break;
    case "annual":    schedule = { type: "yearly",    month, day: dom }; break;
    case "weekly":    schedule = { type: "weekly",    dayOfWeek: dow }; break;
    case "quarterly": schedule = { type: "quarterly", anchorDate: s.renewalDate || new Date().toISOString().slice(0,10) }; break;
  }
  return { id: `sub_${s.id}`, name: s.name, amount: -s.cost, schedule, category: "Subscriptions", active: s.active };
}

const CATEGORIES = ["Streaming", "Music", "Software", "Gaming", "News", "Fitness", "Cloud", "Other"];

const CYCLE_LABEL: Record<BillingCycle, string> = {
  monthly: "/ mo", annual: "/ yr", weekly: "/ wk", quarterly: "/ qtr"
};

// Monthly equivalent for totals
function toMonthly(cost: number, cycle: BillingCycle): number {
  switch (cycle) {
    case "monthly":   return cost;
    case "annual":    return cost / 12;
    case "weekly":    return cost * 4.33;
    case "quarterly": return cost / 3;
  }
}

function fmtDate(s: string) {
  if (!s) return "—";
  return new Date(s + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function daysUntil(s: string) {
  if (!s) return null;
  return Math.round((new Date(s + "T00:00:00").getTime() - Date.now()) / 86400000);
}

function blank(): Omit<Subscription, "id"> {
  return { name: "", cost: 0, cycle: "monthly", category: "Streaming", renewalDate: "", notes: "", active: true };
}

// ── Icons ─────────────────────────────────────────────────────────────────────

const XIcon = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M2 2l9 9M11 2l-9 9" strokeLinecap="round" />
  </svg>
);
const PencilIcon = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.4">
    <path d="M9 2l2 2-7 7H2v-2L9 2z" strokeLinejoin="round" />
  </svg>
);

// ── Form ──────────────────────────────────────────────────────────────────────

function SubForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: Omit<Subscription, "id">;
  onSave: (s: Omit<Subscription, "id">) => void;
  onCancel: () => void;
}) {
  const [v, setV] = useState(initial);
  const f = <K extends keyof typeof v>(k: K, val: typeof v[K]) => setV(x => ({ ...x, [k]: val }));

  return (
    <div style={{ background: "var(--surface-raised)", borderRadius: "8px", padding: "14px", marginBottom: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        <div style={{ flex: "2 1 160px" }}>
          <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "3px" }}>Name</label>
          <input className="input" placeholder="Netflix, Spotify…" value={v.name} autoFocus onChange={e => f("name", e.target.value)} />
        </div>
        <div style={{ flex: "1 1 90px" }}>
          <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "3px" }}>Cost ($)</label>
          <input className="input" type="number" step="0.01" min="0" placeholder="0.00" value={v.cost || ""} onChange={e => f("cost", parseFloat(e.target.value) || 0)} />
        </div>
        <div style={{ flex: "1 1 100px" }}>
          <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "3px" }}>Billing</label>
          <select className="input" value={v.cycle} onChange={e => f("cycle", e.target.value as BillingCycle)}>
            <option value="monthly">Monthly</option>
            <option value="annual">Annual</option>
            <option value="quarterly">Quarterly</option>
            <option value="weekly">Weekly</option>
          </select>
        </div>
        <div style={{ flex: "1 1 110px" }}>
          <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "3px" }}>Category</label>
          <select className="input" value={v.category} onChange={e => f("category", e.target.value)}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div style={{ flex: "1 1 130px" }}>
          <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "3px" }}>Renewal date</label>
          <input className="input" type="date" value={v.renewalDate} onChange={e => f("renewalDate", e.target.value)} />
        </div>
      </div>
      <input className="input" placeholder="Notes (optional)" value={v.notes} onChange={e => f("notes", e.target.value)}
        onKeyDown={e => e.key === "Enter" && v.name.trim() && onSave(v)} />
      <div style={{ display: "flex", gap: "8px" }}>
        <button className="btn btn-primary" onClick={() => v.name.trim() && onSave(v)}>Save</button>
        <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SubscriptionsPage() {
  const [rawData, setRawData] = useState<DashData>({});
  const [subs,    setSubs]    = useState<Subscription[]>([]);
  const [status,  setStatus]  = useState<SaveStatus>("idle");
  const [loading, setLoading] = useState(true);
  const [adding,  setAdding]  = useState(false);
  const [editId,  setEditId]  = useState<string | null>(null);
  const [filter,  setFilter]  = useState<string>("All");
  const [showInactive, setShowInactive] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/api/data")
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(res => {
        const d: DashData = res.data ?? {};
        setRawData(d);
        setSubs(d.subscriptions?.subscriptions ?? []);
      })
      .catch(() => setStatus("error"))
      .finally(() => setLoading(false));
  }, []);

  const save = useCallback(async (updated: Subscription[]) => {
    setStatus("saving");
    if (timer.current) clearTimeout(timer.current);
    // Sync active subscriptions into finances items (sub_ prefix)
    const existingFin = rawData.finances as FinData | undefined;
    const nonSubItems = (existingFin?.items ?? []).filter((it: FinItem) => !it.id.startsWith("sub_"));
    const subItems = updated.filter(s => s.active).map(subToFinItem);
    const newFin: FinData | undefined = existingFin
      ? { ...existingFin, items: [...nonSubItems, ...subItems] }
      : undefined;
    const newData: DashData = { ...rawData, subscriptions: { subscriptions: updated }, ...(newFin ? { finances: newFin } : {}) };
    setRawData(newData);
    try {
      const res = await fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data: newData }) });
      if (!res.ok) throw new Error();
      setStatus("saved");
    } catch { setStatus("error"); }
    finally { timer.current = setTimeout(() => setStatus("idle"), 2000); }
  }, [rawData]);

  const addSub = (data: Omit<Subscription, "id">) => {
    const next = [...subs, { ...data, id: crypto.randomUUID() }];
    setSubs(next); setAdding(false); save(next);
  };

  const updateSub = (id: string, data: Omit<Subscription, "id">) => {
    const next = subs.map(s => s.id === id ? { ...data, id } : s);
    setSubs(next); setEditId(null); save(next);
  };

  const toggleActive = (id: string) => {
    const next = subs.map(s => s.id === id ? { ...s, active: !s.active } : s);
    setSubs(next); save(next);
  };

  const deleteSub = (id: string) => {
    const next = subs.filter(s => s.id !== id);
    setSubs(next); save(next);
  };

  if (loading) return <p className="empty" style={{ padding: "32px 0" }}>Loading…</p>;

  const activeSubs = subs.filter(s => s.active);
  const totalMonthly = activeSubs.reduce((sum, s) => sum + toMonthly(s.cost, s.cycle), 0);
  const totalAnnual  = totalMonthly * 12;

  const categories = ["All", ...Array.from(new Set(subs.map(s => s.category))).sort()];
  const visible = subs
    .filter(s => showInactive ? true : s.active)
    .filter(s => filter === "All" || s.category === filter)
    .sort((a, b) => a.name.localeCompare(b.name));

  const renewingSoon = activeSubs
    .filter(s => { const d = daysUntil(s.renewalDate); return d !== null && d >= 0 && d <= 14; })
    .sort((a, b) => (daysUntil(a.renewalDate) ?? 999) - (daysUntil(b.renewalDate) ?? 999));

  return (
    <div style={{ maxWidth: "860px" }}>
      {status !== "idle" && (
        <div className={`toast${status === "error" ? " error" : ""}`}>
          {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : "Could not save — check connection."}
        </div>
      )}

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "16px" }}>
        <div className="card">
          <p style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 6px" }}>Monthly</p>
          <p style={{ fontSize: "24px", fontWeight: 700, margin: 0, fontVariantNumeric: "tabular-nums" }}>${totalMonthly.toFixed(2)}</p>
        </div>
        <div className="card">
          <p style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 6px" }}>Annual</p>
          <p style={{ fontSize: "24px", fontWeight: 700, margin: 0, fontVariantNumeric: "tabular-nums" }}>${totalAnnual.toFixed(0)}</p>
        </div>
        <div className="card">
          <p style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 6px" }}>Active</p>
          <p style={{ fontSize: "24px", fontWeight: 700, margin: 0 }}>{activeSubs.length}</p>
        </div>
      </div>

      {/* Renewing soon banner */}
      {renewingSoon.length > 0 && (
        <div style={{ background: "var(--yellow-dim)", borderRadius: "8px", padding: "10px 14px", marginBottom: "16px", display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--yellow)" }}>Renewing soon</span>
          {renewingSoon.map(s => {
            const d = daysUntil(s.renewalDate)!;
            return (
              <span key={s.id} style={{ fontSize: "12px", color: "var(--text-2)" }}>
                {s.name} <span style={{ color: "var(--yellow)", fontWeight: 600 }}>in {d}d</span>
              </span>
            );
          })}
        </div>
      )}

      {/* Toolbar */}
      <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "12px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: "4px", flex: 1, flexWrap: "wrap" }}>
          {categories.map(c => (
            <button key={c} onClick={() => setFilter(c)}
              className={filter === c ? "btn btn-primary" : "btn btn-secondary"}
              style={{ fontSize: "12px", padding: "4px 10px" }}>
              {c}
            </button>
          ))}
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12.5px", color: "var(--text-3)", cursor: "pointer", userSelect: "none" }}>
          <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} />
          Show paused
        </label>
        <button className="btn btn-primary" onClick={() => { setAdding(true); setEditId(null); }} style={{ fontSize: "13px", padding: "6px 14px" }}>
          + Add
        </button>
      </div>

      {/* Add form */}
      {adding && <SubForm initial={blank()} onSave={addSub} onCancel={() => setAdding(false)} />}

      {/* List */}
      {visible.length === 0 ? (
        <div className="card"><p className="empty">No subscriptions yet. Add one above.</p></div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {visible.map((s, i) => {
            const days = daysUntil(s.renewalDate);
            const soon = days !== null && days >= 0 && days <= 14;
            const overdue = days !== null && days < 0;

            if (editId === s.id) {
              return (
                <div key={s.id} style={{ padding: "12px" }}>
                  <SubForm
                    initial={{ name: s.name, cost: s.cost, cycle: s.cycle, category: s.category, renewalDate: s.renewalDate, notes: s.notes, active: s.active }}
                    onSave={data => updateSub(s.id, data)}
                    onCancel={() => setEditId(null)}
                  />
                </div>
              );
            }

            return (
              <div key={s.id}
                style={{ display: "flex", alignItems: "center", gap: "12px", padding: "11px 16px", borderTop: i === 0 ? "none" : "1px solid var(--border)", opacity: s.active ? 1 : 0.45 }}
                onMouseEnter={e => e.currentTarget.querySelectorAll<HTMLElement>(".row-action").forEach(el => el.style.opacity = "1")}
                onMouseLeave={e => e.currentTarget.querySelectorAll<HTMLElement>(".row-action").forEach(el => el.style.opacity = "0")}>

                {/* Active toggle */}
                <input type="checkbox" checked={s.active} onChange={() => toggleActive(s.id)}
                  title={s.active ? "Mark as paused" : "Mark as active"} style={{ cursor: "pointer", flexShrink: 0 }} />

                {/* Name + category */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--text)" }}>{s.name}</span>
                    <span style={{ fontSize: "10.5px", fontWeight: 600, padding: "1px 7px", borderRadius: "99px", background: "var(--surface-raised)", color: "var(--text-3)" }}>{s.category}</span>
                  </div>
                  {s.notes && <div style={{ fontSize: "11.5px", color: "var(--text-3)", marginTop: "2px" }}>{s.notes}</div>}
                </div>

                {/* Renewal date */}
                <div style={{ textAlign: "right", minWidth: "100px" }}>
                  {s.renewalDate ? (
                    <>
                      <div style={{ fontSize: "12px", color: "var(--text-3)" }}>{fmtDate(s.renewalDate)}</div>
                      {(soon || overdue) && (
                        <div style={{ fontSize: "11px", fontWeight: 600, color: overdue ? "var(--red)" : "var(--yellow)" }}>
                          {overdue ? `${Math.abs(days!)}d overdue` : `in ${days}d`}
                        </div>
                      )}
                    </>
                  ) : <span style={{ fontSize: "12px", color: "var(--text-3)" }}>—</span>}
                </div>

                {/* Cost */}
                <div style={{ textAlign: "right", minWidth: "80px" }}>
                  <span style={{ fontSize: "14px", fontWeight: 700, fontVariantNumeric: "tabular-nums", color: "var(--text)" }}>
                    ${s.cost.toFixed(2)}
                  </span>
                  <span style={{ fontSize: "11px", color: "var(--text-3)", marginLeft: "3px" }}>{CYCLE_LABEL[s.cycle]}</span>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: "4px" }}>
                  <button className="btn-icon row-action" style={{ opacity: 0 }} onClick={() => { setEditId(s.id); setAdding(false); }}><PencilIcon /></button>
                  <button className="btn-icon row-action" style={{ opacity: 0 }} onClick={() => deleteSub(s.id)}><XIcon /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
