"use client";

import { useEffect, useState, useCallback, useRef } from "react";

type Todo         = { id: string; text: string; done: boolean };
type DashboardData = { todos?: Todo[]; [key: string]: unknown };
type SaveStatus   = "idle" | "saving" | "saved" | "error";

export default function TodosPage() {
  const [data,    setData]   = useState<DashboardData>({});
  const [todos,   setTodos]  = useState<Todo[]>([]);
  const [status,  setStatus] = useState<SaveStatus>("idle");
  const [loading, setLoading] = useState(true);
  const [newTodo, setNewTodo] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/api/data")
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((res) => {
        const d: DashboardData = res.data ?? {};
        setData(d);
        setTodos(d.todos ?? []);
      })
      .catch(() => setStatus("error"))
      .finally(() => setLoading(false));
  }, []);

  const save = useCallback(async (newData: DashboardData) => {
    setStatus("saving");
    if (toastTimer.current) clearTimeout(toastTimer.current);
    try {
      const res = await fetch("/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: newData }),
      });
      if (!res.ok) throw new Error();
      setStatus("saved");
    } catch {
      setStatus("error");
    } finally {
      toastTimer.current = setTimeout(() => setStatus("idle"), 2200);
    }
  }, []);

  const addTodo = () => {
    const text = newTodo.trim();
    if (!text) return;
    const updated = [...todos, { id: crypto.randomUUID(), text, done: false }];
    setTodos(updated);
    setNewTodo("");
    const newData = { ...data, todos: updated };
    setData(newData);
    save(newData);
  };

  const toggleTodo = (id: string) => {
    const updated = todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t));
    setTodos(updated);
    save({ ...data, todos: updated });
  };

  const deleteTodo = (id: string) => {
    const updated = todos.filter((t) => t.id !== id);
    setTodos(updated);
    save({ ...data, todos: updated });
  };

  const pending   = todos.filter((t) => !t.done);
  const completed = todos.filter((t) =>  t.done);

  if (loading) {
    return <p className="empty-state">Summoning your tasks…</p>;
  }

  return (
    <div style={{ maxWidth: "700px" }}>

      {status !== "idle" && (
        <div className={`save-toast${status === "error" ? " error" : ""}`}>
          {status === "saving" ? "Saving…" : status === "saved" ? "Saved  ✦" : "Could not save — check your connection."}
        </div>
      )}

      <div className="magic-card">

        <div className="section-title">
          <span>⚜</span> To-Do List
        </div>

        {/* Add task */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "4px" }}>
          <input
            className="magic-input"
            type="text"
            placeholder="What must be done…"
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTodo()}
          />
          <button className="btn-seal" onClick={addTodo}>Add</button>
        </div>

        <hr className="gold-rule" />

        {todos.length === 0 ? (
          <p className="empty-state">No tasks yet. Your quest log is empty.</p>
        ) : (
          <>
            {/* Pending */}
            {pending.map((todo) => (
              <div key={todo.id} className="item-row" style={{ marginBottom: "5px" }}>
                <input
                  type="checkbox"
                  className="magic-checkbox"
                  checked={false}
                  onChange={() => toggleTodo(todo.id)}
                />
                <span style={{
                  flex: 1,
                  fontFamily: "var(--font-crimson)",
                  fontSize: "17px",
                  color: "var(--parchment)",
                }}>
                  {todo.text}
                </span>
                <button className="del-btn" onClick={() => deleteTodo(todo.id)}>×</button>
              </div>
            ))}

            {/* Completed */}
            {completed.length > 0 && (
              <>
                <hr className="gold-rule" />
                <p className="completed-label">Completed</p>
                {completed.map((todo) => (
                  <div key={todo.id} className="item-row done" style={{ marginBottom: "5px" }}>
                    <input
                      type="checkbox"
                      className="magic-checkbox"
                      checked={true}
                      onChange={() => toggleTodo(todo.id)}
                    />
                    <span style={{
                      flex: 1,
                      fontFamily: "var(--font-crimson)",
                      fontSize: "17px",
                      color: "var(--parchment)",
                      textDecoration: "line-through",
                    }}>
                      {todo.text}
                    </span>
                    <button className="del-btn" onClick={() => deleteTodo(todo.id)}>×</button>
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
