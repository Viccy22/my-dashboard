"use client";

import { useEffect, useState, useCallback } from "react";

type DashboardData = Record<string, unknown>;

export default function Dashboard() {
  const [data, setData] = useState<DashboardData>({});
  const [status, setStatus] = useState<"loading" | "ready" | "saving" | "saved" | "error">("loading");
  const [note, setNote] = useState("");

  useEffect(() => {
    fetch("/api/data")
      .then((r) => r.json())
      .then((res) => {
        setData(res.data ?? {});
        setNote((res.data?.note as string) ?? "");
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
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-3">Notes</h2>
            <textarea
              className="w-full h-48 p-3 text-gray-700 bg-gray-50 rounded-lg border border-gray-200 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Type anything here — it saves automatically…"
              value={note}
              onChange={handleNoteChange}
            />
            <p className="text-xs text-gray-400 mt-2">Auto-saves as you type. More features coming soon.</p>
          </div>
        )}
      </div>
    </main>
  );
}
