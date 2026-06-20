"use client";

import { useEffect, useState, useCallback, useRef } from "react";

type Habit = {
  id: string;
  name: string;
  emoji: string;
  color: string;
  active: boolean;
  order: number;
};

type HabitLog = {
  date: string;
  habitId: string;
};

type HabitsData = { habits: Habit[]; logs: HabitLog[] };
type DashData   = { habits?: HabitsData; [key: string]: unknown };
type SaveStatus = "idle" | "saving" | "saved" | "error";
type View       = "today" | "history";

const COLORS = [
  "#7c6ff7", "#3b82f6", "#22c55e", "#f59e0b",
  "#ef4444", "#ec4899", "#14b8a6", "#f97316",
];

function todayStr() { return new Date().toISOString().slice(0, 10); }

function daysAgoStr(n: number) {
  const d = new Date(); d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function computeStreak(habitId: string, logs: HabitLog[], upTo: string): number {
  let streak = 0;
  let cursor = upTo;
  const logged = new Set(logs.filter(l => l.habitId === habitId).map(l => l.date));
  while (logged.has(cursor)) {
    streak++;
    const d = new Date(cursor + "T00:00:00"); d.setDate(d.getDate() - 1);
    cursor = d.toISOString().slice(0, 10);
  }
  return streak;
}

function getLast30Days(): string[] {
  return Array.from({ length: 30 }, (_, i) => daysAgoStr(29 - i));
}

const DragIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" opacity="0.4">
    <circle cx="5" cy="4" r="1" fill="currentColor" stroke="none" />
    <circle cx="9" cy="4" r="1" fill="currentColor" stroke="none" />
    <circle cx="5" cy="7" r="1" fill="currentColor" stroke="none" />
    <circle cx="9" cy="7" r="1" fill="currentColor" stroke="none" />
    <circle cx="5" cy="10" r="1" fill="currentColor" stroke="none" />
    <circle cx="9" cy="10" r="1" fill="currentColor" stroke="none" />
  </svg>
);

const EMOJI_OPTIONS = ["✅", "💧", "🏃", "🧘", "📖", "💊", "🥗", "🛌", "🧹", "✍️", "🚶", "🎯", "🎸", "🧠", "💪", "🌿", "☀️", "🍎", "🚫🍺", "🧘‍♀️"];

