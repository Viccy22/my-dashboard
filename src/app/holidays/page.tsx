"use client";

import { useEffect, useState, useCallback, useRef } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

type GiftItem = { id: string; person: string; idea: string; budget: string; bought: boolean; link: string };

type Holiday = {
  id: string;
  name: string;
  date: string;
  notes: string;
  gifts: GiftItem[];
};

type HolidayData = { holidays: Holiday[] };
type DashData    = { holidays?: HolidayData; [key: string]: unknown };
type SaveStatus  = "idle" | "saving" | "saved" | "error";

const PRESETS = [
  { name: "New Year's Day",       date: "2026-01-01" },
  { name: "Valentine's Day",      date: "2026-02-14" },
  { name: "St. Patrick's Day",    date: "2026-03-17" },
  { name: "Easter",               date: "2026-04-05" },
  { name: "Mother's Day",         date: "2026-05-10" },
  { name: "Memorial Day",         date: "2026-05-25" },
  { name: "Father's Day",         date: "2026-06-21" },
  { name: "Independence Day",     date: "2026-07-04" },
  { name: "Halloween",            date: "2026-10-31" },
  { name: "Thanksgiving",         date: "2026-11-26" },
  { name: "Christmas Eve",        date: "2026-12-24" },
  { name: "Christmas Day",        date: "2026-12-25" },
  { name: "New Year's Eve",       date: "2026-12-31" },
];

function daysUntil(s: string) {
  if (!s) return null;
  return Math.round((new Date(s + "T00:00:00").getTime() - Date.now()) / 86400000);
}

function fmtDate(s: string) {
  if (!s) return "";
  return new Date(s + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function blankHoliday(name = "", date = ""): Omit<Holiday, "id"> {
  return { name, date, notes: "", gifts: [] };
}

// ── Icons ─────────────────────────────────────────────────────────────────────

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
const ChevronIcon = ({ open }: { open: boolean }) => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"
    style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }}>
    <path d="M3 5l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ── Gift row ──────────────────────────────────────────────────────────────────

function GiftRow({ gift, onChange, onDelete }: { gift: GiftItem; onChange: (g: GiftItem) => void; onDelete: () => void }) {
  const [editing, setEditing] = useState(!gift.idea);
  const [v, setV] = useState(gift);

  const save = () => { onChange(v); setEditing(false); };

  if (editing) return (
    <div style={{ background: "var(--surface)", borderRadius: "6px", padding: "8px", marginBottom: "6px", display: "flex", flexDirection: "column", gap: "6px" }}>
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
        <input className="input" placeholder="Person" value={v.person} autoFocus onChange={e => setV(x => ({ ...x, person: e.target.value }))} style={{ flex: "1 1 100px" }} />
        <input className="input" placeholder="Gift idea" value={v.idea} onChange={e => setV(x => ({ ...x, idea: e.target.value }))} style={{ flex: "2 1 160px" }} />
        <input className="input" placeholder="Budget" value={v.budget} onChange={e => setV(x => ({ ...x, budget: e.target.value }))} style={{ flex: "1 1 70px" }} />
      </div>
      <input className="input" placeholder="Link (optional)" value={v.link} onChange={e => setV(x => ({ ...x, link: e.target.value }))} onKeyDown={e => e.key === "Enter" && save()} />
      <div style={{ display: "flex", gap: "6px" }}>
        <button className="btn btn-primary" style={{ fontSize: "11px", padding: "3px 10px" }} onClick={save}>Save</button>
        <button className="btn btn-secondary" style={{ fontSize: "11px", padding: "3px 8px" }} onClick={() => { if (!gift.idea) onDelete(); else { setV(gift); setEditing(false); } }}>Cancel</button>
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "5px 0" }}
      onMouseEnter={e => e.currentTarget.querySelectorAll<HTMLElement>(".gift-action").forEach(el => el.style.opacity = "1")}
      onMouseLeave={e => e.currentTarget.querySelectorAll<HTMLElement>(".gift-action").forEach(el => el.style.opacity = "0")}>
      <input type="checkbox" checked={gift.bought} onChange={() => onChange({ ...gift, bought: !gift.bought })} style={{ cursor: "pointer", flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: "13px", fontWeight: 600, color: gift.bought ? "var(--text-3)" : "var(--text)", textDecoration: gift.bought ? "line-through" : "none" }}>
          {gift.person && <span style={{ color: "var(--accent)" }}>{gift.person}: </span>}
          {gift.idea}
        </span>
        {gift.budget && <span style={{ fontSize: "11.5px", color: "var(--text-3)", marginLeft: "8px" }}>{gift.budget}</span>}
        {gift.link && <a href={gift.link} target="_blank" rel="noreferrer" style={{ fontSize: "11px", color: "var(--accent)", marginLeft: "8px" }}>link ↗</a>}
      </div>
      <button className="btn-icon gift-action" style={{ opacity: 0 }} onClick={() => setEditing(true)}><PencilIcon /></button>
      <button className="btn-icon gift-action" style={{ opacity: 0 }} onClick={onDelete}><XIcon /></button>
    </div>
  );
}

