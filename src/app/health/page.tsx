"use client";

import { useEffect, useState, useCallback, useRef } from "react";

type OuraDay = {
  date: string;
  sleepScore: number | null;
  sleepDuration: number | null;
  sleepDeep: number | null;
  sleepRem: number | null;
  readinessScore: number | null;
  hrvAvg: number | null;
  restingHR: number | null;
  activityScore: number | null;
  steps: number | null;
  activeCalories: number | null;
};

// ── Types ─────────────────────────────────────────────────────────────────────

type AMRoutine = { faceWash: boolean; toner: boolean; moisturizer: boolean; spf: boolean; azelaicAcid: boolean };
type PMRoutine = { faceWash: boolean; toner: boolean; moisturizer: boolean; tretinoin: boolean };

type SkincareEntry = {
  id: string;
  date: string;
  am: AMRoutine;
  pm: PMRoutine;
};

type DayLog = {
  id: string;
  date: string;
  sleep: string;
  water: string;
  workout: string;
  workoutDuration: string;
  notes: string;
};

type WeightEntry = { id: string; date: string; weight: number; note: string };
type HealthData = { logs: DayLog[]; skincare: SkincareEntry[] };
type DashData   = { health?: HealthData; weight?: { entries: WeightEntry[] }; [key: string]: unknown };
type SaveStatus = "idle" | "saving" | "saved" | "error";

