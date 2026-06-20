"use client";

import { useEffect, useState, useCallback, useRef } from "react";

type RunType = "easy" | "tempo" | "intervals" | "long" | "race" | "walk" | "cross";
type Run = {
  id: string;
  date: string;
  type: RunType;
  distance: number;      // miles
  duration: number;      // minutes
  pace: string;          // auto-computed or manual mm:ss
  heartRate?: number;
  notes: string;
  feeling: 1 | 2 | 3 | 4 | 5;
};

type TrainingPlan = {
  id: string;
  name: string;
  startDate: string;
  goalDate: string;
  goalEvent: string;
  goalDistance: number;
  notes: string;
  active: boolean;
};

type RunData = { runs: Run[]; plans: TrainingPlan[] };
type DashData = { running?: RunData; [key: string]: unknown };
type SaveStatus = "idle" | "saving" | "saved" | "error";
type View = "log" | "analytics" | "plans";

const RUN_TYPE_LABEL: Record<RunType, string> = {
  easy: "Easy", tempo: "Tempo", intervals: "Intervals", long: "Long run",
  race: "Race", walk: "Walk", cross: "Cross-train",
};
const RUN_TYPE_COLOR: Record<RunType, string> = {
  easy: "var(--green)", tempo: "var(--yellow)", intervals: "var(--red)",
  long: "var(--accent-text)", race: "var(--accent-text)", walk: "var(--text-3)", cross: "var(--text-2)",
};
const FEELING_EMOJI = ["", "😩", "😕", "😐", "🙂", "🔥"];