// ── Holiday card ──────────────────────────────────────────────────────────────

function HolidayCard({ holiday, onUpdate, onDelete }: { holiday: Holiday; onUpdate: (h: Holiday) => void; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [editingHeader, setEditingHeader] = useState(false);
  const [name, setName] = useState(holiday.name);
  const [date, setDate] = useState(holiday.date);
  const [notes, setNotes] = useState(holiday.notes);

  const days      = daysUntil(holiday.date);
  const bought    = holiday.gifts.filter(g => g.bought).length;
  const total     = holiday.gifts.length;
  const isPast    = days !== null && days < 0;
  const isSoon    = days !== null && days >= 0 && days <= 30;

  const saveHeader = () => {
    onUpdate({ ...holiday, name, date, notes });
    setEditingHeader(false);
  };

  const updateGift = (id: string, g: GiftItem) => onUpdate({ ...holiday, gifts: holiday.gifts.map(x => x.id === id ? g : x) });
  const deleteGift = (id: string) => onUpdate({ ...holiday, gifts: holiday.gifts.filter(x => x.id !== id) });
  const addGift    = () => onUpdate({ ...holiday, gifts: [...holiday.gifts, { id: crypto.randomUUID(), person: "", idea: "", budget: "", bought: false, link: "" }] });

  return (
    <div className="card" style={{ opacity: isPast ? 0.6 : 1 }}>
      {editingHeader ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "8px" }}>
          <div style={{ display: "flex", gap: "8px" }}>
            <input className="input" value={name} onChange={e => setName(e.target.value)} style={{ flex: 2 }} placeholder="Holiday name" />
            <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} style={{ flex: 1 }} />
          </div>
          <input className="input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes…" onKeyDown={e => e.key === "Enter" && saveHeader()} />
          <div style={{ display: "flex", gap: "6px" }}>
            <button className="btn btn-primary" style={{ fontSize: "12px", padding: "4px 12px" }} onClick={saveHeader}>Save</button>
            <button className="btn btn-secondary" style={{ fontSize: "12px", padding: "4px 10px" }} onClick={() => { setName(holiday.name); setDate(holiday.date); setNotes(holiday.notes); setEditingHeader(false); }}>Cancel</button>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", marginBottom: expanded ? "10px" : 0 }}
          onMouseEnter={e => e.currentTarget.querySelectorAll<HTMLElement>(".hday-action").forEach(el => el.style.opacity = "1")}
          onMouseLeave={e => e.currentTarget.querySelectorAll<HTMLElement>(".hday-action").forEach(el => el.style.opacity = "0")}>
          <button onClick={() => setExpanded(v => !v)} style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "left" }}>
            <ChevronIcon open={expanded} />
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)" }}>{holiday.name}</span>
                {isSoon && !isPast && <span style={{ fontSize: "11px", fontWeight: 600, padding: "1px 7px", borderRadius: "99px", background: "var(--accent-dim)", color: "var(--accent)" }}>{days === 0 ? "Today!" : `${days}d`}</span>}
                {total > 0 && <span style={{ fontSize: "11px", color: "var(--text-3)" }}>{bought}/{total} gifts</span>}
              </div>
              {holiday.date && <div style={{ fontSize: "12px", color: "var(--text-3)", marginTop: "2px" }}>{fmtDate(holiday.date)}</div>}
            </div>
          </button>
          <div style={{ display: "flex", gap: "2px" }}>
            <button className="btn-icon hday-action" style={{ opacity: 0 }} onClick={() => setEditingHeader(true)}><PencilIcon /></button>
            <button className="btn-icon hday-action" style={{ opacity: 0 }} onClick={onDelete}><XIcon /></button>
          </div>
        </div>
      )}

      {expanded && (
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: "10px" }}>
          {holiday.notes && <p style={{ fontSize: "12.5px", color: "var(--text-2)", margin: "0 0 10px", lineHeight: 1.5 }}>{holiday.notes}</p>}
          {holiday.gifts.map(g => (
            <GiftRow key={g.id} gift={g} onChange={updated => updateGift(g.id, updated)} onDelete={() => deleteGift(g.id)} />
          ))}
          <button className="btn btn-secondary" style={{ fontSize: "12px", padding: "4px 12px", marginTop: "6px", width: "100%" }} onClick={addGift}>
            + Add gift idea
          </button>
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function HolidaysPage() {
  const [holidays,  setHolidays]  = useState<Holiday[]>([]);
  const [status,    setStatus]    = useState<SaveStatus>("idle");
  const [loading,   setLoading]   = useState(true);
  const [showAdd,   setShowAdd]   = useState(false);
  const [newName,   setNewName]   = useState("");
  const [newDate,   setNewDate]   = useState("");
  const [showPast,  setShowPast]  = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rawDataRef = useRef<DashData>({});

  useEffect(() => {
    fetch("/api/data")
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(res => {
        const d: DashData = res.data ?? {};
        rawDataRef.current = d;
        const saved = d.holidays?.holidays;
        if (saved && saved.length > 0) {
          setHolidays(saved);
        } else {
          // Seed with upcoming presets
          const seeded = PRESETS
            .filter(p => (daysUntil(p.date) ?? 1) >= 0)
            .map(p => ({ ...blankHoliday(p.name, p.date), id: crypto.randomUUID() }));
          setHolidays(seeded);
        }
      })
      .catch(() => setStatus("error"))
      .finally(() => setLoading(false));
  }, []);

  const save = useCallback(async (updated: Holiday[]) => {
    setStatus("saving");
    if (timer.current) clearTimeout(timer.current);
    const newData = { ...rawDataRef.current, holidays: { holidays: updated } };
    rawDataRef.current = newData;
    try {
      const res = await fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data: newData }) });
      if (!res.ok) throw new Error();
      setStatus("saved");
    } catch { setStatus("error"); }
    finally { timer.current = setTimeout(() => setStatus("idle"), 2000); }
  }, []);

  const addHoliday = () => {
    if (!newName.trim()) return;
    const next = [...holidays, { ...blankHoliday(newName.trim(), newDate), id: crypto.randomUUID() }];
    setHolidays(next); setShowAdd(false); setNewName(""); setNewDate(""); save(next);
  };

  const updateHoliday = (updated: Holiday) => {
    const next = holidays.map(h => h.id === updated.id ? updated : h);
    setHolidays(next); save(next);
  };

  const deleteHoliday = (id: string) => {
    const next = holidays.filter(h => h.id !== id);
    setHolidays(next); save(next);
  };

  if (loading) return <p className="empty" style={{ padding: "32px 0" }}>Loading…</p>;

  const sorted   = [...holidays].sort((a, b) => (a.date || "9999").localeCompare(b.date || "9999"));
  const upcoming = sorted.filter(h => (daysUntil(h.date) ?? 1) >= 0);
  const past     = sorted.filter(h => (daysUntil(h.date) ?? 1) < 0);
  const nextUp   = upcoming.filter(h => { const d = daysUntil(h.date); return d !== null && d <= 60; });

  return (
    <div style={{ maxWidth: "680px" }}>
      {status !== "idle" && (
        <div className={`toast${status === "error" ? " error" : ""}`}>
          {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : "Could not save — check connection."}
        </div>
      )}

      {/* Coming up banner */}
      {nextUp.length > 0 && (
        <div style={{ background: "var(--accent-dim)", borderRadius: "8px", padding: "10px 14px", marginBottom: "16px", display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--accent)" }}>Coming up</span>
          {nextUp.map(h => {
            const d = daysUntil(h.date)!;
            return <span key={h.id} style={{ fontSize: "12px", color: "var(--text-2)" }}>{h.name} <span style={{ color: "var(--accent)", fontWeight: 600 }}>{d === 0 ? "today!" : `in ${d}d`}</span></span>;
          })}
        </div>
      )}

      {/* Toolbar */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "12px", gap: "8px" }}>
        <button className="btn btn-primary" onClick={() => setShowAdd(v => !v)} style={{ fontSize: "13px", padding: "6px 14px" }}>
          {showAdd ? "Cancel" : "+ Add holiday"}
        </button>
      </div>

      {showAdd && (
        <div className="card" style={{ marginBottom: "12px", display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: "2 1 160px" }}>
            <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "3px" }}>Name</label>
            <input className="input" placeholder="Holiday name" value={newName} autoFocus onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === "Enter" && addHoliday()} />
          </div>
          <div style={{ flex: "1 1 130px" }}>
            <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "3px" }}>Date</label>
            <input className="input" type="date" value={newDate} onChange={e => setNewDate(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={addHoliday} style={{ padding: "8px 16px" }}>Add</button>
        </div>
      )}

      {/* Upcoming */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {upcoming.map(h => <HolidayCard key={h.id} holiday={h} onUpdate={updateHoliday} onDelete={() => deleteHoliday(h.id)} />)}
      </div>

      {/* Past */}
      {past.length > 0 && (
        <div style={{ marginTop: "20px" }}>
          <button onClick={() => setShowPast(v => !v)} style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", cursor: "pointer", color: "var(--text-3)", fontSize: "12.5px", fontWeight: 600, padding: "0 0 10px" }}>
            <ChevronIcon open={showPast} /> Past holidays ({past.length})
          </button>
          {showPast && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {past.map(h => <HolidayCard key={h.id} holiday={h} onUpdate={updateHoliday} onDelete={() => deleteHoliday(h.id)} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
