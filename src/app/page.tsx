"use client";

import { useEffect, useState, useCallback } from "react";

type CalendarEvent = { id: string; title: string; date: string; time?: string };
type DashboardData = { events?: CalendarEvent[]; todos?: unknown[] };

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData>({});
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "saving" | "saved" | "error">("loading");
  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");

  useEffect(() => {
    fetch("/api/data")
      .then((r) => r.json())
      .then((res) => {
        const d: DashboardData = res.data ?? {};
        setData(d);
        setEvents(d.events ?? []);
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

  const addEvent = () => {
    if (!newTitle.trim() || !newDate) return;
    const event: CalendarEvent = {
      id: crypto.randomUUID(),
      title: newTitle.trim(),
      date: newDate,
      time: newTime || undefined,
    };
    const updated = [...events, event].sort((a, b) => a.date.localeCompare(b.date));
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
    const suffix = h >= 12 ? "pm" : "am";
    const hour = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
  };

  const isUpcoming = (dateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(dateStr + "T00:00:00") >= today;
  };

  const upcomingEvents = events.filter((e) => isUpcoming(e.date));
  const pastEvents = events.filter((e) => !isUpcoming(e.date));

  if (status === "loading") {
    return (
      <p style={{ color: "var(--text-muted)", fontFamily: "var(--font-crimson)", fontStyle: "italic" }}>
        Summoning your data…
      </p>
    );
  }

  return (
    <div style={{ maxWidth: "780px", position: "relative" }}>

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

      {/* Upcoming Schedule card */}
      <div className="magic-card" style={{ marginBottom: "0" }}>

        {/* Card heading */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "22px" }}>
          <span style={{ color: "var(--gold)", fontSize: "14px" }}>✦</span>
          <h2 style={{
            fontFamily: "var(--font-cinzel)",
            fontSize: "14px",
            letterSpacing: "0.12em",
            color: "var(--gold)",
            margin: 0,
            fontWeight: "700",
            textTransform: "uppercase",
          }}>
            Upcoming Schedule
          </h2>
        </div>

        {/* Add event form */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "24px", flexWrap: "wrap" }}>
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
            style={{ flex: "1 1 140px" }}
          />
          <input
            className="magic-input"
            type="time"
            value={newTime}
            onChange={(e) => setNewTime(e.target.value)}
            style={{ flex: "1 1 110px" }}
          />
          <button className="btn-gold" onClick={addEvent}>
            Add
          </button>
        </div>

        {/* Divider */}
        <div style={{
          height: "1px",
          background: "linear-gradient(to right, var(--gold), transparent)",
          opacity: 0.2,
          marginBottom: "18px",
        }} />

        {/* Events list */}
        {upcomingEvents.length === 0 ? (
          <p style={{
            color: "var(--text-muted)", fontFamily: "var(--font-crimson)",
            fontStyle: "italic", fontSize: "16px", margin: 0,
          }}>
            No upcoming events — your schedule is clear.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {upcomingEvents.map((event) => (
              <div key={event.id} style={{
                display: "flex", alignItems: "center", gap: "14px",
                padding: "13px 16px", borderRadius: "8px",
                background: "var(--hover-bg)",
                borderLeft: "2px solid var(--gold)",
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontFamily: "var(--font-crimson)", fontSize: "17px",
                    color: "var(--text)", fontWeight: "600",
                  }}>
                    {event.title}
                  </div>
                  <div style={{
                    fontFamily: "var(--font-crimson)", fontSize: "14px",
                    color: "var(--text-muted)", fontStyle: "italic", marginTop: "2px",
                  }}>
                    {formatDate(event.date)}{event.time ? ` · ${formatTime(event.time)}` : ""}
                  </div>
                </div>
                <button className="del-btn" onClick={() => deleteEvent(event.id)} title="Remove event">×</button>
              </div>
            ))}
          </div>
        )}

        {/* Past events collapsible */}
        {pastEvents.length > 0 && (
          <details style={{ marginTop: "20px" }}>
            <summary style={{
              color: "var(--text-muted)", fontFamily: "var(--font-crimson)",
              fontStyle: "italic", fontSize: "14px", cursor: "pointer", userSelect: "none",
            }}>
              {pastEvents.length} past event{pastEvents.length !== 1 ? "s" : ""}
            </summary>
            <div style={{ marginTop: "10px", opacity: 0.5, display: "flex", flexDirection: "column", gap: "6px" }}>
              {pastEvents.map((event) => (
                <div key={event.id} style={{
                  display: "flex", alignItems: "center", gap: "14px",
                  padding: "10px 14px", borderRadius: "8px",
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontFamily: "var(--font-crimson)", fontSize: "16px",
                      color: "var(--text)", textDecoration: "line-through",
                    }}>
                      {event.title}
                    </div>
                    <div style={{
                      fontFamily: "var(--font-crimson)", fontSize: "13px",
                      color: "var(--text-muted)", fontStyle: "italic",
                    }}>
                      {formatDate(event.date)}{event.time ? ` · ${formatTime(event.time)}` : ""}
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
