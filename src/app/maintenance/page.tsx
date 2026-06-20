"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  MainTask, TaskPeriod, MaintenanceData,
  PERIOD_LABELS, SEED_TASKS,
  tasksForToday, isCompletedToday, toggleCompletion, isSummerSeason,
} from "@/lib/maintenance";

type Replacement = { id: string; name: string; quote?: number; notes?: string; done: boolean; };
type DashData  = { maintenance?: MaintenanceData; replacements?: { items: Replacement[] }; [key: string]: unknown };
type SaveStatus = "idle" | "saving" | "saved" | "error";

const SEED_REPLACEMENTS: Replacement[] = [
  { id: "rep1", name: "Water Heater",    done: false },
  { id: "rep2", name: "Washer / Dryer",  done: false },
  { id: "rep3", name: "Central A/C",     done: false },
];

function todayStr() { return new Date().toISOString().slice(0, 10); }

const PERIODS: TaskPeriod[] = ["morning", "evening", "weekly", "monthly", "quarterly", "annual"];

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

export default function MaintenancePage() {
  const [maint,        setMaint]        = useState<MaintenanceData>({ tasks: [], completions: [] });
  const [status,       setStatus]       = useState<SaveStatus>("idle");
  const [loading,      setLoading]      = useState(true);
  const [view,         setView]         = useState<"today" | "manage" | "replacements">("today");
  const [editId,       setEditId]       = useState<string | null>(null);
  const [editTitle,    setEditTitle]    = useState("");
  const [addingPeriod, setAddingPeriod] = useState<TaskPeriod | null>(null);
  const [newTitle,     setNewTitle]     = useState("");
  const [newSeasonal,  setNewSeasonal]  = useState(false);
  const [replacements, setReplacements] = useState<Replacement[]>([]);
  const [addingRep,    setAddingRep]    = useState(false);
  const [repName,      setRepName]      = useState("");
  const [repQuote,     setRepQuote]     = useState("");
  const [repNotes,     setRepNotes]     = useState("");
  const [editRepId,    setEditRepId]    = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rawDataRef = useRef<DashData>({});
  const today = todayStr();

  useEffect(() => {
    fetch("/api/data")
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(res => {
        const d: DashData = res.data ?? {};
        rawDataRef.current = d;
        const saved = d.maintenance;
        // Detect old format (had `frequency` field) → replace with seeds
        if (!saved?.tasks?.length || (saved.tasks[0] as unknown as { frequency?: string }).frequency) {
          setMaint({ tasks: SEED_TASKS, completions: [] });
        } else {
          setMaint(saved as MaintenanceData);
        }
        setReplacements(d.replacements?.items ?? SEED_REPLACEMENTS);
      })
      .catch(() => setStatus("error"))
      .finally(() => setLoading(false));
  }, []);

  const save = useCallback(async (updated: MaintenanceData) => {
    setStatus("saving");
    if (timer.current) clearTimeout(timer.current);
    const newData = { ...rawDataRef.current, maintenance: updated };
    rawDataRef.current = newData;
    try {
      const res = await fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data: newData }) });
      if (!res.ok) throw new Error();
      setStatus("saved");
    } catch { setStatus("error"); }
    finally { timer.current = setTimeout(() => setStatus("idle"), 2000); }
  }, []);

  const saveReplacements = useCallback(async (items: Replacement[]) => {
    setStatus("saving");
    if (timer.current) clearTimeout(timer.current);
    const newData = { ...rawDataRef.current, replacements: { items } };
    rawDataRef.current = newData;
    try {
      const res = await fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data: newData }) });
      if (!res.ok) throw new Error();
      setStatus("saved");
    } catch { setStatus("error"); }
    finally { timer.current = setTimeout(() => setStatus("idle"), 2000); }
  }, []);

  const addReplacement = () => {
    if (!repName.trim()) return;
    const item: Replacement = { id: crypto.randomUUID(), name: repName.trim(), quote: repQuote ? parseFloat(repQuote) : undefined, notes: repNotes.trim() || undefined, done: false };
    const upd = [...replacements, item];
    setReplacements(upd); saveReplacements(upd);
    setRepName(""); setRepQuote(""); setRepNotes(""); setAddingRep(false);
  };

  const updateReplacement = (id: string, changes: Partial<Replacement>) => {
    const upd = replacements.map(r => r.id === id ? { ...r, ...changes } : r);
    setReplacements(upd); saveReplacements(upd);
  };

  const deleteReplacement = (id: string) => {
    const upd = replacements.filter(r => r.id !== id);
    setReplacements(upd); saveReplacements(upd);
  };

  const toggle = (taskId: string) => {
    const updated = { ...maint, completions: toggleCompletion(maint.completions, taskId, today) };
    setMaint(updated); save(updated);
  };

  const toggleActive = (id: string) => {
    const updated = { ...maint, tasks: maint.tasks.map(t => t.id === id ? { ...t, active: !t.active } : t) };
    setMaint(updated); save(updated);
  };

  const saveEdit = (id: string) => {
    if (!editTitle.trim()) return;
    const updated = { ...maint, tasks: maint.tasks.map(t => t.id === id ? { ...t, title: editTitle.trim() } : t) };
    setMaint(updated); setEditId(null); save(updated);
  };

  const deleteTask = (id: string) => {
    const updated = { ...maint, tasks: maint.tasks.filter(t => t.id !== id) };
    setMaint(updated); save(updated);
  };

  const addTask = () => {
    if (!newTitle.trim() || !addingPeriod) return;
    const task: MainTask = { id: crypto.randomUUID(), title: newTitle.trim(), period: addingPeriod, active: true, seasonal: newSeasonal };
    const updated = { ...maint, tasks: [...maint.tasks, task] };
    setMaint(updated); setAddingPeriod(null); setNewTitle(""); setNewSeasonal(false); save(updated);
  };

  if (loading) return <p className="empty" style={{ padding: "32px 0" }}>Loading…</p>;

  const todayTasks = tasksForToday(maint.tasks, today);
  const inSeason   = isSummerSeason(today);
  const todayDone  = todayTasks.filter(t => isCompletedToday(maint.completions, t.id, today)).length;

  return (
    <div style={{ maxWidth: "760px" }}>
      {status !== "idle" && (
        <div className={`toast${status === "error" ? " error" : ""}`}>
          {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : "Could not save — check connection."}
        </div>
      )}

      <div style={{ display: "flex", gap: "4px", marginBottom: "16px", alignItems: "center", flexWrap: "wrap" }}>
        <button onClick={() => setView("today")}        className={view === "today"        ? "btn btn-primary" : "btn btn-secondary"} style={{ fontSize: "13px", padding: "6px 16px" }}>Today</button>
        <button onClick={() => setView("manage")}       className={view === "manage"       ? "btn btn-primary" : "btn btn-secondary"} style={{ fontSize: "13px", padding: "6px 16px" }}>Manage tasks</button>
        <button onClick={() => setView("replacements")} className={view === "replacements" ? "btn btn-primary" : "btn btn-secondary"} style={{ fontSize: "13px", padding: "6px 16px" }}>
          Replacements {replacements.filter(r => !r.done).length > 0 && <span style={{ marginLeft: "5px", background: "var(--accent-dim)", color: "var(--accent-text)", borderRadius: "99px", padding: "0 6px", fontSize: "11px" }}>{replacements.filter(r => !r.done).length}</span>}
        </button>
        {!inSeason && view !== "replacements" && <span style={{ marginLeft: "auto", fontSize: "11.5px", color: "var(--text-3)" }}>Seasonal (AC) tasks hidden Nov–Apr</span>}
      </div>

      {/* TODAY VIEW */}
      {view === "today" && (
        <div>
          {todayTasks.length === 0 ? (
            <div className="card"><p className="empty">Nothing scheduled for today.</p></div>
          ) : (
            <>
              <div style={{ marginBottom: "14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--text-2)" }}>Today&apos;s progress</span>
                  <span style={{ fontSize: "12.5px", color: "var(--text-3)" }}>{todayDone}/{todayTasks.length} done</span>
                </div>
                <div style={{ height: "6px", borderRadius: "99px", background: "var(--surface-raised)", overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: "99px", background: "var(--green)", width: `${todayTasks.length ? (todayDone / todayTasks.length) * 100 : 0}%`, transition: "width 0.3s" }} />
                </div>
              </div>

              {PERIODS.map(period => {
                const group = todayTasks.filter(t => t.period === period);
                if (!group.length) return null;
                const label = period === "morning" ? "Morning" : period === "evening" ? "Evening" : PERIOD_LABELS[period];
                return (
                  <div key={period} className="card" style={{ marginBottom: "10px" }}>
                    <p className="card-title" style={{ marginBottom: "10px" }}>{label}</p>
                    {group.map(task => {
                      const done = isCompletedToday(maint.completions, task.id, today);
                      return (
                        <label key={task.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "5px 0", cursor: "pointer", userSelect: "none" }}>
                          <span style={{ width: "20px", height: "20px", borderRadius: "6px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: done ? "var(--green)" : "var(--surface-raised)", border: done ? "none" : "1px solid var(--border)", transition: "all 0.1s" }}
                            onClick={() => toggle(task.id)}>
                            {done && <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="white" strokeWidth="1.8"><path d="M1.5 5.5l3 3L9.5 2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                          </span>
                          <span style={{ fontSize: "13.5px", color: done ? "var(--text-3)" : "var(--text)", textDecoration: done ? "line-through" : "none", transition: "all 0.1s" }}>
                            {task.title}
                            {task.seasonal && <span style={{ fontSize: "10px", color: "var(--accent)", marginLeft: "6px", fontWeight: 600 }}>seasonal</span>}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      {/* REPLACEMENTS VIEW */}
      {view === "replacements" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <p style={{ fontSize: "13px", color: "var(--text-2)", margin: 0 }}>Track appliances and home items that need replacing. Add quote amounts as you get estimates.</p>
            <button className="btn btn-primary" style={{ fontSize: "12px", padding: "5px 12px", flexShrink: 0, marginLeft: "12px" }} onClick={() => { setAddingRep(true); setEditRepId(null); setRepName(""); setRepQuote(""); setRepNotes(""); }}>+ Add item</button>
          </div>

          {addingRep && (
            <div className="card" style={{ marginBottom: "12px" }}>
              <p style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-2)", marginBottom: "10px" }}>New replacement item</p>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "8px" }}>
                <input className="input" placeholder="Item name (e.g. Water Heater)" value={repName} autoFocus onChange={e => setRepName(e.target.value)} style={{ flex: "2 1 160px" }} onKeyDown={e => e.key === "Enter" && addReplacement()} />
                <div style={{ display: "flex", alignItems: "center", background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: "6px", padding: "0 10px", flex: "1 1 110px" }}>
                  <span style={{ color: "var(--text-3)", fontSize: "13px", marginRight: "4px" }}>$</span>
                  <input style={{ background: "none", border: "none", outline: "none", color: "var(--text)", fontSize: "13px", width: "80px", fontFamily: "inherit" }} type="number" step="0.01" min="0" placeholder="Quote" value={repQuote} onChange={e => setRepQuote(e.target.value)} />
                </div>
              </div>
              <input className="input" placeholder="Notes (optional)" value={repNotes} onChange={e => setRepNotes(e.target.value)} style={{ marginBottom: "10px" }} />
              <div style={{ display: "flex", gap: "8px" }}>
                <button className="btn btn-primary" style={{ fontSize: "12px", padding: "4px 12px" }} onClick={addReplacement}>Add</button>
                <button className="btn btn-secondary" style={{ fontSize: "12px", padding: "4px 10px" }} onClick={() => setAddingRep(false)}>Cancel</button>
              </div>
            </div>
          )}

          {replacements.length === 0 && !addingRep && <div className="card"><p className="empty">No items tracked yet.</p></div>}

          {/* Pending */}
          {replacements.filter(r => !r.done).map(r => {
            const isEditing = editRepId === r.id;
            if (isEditing) return (
              <div key={r.id} className="card" style={{ marginBottom: "8px" }}>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "8px" }}>
                  <input className="input" value={repName} onChange={e => setRepName(e.target.value)} style={{ flex: "2 1 160px" }} autoFocus />
                  <div style={{ display: "flex", alignItems: "center", background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: "6px", padding: "0 10px", flex: "1 1 110px" }}>
                    <span style={{ color: "var(--text-3)", fontSize: "13px", marginRight: "4px" }}>$</span>
                    <input style={{ background: "none", border: "none", outline: "none", color: "var(--text)", fontSize: "13px", width: "80px", fontFamily: "inherit" }} type="number" step="0.01" min="0" value={repQuote} onChange={e => setRepQuote(e.target.value)} />
                  </div>
                </div>
                <input className="input" placeholder="Notes" value={repNotes} onChange={e => setRepNotes(e.target.value)} style={{ marginBottom: "8px" }} />
                <div style={{ display: "flex", gap: "8px" }}>
                  <button className="btn btn-primary" style={{ fontSize: "12px", padding: "4px 12px" }} onClick={() => { updateReplacement(r.id, { name: repName.trim(), quote: repQuote ? parseFloat(repQuote) : undefined, notes: repNotes.trim() || undefined }); setEditRepId(null); }}>Save</button>
                  <button className="btn btn-secondary" style={{ fontSize: "12px", padding: "4px 10px" }} onClick={() => setEditRepId(null)}>Cancel</button>
                  <button className="btn btn-secondary" style={{ fontSize: "12px", padding: "4px 10px", color: "var(--red)", marginLeft: "auto" }} onClick={() => { deleteReplacement(r.id); setEditRepId(null); }}>Delete</button>
                </div>
              </div>
            );
            return (
              <div key={r.id} className="card" style={{ marginBottom: "8px" }}
                onMouseEnter={e => e.currentTarget.querySelectorAll<HTMLElement>(".rep-action").forEach(el => el.style.opacity = "1")}
                onMouseLeave={e => e.currentTarget.querySelectorAll<HTMLElement>(".rep-action").forEach(el => el.style.opacity = "0")}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <input type="checkbox" checked={r.done} onChange={() => updateReplacement(r.id, { done: !r.done })} style={{ cursor: "pointer", flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text)" }}>{r.name}</div>
                    {r.notes && <div style={{ fontSize: "12px", color: "var(--text-3)", marginTop: "2px" }}>{r.notes}</div>}
                  </div>
                  {r.quote != null ? (
                    <span style={{ fontSize: "15px", fontWeight: 700, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>${r.quote.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  ) : (
                    <span style={{ fontSize: "12px", color: "var(--text-3)", fontStyle: "italic" }}>No quote yet</span>
                  )}
                  <button className="btn-icon rep-action" style={{ opacity: 0 }} onClick={() => { setEditRepId(r.id); setRepName(r.name); setRepQuote(r.quote ? String(r.quote) : ""); setRepNotes(r.notes ?? ""); }}><PencilIcon /></button>
                  <button className="btn-icon rep-action" style={{ opacity: 0 }} onClick={() => deleteReplacement(r.id)}><XIcon /></button>
                </div>
              </div>
            );
          })}

          {/* Completed */}
          {replacements.filter(r => r.done).length > 0 && (
            <details style={{ marginTop: "12px" }}>
              <summary style={{ fontSize: "12px", color: "var(--text-3)", cursor: "pointer", fontWeight: 600 }}>Replaced ({replacements.filter(r => r.done).length})</summary>
              <div style={{ marginTop: "8px" }}>
                {replacements.filter(r => r.done).map(r => (
                  <div key={r.id} className="card" style={{ marginBottom: "6px", opacity: 0.5 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <input type="checkbox" checked={true} onChange={() => updateReplacement(r.id, { done: false })} style={{ cursor: "pointer", flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: "13.5px", color: "var(--text-3)", textDecoration: "line-through" }}>{r.name}</span>
                      {r.quote != null && <span style={{ fontSize: "13px", color: "var(--text-3)" }}>${r.quote.toFixed(2)}</span>}
                      <button className="btn-icon" onClick={() => deleteReplacement(r.id)}><XIcon /></button>
                    </div>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}

      {/* MANAGE VIEW */}
      {view === "manage" && (
        <div>
          {PERIODS.map(period => {
            const group = maint.tasks.filter(t => t.period === period);
            return (
              <div key={period} className="card" style={{ marginBottom: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                  <p className="card-title" style={{ margin: 0 }}>{PERIOD_LABELS[period]}</p>
                  <button className="btn btn-secondary" style={{ fontSize: "11px", padding: "3px 10px" }}
                    onClick={() => { setAddingPeriod(period); setNewTitle(""); setNewSeasonal(false); }}>+ Add</button>
                </div>

                {group.map(task => {
                  if (editId === task.id) return (
                    <div key={task.id} style={{ display: "flex", gap: "8px", marginBottom: "6px" }}>
                      <input className="input" value={editTitle} onChange={e => setEditTitle(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && saveEdit(task.id)} style={{ flex: 1 }} autoFocus />
                      <button className="btn btn-primary" style={{ fontSize: "12px", padding: "4px 10px" }} onClick={() => saveEdit(task.id)}>Save</button>
                      <button className="btn btn-secondary" style={{ fontSize: "12px", padding: "4px 8px" }} onClick={() => setEditId(null)}>Cancel</button>
                    </div>
                  );
                  return (
                    <div key={task.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "5px 0", opacity: task.active ? 1 : 0.45 }}
                      onMouseEnter={e => e.currentTarget.querySelectorAll<HTMLElement>(".mact").forEach(el => el.style.opacity = "1")}
                      onMouseLeave={e => e.currentTarget.querySelectorAll<HTMLElement>(".mact").forEach(el => el.style.opacity = "0")}>
                      <input type="checkbox" checked={task.active} onChange={() => toggleActive(task.id)} title="Active" style={{ cursor: "pointer", flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: "13.5px", color: "var(--text-2)" }}>
                        {task.title}
                        {task.seasonal && <span style={{ fontSize: "10px", color: "var(--accent)", marginLeft: "6px", fontWeight: 600 }}>May–Oct</span>}
                      </span>
                      <button className="btn-icon mact" style={{ opacity: 0 }} onClick={() => { setEditId(task.id); setEditTitle(task.title); }}><PencilIcon /></button>
                      <button className="btn-icon mact" style={{ opacity: 0 }} onClick={() => deleteTask(task.id)}><XIcon /></button>
                    </div>
                  );
                })}

                {addingPeriod === period && (
                  <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "6px", background: "var(--surface-raised)", borderRadius: "6px", padding: "10px" }}>
                    <input className="input" placeholder="Task title" value={newTitle} autoFocus
                      onChange={e => setNewTitle(e.target.value)} onKeyDown={e => e.key === "Enter" && addTask()} />
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12.5px", color: "var(--text-2)", cursor: "pointer" }}>
                      <input type="checkbox" checked={newSeasonal} onChange={e => setNewSeasonal(e.target.checked)} />
                      Seasonal only (May 1 – Oct 1)
                    </label>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button className="btn btn-primary" style={{ fontSize: "12px", padding: "4px 10px" }} onClick={addTask}>Add</button>
                      <button className="btn btn-secondary" style={{ fontSize: "12px", padding: "4px 8px" }} onClick={() => setAddingPeriod(null)}>Cancel</button>
                    </div>
                  </div>
                )}

                {group.length === 0 && addingPeriod !== period && (
                  <p className="empty" style={{ margin: "4px 0" }}>No tasks yet.</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
