"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { MaintenanceData, tasksForToday, isCompletedToday, toggleCompletion, SEED_TASKS } from "@/lib/maintenance";
import { RecurringItem, itemAppliesToDate } from "@/lib/finances";

type Priority = "high" | "medium" | "low";
type Todo = {
  id: string;
  text: string;
  done: boolean;
  dueDate?: string;
  priority?: Priority;
};
type DashData = { todos?: Todo[]; maintenance?: MaintenanceData; finances?: { items?: RecurringItem[] }; [key: string]: unknown };
type SaveStatus = "idle" | "saving" | "saved" | "error";

const PRIORITY_COLOR: Record<Priority, string> = { high: "var(--red)", medium: "var(--yellow)", low: "var(--text-3)" };
const PRIORITY_BG: Record<Priority, string>    = { high: "var(--red-dim)", medium: "var(--yellow-dim)", low: "transparent" };

function todayStr() { return new Date().toISOString().slice(0, 10); }

function dueLabel(dateStr: string): { label: string; color: string } {
  const today = todayStr();
  const diff  = Math.round((new Date(dateStr + "T00:00:00").getTime() - new Date(today + "T00:00:00").getTime()) / 86400000);
  if (diff < 0)   return { label: `${Math.abs(diff)}d overdue`, color: "var(--red)" };
  if (diff === 0) return { label: "Today",                       color: "var(--yellow)" };
  if (diff === 1) return { label: "Tomorrow",                    color: "var(--accent-text)" };
  if (diff <= 7)  return { label: `In ${diff} days`,             color: "var(--text-2)" };
  return { label: new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }), color: "var(--text-3)" };
}

function groupTodos(todos: Todo[]) {
  const today = todayStr();
  const overdue: Todo[] = [], dueToday: Todo[] = [], upcoming: Todo[] = [], noDate: Todo[] = [];
  todos.filter(t => !t.done).forEach(t => {
    if (!t.dueDate)              noDate.push(t);
    else if (t.dueDate < today)  overdue.push(t);
    else if (t.dueDate === today) dueToday.push(t);
    else                         upcoming.push(t);
  });
  upcoming.sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""));
  return { overdue, dueToday, upcoming, noDate };
}

const XIcon = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M2 2l9 9M11 2l-9 9" strokeLinecap="round" />
  </svg>
);

