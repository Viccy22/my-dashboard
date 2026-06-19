"use client";

import { useEffect, useState, useCallback, useRef } from "react";

type CalendarEvent = { id: string; title: string; date: string; time?: string };
type DashboardData  = { events?: CalendarEvent[]; [key: string]: unknown };

type SaveStatus = "idle" | "saving" | "saved" | "error";

export default function DashboardPage() {
  const [data,      setData]     = useState<DashboardData>({});
  const [events,    setEvents]   = useState<CalendarEvent[]>([]);
  const [status,    setStatus]   = useState<SaveStatus>("idle");
  const [loading,   setLoading]  = useState(true);
  const [newTitle,  setNewTitle] = useState("");
  const [newDate,   setNewDate]  = useState("");
  const [newTime,   setNewTime]  = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/api/data")
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((res) => {
        const d: DashboardData = res.data ?? {};
        setData(d);
        setEvents(d.events ?? []);
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

  const addEvent = () => {
    if (!newTitle.trim() || !newDate) return;
    const event: CalendarEvent = {
      id:    crypto.randomUUID(),
      title: newTitle.trim(),
      date:  newDate,
      time:  newTime || undefined,
    };
    const updated = [...events, event].sort((a, b) => {
      const cmp = a.date.localeCompare(b.date);
      if (cmp !== 0) return cmp;
      return (a.time ?? "").localeCompare(b.time ?? "");
    });
    setEvents(updated);
    setNewTitle("");
    setNewDate("");
    setNewTime("");
    const newData = { ...data, events: updated };
    setData(newData);
    save(newData);
  };

  const deleteEvent = (id: string) => {
    const updated = events.filter((e) => e.id !== id);
    setEvents(updated);
    const newData = { ...data, events: updated };
    setData(newData);
    save(newData);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  };

  const formatTime = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "pm" : "am"}`;
  };

  const todayStr = new Date().toISOString().slice(0, 10);
  const upcomingEvents = events.filter((e) => e.date >= todayStr);
  const pastEvents     = events.filter((e) => e.date <  todayStr);

  if (loading) {
    return <p className="empty-state">Summoning your data…</p>;
  }

  return (
    <div style={{ maxWidth: "800px" }}>

      {status !== "idle" && (
        <div className={`save-toast${status === "error" ? " error" : ""}`}>
          {status === "saving" ? "Saving…" : status === "saved" ? "Saved  ✦" : "Could not save — check your connection."}
        </div>
      )}

      <div className="magic-card">

        <div className="section-title">
          <span>✦</span> Upcoming Schedule
        </div>

        {/* Add event form */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "4px" }}>
          <input
            className="magic-input"
            type="text"
            placeholder="Event title…"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addEvent()}
            style={{ flex: "2 1 180px" }}
          />
          <input
            className="magic-input"
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            style={{ flex: "1 1 148px" }}
          />
          <input
            className="magic-input"
            type="time"
            value={newTime}
            onChange={(e) => setNewTime(e.target.value)}
            style={{ flex: "1 1 110px" }}
          />
          <button className="btn-seal" onClick={addEvent}>Add</button>
        </div>

        <hr className="gold-rule" />

        {/* Upcoming events */}
        {upcomingEvents.length === 0 ? (
          <p className="empty-state">No upcoming events — your schedule is clear.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {upcomingEvents.map((event) => (
              <div key={event.id} className="item-row accent-left" style={{ marginBottom: "6px" }}>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontFamily: "var(--font-crimson)",
                    fontSize: "17px",
                    color: "var(--parchment)",
                    fontWeight: 600,
                    lineHeight: 1.3,
                  }}>
                    {event.title}
                  </div>
                  <div style={{
                    fontFamily: "var(--font-crimson)",
                    fontSize: "14px",
                    color: "var(--parchment-dim)",
                    fontStyle: "italic",
                    marginTop: "2px",
                  }}>
                    {formatDate(event.date)}
                    {event.time && ` · ${formatTime(event.time)}`}
                  </div>
                </div>
                <button className="del-btn" onClick={() => deleteEvent(event.id)} title="Remove event">×</button>
              </div>
            ))}
          </div>
        )}

        {/* Past events — collapsed */}
        {pastEvents.length > 0 && (
          <details style={{ marginTop: "16px" }}>
            <summary style={{
              color: "var(--parchment-dim)",
              fontFamily: "var(--font-crimson)",
              fontStyle: "italic",
              fontSize: "14px",
              cursor: "pointer",
              userSelect: "none",
              listStyle: "none",
            }}>
              {pastEvents.length} past event{pastEvents.length !== 1 ? "s" : ""}
            </summary>
            <div style={{ marginTop: "10px", opacity: 0.44 }}>
              {pastEvents.map((event) => (
                <div key={event.id} className="item-row" style={{
                  marginBottom: "5px",
                  textDecoration: "line-through",
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "var(--font-crimson)", fontSize: "16px", color: "var(--parchment)" }}>
                      {event.title}
                    </div>
                    <div style={{ fontFamily: "var(--font-crimson)", fontSize: "13px", color: "var(--parchment-dim)", fontStyle: "italic" }}>
                      {formatDate(event.date)}{event.time && ` · ${formatTime(event.time)}`}
                    </div>
                  </div>
                  <button className="del-btn" onClick={() => deleteEvent(event.id)}>×</button>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}
