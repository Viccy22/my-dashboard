"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { RecurringItem, itemAppliesToDate } from "@/lib/finances";

// ── Types ─────────────────────────────────────────────────────────────────────

type CalEvent  = { id: string; title: string; date: string; time?: string; color?: string; notes?: string };
type FinData   = { items?: RecurringItem[] };
type MagicGame = { id: string; date: string; opponent: string; homeAway: "home" | "away"; ourScore: number | null; theirScore: number | null };
type Festival  = { id: string; name: string; startDate: string; endDate: string; ticketStatus: string };
type Trip      = { id: string; destination: string; startDate: string; endDate: string; status: string };
type DashData  = { events?: CalEvent[]; finances?: FinData; magic?: { games: MagicGame[] }; festivals?: { festivals: Festival[] }; vacations?: { trips: Trip[] }; [key: string]: unknown };

// A virtual overlay item (read-only, not stored in events[])
type Overlay = { date: string; label: string; emoji: string; color: string; bg: string; href: string };
type SaveStatus = "idle" | "saving" | "saved" | "error";

const COLORS = [
  { value: "accent", label: "Blue",   bg: "var(--accent-dim)",  fg: "var(--accent)"  },
  { value: "green",  label: "Green",  bg: "var(--green-dim)",   fg: "var(--green)"   },
  { value: "yellow", label: "Yellow", bg: "var(--yellow-dim)",  fg: "var(--yellow)"  },
  { value: "red",    label: "Red",    bg: "var(--red-dim)",     fg: "var(--red)"     },
];

function getColor(c?: string) { return COLORS.find(x => x.value === c) ?? COLORS[0]; }

const DAYS   = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function todayStr() { return new Date().toISOString().slice(0, 10); }

