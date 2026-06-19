"use client";

import { useEffect, useState, useCallback } from "react";

type Todo = { id: string; text: string; done: boolean };
type DashboardData = { todos?: Todo[]; [key: string]: unknown };

export default function TodosPage() {
  const [data, setData] = useState<DashboardData>({});
  const [todos, setTodos] = useState<Todo[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "saving" | "saved" | "error">("loading");
  const [newTodo, setNewTodo] = useState("");

  useEffect(() => {
    fetch("/api/data")
      .then((r) => r.json())
      .then((res) => {
        const d: DashboardData = res.data ?? {};
        setData(d);
        setTodos(d.todos ?? []);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, []);

  const save = useCallback(async (newData: DashboardData) => {
    setStatus("saving");
    try {
      await fetch("/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: newData }),
      });
      setStatus("saved");
      setTimeout(() => setStatus("ready"), 2000);
    } catch {
      setStatus("error");
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

  const pending = todos.filter((t) => !t.done);
  const done = todos.filter((t) => t.done);

  if (status === "loading") {
    return (
      <p style={{ color: "var(--text-muted)", fontFamily: "var(--font-crimson)", fontStyle: "italic" }}>
        Summoning your tasks…
      </p>
    );
  }

  return (
    <div style={{ maxWidth: "700px", position: "relative" }}>

      {/* Save status badge */}
      {(status === "saving" || status === "saved" || status === "error") && (
        <div style={{
          position: "fixed", top: "20px", right: "24px",
          background: "var(--card-bg)",
          border: `1px solid ${status === "error" ? "#c06040" : "var(--gold)"}`,
          color: status === "error" ? "#c06040" : "var(--gold)",
          padding: "8px 18px", borderRadius: "8px",
          fontFamily: "var(--font-crimson)", fontSize: "14px",
          fontStyle: "italic", zIndex: 50,
        }}>
          {status === "saving" ? "Saving…" : status === "saved" ? "Saved ✦" : "Error saving"}
        </div>
      )}

      <div className="magic-card">

        {/* Heading */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "22px" }}>
          <span style={{ color: "var(--gold)", fontSize: "14px" }}>⚜</span>
          <h2 style={{
            fontFamily: "var(--font-cinzel)",
            fontSize: "14px",
            letterSpacing: "0.12em",
            color: "var(--gold)",
            margin: 0,
            fontWeight: "700",
            textTransform: "uppercase",
          }}>
            To-Do List
          </h2>
        </div>

        {/* Add task */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "22px" }}>
          <input
            className="magic-input"
            type="text"
            placeholder="What must be done…"
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTodo()}
            style={{ flex: 1 }}
          />
          <button className="btn-gold" onClick={addTodo}>Add</button>
        </div>

        <div style={{
          height: "1px",
          background: "linear-gradient(to right, var(--gold), transparent)",
          opacity: 0.2,
          marginBottom: "18px",
        }} />

        {todos.length === 0 ? (
          <p style={{
            color: "var(--text-muted)", fontFamily: "var(--font-crimson)",
            fontStyle: "italic", fontSize: "16px", margin: 0,
          }}>
            No tasks yet. Your quest log is empty.
          </p>
        ) : (
          <>
            {/* Pending tasks */}
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {pending.map((todo) => (
                <div key={todo.id} style={{
                  display: "flex", alignItems: "center", gap: "12px",
                  padding: "11px 14px", borderRadius: "8px",
                  background: "var(--hover-bg)",
                }}>
                  <input
                    type="checkbox"
                    checked={false}
                    onChange={() => toggleTodo(todo.id)}
                    style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "var(--gold)", flexShrink: 0 }}
                  />
                  <span style={{ flex: 1, fontFamily: "var(--font-crimson)", fontSize: "17px", color: "var(--text)" }}>
                    {todo.text}
                  </span>
                  <button className="del-btn" onClick={() => deleteTodo(todo.id)}>×</button>
                </div>
              ))}
            </div>

            {/* Completed tasks */}
            {done.length > 0 && (
              <div style={{ marginTop: "16px", opacity: 0.45 }}>
                <div style={{
                  height: "1px", background: "var(--card-border)",
                  marginBottom: "12px",
                }} />
                <div style={{
                  fontSize: "10px", letterSpacing: "0.2em",
                  color: "var(--text-muted)", fontFamily: "var(--font-cinzel)",
                  textTransform: "uppercase", marginBottom: "8px",
                }}>
                  Completed
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  {done.map((todo) => (
                    <div key={todo.id} style={{
                      display: "flex", alignItems: "center", gap: "12px",
                      padding: "10px 14px", borderRadius: "8px",
                    }}>
                      <input
                        type="checkbox"
                        checked={true}
                        onChange={() => toggleTodo(todo.id)}
                        style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "var(--gold)", flexShrink: 0 }}
                      />
                      <span style={{
                        flex: 1, fontFamily: "var(--font-crimson)", fontSize: "17px",
                        color: "var(--text)", textDecoration: "line-through",
                      }}>
                        {todo.text}
                      </span>
                      <button className="del-btn" onClick={() => deleteTodo(todo.id)}>×</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