export default function TodosPage() {
  const [data,    setData]    = useState<DashData>({});
  const [todos,   setTodos]   = useState<Todo[]>([]);
  const [maint,   setMaint]   = useState<MaintenanceData>({ tasks: [], completions: [] });
  const [billItems, setBillItems] = useState<RecurringItem[]>([]);
  const [status,  setStatus]  = useState<SaveStatus>("idle");
  const [loading, setLoading] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [newText,     setNewText]     = useState("");
  const [newDueDate,  setNewDueDate]  = useState("");
  const [newPriority, setNewPriority] = useState<Priority | "">("");
  const [showForm,    setShowForm]    = useState(false);
  const today = todayStr();

  useEffect(() => {
    fetch("/api/data")
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(res => {
        const d: DashData = res.data ?? {};
        setData(d);
        setTodos(d.todos ?? []);
        setBillItems((d.finances?.items ?? []).filter((it: RecurringItem) => it.active && it.amount < 0));
        const saved = d.maintenance;
        if (!saved?.tasks?.length || (saved.tasks[0] as unknown as { frequency?: string }).frequency) {
          setMaint({ tasks: SEED_TASKS, completions: [] });
        } else {
          setMaint(saved as MaintenanceData);
        }
      })
      .catch(() => setStatus("error"))
      .finally(() => setLoading(false));
  }, []);

  const save = useCallback(async (newData: DashData) => {
    setStatus("saving");
    if (timer.current) clearTimeout(timer.current);
    setData(newData);
    try {
      const res = await fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data: newData }) });
      if (!res.ok) throw new Error();
      setStatus("saved");
    } catch { setStatus("error"); }
    finally { timer.current = setTimeout(() => setStatus("idle"), 2000); }
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  const addTodo = () => {
    const text = newText.trim(); if (!text) return;
    const todo: Todo = { id: crypto.randomUUID(), text, done: false, dueDate: newDueDate || undefined, priority: newPriority || undefined };
    const updated = [...todos, todo];
    setTodos(updated); setNewText(""); setNewDueDate(""); setNewPriority(""); setShowForm(false);
    save({ ...data, todos: updated });
  };
  const toggleTodo = (id: string) => {
    const updated = todos.map(t => t.id === id ? { ...t, done: !t.done } : t);
    setTodos(updated); save({ ...data, todos: updated });
  };
  const deleteTodo = (id: string) => {
    const updated = todos.filter(t => t.id !== id);
    setTodos(updated); save({ ...data, todos: updated });
  };

  const toggleMaint = (taskId: string) => {
    const updated = { ...maint, completions: toggleCompletion(maint.completions, taskId, today) };
    setMaint(updated); save({ ...data, maintenance: updated });
  };

  if (loading) return <p className="empty" style={{ padding: "32px 0" }}>Loading…</p>;

  const { overdue, dueToday, upcoming, noDate } = groupTodos(todos);
  const done = todos.filter(t => t.done);
  const pendingCount = overdue.length + dueToday.length + upcoming.length + noDate.length;

  const todayTasks  = tasksForToday(maint.tasks, today);
  const maintDone   = todayTasks.filter(t => isCompletedToday(maint.completions, t.id, today)).length;
  const billsDueToday = billItems.filter(it => itemAppliesToDate(it, today));

  return (
    <div style={{ maxWidth: "680px" }}>
      {status !== "idle" && (
        <div className={`toast${status === "error" ? " error" : ""}`}>
          {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : "Could not save — check connection."}
        </div>
      )}

      {/* Quick add */}
      <div className="card" style={{ marginBottom: "16px" }}>
        <div style={{ display: "flex", gap: "8px" }}>
          <input className="input" type="text" placeholder="Add a task…" value={newText}
            onChange={e => setNewText(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") addTodo(); }}
            onFocus={() => setShowForm(true)} />
          <button className="btn btn-primary" onClick={addTodo}>Add</button>
        </div>
        {showForm && (
          <div style={{ display: "flex", gap: "8px", marginTop: "10px", flexWrap: "wrap" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "11px", color: "var(--text-3)", fontWeight: 600 }}>Due date</label>
              <input className="input" type="date" value={newDueDate} onChange={e => setNewDueDate(e.target.value)} style={{ width: "160px" }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "11px", color: "var(--text-3)", fontWeight: 600 }}>Priority</label>
              <select className="input" value={newPriority} onChange={e => setNewPriority(e.target.value as Priority | "")} style={{ width: "130px" }}>
                <option value="">None</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <button className="btn btn-ghost" style={{ alignSelf: "flex-end" }}
              onClick={() => { setShowForm(false); setNewDueDate(""); setNewPriority(""); }}>Cancel</button>
          </div>
        )}
      </div>

      {/* Today's cleaning */}
      {todayTasks.length > 0 && (
        <div className="card" style={{ marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
            <p className="card-title" style={{ margin: 0 }}>Cleaning today</p>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "12px", color: "var(--text-3)" }}>{maintDone}/{todayTasks.length}</span>
              <a href="/maintenance" style={{ fontSize: "12px", color: "var(--accent)", textDecoration: "none" }}>All tasks →</a>
            </div>
          </div>
          <div style={{ height: "4px", borderRadius: "99px", background: "var(--surface-raised)", marginBottom: "12px", overflow: "hidden" }}>
            <div style={{ height: "100%", borderRadius: "99px", background: "var(--green)", width: `${todayTasks.length ? (maintDone / todayTasks.length) * 100 : 0}%`, transition: "width 0.3s" }} />
          </div>
          {todayTasks.map(task => {
            const done = isCompletedToday(maint.completions, task.id, today);
            return (
              <label key={task.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "4px 0", cursor: "pointer", userSelect: "none" }}>
                <span style={{ width: "18px", height: "18px", borderRadius: "5px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: done ? "var(--green)" : "var(--surface-raised)", border: done ? "none" : "1px solid var(--border)", transition: "all 0.1s" }}
                  onClick={() => toggleMaint(task.id)}>
                  {done && <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="white" strokeWidth="1.8"><path d="M1.5 5l2.5 2.5L8.5 2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                </span>
                <span style={{ fontSize: "13px", color: done ? "var(--text-3)" : "var(--text)", textDecoration: done ? "line-through" : "none", transition: "all 0.1s" }}>
                  {task.title}
                  <span style={{ marginLeft: "8px", fontSize: "10.5px", color: "var(--text-3)", fontWeight: 400 }}>
                    {task.period === "morning" ? "morning" : task.period === "evening" ? "evening" : task.period}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      )}

      {/* Bills due today */}
      {billsDueToday.length > 0 && (
        <div className="card" style={{ marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
            <p className="card-title" style={{ margin: 0 }}>Bills due today</p>
            <a href="/finances" style={{ fontSize: "12px", color: "var(--accent)", textDecoration: "none" }}>All bills →</a>
          </div>
          {billsDueToday.map(b => (
            <div key={b.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid var(--border)" }}>
              <span style={{ fontSize: "13px", color: "var(--text)" }}>{b.name}</span>
              <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--red)", fontVariantNumeric: "tabular-nums" }}>
                {Math.abs(b.amount).toLocaleString("en-US", { style: "currency", currency: "USD" })}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Stats row */}
      {pendingCount > 0 && (
        <div style={{ display: "flex", gap: "10px", marginBottom: "16px", flexWrap: "wrap" }}>
          {overdue.length > 0  && <StatChip label="Overdue"  count={overdue.length}  color="var(--red)"          bg="var(--red-dim)" />}
          {dueToday.length > 0 && <StatChip label="Today"    count={dueToday.length} color="var(--yellow)"       bg="var(--yellow-dim)" />}
          {upcoming.length > 0 && <StatChip label="Upcoming" count={upcoming.length} color="var(--accent-text)"  bg="var(--accent-dim)" />}
          {noDate.length > 0   && <StatChip label="No date"  count={noDate.length}   color="var(--text-3)"       bg="var(--surface-overlay)" />}
        </div>
      )}

      {pendingCount === 0 && done.length === 0 && (
        <div className="card"><p className="empty">No tasks yet. Add one above.</p></div>
      )}

      <TaskGroup title="Overdue"  todos={overdue}   titleColor="var(--red)"    onToggle={toggleTodo} onDelete={deleteTodo} />
      <TaskGroup title="Today"    todos={dueToday}  titleColor="var(--yellow)" onToggle={toggleTodo} onDelete={deleteTodo} />
      <TaskGroup title="Upcoming" todos={upcoming}                             onToggle={toggleTodo} onDelete={deleteTodo} />
      <TaskGroup title="No date"  todos={noDate}                               onToggle={toggleTodo} onDelete={deleteTodo} />

      {done.length > 0 && (
        <details style={{ marginTop: "8px" }}>
          <summary style={{ fontSize: "12px", color: "var(--text-3)", cursor: "pointer", userSelect: "none", padding: "6px 0" }}>
            {done.length} completed
          </summary>
          <div className="card" style={{ marginTop: "8px", opacity: 0.45 }}>
            {done.map(t => <TodoRow key={t.id} todo={t} onToggle={toggleTodo} onDelete={deleteTodo} />)}
          </div>
        </details>
      )}
    </div>
  );
}

function StatChip({ label, count, color, bg }: { label: string; count: number; color: string; bg: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "5px 12px", borderRadius: "99px", background: bg, border: `1px solid ${color}30` }}>
      <span style={{ fontSize: "13px", fontWeight: 700, color, fontVariantNumeric: "tabular-nums" }}>{count}</span>
      <span style={{ fontSize: "12px", color }}>{label}</span>
    </div>
  );
}

function TaskGroup({ title, todos, titleColor, onToggle, onDelete }: {
  title: string; todos: Todo[]; titleColor?: string;
  onToggle: (id: string) => void; onDelete: (id: string) => void;
}) {
  if (todos.length === 0) return null;
  return (
    <div className="card" style={{ marginBottom: "10px" }}>
      <p className="card-title" style={{ color: titleColor ?? "var(--text-3)" }}>{title}</p>
      {todos.map(t => <TodoRow key={t.id} todo={t} onToggle={onToggle} onDelete={onDelete} />)}
    </div>
  );
}

function TodoRow({ todo, onToggle, onDelete }: { todo: Todo; onToggle: (id: string) => void; onDelete: (id: string) => void }) {
  const due = todo.dueDate ? dueLabel(todo.dueDate) : null;
  return (
    <div className={`row${todo.done ? " done" : ""}`}>
      <input type="checkbox" className="checkbox" checked={todo.done} onChange={() => onToggle(todo.id)} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "13.5px", color: "var(--text)", textDecoration: todo.done ? "line-through" : "none" }}>{todo.text}</div>
        {(due || todo.priority) && (
          <div style={{ display: "flex", gap: "6px", marginTop: "3px", alignItems: "center" }}>
            {due && <span style={{ fontSize: "11px", color: due.color, fontWeight: 500 }}>{due.label}</span>}
            {todo.priority && (
              <span style={{ fontSize: "10px", fontWeight: 600, color: PRIORITY_COLOR[todo.priority], background: PRIORITY_BG[todo.priority], borderRadius: "99px", padding: "1px 7px" }}>
                {todo.priority}
              </span>
            )}
          </div>
        )}
      </div>
      <button className="btn-icon" onClick={() => onDelete(todo.id)} title="Delete"><XIcon /></button>
    </div>
  );
}