function calDays(year: number, month: number): (string | null)[] {
  const first  = new Date(year, month, 1).getDay();
  const total  = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = Array(first).fill(null);
  for (let d = 1; d <= total; d++) cells.push(`${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

// ── Icons ─────────────────────────────────────────────────────────────────────

const ChevL = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M10 3L5 8l5 5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const ChevR = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M6 3l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ── Event form (popover) ──────────────────────────────────────────────────────

function EventForm({
  initial,
  onSave,
  onDelete,
  onCancel,
}: {
  initial: Partial<CalEvent> & { date: string };
  onSave: (e: Omit<CalEvent, "id">) => void;
  onDelete?: () => void;
  onCancel: () => void;
}) {
  const [title,  setTitle]  = useState(initial.title  ?? "");
  const [date,   setDate]   = useState(initial.date);
  const [time,   setTime]   = useState(initial.time   ?? "");
  const [notes,  setNotes]  = useState(initial.notes  ?? "");
  const [color,  setColor]  = useState(initial.color  ?? "accent");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <input className="input" placeholder="Event title" value={title} autoFocus
        onChange={e => setTitle(e.target.value)}
        onKeyDown={e => e.key === "Enter" && title.trim() && onSave({ title, date, time, notes, color })} />
      <div style={{ display: "flex", gap: "8px" }}>
        <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} style={{ flex: 1 }} />
        <input className="input" type="time" value={time} onChange={e => setTime(e.target.value)} style={{ flex: 1 }} />
      </div>
      <input className="input" placeholder="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} />
      <div style={{ display: "flex", gap: "6px" }}>
        {COLORS.map(c => (
          <button key={c.value} onClick={() => setColor(c.value)}
            style={{ width: "24px", height: "24px", borderRadius: "50%", border: color === c.value ? `2px solid ${c.fg}` : "2px solid transparent", background: c.bg, cursor: "pointer", outline: color === c.value ? `2px solid ${c.fg}` : "none", outlineOffset: "2px" }} />
        ))}
      </div>
      <div style={{ display: "flex", gap: "8px" }}>
        <button className="btn btn-primary" onClick={() => title.trim() && onSave({ title, date, time, notes, color })}>Save</button>
        <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        {onDelete && <button className="btn btn-secondary" style={{ marginLeft: "auto", color: "var(--red)" }} onClick={onDelete}>Delete</button>}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const now = new Date();
  const [events,    setEvents]    = useState<CalEvent[]>([]);
  const [billItems, setBillItems] = useState<RecurringItem[]>([]);
  const [overlays,  setOverlays]  = useState<Overlay[]>([]);
  const [status,  setStatus]  = useState<SaveStatus>("idle");
  const [loading, setLoading] = useState(true);
  const [year,    setYear]    = useState(now.getFullYear());
  const [month,   setMonth]   = useState(now.getMonth());
  const [selected, setSelected] = useState<string | null>(null);   // date clicked
  const [editId,   setEditId]   = useState<string | null>(null);    // event being edited
  const [view,     setView]     = useState<"month" | "list">("month");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rawDataRef = useRef<DashData>({});
  const today = todayStr();

  useEffect(() => {
    fetch("/api/data")
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(res => {
        const d: DashData = res.data ?? {};
        rawDataRef.current = d;
        setEvents(d.events ?? []);
        setBillItems((d.finances?.items ?? []).filter((it: RecurringItem) => it.active && it.amount < 0));

        // Build overlays from magic games, festivals, vacations
        const ovl: Overlay[] = [];
        for (const g of (d.magic?.games ?? []) as MagicGame[]) {
          if (g.date) ovl.push({ date: g.date, label: `${g.homeAway === "home" ? "vs" : "@"} ${g.opponent}`, emoji: "🏀", color: "#0077C0", bg: "rgba(0,119,192,0.12)", href: "/magic" });
        }
        for (const f of (d.festivals?.festivals ?? []) as Festival[]) {
          if (f.startDate && f.ticketStatus !== "skipped") ovl.push({ date: f.startDate, label: f.name, emoji: "🎪", color: "var(--green)", bg: "var(--green-dim)", href: "/festivals" });
        }
        for (const t of (d.vacations?.trips ?? []) as Trip[]) {
          if (t.startDate && t.status !== "completed") ovl.push({ date: t.startDate, label: t.destination, emoji: "✈️", color: "var(--accent)", bg: "var(--accent-dim)", href: "/vacations" });
        }
        setOverlays(ovl);
      })
      .catch(() => setStatus("error"))
      .finally(() => setLoading(false));
  }, []);

  const save = useCallback(async (updated: CalEvent[]) => {
    setStatus("saving");
    if (timer.current) clearTimeout(timer.current);
    const newData = { ...rawDataRef.current, events: updated };
    rawDataRef.current = newData;
    try {
      const res = await fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data: newData }) });
      if (!res.ok) throw new Error();
      setStatus("saved");
    } catch { setStatus("error"); }
    finally { timer.current = setTimeout(() => setStatus("idle"), 2000); }
  }, []);

  const addEvent = (data: Omit<CalEvent, "id">) => {
    const next = [...events, { ...data, id: crypto.randomUUID() }];
    setEvents(next); setSelected(null); save(next);
  };

  const updateEvent = (id: string, data: Omit<CalEvent, "id">) => {
    const next = events.map(e => e.id === id ? { ...data, id } : e);
    setEvents(next); setEditId(null); save(next);
  };

  const deleteEvent = (id: string) => {
    const next = events.filter(e => e.id !== id);
    setEvents(next); setEditId(null); setSelected(null); save(next);
  };

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); setSelected(null); };
  const nextMonth = () => { if (month === 11) { setMonth(0);  setYear(y => y + 1); } else setMonth(m => m + 1); setSelected(null); };
  const goToday   = () => { setYear(now.getFullYear()); setMonth(now.getMonth()); setSelected(null); };

  if (loading) return <p className="empty" style={{ padding: "32px 0" }}>Loading…</p>;

  const cells = calDays(year, month);
  const eventsThisMonth = events.filter(e => e.date.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`));
  const eventsForDate   = (d: string) => events.filter(e => e.date === d).sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));
  const billsForDate    = (d: string) => billItems.filter(it => itemAppliesToDate(it, d));
  const overlaysForDate = (d: string) => overlays.filter(o => o.date === d);
  const selectedEvents   = selected ? eventsForDate(selected)   : [];
  const selectedBills    = selected ? billsForDate(selected)    : [];
  const selectedOverlays = selected ? overlaysForDate(selected) : [];
  const editingEvent   = editId ? events.find(e => e.id === editId) : null;

  // Upcoming events for list view
  const upcomingEvents = [...events]
    .filter(e => e.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? "").localeCompare(b.time ?? ""))
    .slice(0, 50);

  // Upcoming bills for list view — next 60 days
  type BillOccurrence = { date: string; item: RecurringItem };
  const upcomingBills: BillOccurrence[] = [];
  for (let i = 0; i < 60; i++) {
    const d = new Date(); d.setDate(d.getDate() + i);
    const ds = d.toISOString().slice(0, 10);
    for (const it of billItems) { if (itemAppliesToDate(it, ds)) upcomingBills.push({ date: ds, item: it }); }
  }
  upcomingBills.sort((a, b) => a.date.localeCompare(b.date));

  // Overlays for list view (upcoming only)
  const upcomingOverlays = overlays.filter(o => o.date >= today).sort((a, b) => a.date.localeCompare(b.date));

  // Merge events + bills + overlays into a single sorted list for list view
  type ListEntry = { date: string; kind: "event"; ev: CalEvent } | { date: string; kind: "bill"; occ: BillOccurrence } | { date: string; kind: "overlay"; ovl: Overlay };
  const listEntries: ListEntry[] = [
    ...upcomingEvents.map(ev => ({ date: ev.date, kind: "event" as const, ev })),
    ...upcomingBills.map(occ => ({ date: occ.date, kind: "bill" as const, occ })),
    ...upcomingOverlays.map(ovl => ({ date: ovl.date, kind: "overlay" as const, ovl })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div style={{ maxWidth: "900px" }}>
      {status !== "idle" && (
        <div className={`toast${status === "error" ? " error" : ""}`}>
          {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : "Could not save — check connection."}
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px", flexWrap: "wrap" }}>
        <button className="btn-icon" onClick={prevMonth}><ChevL /></button>
        <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 700, minWidth: "180px", textAlign: "center" }}>{MONTHS[month]} {year}</h2>
        <button className="btn-icon" onClick={nextMonth}><ChevR /></button>
        <button className="btn btn-secondary" style={{ fontSize: "12px", padding: "4px 10px" }} onClick={goToday}>Today</button>
        <div style={{ marginLeft: "auto", display: "flex", gap: "4px" }}>
          <button onClick={() => setView("month")} className={view === "month" ? "btn btn-primary" : "btn btn-secondary"} style={{ fontSize: "12px", padding: "4px 10px" }}>Month</button>
          <button onClick={() => setView("list")}  className={view === "list"  ? "btn btn-primary" : "btn btn-secondary"} style={{ fontSize: "12px", padding: "4px 10px" }}>List</button>
        </div>
        <button className="btn btn-primary" onClick={() => { setSelected(today); setEditId(null); }} style={{ fontSize: "13px", padding: "6px 14px" }}>+ Add event</button>
      </div>

      {/* ── MONTH VIEW ─────────────────────────────────────────────────────── */}
      {view === "month" && (
        <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Day headers */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "2px", marginBottom: "4px" }}>
              {DAYS.map(d => <div key={d} style={{ textAlign: "center", fontSize: "11px", fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em", padding: "4px 0" }}>{d}</div>)}
            </div>
            {/* Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "2px" }}>
              {cells.map((date, i) => {
                if (!date) return <div key={i} style={{ minHeight: "80px", borderRadius: "6px" }} />;
                const dayEvents   = eventsForDate(date);
                const dayBills   = billsForDate(date);
                const dayOverlays = overlaysForDate(date);
                const isToday    = date === today;
                const isSelected = date === selected;
                const isPast     = date < today;
                return (
                  <div key={date} onClick={() => setSelected(date === selected ? null : date)}
                    style={{
                      minHeight: "80px", borderRadius: "6px", padding: "6px", cursor: "pointer",
                      background: isSelected ? "var(--accent-dim)" : isToday ? "var(--surface-raised)" : "var(--surface)",
                      border: `1px solid ${isSelected ? "var(--accent)" : isToday ? "var(--accent)" : "var(--border)"}`,
                      opacity: isPast && !isToday ? 0.55 : 1,
                      transition: "all 0.1s",
                    }}>
                    <div style={{ fontSize: "12px", fontWeight: isToday ? 700 : 400, color: isToday ? "var(--accent)" : "var(--text-2)", marginBottom: "4px" }}>
                      {parseInt(date.slice(8))}
                    </div>
                    {dayEvents.slice(0, 3).map(ev => {
                      const c = getColor(ev.color);
                      return (
                        <div key={ev.id} style={{ fontSize: "10.5px", fontWeight: 500, padding: "1px 5px", borderRadius: "3px", background: c.bg, color: c.fg, marginBottom: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {ev.time && <span style={{ opacity: 0.7 }}>{ev.time.slice(0, 5)} </span>}{ev.title}
                        </div>
                      );
                    })}
                    {dayEvents.length > 3 && <div style={{ fontSize: "10px", color: "var(--text-3)" }}>+{dayEvents.length - 3} more</div>}
                    {dayBills.slice(0, 2).map(b => (
                      <div key={b.id} style={{ fontSize: "10.5px", fontWeight: 500, padding: "1px 5px", borderRadius: "3px", background: "var(--red-dim)", color: "var(--red)", marginBottom: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        💸 {b.name}
                      </div>
                    ))}
                    {dayBills.length > 2 && <div style={{ fontSize: "10px", color: "var(--red)" }}>+{dayBills.length - 2} bills</div>}
                    {dayOverlays.map((o, oi) => (
                      <div key={oi} style={{ fontSize: "10.5px", fontWeight: 500, padding: "1px 5px", borderRadius: "3px", background: o.bg, color: o.color, marginBottom: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {o.emoji} {o.label}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>

            {/* Month event count */}
            {eventsThisMonth.length > 0 && (
              <p style={{ fontSize: "11.5px", color: "var(--text-3)", margin: "10px 0 0", textAlign: "right" }}>
                {eventsThisMonth.length} event{eventsThisMonth.length !== 1 ? "s" : ""} this month
              </p>
            )}
          </div>

          {/* Side panel */}
          {selected && (
            <div className="card" style={{ width: "240px", flexShrink: 0 }}>
              <p className="card-title" style={{ marginBottom: "10px" }}>
                {new Date(selected + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
              </p>

              {editingEvent ? (
                <EventForm
                  initial={{ ...editingEvent }}
                  onSave={data => updateEvent(editingEvent.id, data)}
                  onDelete={() => deleteEvent(editingEvent.id)}
                  onCancel={() => setEditId(null)} />
              ) : editId === "new" ? (
                <EventForm
                  initial={{ date: selected }}
                  onSave={addEvent}
                  onCancel={() => setEditId(null)} />
              ) : (
                <>
                  {selectedOverlays.length > 0 && (
                    <div style={{ marginBottom: "10px" }}>
                      {selectedOverlays.map((o, i) => (
                        <a key={i} href={o.href} style={{ textDecoration: "none", display: "block" }}>
                          <div style={{ padding: "7px 10px", borderRadius: "6px", background: o.bg, marginBottom: "4px" }}>
                            <div style={{ fontSize: "12.5px", fontWeight: 600, color: o.color }}>{o.emoji} {o.label}</div>
                          </div>
                        </a>
                      ))}
                    </div>
                  )}
                  {selectedBills.length > 0 && (
                    <div style={{ marginBottom: "10px" }}>
                      {selectedBills.map(b => (
                        <div key={b.id} style={{ padding: "7px 10px", borderRadius: "6px", background: "var(--red-dim)", marginBottom: "4px" }}>
                          <div style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--red)" }}>{b.name}</div>
                          <div style={{ fontSize: "11.5px", color: "var(--text-3)" }}>{Math.abs(b.amount).toLocaleString("en-US", { style: "currency", currency: "USD" })} · {b.category}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {selectedEvents.length === 0 && selectedBills.length === 0 && <p className="empty" style={{ marginBottom: "10px" }}>No events.</p>}
                  {selectedEvents.map(ev => {
                    const c = getColor(ev.color);
                    return (
                      <div key={ev.id} style={{ padding: "8px 10px", borderRadius: "6px", background: c.bg, marginBottom: "6px", cursor: "pointer" }}
                        onClick={() => setEditId(ev.id)}>
                        <div style={{ fontSize: "13px", fontWeight: 600, color: c.fg }}>{ev.title}</div>
                        {ev.time  && <div style={{ fontSize: "11.5px", color: "var(--text-3)", marginTop: "2px" }}>{ev.time}</div>}
                        {ev.notes && <div style={{ fontSize: "11.5px", color: "var(--text-2)", marginTop: "2px" }}>{ev.notes}</div>}
                      </div>
                    );
                  })}
                  <button className="btn btn-secondary" style={{ width: "100%", fontSize: "12px", padding: "6px" }}
                    onClick={() => setEditId("new")}>+ Add event</button>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── LIST VIEW ──────────────────────────────────────────────────────── */}
      {view === "list" && (
        <div>
          {selected && (
            <div className="card" style={{ marginBottom: "14px" }}>
              <p className="card-title" style={{ marginBottom: "10px" }}>New event</p>
              <EventForm initial={{ date: selected }} onSave={addEvent} onCancel={() => setSelected(null)} />
            </div>
          )}
          {listEntries.length === 0 ? (
            <div className="card"><p className="empty">No upcoming events or bills.</p></div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              {listEntries.map((entry, i) => {
                const days = Math.round((new Date(entry.date + "T00:00:00").getTime() - Date.now()) / 86400000);
                const dayLabel = days === 0 ? "Today" : days === 1 ? "Tomorrow" : `${days}d`;

                if (entry.kind === "event") {
                  const ev = entry.ev;
                  const c  = getColor(ev.color);
                  if (editId === ev.id) return (
                    <div key={ev.id} style={{ padding: "12px 16px", borderTop: i > 0 ? "1px solid var(--border)" : "none" }}>
                      <EventForm initial={{ ...ev }} onSave={data => updateEvent(ev.id, data)} onDelete={() => deleteEvent(ev.id)} onCancel={() => setEditId(null)} />
                    </div>
                  );
                  return (
                    <div key={`ev-${ev.id}`} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 16px", borderTop: i > 0 ? "1px solid var(--border)" : "none", cursor: "pointer" }}
                      onClick={() => setEditId(ev.id)}
                      onMouseEnter={e => (e.currentTarget.style.background = "var(--surface-raised)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "")}>
                      <div style={{ width: "4px", alignSelf: "stretch", borderRadius: "99px", background: c.fg, flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--text)" }}>{ev.title}</div>
                        <div style={{ fontSize: "12px", color: "var(--text-3)", marginTop: "2px" }}>
                          {new Date(ev.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                          {ev.time && ` · ${ev.time}`}
                          {ev.notes && ` · ${ev.notes}`}
                        </div>
                      </div>
                      <span style={{ fontSize: "11.5px", color: days === 0 ? "var(--accent)" : "var(--text-3)", fontWeight: days <= 3 ? 700 : 400 }}>{dayLabel}</span>
                    </div>
                  );
                }

                // overlay entry (Magic game / festival / trip)
                if (entry.kind === "overlay") {
                  const o = entry.ovl;
                  return (
                    <a key={`ovl-${o.date}-${o.label}`} href={o.href} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 16px", borderTop: i > 0 ? "1px solid var(--border)" : "none" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "var(--surface-raised)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "")}>
                        <div style={{ width: "4px", alignSelf: "stretch", borderRadius: "99px", background: o.color, flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--text)" }}>{o.emoji} {o.label}</div>
                          <div style={{ fontSize: "12px", color: "var(--text-3)", marginTop: "2px" }}>
                            {new Date(entry.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                          </div>
                        </div>
                        <span style={{ fontSize: "11.5px", color: days <= 3 ? "var(--accent-text)" : "var(--text-3)", fontWeight: days <= 3 ? 700 : 400 }}>{dayLabel}</span>
                      </div>
                    </a>
                  );
                }

                // bill entry
                const { item } = entry.occ;
                return (
                  <div key={`bill-${item.id}-${entry.date}`} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 16px", borderTop: i > 0 ? "1px solid var(--border)" : "none" }}>
                    <div style={{ width: "4px", alignSelf: "stretch", borderRadius: "99px", background: "var(--red)", flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--text)" }}>💸 {item.name}</div>
                      <div style={{ fontSize: "12px", color: "var(--text-3)", marginTop: "2px" }}>
                        {new Date(entry.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} · {item.category}
                      </div>
                    </div>
                    <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--red)", fontVariantNumeric: "tabular-nums" }}>
                      {Math.abs(item.amount).toLocaleString("en-US", { style: "currency", currency: "USD" })}
                    </span>
                    <span style={{ fontSize: "11.5px", color: days === 0 ? "var(--red)" : "var(--text-3)", fontWeight: days <= 3 ? 700 : 400 }}>{dayLabel}</span>
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