export default function HabitsPage() {
  const [habits,  setHabits]  = useState<Habit[]>([]);
  const [logs,    setLogs]    = useState<HabitLog[]>([]);
  const [status,  setStatus]  = useState<SaveStatus>("idle");
  const [loading, setLoading] = useState(true);
  const [view,    setView]    = useState<View>("today");
  const [adding,  setAdding]  = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmoji, setNewEmoji] = useState("✅");
  const [newColor, setNewColor] = useState(COLORS[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rawDataRef = useRef<DashData>({});
  const today = todayStr();

  useEffect(() => {
    fetch("/api/data")
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(res => {
        const d: DashData = res.data ?? {};
        rawDataRef.current = d;
        const h = d.habits?.habits ?? [];
        setHabits(h.sort((a: Habit, b: Habit) => a.order - b.order));
        setLogs(d.habits?.logs ?? []);
      })
      .catch(() => setStatus("error"))
      .finally(() => setLoading(false));
  }, []);

  const persist = useCallback((updHabits: Habit[], updLogs: HabitLog[]) => {
    setStatus("saving");
    if (timer.current) clearTimeout(timer.current);
    const newData = { ...rawDataRef.current, habits: { habits: updHabits, logs: updLogs } };
    rawDataRef.current = newData;
    fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data: newData }) })
      .then(r => { if (!r.ok) throw new Error(); setStatus("saved"); })
      .catch(() => setStatus("error"))
      .finally(() => { timer.current = setTimeout(() => setStatus("idle"), 2000); });
  }, []);

  const toggleLog = (habitId: string) => {
    const already = logs.some(l => l.date === today && l.habitId === habitId);
    const updLogs = already
      ? logs.filter(l => !(l.date === today && l.habitId === habitId))
      : [...logs, { date: today, habitId }];
    setLogs(updLogs);
    persist(habits, updLogs);
  };

  const addHabit = () => {
    if (!newName.trim()) return;
    const h: Habit = { id: crypto.randomUUID(), name: newName.trim(), emoji: newEmoji, color: newColor, active: true, order: habits.length };
    const upd = [...habits, h];
    setHabits(upd); persist(upd, logs);
    setNewName(""); setNewEmoji("✅"); setNewColor(COLORS[0]); setAdding(false);
  };

  const deleteHabit = (id: string) => {
    const upd = habits.filter(h => h.id !== id).map((h, i) => ({ ...h, order: i }));
    const updLogs = logs.filter(l => l.habitId !== id);
    setHabits(upd); setLogs(updLogs); persist(upd, updLogs);
  };

  const updateHabit = (id: string, patch: Partial<Habit>) => {
    const upd = habits.map(h => h.id === id ? { ...h, ...patch } : h);
    setHabits(upd); persist(upd, logs);
  };

  const activeHabits = habits.filter(h => h.active);
  const doneToday = new Set(logs.filter(l => l.date === today).map(l => l.habitId));
  const completedCount = activeHabits.filter(h => doneToday.has(h.id)).length;
  const last30 = getLast30Days();

  if (loading) return <p className="empty" style={{ padding: "32px 0" }}>Loading…</p>;

  return (
    <div style={{ maxWidth: "680px" }}>
      {status !== "idle" && (
        <div className={`toast${status === "error" ? " error" : ""}`}>
          {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : "Error saving."}
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
            <h1 style={{ margin: 0, fontSize: "22px", fontWeight: 700 }}>Habits</h1>
            {activeHabits.length > 0 && (
              <span style={{ fontSize: "13px", color: completedCount === activeHabits.length ? "var(--green)" : "var(--text-3)", fontWeight: 600 }}>
                {completedCount}/{activeHabits.length} today
              </span>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <div style={{ display: "flex", border: "1px solid var(--border)", borderRadius: "8px", overflow: "hidden" }}>
            {(["today", "history"] as View[]).map(v => (
              <button key={v} onClick={() => setView(v)}
                style={{ padding: "5px 14px", fontSize: "12.5px", fontWeight: 600, border: "none", cursor: "pointer", background: view === v ? "var(--accent)" : "transparent", color: view === v ? "white" : "var(--text-2)", transition: "all 0.1s" }}>
                {v === "today" ? "Today" : "History"}
              </button>
            ))}
          </div>
          <button className="btn btn-primary" style={{ fontSize: "12.5px", padding: "5px 14px" }} onClick={() => setAdding(true)}>+ Add</button>
        </div>
      </div>

      {/* Progress bar */}
      {activeHabits.length > 0 && (
        <div style={{ marginBottom: "20px" }}>
          <div style={{ height: "6px", borderRadius: "99px", background: "var(--surface-raised)", overflow: "hidden" }}>
            <div style={{ height: "100%", borderRadius: "99px", background: completedCount === activeHabits.length ? "var(--green)" : "var(--accent)", width: `${(completedCount / activeHabits.length) * 100}%`, transition: "width 0.3s" }} />
          </div>
        </div>
      )}

      {/* Add habit form */}
      {adding && (
        <div className="card" style={{ marginBottom: "16px" }}>
          <p className="card-title" style={{ margin: "0 0 12px" }}>New habit</p>
          <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
            {/* Emoji picker */}
            <div style={{ position: "relative" }}>
              <select value={newEmoji} onChange={e => setNewEmoji(e.target.value)}
                style={{ fontSize: "20px", padding: "6px 4px", background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: "8px", cursor: "pointer", appearance: "none", width: "48px", textAlign: "center" }}>
                {EMOJI_OPTIONS.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
            <input value={newName} onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") addHabit(); if (e.key === "Escape") setAdding(false); }}
              placeholder="Habit name…" autoFocus
              style={{ flex: 1, background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: "8px", padding: "8px 12px", fontSize: "14px", color: "var(--text)", fontFamily: "inherit", outline: "none" }} />
          </div>
          {/* Color picker */}
          <div style={{ display: "flex", gap: "8px", marginBottom: "14px", flexWrap: "wrap" }}>
            {COLORS.map(c => (
              <button key={c} onClick={() => setNewColor(c)}
                style={{ width: "28px", height: "28px", borderRadius: "50%", background: c, border: newColor === c ? "3px solid var(--text)" : "3px solid transparent", cursor: "pointer", flexShrink: 0 }} />
            ))}
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button className="btn btn-primary" style={{ fontSize: "13px" }} onClick={addHabit}>Add habit</button>
            <button className="btn btn-secondary" style={{ fontSize: "13px" }} onClick={() => { setAdding(false); setNewName(""); }}>Cancel</button>
          </div>
        </div>
      )}

      {/* ── TODAY VIEW ── */}
      {view === "today" && (
        <>
          {activeHabits.length === 0 ? (
            <p className="empty">No habits yet. Add one to get started.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {activeHabits.map(habit => {
                const done = doneToday.has(habit.id);
                const streak = computeStreak(habit.id, logs, today);
                const isEditing = editingId === habit.id;
                return (
                  <div key={habit.id} className="card" style={{ padding: "14px 16px" }}>
                    {isEditing ? (
                      <div>
                        <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
                          <select value={habit.emoji} onChange={e => updateHabit(habit.id, { emoji: e.target.value })}
                            style={{ fontSize: "20px", padding: "4px", background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: "6px", appearance: "none", width: "44px", textAlign: "center", cursor: "pointer" }}>
                            {EMOJI_OPTIONS.map(e => <option key={e} value={e}>{e}</option>)}
                          </select>
                          <input defaultValue={habit.name} onBlur={e => updateHabit(habit.id, { name: e.target.value })}
                            onKeyDown={e => { if (e.key === "Enter" || e.key === "Escape") setEditingId(null); }}
                            autoFocus style={{ flex: 1, background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: "6px", padding: "6px 10px", fontSize: "14px", color: "var(--text)", fontFamily: "inherit", outline: "none" }} />
                        </div>
                        <div style={{ display: "flex", gap: "8px", marginBottom: "10px", flexWrap: "wrap" }}>
                          {COLORS.map(c => (
                            <button key={c} onClick={() => updateHabit(habit.id, { color: c })}
                              style={{ width: "24px", height: "24px", borderRadius: "50%", background: c, border: habit.color === c ? "3px solid var(--text)" : "3px solid transparent", cursor: "pointer" }} />
                          ))}
                        </div>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button className="btn btn-secondary" style={{ fontSize: "12px" }} onClick={() => setEditingId(null)}>Done</button>
                          <button className="btn btn-secondary" style={{ fontSize: "12px", color: "var(--red)" }} onClick={() => { deleteHabit(habit.id); setEditingId(null); }}>Delete</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <DragIcon />
                        {/* Check circle */}
                        <button onClick={() => toggleLog(habit.id)}
                          style={{ width: "40px", height: "40px", borderRadius: "50%", border: done ? "none" : `2px solid ${habit.color}`, background: done ? habit.color : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "18px", transition: "all 0.15s" }}>
                          {done
                            ? <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="white" strokeWidth="2.2"><path d="M3 9l4.5 4.5L15 5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            : <span style={{ fontSize: "20px", lineHeight: 1 }}>{habit.emoji}</span>
                          }
                        </button>
                        <div style={{ flex: 1 }}>
                          <p style={{ margin: 0, fontSize: "14.5px", fontWeight: 600, color: done ? "var(--text-3)" : "var(--text)", textDecoration: done ? "line-through" : "none" }}>{habit.name}</p>
                          {streak > 0 && (
                            <p style={{ margin: "2px 0 0", fontSize: "11.5px", color: streak >= 7 ? "var(--green)" : "var(--text-3)" }}>
                              🔥 {streak} day streak
                            </p>
                          )}
                        </div>
                        <button className="btn-icon" onClick={() => setEditingId(habit.id)} style={{ opacity: 0.4 }}>
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4">
                            <path d="M2 10.5l1.5-1.5 7-7 1.5 1.5-7 7-1.5 1.5H2v-1.5z" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── HISTORY VIEW ── */}
      {view === "history" && (
        <div>
          {activeHabits.length === 0 ? (
            <p className="empty">No habits yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {activeHabits.map(habit => {
                const logSet = new Set(logs.filter(l => l.habitId === habit.id).map(l => l.date));
                const streak = computeStreak(habit.id, logs, today);
                const completedDays = last30.filter(d => logSet.has(d)).length;
                return (
                  <div key={habit.id} className="card">
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                      <span style={{ fontSize: "20px" }}>{habit.emoji}</span>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontSize: "14px", fontWeight: 600 }}>{habit.name}</p>
                        <p style={{ margin: "2px 0 0", fontSize: "11.5px", color: "var(--text-3)" }}>
                          {completedDays}/30 days · {streak > 0 ? `🔥 ${streak} day streak` : "No current streak"}
                        </p>
                      </div>
                      <span style={{ fontSize: "12px", fontWeight: 700, color: habit.color, background: habit.color + "22", padding: "3px 10px", borderRadius: "99px" }}>
                        {Math.round((completedDays / 30) * 100)}%
                      </span>
                    </div>
                    {/* 30-day grid — 5 rows × 6 cols */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(10, 1fr)", gap: "4px" }}>
                      {last30.map(d => {
                        const done = logSet.has(d);
                        const isToday = d === today;
                        return (
                          <div key={d} title={d} onClick={() => {
                            const updLogs = done
                              ? logs.filter(l => !(l.habitId === habit.id && l.date === d))
                              : [...logs, { date: d, habitId: habit.id }];
                            setLogs(updLogs); persist(habits, updLogs);
                          }}
                            style={{ aspectRatio: "1", borderRadius: "4px", background: done ? habit.color : "var(--surface-raised)", cursor: "pointer", border: isToday ? `2px solid ${habit.color}` : "2px solid transparent", opacity: done ? 1 : 0.5, transition: "opacity 0.1s" }} />
                        );
                      })}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px", fontSize: "10px", color: "var(--text-3)" }}>
                      <span>30 days ago</span>
                      <span>Today</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