function todayStr() { return new Date().toISOString().slice(0, 10); }
function fmtDate(s: string) { return new Date(s + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
function computePace(distance: number, duration: number): string {
  if (!distance || !duration) return "—";
  const secsPerMile = (duration * 60) / distance;
  const m = Math.floor(secsPerMile / 60);
  const s = Math.round(secsPerMile % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
function totalMiles(runs: Run[]) { return runs.reduce((s, r) => s + r.distance, 0); }
function totalMinutes(runs: Run[]) { return runs.reduce((s, r) => s + r.duration, 0); }

function getMonthKey(date: string) { return date.slice(0, 7); } // "YYYY-MM"
function fmtMonth(key: string) {
  const [y, m] = key.split("-");
  return new Date(parseInt(y), parseInt(m) - 1, 1).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function getLast6MonthKeys(): string[] {
  const keys: string[] = [];
  const d = new Date();
  for (let i = 5; i >= 0; i--) {
    const tmp = new Date(d.getFullYear(), d.getMonth() - i, 1);
    keys.push(`${tmp.getFullYear()}-${String(tmp.getMonth() + 1).padStart(2, "0")}`);
  }
  return keys;
}

function weekRuns(runs: Run[]) {
  const now = new Date(); const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  const start = startOfWeek.toISOString().slice(0, 10);
  return runs.filter(r => r.date >= start);
}

const XIcon = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M2 2l9 9M11 2l-9 9" strokeLinecap="round" />
  </svg>
);

function blankRun(): Omit<Run, "id"> {
  return { date: todayStr(), type: "easy", distance: 0, duration: 0, pace: "", heartRate: undefined, notes: "", feeling: 3 };
}

export default function RunningPage() {
  const [rawData, setRawData] = useState<DashData>({});
  const [runs,    setRuns]    = useState<Run[]>([]);
  const [plans,   setPlans]   = useState<TrainingPlan[]>([]);
  const [status,  setStatus]  = useState<SaveStatus>("idle");
  const [loading, setLoading] = useState(true);
  const [view,    setView]    = useState<View>("log");
  const [adding,  setAdding]  = useState(false);
  const [addingPlan, setAddingPlan] = useState(false);
  const [form, setForm]       = useState<Omit<Run, "id">>(blankRun());
  const [planForm, setPlanForm] = useState<Omit<TrainingPlan, "id">>({
    name: "", startDate: todayStr(), goalDate: "", goalEvent: "", goalDistance: 0, notes: "", active: true,
  });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/api/data")
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(res => {
        const d: DashData = res.data ?? {};
        setRawData(d);
        setRuns(d.running?.runs ?? []);
        setPlans(d.running?.plans ?? []);
      })
      .catch(() => setStatus("error"))
      .finally(() => setLoading(false));
  }, []);

  const save = useCallback(async (r: Run[], p: TrainingPlan[]) => {
    setStatus("saving");
    if (timer.current) clearTimeout(timer.current);
    const newData = { ...rawData, running: { runs: r, plans: p } };
    setRawData(newData);
    try {
      const res = await fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data: newData }) });
      if (!res.ok) throw new Error();
      setStatus("saved");
    } catch { setStatus("error"); }
    finally { timer.current = setTimeout(() => setStatus("idle"), 2000); }
  }, [rawData]);

  const addRun = () => {
    if (!form.distance || !form.duration) return;
    const run: Run = { ...form, id: crypto.randomUUID(), pace: computePace(form.distance, form.duration) };
    const updated = [...runs, run].sort((a, b) => b.date.localeCompare(a.date));
    setRuns(updated); setForm(blankRun()); setAdding(false); save(updated, plans);
  };

  const deleteRun = (id: string) => {
    const updated = runs.filter(r => r.id !== id); setRuns(updated); save(updated, plans);
  };

  const addPlan = () => {
    if (!planForm.name.trim() || !planForm.goalDate) return;
    const plan: TrainingPlan = { ...planForm, id: crypto.randomUUID() };
    const updated = [...plans, plan]; setPlans(updated); setAddingPlan(false);
    setPlanForm({ name: "", startDate: todayStr(), goalDate: "", goalEvent: "", goalDistance: 0, notes: "", active: true });
    save(runs, updated);
  };

  const togglePlan = (id: string) => {
    const updated = plans.map(p => p.id === id ? { ...p, active: !p.active } : p); setPlans(updated); save(runs, updated);
  };

  const deletePlan = (id: string) => {
    const updated = plans.filter(p => p.id !== id); setPlans(updated); save(runs, updated);
  };

  if (loading) return <p className="empty" style={{ padding: "32px 0" }}>Loading…</p>;

  const thisWeek = weekRuns(runs);
  const allTime  = totalMiles(runs);
  const weekMi   = totalMiles(thisWeek);
  const activePlan = plans.find(p => p.active);
  const daysToGoal = activePlan?.goalDate
    ? Math.round((new Date(activePlan.goalDate + "T00:00:00").getTime() - Date.now()) / 86400000)
    : null;

  const sortedRuns = [...runs].sort((a, b) => b.date.localeCompare(a.date));
  const f = form;

  return (
    <div style={{ maxWidth: "800px" }}>
      {status !== "idle" && (
        <div className={`toast${status === "error" ? " error" : ""}`}>
          {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : "Could not save — check connection."}
        </div>
      )}

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "16px" }}>
        {[
          { label: "This week", value: `${weekMi.toFixed(1)} mi`, sub: `${thisWeek.length} run${thisWeek.length !== 1 ? "s" : ""}` },
          { label: "All-time miles", value: allTime.toFixed(1), sub: `${runs.length} runs logged` },
          { label: "Avg pace (week)", value: weekMi && thisWeek.reduce((s,r)=>s+r.duration,0) ? computePace(weekMi, thisWeek.reduce((s,r)=>s+r.duration,0)) : "—", sub: "min/mi" },
          { label: "Goal countdown", value: daysToGoal != null ? `${daysToGoal}d` : "—", sub: activePlan?.goalEvent || "No active plan" },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: "12px 14px" }}>
            <p style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 4px" }}>{s.label}</p>
            <p style={{ fontSize: "22px", fontWeight: 700, margin: "0 0 2px", fontVariantNumeric: "tabular-nums" }}>{s.value}</p>
            <p style={{ fontSize: "11px", color: "var(--text-3)", margin: 0 }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "4px", marginBottom: "16px" }}>
        <button onClick={() => setView("log")}       className={view === "log"       ? "btn btn-primary" : "btn btn-secondary"} style={{ fontSize: "13px", padding: "6px 16px" }}>Run log</button>
        <button onClick={() => setView("analytics")} className={view === "analytics" ? "btn btn-primary" : "btn btn-secondary"} style={{ fontSize: "13px", padding: "6px 16px" }}>Analytics</button>
        <button onClick={() => setView("plans")}     className={view === "plans"     ? "btn btn-primary" : "btn btn-secondary"} style={{ fontSize: "13px", padding: "6px 16px" }}>Training plans</button>
      </div>

      {/* ── LOG TAB ── */}
      {view === "log" && (
        <>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "12px" }}>
            <button className="btn btn-primary" style={{ fontSize: "13px" }} onClick={() => { setAdding(a => !a); setForm(blankRun()); }}>
              {adding ? "Cancel" : "+ Log run"}
            </button>
          </div>

          {adding && (
            <div className="card" style={{ marginBottom: "16px" }}>
              <p className="card-title" style={{ marginBottom: "12px" }}>Log a run</p>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "10px" }}>
                <div style={{ flex: "1 1 120px" }}>
                  <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "3px" }}>Date</label>
                  <input className="input" type="date" value={f.date} onChange={e => setForm(x => ({ ...x, date: e.target.value }))} />
                </div>
                <div style={{ flex: "1 1 120px" }}>
                  <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "3px" }}>Type</label>
                  <select className="input" value={f.type} onChange={e => setForm(x => ({ ...x, type: e.target.value as RunType }))}>
                    {(Object.keys(RUN_TYPE_LABEL) as RunType[]).map(t => <option key={t} value={t}>{RUN_TYPE_LABEL[t]}</option>)}
                  </select>
                </div>
                <div style={{ flex: "1 1 100px" }}>
                  <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "3px" }}>Distance (mi)</label>
                  <input className="input" type="number" step="0.01" min="0" placeholder="3.1"
                    value={f.distance || ""} onChange={e => setForm(x => ({ ...x, distance: parseFloat(e.target.value) || 0 }))} />
                </div>
                <div style={{ flex: "1 1 100px" }}>
                  <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "3px" }}>Duration (min)</label>
                  <input className="input" type="number" step="1" min="0" placeholder="30"
                    value={f.duration || ""} onChange={e => setForm(x => ({ ...x, duration: parseFloat(e.target.value) || 0 }))} />
                </div>
                <div style={{ flex: "1 1 100px" }}>
                  <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "3px" }}>Avg HR (bpm)</label>
                  <input className="input" type="number" min="0" placeholder="optional"
                    value={f.heartRate || ""} onChange={e => setForm(x => ({ ...x, heartRate: parseInt(e.target.value) || undefined }))} />
                </div>
              </div>
              {f.distance > 0 && f.duration > 0 && (
                <p style={{ fontSize: "12px", color: "var(--text-3)", marginBottom: "10px" }}>
                  Pace: <strong style={{ color: "var(--text)" }}>{computePace(f.distance, f.duration)} /mi</strong>
                </p>
              )}
              <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "10px", flexWrap: "wrap" }}>
                <label style={{ fontSize: "12px", color: "var(--text-3)" }}>Feeling:</label>
                {([1,2,3,4,5] as const).map(n => (
                  <button key={n} onClick={() => setForm(x => ({ ...x, feeling: n }))}
                    style={{ fontSize: "18px", background: "none", border: f.feeling === n ? "2px solid var(--accent)" : "2px solid transparent", borderRadius: "6px", padding: "2px 6px", cursor: "pointer" }}>
                    {FEELING_EMOJI[n]}
                  </button>
                ))}
              </div>
              <input className="input" placeholder="Notes (route, weather, etc.)" value={f.notes}
                onChange={e => setForm(x => ({ ...x, notes: e.target.value }))}
                onKeyDown={e => e.key === "Enter" && addRun()}
                style={{ marginBottom: "10px" }} />
              <div style={{ display: "flex", gap: "8px" }}>
                <button className="btn btn-primary" onClick={addRun}>Save run</button>
                <button className="btn btn-secondary" onClick={() => setAdding(false)}>Cancel</button>
              </div>
            </div>
          )}

          {sortedRuns.length === 0 ? (
            <div className="card"><p className="empty">No runs logged yet. Add your first one above.</p></div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "90px 100px 1fr 70px 70px 50px 28px", gap: "0 8px", padding: "8px 16px", borderBottom: "1px solid var(--border)" }}>
                {["Date","Type","Notes","Dist","Pace","Feel",""].map(h => (
                  <span key={h} style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</span>
                ))}
              </div>
              {sortedRuns.map((run, i) => (
                <div key={run.id}
                  style={{ display: "grid", gridTemplateColumns: "90px 100px 1fr 70px 70px 50px 28px", gap: "0 8px", padding: "10px 16px", borderTop: i === 0 ? "none" : "1px solid var(--border)", alignItems: "center" }}
                  onMouseEnter={e => e.currentTarget.querySelectorAll<HTMLElement>(".run-del").forEach(el => el.style.opacity = "1")}
                  onMouseLeave={e => e.currentTarget.querySelectorAll<HTMLElement>(".run-del").forEach(el => el.style.opacity = "0")}>
                  <span style={{ fontSize: "12.5px", color: "var(--text-3)" }}>{fmtDate(run.date)}</span>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: RUN_TYPE_COLOR[run.type] }}>{RUN_TYPE_LABEL[run.type]}</span>
                  <span style={{ fontSize: "13px", color: "var(--text-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {run.notes || `${run.duration} min`}
                    {run.heartRate && <span style={{ fontSize: "11px", color: "var(--text-3)", marginLeft: "8px" }}>♥ {run.heartRate}</span>}
                  </span>
                  <span style={{ fontSize: "13px", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{run.distance.toFixed(1)} mi</span>
                  <span style={{ fontSize: "13px", fontVariantNumeric: "tabular-nums", color: "var(--text-2)" }}>{run.pace || computePace(run.distance, run.duration)}/mi</span>
                  <span style={{ fontSize: "16px", textAlign: "center" }}>{FEELING_EMOJI[run.feeling]}</span>
                  <button className="btn-icon run-del" style={{ opacity: 0 }} onClick={() => deleteRun(run.id)}><XIcon /></button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── ANALYTICS TAB ── */}
      {view === "analytics" && (() => {
        if (runs.length === 0) return <div className="card"><p className="empty">No runs logged yet.</p></div>;

        // Monthly breakdown (last 6 months)
        const monthKeys = getLast6MonthKeys();
        const byMonth = monthKeys.map(key => {
          const monthRuns = runs.filter(r => getMonthKey(r.date) === key);
          return { key, label: fmtMonth(key), miles: totalMiles(monthRuns), count: monthRuns.length, minutes: totalMinutes(monthRuns) };
        });
        const maxMiles = Math.max(...byMonth.map(m => m.miles), 1);

        // Personal bests
        const longestRun   = [...runs].sort((a, b) => b.distance - a.distance)[0];
        const fastestPaceRun = [...runs].filter(r => r.distance >= 1 && r.duration > 0)
          .sort((a, b) => (a.duration / a.distance) - (b.duration / b.distance))[0];
        const longestStreak = (() => {
          const dateSorted = Array.from(new Set(runs.map(r => r.date))).sort();
          let best = 1; let cur = 1;
          for (let i = 1; i < dateSorted.length; i++) {
            const prev = new Date(dateSorted[i-1] + "T00:00:00");
            const curr = new Date(dateSorted[i]   + "T00:00:00");
            const diff = (curr.getTime() - prev.getTime()) / 86400000;
            cur = diff === 1 ? cur + 1 : 1;
            best = Math.max(best, cur);
          }
          return dateSorted.length ? best : 0;
        })();

        // Run type breakdown
        const typeCounts: Partial<Record<RunType, number>> = {};
        runs.forEach(r => { typeCounts[r.type] = (typeCounts[r.type] ?? 0) + 1; });
        const typeEntries = (Object.entries(typeCounts) as [RunType, number][]).sort((a, b) => b[1] - a[1]);

        // Feeling distribution
        const feelingCounts = [0,0,0,0,0,0];
        runs.forEach(r => { if (r.feeling >= 1 && r.feeling <= 5) feelingCounts[r.feeling]++; });

        return (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Personal bests */}
            <div className="card">
              <p className="card-title" style={{ margin: "0 0 14px" }}>Personal bests</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
                <div style={{ padding: "12px", background: "var(--surface-raised)", borderRadius: "10px" }}>
                  <p style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 4px" }}>Longest run</p>
                  <p style={{ fontSize: "22px", fontWeight: 700, margin: "0 0 2px", color: "var(--accent-text)", fontVariantNumeric: "tabular-nums" }}>{longestRun ? `${longestRun.distance.toFixed(2)} mi` : "—"}</p>
                  <p style={{ fontSize: "11px", color: "var(--text-3)", margin: 0 }}>{longestRun ? fmtDate(longestRun.date) : ""}</p>
                </div>
                <div style={{ padding: "12px", background: "var(--surface-raised)", borderRadius: "10px" }}>
                  <p style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 4px" }}>Best pace</p>
                  <p style={{ fontSize: "22px", fontWeight: 700, margin: "0 0 2px", color: "var(--green)", fontVariantNumeric: "tabular-nums" }}>{fastestPaceRun ? `${computePace(fastestPaceRun.distance, fastestPaceRun.duration)}/mi` : "—"}</p>
                  <p style={{ fontSize: "11px", color: "var(--text-3)", margin: 0 }}>{fastestPaceRun ? `${fastestPaceRun.distance.toFixed(1)} mi · ${fmtDate(fastestPaceRun.date)}` : ""}</p>
                </div>
                <div style={{ padding: "12px", background: "var(--surface-raised)", borderRadius: "10px" }}>
                  <p style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 4px" }}>Best streak</p>
                  <p style={{ fontSize: "22px", fontWeight: 700, margin: "0 0 2px", fontVariantNumeric: "tabular-nums" }}>{longestStreak} {longestStreak === 1 ? "day" : "days"}</p>
                  <p style={{ fontSize: "11px", color: "var(--text-3)", margin: 0 }}>consecutive days</p>
                </div>
              </div>
            </div>

            {/* Monthly mileage chart */}
            <div className="card">
              <p className="card-title" style={{ margin: "0 0 16px" }}>Monthly mileage</p>
              <div style={{ display: "flex", alignItems: "flex-end", gap: "8px", height: "140px" }}>
                {byMonth.map(m => (
                  <div key={m.key} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", height: "100%" }}>
                    <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--accent-text)", fontVariantNumeric: "tabular-nums" }}>
                      {m.miles > 0 ? m.miles.toFixed(1) : ""}
                    </span>
                    <div style={{ flex: 1, width: "100%", display: "flex", alignItems: "flex-end" }}>
                      <div style={{ width: "100%", height: `${Math.max(4, (m.miles / maxMiles) * 100)}%`, background: "var(--accent)", borderRadius: "6px 6px 0 0", opacity: m.miles === 0 ? 0.15 : 1, transition: "height 0.3s" }} />
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: "10.5px", color: "var(--text-3)", whiteSpace: "nowrap" }}>{m.label.split(" ")[0]}</div>
                      {m.count > 0 && <div style={{ fontSize: "10px", color: "var(--text-3)" }}>{m.count}x</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Run type breakdown + feeling */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div className="card">
                <p className="card-title" style={{ margin: "0 0 12px" }}>Run types</p>
                {typeEntries.map(([type, count]) => (
                  <div key={type} style={{ marginBottom: "8px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                      <span style={{ fontSize: "12.5px", color: RUN_TYPE_COLOR[type], fontWeight: 600 }}>{RUN_TYPE_LABEL[type]}</span>
                      <span style={{ fontSize: "12px", color: "var(--text-3)", fontVariantNumeric: "tabular-nums" }}>{count} · {Math.round((count / runs.length) * 100)}%</span>
                    </div>
                    <div style={{ height: "5px", borderRadius: "99px", background: "var(--surface-raised)", overflow: "hidden" }}>
                      <div style={{ height: "100%", borderRadius: "99px", background: RUN_TYPE_COLOR[type], width: `${(count / runs.length) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="card">
                <p className="card-title" style={{ margin: "0 0 12px" }}>How runs felt</p>
                {([5,4,3,2,1] as const).map(n => (
                  <div key={n} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                    <span style={{ fontSize: "16px", width: "22px", textAlign: "center" }}>{FEELING_EMOJI[n]}</span>
                    <div style={{ flex: 1, height: "8px", borderRadius: "99px", background: "var(--surface-raised)", overflow: "hidden" }}>
                      <div style={{ height: "100%", borderRadius: "99px", background: n >= 4 ? "var(--green)" : n === 3 ? "var(--accent)" : "var(--yellow)", width: runs.length ? `${(feelingCounts[n] / runs.length) * 100}%` : "0%" }} />
                    </div>
                    <span style={{ fontSize: "11.5px", color: "var(--text-3)", width: "16px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{feelingCounts[n]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── PLANS TAB ── */}
      {view === "plans" && (
        <>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "12px" }}>
            <button className="btn btn-primary" style={{ fontSize: "13px" }} onClick={() => setAddingPlan(a => !a)}>
              {addingPlan ? "Cancel" : "+ New plan"}
            </button>
          </div>

          {addingPlan && (
            <div className="card" style={{ marginBottom: "16px" }}>
              <p className="card-title" style={{ marginBottom: "12px" }}>New training plan</p>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "10px" }}>
                <div style={{ flex: "2 1 160px" }}>
                  <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "3px" }}>Plan name</label>
                  <input className="input" placeholder="5K training, Marathon prep…" value={planForm.name}
                    autoFocus onChange={e => setPlanForm(x => ({ ...x, name: e.target.value }))} />
                </div>
                <div style={{ flex: "1 1 130px" }}>
                  <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "3px" }}>Goal event</label>
                  <input className="input" placeholder="5K, Half marathon…" value={planForm.goalEvent}
                    onChange={e => setPlanForm(x => ({ ...x, goalEvent: e.target.value }))} />
                </div>
                <div style={{ flex: "1 1 100px" }}>
                  <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "3px" }}>Goal dist (mi)</label>
                  <input className="input" type="number" step="0.1" min="0" placeholder="3.1"
                    value={planForm.goalDistance || ""} onChange={e => setPlanForm(x => ({ ...x, goalDistance: parseFloat(e.target.value) || 0 }))} />
                </div>
                <div style={{ flex: "1 1 130px" }}>
                  <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "3px" }}>Start date</label>
                  <input className="input" type="date" value={planForm.startDate} onChange={e => setPlanForm(x => ({ ...x, startDate: e.target.value }))} />
                </div>
                <div style={{ flex: "1 1 130px" }}>
                  <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "3px" }}>Goal / race date</label>
                  <input className="input" type="date" value={planForm.goalDate} onChange={e => setPlanForm(x => ({ ...x, goalDate: e.target.value }))} />
                </div>
              </div>
              <input className="input" placeholder="Notes (weekly mileage target, pacing goals…)" value={planForm.notes}
                onChange={e => setPlanForm(x => ({ ...x, notes: e.target.value }))} style={{ marginBottom: "10px" }} />
              <div style={{ display: "flex", gap: "8px" }}>
                <button className="btn btn-primary" onClick={addPlan}>Save plan</button>
                <button className="btn btn-secondary" onClick={() => setAddingPlan(false)}>Cancel</button>
              </div>
            </div>
          )}

          {plans.length === 0 ? (
            <div className="card"><p className="empty">No training plans yet.</p></div>
          ) : (
            plans.map(plan => {
              const days = plan.goalDate
                ? Math.round((new Date(plan.goalDate + "T00:00:00").getTime() - Date.now()) / 86400000)
                : null;
              const planRuns = runs.filter(r => r.date >= plan.startDate && (!plan.goalDate || r.date <= plan.goalDate));
              return (
                <div key={plan.id} className="card" style={{ marginBottom: "12px", opacity: plan.active ? 1 : 0.5 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                        <span style={{ fontSize: "15px", fontWeight: 700, color: "var(--text)" }}>{plan.name}</span>
                        {plan.active && <span style={{ fontSize: "10px", fontWeight: 600, padding: "2px 8px", borderRadius: "99px", background: "var(--green-dim)", color: "var(--green)" }}>Active</span>}
                      </div>
                      {plan.goalEvent && <p style={{ fontSize: "13px", color: "var(--text-2)", margin: "0 0 4px" }}>{plan.goalEvent}{plan.goalDistance ? ` — ${plan.goalDistance} mi` : ""}</p>}
                      <div style={{ display: "flex", gap: "16px", fontSize: "12px", color: "var(--text-3)", flexWrap: "wrap" }}>
                        <span>Started {fmtDate(plan.startDate)}</span>
                        {plan.goalDate && <span>Goal: {fmtDate(plan.goalDate)}{days != null && days >= 0 ? ` (${days}d away)` : days != null && " (past)"}</span>}
                        <span>{planRuns.length} runs • {totalMiles(planRuns).toFixed(1)} mi</span>
                      </div>
                      {plan.notes && <p style={{ fontSize: "12.5px", color: "var(--text-3)", margin: "6px 0 0" }}>{plan.notes}</p>}
                    </div>
                    <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                      <button className="btn btn-secondary" style={{ fontSize: "11px", padding: "3px 10px" }} onClick={() => togglePlan(plan.id)}>
                        {plan.active ? "Deactivate" : "Activate"}
                      </button>
                      <button className="btn-icon" onClick={() => deletePlan(plan.id)}><XIcon /></button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </>
      )}
    </div>
  );
}