function todayStr() { return new Date().toISOString().slice(0, 10); }
function fmtDate(s: string) {
  return new Date(s + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}
function daysBetween(a: string, b: string) {
  return Math.round((new Date(b + "T00:00:00").getTime() - new Date(a + "T00:00:00").getTime()) / 86400000);
}

function blankAM(): AMRoutine { return { faceWash: false, toner: false, moisturizer: false, spf: false, azelaicAcid: false }; }
function blankPM(): PMRoutine { return { faceWash: false, toner: false, moisturizer: false, tretinoin: false }; }

function blankSkincare(date = todayStr()): Omit<SkincareEntry, "id"> {
  return { date, am: blankAM(), pm: blankPM() };
}
function blankLog(date = todayStr()): Omit<DayLog, "id"> {
  return { date, sleep: "", water: "", workout: "", workoutDuration: "", notes: "" };
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

// ── Checkbox row ──────────────────────────────────────────────────────────────

function Check({ label, checked, onChange, accent }: { label: string; checked: boolean; onChange: (v: boolean) => void; accent?: boolean }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", userSelect: "none", padding: "4px 0" }}>
      <span style={{
        width: "18px", height: "18px", borderRadius: "5px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
        background: checked ? (accent ? "var(--accent)" : "var(--green)") : "var(--surface-raised)",
        border: checked ? "none" : "1px solid var(--border)",
        transition: "all 0.1s",
      }} onClick={() => onChange(!checked)}>
        {checked && <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="white" strokeWidth="1.8"><path d="M1.5 5l2.5 2.5L8.5 2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
      </span>
      <span style={{ fontSize: "13.5px", color: checked ? "var(--text-3)" : "var(--text)", textDecoration: checked ? "line-through" : "none", transition: "all 0.1s" }}>{label}</span>
    </label>
  );
}

// ── Schedule badge ────────────────────────────────────────────────────────────

function ScheduleBadge({ lastDate, intervalDays, label }: { lastDate: string | null; intervalDays: number; label: string }) {
  const today = todayStr();
  if (!lastDate) return <span style={{ fontSize: "11px", color: "var(--yellow)", fontWeight: 600, background: "var(--yellow-dim)", padding: "2px 8px", borderRadius: "99px" }}>{label} — never logged</span>;
  const since = daysBetween(lastDate, today);
  const dueIn = intervalDays - since;
  if (dueIn <= 0) return <span style={{ fontSize: "11px", color: "var(--green)", fontWeight: 600, background: "var(--green-dim)", padding: "2px 8px", borderRadius: "99px" }}>{label} — due today</span>;
  return <span style={{ fontSize: "11px", color: "var(--text-3)", background: "var(--surface-raised)", padding: "2px 8px", borderRadius: "99px" }}>{label} — in {dueIn}d</span>;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function HealthPage() {
  const [rawData,  setRawData]  = useState<DashData>({});
  const [logs,     setLogs]     = useState<DayLog[]>([]);
  const [skincare, setSkincare] = useState<SkincareEntry[]>([]);
  const [status,   setStatus]   = useState<SaveStatus>("idle");
  const [loading,  setLoading]  = useState(true);
  const [tab,      setTab]      = useState<"skincare" | "log" | "weight" | "oura">("skincare");
  const [weights,  setWeights]  = useState<WeightEntry[]>([]);
  const [wInput,   setWInput]   = useState("");
  const [wNote,    setWNote]    = useState("");
  const [wDate,    setWDate]    = useState(todayStr());
  const [oura,     setOura]     = useState<OuraDay[]>([]);
  const [ouraLoad, setOuraLoad] = useState(false);
  const [ouraErr,  setOuraErr]  = useState<string | null>(null);

  // Log form state
  const [addingLog,  setAddingLog]  = useState(false);
  const [editLogId,  setEditLogId]  = useState<string | null>(null);
  const [logDraft,   setLogDraft]   = useState<Omit<DayLog, "id">>(blankLog());

  // Skincare today
  const [scToday,   setScToday]   = useState<SkincareEntry | null>(null);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const today = todayStr();

  useEffect(() => {
    if (tab !== "oura" || oura.length > 0 || ouraLoad) return;
    setOuraLoad(true);
    fetch("/api/oura")
      .then(r => r.json())
      .then(res => { if (res.ok) setOura(res.days); else setOuraErr(res.error); })
      .catch(() => setOuraErr("Could not connect to Oura."))
      .finally(() => setOuraLoad(false));
  }, [tab, oura.length, ouraLoad]);

  useEffect(() => {
    fetch("/api/data")
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(res => {
        const d: DashData = res.data ?? {};
        setRawData(d);
        const sc = d.health?.skincare ?? [];
        const lg = d.health?.logs ?? [];
        setSkincare(sc);
        setLogs(lg);
        const existing = sc.find(e => e.date === today);
        setScToday(existing ?? null);
        setWeights((d.weight?.entries ?? []).sort((a: WeightEntry, b: WeightEntry) => b.date.localeCompare(a.date)));
      })
      .catch(() => setStatus("error"))
      .finally(() => setLoading(false));
  }, [today]);

  const saveAll = useCallback(async (newLogs: DayLog[], newSkincare: SkincareEntry[]) => {
    setStatus("saving");
    if (timer.current) clearTimeout(timer.current);
    const newData = { ...rawData, health: { logs: newLogs, skincare: newSkincare } };
    setRawData(newData);
    try {
      const res = await fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data: newData }) });
      if (!res.ok) throw new Error();
      setStatus("saved");
    } catch { setStatus("error"); }
    finally { timer.current = setTimeout(() => setStatus("idle"), 2000); }
  }, [rawData]);

  const saveWeights = useCallback(async (updated: WeightEntry[]) => {
    setStatus("saving");
    if (timer.current) clearTimeout(timer.current);
    const newData = { ...rawData, weight: { entries: updated } };
    setRawData(newData);
    try {
      const res = await fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data: newData }) });
      if (!res.ok) throw new Error();
      setStatus("saved");
    } catch { setStatus("error"); }
    finally { timer.current = setTimeout(() => setStatus("idle"), 2000); }
  }, [rawData]);

  const logWeight = () => {
    const val = parseFloat(wInput);
    if (!val || val <= 0 || !wDate) return;
    const entry: WeightEntry = { id: crypto.randomUUID(), date: wDate, weight: val, note: wNote.trim() };
    const updated = [...weights.filter(w => w.date !== wDate), entry].sort((a, b) => b.date.localeCompare(a.date));
    setWeights(updated); saveWeights(updated);
    setWInput(""); setWNote(""); setWDate(todayStr());
  };

  const deleteWeight = (id: string) => {
    const updated = weights.filter(w => w.id !== id);
    setWeights(updated); saveWeights(updated);
  };

  // ── Skincare helpers ──────────────────────────────────────────────────────

  const updateScToday = (updated: SkincareEntry) => {
    setScToday(updated);
    const next = skincare.some(e => e.date === today)
      ? skincare.map(e => e.date === today ? updated : e)
      : [...skincare, updated];
    setSkincare(next);
    saveAll(logs, next);
  };

  const startToday = () => {
    const entry: SkincareEntry = { ...blankSkincare(today), id: crypto.randomUUID() };
    setScToday(entry);
    const next = [...skincare, entry];
    setSkincare(next);
    saveAll(logs, next);
  };

  const patchAM = (key: keyof AMRoutine, val: boolean) => {
    if (!scToday) return;
    const updated = { ...scToday, am: { ...scToday.am, [key]: val } };
    updateScToday(updated);
  };
  const patchPM = (key: keyof PMRoutine, val: boolean) => {
    if (!scToday) return;
    const updated = { ...scToday, pm: { ...scToday.pm, [key]: val } };
    updateScToday(updated);
  };

  // Last used dates
  const sortedSc = [...skincare].sort((a, b) => b.date.localeCompare(a.date));
  const lastTret = sortedSc.find(e => e.pm.tretinoin)?.date ?? null;
  const lastAzel = sortedSc.find(e => e.am.azelaicAcid)?.date ?? null;

  // ── Log helpers ───────────────────────────────────────────────────────────

  const saveLog = () => {
    let next: DayLog[];
    if (editLogId) {
      next = logs.map(l => l.id === editLogId ? { ...logDraft, id: editLogId } : l);
      setEditLogId(null);
    } else {
      next = [{ ...logDraft, id: crypto.randomUUID() }, ...logs];
      setAddingLog(false);
    }
    next = next.sort((a, b) => b.date.localeCompare(a.date));
    setLogs(next);
    setLogDraft(blankLog());
    saveAll(next, skincare);
  };

  const deleteLog = (id: string) => {
    const next = logs.filter(l => l.id !== id);
    setLogs(next);
    saveAll(next, skincare);
  };

  const deleteSc = (id: string) => {
    const next = skincare.filter(e => e.id !== id);
    setSkincare(next);
    if (scToday?.id === id) setScToday(null);
    saveAll(logs, next);
  };

  if (loading) return <p className="empty" style={{ padding: "32px 0" }}>Loading…</p>;

  const sortedLogs = [...logs].sort((a, b) => b.date.localeCompare(a.date));
  const recent7    = sortedLogs.slice(0, 7);
  const avgSleep   = recent7.filter(l => l.sleep).reduce((s, l, _, a) => s + parseFloat(l.sleep) / a.length, 0);
  const workoutDays = recent7.filter(l => l.workout).length;

  return (
    <div style={{ maxWidth: "720px" }}>
      {status !== "idle" && (
        <div className={`toast${status === "error" ? " error" : ""}`}>
          {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : "Could not save — check connection."}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: "4px", marginBottom: "16px", flexWrap: "wrap" }}>
        {(["skincare", "log", "weight", "oura"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={tab === t ? "btn btn-primary" : "btn btn-secondary"}
            style={{ fontSize: "13px", padding: "6px 16px" }}>
            {t === "log" ? "Daily Log" : t === "oura" ? "Oura" : t === "weight" ? "Weight" : "Skincare"}
          </button>
        ))}
      </div>

      {/* ── SKINCARE TAB ─────────────────────────────────────────────────── */}
      {tab === "skincare" && (
        <div>
          {/* Schedule status */}
          <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
            <ScheduleBadge lastDate={lastTret} intervalDays={3} label="Tretinoin" />
            <ScheduleBadge lastDate={lastAzel} intervalDays={2} label="Azelaic acid" />
          </div>

          {/* Today's routine */}
          <div className="card" style={{ marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <p className="card-title" style={{ margin: 0 }}>Today — {fmtDate(today)}</p>
              {!scToday && <button className="btn btn-primary" style={{ fontSize: "12px", padding: "5px 12px" }} onClick={startToday}>Start today</button>}
            </div>

            {scToday ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                <div>
                  <p style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-3)", margin: "0 0 8px" }}>Morning</p>
                  <Check label="Face wash"    checked={scToday.am.faceWash}    onChange={v => patchAM("faceWash", v)} />
                  <Check label="Toner"        checked={scToday.am.toner}        onChange={v => patchAM("toner", v)} />
                  <Check label="Azelaic acid" checked={scToday.am.azelaicAcid} onChange={v => patchAM("azelaicAcid", v)} accent />
                  <Check label="Moisturizer"  checked={scToday.am.moisturizer}  onChange={v => patchAM("moisturizer", v)} />
                  <Check label="SPF"          checked={scToday.am.spf}          onChange={v => patchAM("spf", v)} />
                </div>
                <div>
                  <p style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-3)", margin: "0 0 8px" }}>Evening</p>
                  <Check label="Face wash"   checked={scToday.pm.faceWash}   onChange={v => patchPM("faceWash", v)} />
                  <Check label="Toner"       checked={scToday.pm.toner}       onChange={v => patchPM("toner", v)} />
                  <Check label="Tretinoin"   checked={scToday.pm.tretinoin}   onChange={v => patchPM("tretinoin", v)} accent />
                  <Check label="Moisturizer" checked={scToday.pm.moisturizer} onChange={v => patchPM("moisturizer", v)} />
                </div>
              </div>
            ) : (
              <p className="empty">Tap &quot;Start today&quot; to log today&apos;s routine.</p>
            )}
          </div>

          {/* History */}
          {sortedSc.filter(e => e.date !== today).length > 0 && (
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
                <p className="card-title" style={{ margin: 0 }}>History</p>
              </div>
              {sortedSc.filter(e => e.date !== today).slice(0, 30).map((entry, i) => {
                const amDone = Object.values(entry.am).filter(Boolean).length;
                const pmDone = Object.values(entry.pm).filter(Boolean).length;
                return (
                  <div key={entry.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "9px 16px", borderTop: i === 0 ? "none" : "1px solid var(--border)" }}
                    onMouseEnter={e => e.currentTarget.querySelectorAll<HTMLElement>(".row-action").forEach(el => el.style.opacity = "1")}
                    onMouseLeave={e => e.currentTarget.querySelectorAll<HTMLElement>(".row-action").forEach(el => el.style.opacity = "0")}>
                    <span style={{ flex: 1, fontSize: "13px", color: "var(--text-2)" }}>{fmtDate(entry.date)}</span>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <span style={{ fontSize: "11.5px", color: "var(--text-3)" }}>AM {amDone}/5</span>
                      <span style={{ fontSize: "11.5px", color: "var(--text-3)" }}>PM {pmDone}/4</span>
                      {entry.am.azelaicAcid && <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--accent)", background: "var(--accent-dim)", padding: "1px 7px", borderRadius: "99px" }}>AzA</span>}
                      {entry.pm.tretinoin   && <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--green)",  background: "var(--green-dim)",  padding: "1px 7px", borderRadius: "99px" }}>Tret</span>}
                    </div>
                    <button className="btn-icon row-action" style={{ opacity: 0 }} onClick={() => deleteSc(entry.id)}><XIcon /></button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── DAILY LOG TAB ─────────────────────────────────────────────────── */}
      {tab === "log" && (
        <div>
          {/* Stats */}
          {logs.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginBottom: "16px" }}>
              {[
                { label: "Avg sleep",    value: avgSleep ? `${avgSleep.toFixed(1)}h` : "—", note: "last 7 days" },
                { label: "Workout days", value: `${workoutDays}/7`,                          note: "last 7 days" },
                { label: "Total logged", value: `${logs.length}`,                            note: "days"        },
              ].map(s => (
                <div key={s.label} className="card" style={{ padding: "12px 14px" }}>
                  <p style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 4px" }}>{s.label}</p>
                  <p style={{ fontSize: "22px", fontWeight: 700, margin: "0 0 2px", fontVariantNumeric: "tabular-nums" }}>{s.value}</p>
                  <p style={{ fontSize: "10.5px", color: "var(--text-3)", margin: 0 }}>{s.note}</p>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "12px" }}>
            <button className="btn btn-primary" onClick={() => { setAddingLog(v => !v); setEditLogId(null); setLogDraft(blankLog()); }}>
              {addingLog ? "Cancel" : "+ Log day"}
            </button>
          </div>

          {/* Add / edit form */}
          {(addingLog || editLogId) && (
            <div style={{ background: "var(--surface-raised)", borderRadius: "8px", padding: "14px", marginBottom: "14px", display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <div style={{ flex: "0 0 150px" }}>
                  <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "3px" }}>Date</label>
                  <input className="input" type="date" value={logDraft.date} onChange={e => setLogDraft(d => ({ ...d, date: e.target.value }))} />
                </div>
                <div style={{ flex: "1 1 90px" }}>
                  <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "3px" }}>Sleep (hrs)</label>
                  <input className="input" type="number" step="0.5" min="0" max="24" placeholder="7.5" value={logDraft.sleep} onChange={e => setLogDraft(d => ({ ...d, sleep: e.target.value }))} />
                </div>
                <div style={{ flex: "1 1 90px" }}>
                  <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "3px" }}>Water (oz)</label>
                  <input className="input" type="number" step="1" min="0" placeholder="64" value={logDraft.water} onChange={e => setLogDraft(d => ({ ...d, water: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <div style={{ flex: "2 1 180px" }}>
                  <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "3px" }}>Workout</label>
                  <input className="input" placeholder="Walked, gym, yoga…" value={logDraft.workout} onChange={e => setLogDraft(d => ({ ...d, workout: e.target.value }))} />
                </div>
                <div style={{ flex: "1 1 90px" }}>
                  <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "3px" }}>Duration</label>
                  <input className="input" placeholder="30 min" value={logDraft.workoutDuration} onChange={e => setLogDraft(d => ({ ...d, workoutDuration: e.target.value }))} />
                </div>
              </div>
              <input className="input" placeholder="Notes…" value={logDraft.notes} onChange={e => setLogDraft(d => ({ ...d, notes: e.target.value }))} onKeyDown={e => e.key === "Enter" && saveLog()} />
              <div style={{ display: "flex", gap: "8px" }}>
                <button className="btn btn-primary" onClick={saveLog}>Save</button>
                <button className="btn btn-secondary" onClick={() => { setAddingLog(false); setEditLogId(null); setLogDraft(blankLog()); }}>Cancel</button>
              </div>
            </div>
          )}

          {sortedLogs.length === 0 ? (
            <div className="card"><p className="empty">No entries yet. Log your first day above.</p></div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {sortedLogs.map(log => (
                <div key={log.id} className="card" style={{ padding: "12px 16px" }}
                  onMouseEnter={e => e.currentTarget.querySelectorAll<HTMLElement>(".row-action").forEach(el => el.style.opacity = "1")}
                  onMouseLeave={e => e.currentTarget.querySelectorAll<HTMLElement>(".row-action").forEach(el => el.style.opacity = "0")}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)", display: "block", marginBottom: "8px" }}>{fmtDate(log.date)}</span>
                      <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                        {log.sleep && <div><span style={{ fontSize: "10.5px", color: "var(--text-3)", display: "block" }}>Sleep</span><span style={{ fontSize: "13.5px", fontWeight: 600 }}>{log.sleep}h</span></div>}
                        {log.water && <div><span style={{ fontSize: "10.5px", color: "var(--text-3)", display: "block" }}>Water</span><span style={{ fontSize: "13.5px", fontWeight: 600 }}>{log.water}oz</span></div>}
                        {log.workout && <div><span style={{ fontSize: "10.5px", color: "var(--text-3)", display: "block" }}>Workout</span><span style={{ fontSize: "13.5px", fontWeight: 600 }}>{log.workout}{log.workoutDuration ? ` · ${log.workoutDuration}` : ""}</span></div>}
                      </div>
                      {log.notes && <p style={{ fontSize: "12.5px", color: "var(--text-2)", margin: "8px 0 0", lineHeight: 1.5 }}>{log.notes}</p>}
                    </div>
                    <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
                      <button className="btn-icon row-action" style={{ opacity: 0 }} onClick={() => { setEditLogId(log.id); setLogDraft({ date: log.date, sleep: log.sleep, water: log.water, workout: log.workout, workoutDuration: log.workoutDuration, notes: log.notes }); setAddingLog(false); }}><PencilIcon /></button>
                      <button className="btn-icon row-action" style={{ opacity: 0 }} onClick={() => deleteLog(log.id)}><XIcon /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── WEIGHT TAB ─────────────────────────────────────────────────────── */}
      {tab === "weight" && (() => {
        const latest = weights[0] ?? null;
        const prev   = weights[1] ?? null;
        const diff   = latest && prev ? latest.weight - prev.weight : null;

        // Mini chart: last 20 entries oldest→newest
        const chartData = [...weights].reverse().slice(-20);
        const minW = chartData.length ? Math.min(...chartData.map(w => w.weight)) - 2 : 0;
        const maxW = chartData.length ? Math.max(...chartData.map(w => w.weight)) + 2 : 100;
        const range = maxW - minW || 1;

        return (
          <div style={{ maxWidth: "640px" }}>
            {/* Stats row */}
            {latest && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "16px" }}>
                <div className="card" style={{ padding: "12px 14px" }}>
                  <p style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 4px" }}>Current</p>
                  <p style={{ fontSize: "26px", fontWeight: 700, margin: 0, fontVariantNumeric: "tabular-nums" }}>{latest.weight} <span style={{ fontSize: "13px", color: "var(--text-3)" }}>lbs</span></p>
                </div>
                <div className="card" style={{ padding: "12px 14px" }}>
                  <p style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 4px" }}>Change</p>
                  <p style={{ fontSize: "26px", fontWeight: 700, margin: 0, color: diff === null ? "var(--text)" : diff < 0 ? "var(--green)" : diff > 0 ? "var(--red)" : "var(--text)", fontVariantNumeric: "tabular-nums" }}>
                    {diff === null ? "—" : `${diff > 0 ? "+" : ""}${diff.toFixed(1)}`}
                    {diff !== null && <span style={{ fontSize: "13px", color: "var(--text-3)" }}> lbs</span>}
                  </p>
                </div>
                <div className="card" style={{ padding: "12px 14px" }}>
                  <p style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 4px" }}>Entries</p>
                  <p style={{ fontSize: "26px", fontWeight: 700, margin: 0 }}>{weights.length}</p>
                </div>
              </div>
            )}

            {/* Mini trend chart */}
            {chartData.length >= 2 && (
              <div className="card" style={{ marginBottom: "16px" }}>
                <p className="card-title" style={{ margin: "0 0 14px" }}>Trend</p>
                <div style={{ position: "relative", height: "100px" }}>
                  <svg width="100%" height="100%" viewBox={`0 0 ${chartData.length * 30} 100`} preserveAspectRatio="none">
                    <polyline
                      points={chartData.map((w, i) => `${i * 30 + 15},${100 - ((w.weight - minW) / range) * 90 - 5}`).join(" ")}
                      fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                    {chartData.map((w, i) => (
                      <circle key={w.id} cx={i * 30 + 15} cy={100 - ((w.weight - minW) / range) * 90 - 5} r="3" fill="var(--accent)" />
                    ))}
                  </svg>
                  {/* Y axis labels */}
                  <div style={{ position: "absolute", top: 0, right: 0, display: "flex", flexDirection: "column", justifyContent: "space-between", height: "100%", pointerEvents: "none" }}>
                    <span style={{ fontSize: "10px", color: "var(--text-3)" }}>{maxW.toFixed(0)}</span>
                    <span style={{ fontSize: "10px", color: "var(--text-3)" }}>{minW.toFixed(0)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Log new entry */}
            <div className="card" style={{ marginBottom: "16px" }}>
              <p className="card-title" style={{ margin: "0 0 12px" }}>Log weight</p>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <div style={{ flex: "0 0 130px" }}>
                  <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "3px" }}>Date</label>
                  <input className="input" type="date" value={wDate} onChange={e => setWDate(e.target.value)} />
                </div>
                <div style={{ flex: "0 0 120px" }}>
                  <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "3px" }}>Weight (lbs)</label>
                  <input className="input" type="number" step="0.1" min="0" placeholder="135.5"
                    value={wInput} onChange={e => setWInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && logWeight()} />
                </div>
                <div style={{ flex: "1 1 140px" }}>
                  <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "3px" }}>Note (optional)</label>
                  <input className="input" placeholder="After workout, morning…" value={wNote}
                    onChange={e => setWNote(e.target.value)} onKeyDown={e => e.key === "Enter" && logWeight()} />
                </div>
                <div style={{ display: "flex", alignItems: "flex-end" }}>
                  <button className="btn btn-primary" onClick={logWeight}>Log</button>
                </div>
              </div>
            </div>

            {/* History */}
            {weights.length > 0 && (
              <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                <div style={{ display: "grid", gridTemplateColumns: "110px 90px 1fr 28px", gap: "0 8px", padding: "8px 16px", borderBottom: "1px solid var(--border)" }}>
                  {["Date", "Weight", "Note", ""].map(h => (
                    <span key={h} style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</span>
                  ))}
                </div>
                {weights.map((w, i) => {
                  const nextW = weights[i + 1];
                  const chg = nextW ? w.weight - nextW.weight : null;
                  return (
                    <div key={w.id} style={{ display: "grid", gridTemplateColumns: "110px 90px 1fr 28px", gap: "0 8px", padding: "9px 16px", borderTop: i === 0 ? "none" : "1px solid var(--border)", alignItems: "center" }}
                      onMouseEnter={e => e.currentTarget.querySelectorAll<HTMLElement>(".w-del").forEach(el => el.style.opacity = "1")}
                      onMouseLeave={e => e.currentTarget.querySelectorAll<HTMLElement>(".w-del").forEach(el => el.style.opacity = "0")}>
                      <span style={{ fontSize: "12.5px", color: "var(--text-3)" }}>{new Date(w.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                      <span style={{ fontSize: "14px", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                        {w.weight} lbs
                        {chg !== null && <span style={{ fontSize: "11px", fontWeight: 400, marginLeft: "6px", color: chg < 0 ? "var(--green)" : chg > 0 ? "var(--red)" : "var(--text-3)" }}>{chg > 0 ? "+" : ""}{chg.toFixed(1)}</span>}
                      </span>
                      <span style={{ fontSize: "12.5px", color: "var(--text-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.note}</span>
                      <button className="btn-icon w-del" style={{ opacity: 0 }} onClick={() => deleteWeight(w.id)}><XIcon /></button>
                    </div>
                  );
                })}
              </div>
            )}

            {weights.length === 0 && <p className="empty">No weight logged yet. Add your first entry above.</p>}
          </div>
        );
      })()}

      {/* ── OURA TAB ──────────────────────────────────────────────────────── */}
      {tab === "oura" && (
        <div>
          {ouraLoad && <p className="empty">Loading Oura data…</p>}
          {ouraErr  && <div className="card"><p className="empty" style={{ color: "var(--red)" }}>Error: {ouraErr}</p></div>}
          {!ouraLoad && !ouraErr && oura.length === 0 && <div className="card"><p className="empty">No Oura data found.</p></div>}
          {oura.length > 0 && (() => {
            const latest = oura[0];
            const scoreColor = (s: number | null) => !s ? "var(--text)" : s >= 85 ? "var(--green)" : s >= 70 ? "var(--yellow)" : "var(--red)";
            return (
              <div>
                {/* Today's scores */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginBottom: "16px" }}>
                  {[
                    { label: "Readiness", value: latest.readinessScore },
                    { label: "Sleep",     value: latest.sleepScore     },
                    { label: "Activity",  value: latest.activityScore  },
                  ].map(s => (
                    <div key={s.label} className="card" style={{ padding: "12px 14px", textAlign: "center" }}>
                      <p style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 6px" }}>{s.label}</p>
                      <p style={{ fontSize: "32px", fontWeight: 700, margin: 0, color: scoreColor(s.value), fontVariantNumeric: "tabular-nums" }}>{s.value ?? "—"}</p>
                    </div>
                  ))}
                </div>

                {/* Stats row */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "10px", marginBottom: "16px" }}>
                  {[
                    { label: "Sleep",      value: latest.sleepDuration  ? `${latest.sleepDuration}h`               : "—" },
                    { label: "HRV",        value: latest.hrvAvg         ? `${latest.hrvAvg}`                        : "—" },
                    { label: "Resting HR", value: latest.restingHR      ? `${latest.restingHR} bpm`                : "—" },
                    { label: "Steps",      value: latest.steps          ? latest.steps.toLocaleString()             : "—" },
                    { label: "Cal burned", value: latest.activeCalories ? `${latest.activeCalories.toLocaleString()} kcal` : "—" },
                  ].map(s => (
                    <div key={s.label} className="card" style={{ padding: "10px 12px" }}>
                      <p style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 4px" }}>{s.label}</p>
                      <p style={{ fontSize: "18px", fontWeight: 700, margin: 0, fontVariantNumeric: "tabular-nums" }}>{s.value}</p>
                    </div>
                  ))}
                </div>

                {/* History */}
                <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                  <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border)" }}>
                    <p className="card-title" style={{ margin: 0 }}>Last 30 days</p>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "100px repeat(3, 1fr) 1fr 1fr 1fr", gap: "0 6px", padding: "6px 16px", borderBottom: "1px solid var(--border)" }}>
                    {["Date","Readiness","Sleep","Activity","Sleep hrs","Steps","Calories"].map(h => (
                      <span key={h} style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "center" }}>{h}</span>
                    ))}
                  </div>
                  {oura.map((day, i) => (
                    <div key={day.date} style={{ display: "grid", gridTemplateColumns: "100px repeat(3, 1fr) 1fr 1fr 1fr", gap: "0 6px", padding: "8px 16px", borderTop: i === 0 ? "none" : "1px solid var(--border)" }}>
                      <span style={{ fontSize: "12.5px", color: "var(--text-2)" }}>{fmtDate(day.date)}</span>
                      {[day.readinessScore, day.sleepScore, day.activityScore].map((s, j) => (
                        <span key={j} style={{ fontSize: "13px", fontWeight: 600, textAlign: "center", color: scoreColor(s), fontVariantNumeric: "tabular-nums" }}>{s ?? "—"}</span>
                      ))}
                      <span style={{ fontSize: "13px", textAlign: "center", color: "var(--text-2)", fontVariantNumeric: "tabular-nums" }}>{day.sleepDuration ? `${day.sleepDuration}h` : "—"}</span>
                      <span style={{ fontSize: "13px", textAlign: "center", color: "var(--text-2)", fontVariantNumeric: "tabular-nums" }}>{day.steps ? day.steps.toLocaleString() : "—"}</span>
                      <span style={{ fontSize: "13px", textAlign: "center", color: "var(--text-2)", fontVariantNumeric: "tabular-nums" }}>{day.activeCalories ? day.activeCalories.toLocaleString() : "—"}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
