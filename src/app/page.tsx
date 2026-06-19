"use client";

import { useEffect, useState, useCallback } from "react";

type Todo = { id: string; text: string; done: boolean };
type DashboardData = { note?: string; todos?: Todo[] };

export default function Dashboard() {
  const [data, setData] = useState<DashboardData>({});
  const [status, setStatus] = useState<"loading" | "ready" | "saving" | "saved" | "error">("loading");
  const [note, setNote] = useState("");
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodo, setNewTodo] = useState("");

  useEffect(() => {
    fetch("/api/data")
      .then((r) => r.json())
      .then((res) => {
        const d: DashboardData = res.data ?? {};
        setData(d);
        setNote(d.note ?? "");
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

  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newNote = e.target.value;
    setNote(newNote);
    const newData = { ...data, note: newNote };
    setData(newData);
    save(newData);
  };

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
    const updated = todos.map((t) => t.id === id ? { ...t, done: !t.done } : t);
    setTodos(updated);
    const newData = { ...data, todos: updated };
    setData(newData);
    save(newData);
  };

  const deleteTodo = (id: string) => {
    const updated = todos.filter((t) => t.id !== id);
    setTodos(updated);
    const newData = { ...data, todos: updated };
    setData(newData);
    save(newData);
  };

  const statusText = {
    loading: "Loading…",
    ready: "",
    saving: "Saving…",
    saved: "Saved!",
    error: "Error saving — check your database connection.",
  }[status];

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Dashboard</h1>
          {statusText && (
            <span className={`text-sm ${status === "error" ? "text-red-500" : "text-gray-400"}`}>
              {statusText}
            </span>
          )}
        </div>

        {status === "loading" ? (
          <p className="text-gray-400">Loading your data…</p>
        ) : (
          <div className="flex flex-col gap-6">

            {/* To-Do List */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-700 mb-4">To-Do List</h2>

              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  className="flex-1 p-3 text-gray-700 bg-gray-50 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="Add a new task…"
                  value={newTodo}
                  onChange={(e) => setNewTodo(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addTodo()}
                />
                <button
                  onClick={addTodo}
                  className="px-5 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
                >
                  Add
                </button>
              </div>

              {todos.length === 0 ? (
                <p className="text-gray-400 text-sm">No tasks yet — add one above.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {todos.map((todo) => (
                    <li key={todo.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 group">
                      <input
                        type="checkbox"
                        checked={todo.done}
                        onChange={() => toggleTodo(todo.id)}
                        className="w-5 h-5 rounded accent-blue-500 cursor-pointer flex-shrink-0"
                      />
                      <span className={`flex-1 text-gray-700 ${todo.done ? "line-through text-gray-400" : ""}`}>
                        {todo.text}
                      </span>
                      <button
                        onClick={() => deleteTodo(todo.id)}
                        className="text-gray-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 text-lg leading-none"
                        aria-label="Delete task"
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Notes */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-700 mb-3">Notes</h2>
              <textarea
                className="w-full h-48 p-3 text-gray-700 bg-gray-50 rounded-lg border border-gray-200 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="Type anything here — it saves automatically…"
                value={note}
                onChange={handleNoteChange}
              />
            </div>

          </div>
        )}
      </div>
    </main>
  );
}
