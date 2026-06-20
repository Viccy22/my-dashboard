"use client";

import { useEffect, useState, useCallback, useRef } from "react";

type TripStatus = "dreaming" | "planning" | "booked" | "completed";

type PackItem     = { id: string; text: string; packed: boolean };
type BudgetItem   = { id: string; category: string; description: string; planned: number; actual: number };
type Outfit       = { id: string; day: string; description: string; items: string; packed: boolean };
type Accommodation = { name: string; address: string; phone: string; checkIn: string; checkOut: string; confirmationNum: string };

type Trip = {
  id: string;
  destination: string;
  startDate: string;
  endDate: string;
  status: TripStatus;
  notes: string;
  accommodation: Accommodation;
  packingList: PackItem[];
  budget: BudgetItem[];
  outfits: Outfit[];
};

type VacData  = { trips: Trip[] };
type DashData = { vacations?: VacData; [key: string]: unknown };
type SaveStatus = "idle" | "saving" | "saved" | "error";
type DetailTab  = "details" | "budget" | "packing" | "outfits";

const STATUS_META: Record<TripStatus, { label: string; color: string; bg: string }> = {
  dreaming:  { label: "Dreaming",  color: "var(--text-3)", bg: "var(--surface-raised)" },
  planning:  { label: "Planning",  color: "var(--yellow)", bg: "var(--yellow-dim)" },
  booked:    { label: "Booked",    color: "var(--accent-text)", bg: "var(--accent-dim)" },
  completed: { label: "Completed", color: "var(--green)",  bg: "var(--green-dim)" },
};

const BUDGET_CATEGORIES = ["Transport", "Accommodation", "Food & Drink", "Activities", "Shopping", "Tickets", "Other"];

function emptyTrip(): Trip {
  return {
    id: crypto.randomUUID(), destination: "", startDate: "", endDate: "",
    status: "planning", notes: "",
    accommodation: { name: "", address: "", phone: "", checkIn: "", checkOut: "", confirmationNum: "" },
    packingList: [], budget: [], outfits: [],
  };
}

function daysUntil(s: string) { return Math.round((new Date(s + "T00:00:00").getTime() - Date.now()) / 86400000); }
function fmtDate(s: string)   { return new Date(s + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
function dateRange(start: string, end: string) {
  if (!start) return "";
  if (!end || start === end) return fmtDate(start);
  const s = new Date(start + "T00:00:00"); const e = new Date(end + "T00:00:00");
  if (s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth())
    return `${s.toLocaleDateString("en-US", { month: "short", day: "numeric" })}–${e.getDate()}, ${e.getFullYear()}`;
  return `${fmtDate(start)} – ${fmtDate(end)}`;
}
function tripDays(start: string, end: string): string[] {
  if (!start || !end) return [];
  const days: string[] = []; const cur = new Date(start + "T00:00:00"); const last = new Date(end + "T00:00:00");
  while (cur <= last) { days.push(cur.toISOString().slice(0, 10)); cur.setDate(cur.getDate() + 1); }
  return days;
}

const XIcon = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M2 2l9 9M11 2l-9 9" strokeLinecap="round" />
  </svg>
);
const BackIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6">
    <path d="M9 2L4 7l5 5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function VacationsPage() {
  const [trips,   setTrips]   = useState<Trip[]>([]);
  const [status,  setStatus]  = useState<SaveStatus>("idle");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>("details");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rawDataRef = useRef<DashData>({});

  useEffect(() => {
    fetch("/api/data")
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(res => {
        const d: DashData = res.data ?? {};
        rawDataRef.current = d;
        setTrips(d.vacations?.trips ?? []);
      })
      .catch(() => setStatus("error"))
      .finally(() => setLoading(false));
  }, []);

  const save = useCallback(async (updated: Trip[]) => {
    setStatus("saving");
    if (timer.current) clearTimeout(timer.current);
    const newData = { ...rawDataRef.current, vacations: { trips: updated } };
    rawDataRef.current = newData;
    try {
      const res = await fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data: newData }) });
      if (!res.ok) throw new Error();
      setStatus("saved");
    } catch { setStatus("error"); }
    finally { timer.current = setTimeout(() => setStatus("idle"), 2000); }
  }, []);

  const updateTrip = (id: string, patch: Partial<Trip>) => {
    const updated = trips.map(t => t.id === id ? { ...t, ...patch } : t);
    setTrips(updated); save(updated);
  };
  const deleteTrip = (id: string) => {
    const updated = trips.filter(t => t.id !== id); setTrips(updated);
    if (selected === id) setSelected(null); save(updated);
  };
  const addTrip = () => {
    const t = emptyTrip(); const updated = [...trips, t];
    setTrips(updated); setSelected(t.id); setDetailTab("details"); save(updated);
  };

  if (loading) return <p className="empty" style={{ padding: "32px 0" }}>Loading…</p>;

  const trip = selected ? trips.find(t => t.id === selected) : null;

  // ── DETAIL VIEW ──
  if (trip) {
    const days = tripDays(trip.startDate, trip.endDate);
    const untilStart = trip.startDate ? daysUntil(trip.startDate) : null;
    const isPast = untilStart !== null && untilStart < 0;
    const budgetPlanned = trip.budget.reduce((s, b) => s + b.planned, 0);
    const budgetActual  = trip.budget.reduce((s, b) => s + b.actual,  0);
    const packDone = trip.packingList.filter(p => p.packed).length;
    const outfitsDone = trip.outfits.filter(o => o.packed).length;

    const addBudgetItem = (item: Omit<BudgetItem, "id">) => {
      updateTrip(trip.id, { budget: [...trip.budget, { ...item, id: crypto.randomUUID() }] });
    };
    const updateBudgetItem = (itemId: string, patch: Partial<BudgetItem>) => {
      updateTrip(trip.id, { budget: trip.budget.map(b => b.id === itemId ? { ...b, ...patch } : b) });
    };
    const deleteBudgetItem = (itemId: string) => {
      updateTrip(trip.id, { budget: trip.budget.filter(b => b.id !== itemId) });
    };
    const addPackItem = (text: string) => {
      if (!text.trim()) return;
      updateTrip(trip.id, { packingList: [...trip.packingList, { id: crypto.randomUUID(), text: text.trim(), packed: false }] });
    };
    const togglePack = (itemId: string) => {
      updateTrip(trip.id, { packingList: trip.packingList.map(p => p.id === itemId ? { ...p, packed: !p.packed } : p) });
    };
    const deletePackItem = (itemId: string) => {
      updateTrip(trip.id, { packingList: trip.packingList.filter(p => p.id !== itemId) });
    };
    const addOutfit = (o: Omit<Outfit, "id">) => {
      updateTrip(trip.id, { outfits: [...trip.outfits, { ...o, id: crypto.randomUUID() }] });
    };
    const updateOutfit = (itemId: string, patch: Partial<Outfit>) => {
      updateTrip(trip.id, { outfits: trip.outfits.map(o => o.id === itemId ? { ...o, ...patch } : o) });
    };
    const deleteOutfit = (itemId: string) => {
      updateTrip(trip.id, { outfits: trip.outfits.filter(o => o.id !== itemId) });
    };

    return (
      <div style={{ maxWidth: "820px" }}>
        {status !== "idle" && <div className={`toast${status === "error" ? " error" : ""}`}>{status === "saving" ? "Saving…" : status === "saved" ? "Saved" : "Error saving."}</div>}

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
          <button className="btn-icon" onClick={() => setSelected(null)}><BackIcon /></button>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 700 }}>{trip.destination || "New trip"}</h2>
            {trip.startDate && <p style={{ margin: 0, fontSize: "13px", color: "var(--text-3)" }}>{dateRange(trip.startDate, trip.endDate)}</p>}
          </div>
          {untilStart !== null && !isPast && (
            <div style={{ textAlign: "center", background: untilStart <= 30 ? "var(--accent-dim)" : "var(--surface-raised)", borderRadius: "10px", padding: "8px 16px" }}>
              <p style={{ margin: 0, fontSize: "24px", fontWeight: 800, color: "var(--accent-text)", fontVariantNumeric: "tabular-nums" }}>{untilStart}</p>
              <p style={{ margin: 0, fontSize: "10px", color: "var(--text-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>days away</p>
            </div>
          )}
          {isPast && <span style={{ fontSize: "12px", fontWeight: 600, padding: "4px 10px", borderRadius: "99px", background: "var(--green-dim)", color: "var(--green)" }}>Completed</span>}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "4px", marginBottom: "16px", flexWrap: "wrap" }}>
          {(["details","budget","packing","outfits"] as DetailTab[]).map(t => (
            <button key={t} onClick={() => setDetailTab(t)}
              className={detailTab === t ? "btn btn-primary" : "btn btn-secondary"}
              style={{ fontSize: "13px", padding: "6px 14px", textTransform: "capitalize" }}>
              {t === "packing" ? `Packing (${packDone}/${trip.packingList.length})` : t === "outfits" ? `Outfits (${outfitsDone}/${trip.outfits.length})` : t === "budget" ? `Budget ($${budgetActual.toFixed(0)}/$${budgetPlanned.toFixed(0)})` : t}
            </button>
          ))}
        </div>

        {/* ── DETAILS ── */}
        {detailTab === "details" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div className="card">
              <p className="card-title" style={{ marginBottom: "12px" }}>Trip details</p>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "10px" }}>
                <div style={{ flex: "2 1 200px" }}>
                  <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "3px" }}>Destination</label>
                  <input className="input" value={trip.destination} placeholder="City, Country" onChange={e => updateTrip(trip.id, { destination: e.target.value })} />
                </div>
                <div style={{ flex: "1 1 140px" }}>
                  <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "3px" }}>Status</label>
                  <select className="input" value={trip.status} onChange={e => updateTrip(trip.id, { status: e.target.value as TripStatus })}>
                    {(Object.keys(STATUS_META) as TripStatus[]).map(s => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "10px" }}>
                <div style={{ flex: "1 1 130px" }}>
                  <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "3px" }}>Start date</label>
                  <input className="input" type="date" value={trip.startDate} onChange={e => updateTrip(trip.id, { startDate: e.target.value })} />
                </div>
                <div style={{ flex: "1 1 130px" }}>
                  <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "3px" }}>End date</label>
                  <input className="input" type="date" value={trip.endDate} onChange={e => updateTrip(trip.id, { endDate: e.target.value })} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "3px" }}>Notes</label>
                <textarea className="input" value={trip.notes} rows={3} placeholder="Itinerary, travel plans, things to do…"
                  onChange={e => updateTrip(trip.id, { notes: e.target.value })}
                  style={{ resize: "vertical", fontFamily: "inherit", fontSize: "13.5px" }} />
              </div>
            </div>

            <div className="card">
              <p className="card-title" style={{ marginBottom: "12px" }}>Accommodation</p>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "10px" }}>
                <div style={{ flex: "2 1 180px" }}>
                  <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "3px" }}>Name (hotel / Airbnb / etc.)</label>
                  <input className="input" value={trip.accommodation.name} placeholder="Hotel name" onChange={e => updateTrip(trip.id, { accommodation: { ...trip.accommodation, name: e.target.value } })} />
                </div>
                <div style={{ flex: "1 1 130px" }}>
                  <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "3px" }}>Phone</label>
                  <input className="input" value={trip.accommodation.phone} placeholder="(xxx) xxx-xxxx" onChange={e => updateTrip(trip.id, { accommodation: { ...trip.accommodation, phone: e.target.value } })} />
                </div>
              </div>
              <div style={{ marginBottom: "10px" }}>
                <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "3px" }}>Address</label>
                <input className="input" value={trip.accommodation.address} placeholder="Street, City, State, Zip" onChange={e => updateTrip(trip.id, { accommodation: { ...trip.accommodation, address: e.target.value } })} />
              </div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "10px" }}>
                <div style={{ flex: "1 1 130px" }}>
                  <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "3px" }}>Check-in</label>
                  <input className="input" type="date" value={trip.accommodation.checkIn} onChange={e => updateTrip(trip.id, { accommodation: { ...trip.accommodation, checkIn: e.target.value } })} />
                </div>
                <div style={{ flex: "1 1 130px" }}>
                  <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "3px" }}>Check-out</label>
                  <input className="input" type="date" value={trip.accommodation.checkOut} onChange={e => updateTrip(trip.id, { accommodation: { ...trip.accommodation, checkOut: e.target.value } })} />
                </div>
                <div style={{ flex: "2 1 200px" }}>
                  <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "3px" }}>Confirmation number</label>
                  <input className="input" value={trip.accommodation.confirmationNum} placeholder="Booking reference" onChange={e => updateTrip(trip.id, { accommodation: { ...trip.accommodation, confirmationNum: e.target.value } })} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── BUDGET ── */}
        {detailTab === "budget" && (
          <BudgetTab
            items={trip.budget} planned={budgetPlanned} actual={budgetActual}
            onAdd={addBudgetItem} onUpdate={updateBudgetItem} onDelete={deleteBudgetItem}
          />
        )}

        {/* ── PACKING ── */}
        {detailTab === "packing" && (
          <PackingTab packingList={trip.packingList} onAdd={addPackItem} onToggle={togglePack} onDelete={deletePackItem} />
        )}

        {/* ── OUTFITS ── */}
        {detailTab === "outfits" && (
          <OutfitsTab outfits={trip.outfits} days={days} onAdd={addOutfit} onUpdate={updateOutfit} onDelete={deleteOutfit} />
        )}
      </div>
    );
  }

  // ── LIST VIEW ──
  const upcoming  = trips.filter(t => t.status !== "completed").sort((a, b) => (a.startDate || "9").localeCompare(b.startDate || "9"));
  const completed = trips.filter(t => t.status === "completed").sort((a, b) => b.startDate.localeCompare(a.startDate));

  return (
    <div style={{ maxWidth: "820px" }}>
      {status !== "idle" && <div className={`toast${status === "error" ? " error" : ""}`}>{status === "saving" ? "Saving…" : status === "saved" ? "Saved" : "Error saving."}</div>}

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "16px" }}>
        <button className="btn btn-primary" onClick={addTrip}>+ Add trip</button>
      </div>

      {upcoming.length === 0 && completed.length === 0 && <div className="card"><p className="empty">No trips yet. Add one to get started.</p></div>}

      {upcoming.map(t => <TripCard key={t.id} trip={t} onSelect={() => { setSelected(t.id); setDetailTab("details"); }} onDelete={() => deleteTrip(t.id)} />)}

      {completed.length > 0 && (
        <details style={{ marginTop: "16px" }}>
          <summary style={{ fontSize: "12px", color: "var(--text-3)", cursor: "pointer", userSelect: "none", padding: "4px 0", fontWeight: 600 }}>
            {completed.length} past trip{completed.length !== 1 ? "s" : ""}
          </summary>
          <div style={{ marginTop: "8px", opacity: 0.55 }}>
            {completed.map(t => <TripCard key={t.id} trip={t} onSelect={() => { setSelected(t.id); setDetailTab("details"); }} onDelete={() => deleteTrip(t.id)} />)}
          </div>
        </details>
      )}
    </div>
  );
}

function TripCard({ trip, onSelect, onDelete }: { trip: Trip; onSelect: () => void; onDelete: () => void }) {
  const days   = trip.startDate ? daysUntil(trip.startDate) : null;
  const isPast = days !== null && days < 0;
  const meta   = STATUS_META[trip.status];
  const budgetPlanned = trip.budget.reduce((s, b) => s + b.planned, 0);
  const budgetActual  = trip.budget.reduce((s, b) => s + b.actual,  0);
  const packPct = trip.packingList.length ? Math.round((trip.packingList.filter(p => p.packed).length / trip.packingList.length) * 100) : -1;

  return (
    <div className="card" style={{ marginBottom: "12px", cursor: "pointer" }} onClick={onSelect}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "16px", fontWeight: 700, color: "var(--text)" }}>{trip.destination || "New trip"}</span>
            <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "99px", background: meta.bg, color: meta.color }}>{meta.label}</span>
          </div>
          <p style={{ fontSize: "12.5px", color: "var(--text-3)", margin: "0 0 8px" }}>{dateRange(trip.startDate, trip.endDate)}</p>
          <div style={{ display: "flex", gap: "12px", fontSize: "12px", color: "var(--text-3)", flexWrap: "wrap" }}>
            {trip.accommodation.name && <span>📍 {trip.accommodation.name}</span>}
            {budgetPlanned > 0 && <span>Budget: ${budgetActual.toFixed(0)} / ${budgetPlanned.toFixed(0)}</span>}
            {packPct >= 0 && <span>Packed: {packPct}%</span>}
            {trip.outfits.length > 0 && <span>{trip.outfits.length} outfit{trip.outfits.length !== 1 ? "s" : ""}</span>}
          </div>
          {packPct >= 0 && (
            <div style={{ height: "4px", borderRadius: "99px", background: "var(--surface-raised)", marginTop: "8px", overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: "99px", background: "var(--green)", width: `${packPct}%` }} />
            </div>
          )}
        </div>
        {days !== null && !isPast && (
          <div style={{ textAlign: "center", background: days <= 30 ? "var(--accent-dim)" : "var(--surface-raised)", borderRadius: "8px", padding: "8px 14px", flexShrink: 0 }}>
            <p style={{ margin: 0, fontSize: "22px", fontWeight: 800, color: days <= 30 ? "var(--accent-text)" : "var(--text)", fontVariantNumeric: "tabular-nums" }}>{days}</p>
            <p style={{ margin: 0, fontSize: "9px", color: "var(--text-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>days</p>
          </div>
        )}
        <button className="btn-icon" style={{ flexShrink: 0 }} onClick={e => { e.stopPropagation(); onDelete(); }}><XIcon /></button>
      </div>
    </div>
  );
}

function BudgetTab({ items, planned, actual, onAdd, onUpdate, onDelete }: {
  items: BudgetItem[]; planned: number; actual: number;
  onAdd: (item: Omit<BudgetItem, "id">) => void;
  onUpdate: (id: string, patch: Partial<BudgetItem>) => void;
  onDelete: (id: string) => void;
}) {
  const [form, setForm] = useState({ category: "Transport", description: "", planned: "", actual: "" });
  const remaining = planned - actual;

  return (
    <div>
      {/* Summary */}
      {(planned > 0 || actual > 0) && (
        <div className="card" style={{ marginBottom: "12px" }}>
          <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
            <div><p style={{ fontSize: "11px", color: "var(--text-3)", margin: "0 0 2px" }}>Total budget</p><p style={{ fontSize: "22px", fontWeight: 800, margin: 0 }}>${planned.toFixed(0)}</p></div>
            <div><p style={{ fontSize: "11px", color: "var(--text-3)", margin: "0 0 2px" }}>Spent so far</p><p style={{ fontSize: "22px", fontWeight: 800, margin: 0, color: actual > planned ? "var(--red)" : "var(--text)" }}>${actual.toFixed(0)}</p></div>
            <div><p style={{ fontSize: "11px", color: "var(--text-3)", margin: "0 0 2px" }}>Remaining</p><p style={{ fontSize: "22px", fontWeight: 800, margin: 0, color: remaining < 0 ? "var(--red)" : "var(--green)" }}>${remaining.toFixed(0)}</p></div>
          </div>
          {planned > 0 && (
            <div style={{ height: "6px", borderRadius: "99px", background: "var(--surface-raised)", marginTop: "12px", overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: "99px", background: actual > planned ? "var(--red)" : "var(--accent)", width: `${Math.min((actual / planned) * 100, 100)}%` }} />
            </div>
          )}
        </div>
      )}

      {/* Add form */}
      <div className="card" style={{ marginBottom: "12px" }}>
        <p className="card-title" style={{ marginBottom: "10px" }}>Add expense</p>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <select className="input" style={{ flex: "1 1 130px" }} value={form.category} onChange={e => setForm(x => ({ ...x, category: e.target.value }))}>
            {BUDGET_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input className="input" style={{ flex: "2 1 150px" }} placeholder="Description" value={form.description} onChange={e => setForm(x => ({ ...x, description: e.target.value }))} />
          <input className="input" style={{ flex: "0 0 100px" }} type="number" step="1" min="0" placeholder="Planned $" value={form.planned} onChange={e => setForm(x => ({ ...x, planned: e.target.value }))} />
          <input className="input" style={{ flex: "0 0 100px" }} type="number" step="1" min="0" placeholder="Actual $" value={form.actual} onChange={e => setForm(x => ({ ...x, actual: e.target.value }))} />
          <button className="btn btn-primary" onClick={() => {
            onAdd({ category: form.category, description: form.description, planned: parseFloat(form.planned) || 0, actual: parseFloat(form.actual) || 0 });
            setForm(x => ({ ...x, description: "", planned: "", actual: "" }));
          }}>Add</button>
        </div>
      </div>

      {/* By category */}
      {BUDGET_CATEGORIES.map(cat => {
        const group = items.filter(b => b.category === cat);
        if (!group.length) return null;
        const catPlanned = group.reduce((s, b) => s + b.planned, 0);
        const catActual  = group.reduce((s, b) => s + b.actual, 0);
        return (
          <div key={cat} className="card" style={{ marginBottom: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
              <p className="card-title" style={{ margin: 0 }}>{cat}</p>
              <span style={{ fontSize: "12px", color: "var(--text-3)", fontVariantNumeric: "tabular-nums" }}>${catActual.toFixed(0)} / ${catPlanned.toFixed(0)}</span>
            </div>
            {group.map(item => (
              <div key={item.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "4px 0", borderBottom: "1px solid var(--border)" }}
                onMouseEnter={e => e.currentTarget.querySelectorAll<HTMLElement>(".b-del").forEach(el => el.style.opacity = "1")}
                onMouseLeave={e => e.currentTarget.querySelectorAll<HTMLElement>(".b-del").forEach(el => el.style.opacity = "0")}>
                <span style={{ flex: 1, fontSize: "13px" }}>{item.description || cat}</span>
                <div style={{ display: "flex", alignItems: "center", background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: "5px", padding: "2px 6px", gap: "2px" }}>
                  <span style={{ fontSize: "10px", color: "var(--text-3)" }}>plan $</span>
                  <input style={{ background: "none", border: "none", outline: "none", color: "var(--text)", fontSize: "12px", width: "52px", fontFamily: "inherit", textAlign: "right" }}
                    type="number" value={item.planned || ""} placeholder="0" onChange={e => onUpdate(item.id, { planned: parseFloat(e.target.value) || 0 })} />
                </div>
                <div style={{ display: "flex", alignItems: "center", background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: "5px", padding: "2px 6px", gap: "2px" }}>
                  <span style={{ fontSize: "10px", color: "var(--text-3)" }}>act $</span>
                  <input style={{ background: "none", border: "none", outline: "none", color: "var(--text)", fontSize: "12px", width: "52px", fontFamily: "inherit", textAlign: "right" }}
                    type="number" value={item.actual || ""} placeholder="0" onChange={e => onUpdate(item.id, { actual: parseFloat(e.target.value) || 0 })} />
                </div>
                <button className="btn-icon b-del" style={{ opacity: 0 }} onClick={() => onDelete(item.id)}><XIcon /></button>
              </div>
            ))}
          </div>
        );
      })}

      {items.length === 0 && <div className="card"><p className="empty">No budget items yet.</p></div>}
    </div>
  );
}

function PackingTab({ packingList, onAdd, onToggle, onDelete }: {
  packingList: PackItem[]; onAdd: (text: string) => void; onToggle: (id: string) => void; onDelete: (id: string) => void;
}) {
  const [text, setText] = useState("");
  const pending  = packingList.filter(p => !p.packed);
  const packed   = packingList.filter(p => p.packed);

  return (
    <div>
      <div className="card" style={{ marginBottom: "12px" }}>
        <div style={{ display: "flex", gap: "8px" }}>
          <input className="input" style={{ flex: 1 }} placeholder="Add item to pack…" value={text}
            onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { onAdd(text); setText(""); } }} />
          <button className="btn btn-primary" onClick={() => { onAdd(text); setText(""); }}>Add</button>
        </div>
      </div>

      {packingList.length === 0 && <div className="card"><p className="empty">Nothing to pack yet.</p></div>}

      {pending.length > 0 && (
        <div className="card" style={{ marginBottom: "12px" }}>
          <p className="card-title" style={{ marginBottom: "8px" }}>Still need to pack ({pending.length})</p>
          {pending.map(item => (
            <label key={item.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "4px 0", cursor: "pointer", userSelect: "none" }}
              onMouseEnter={e => e.currentTarget.querySelectorAll<HTMLElement>(".p-del").forEach(el => el.style.opacity = "1")}
              onMouseLeave={e => e.currentTarget.querySelectorAll<HTMLElement>(".p-del").forEach(el => el.style.opacity = "0")}>
              <input type="checkbox" className="checkbox" checked={false} onChange={() => onToggle(item.id)} />
              <span style={{ flex: 1, fontSize: "13.5px" }}>{item.text}</span>
              <button className="btn-icon p-del" style={{ opacity: 0 }} onClick={() => onDelete(item.id)}><XIcon /></button>
            </label>
          ))}
        </div>
      )}

      {packed.length > 0 && (
        <details>
          <summary style={{ fontSize: "12px", color: "var(--text-3)", cursor: "pointer", userSelect: "none", padding: "4px 0" }}>{packed.length} packed</summary>
          <div className="card" style={{ marginTop: "8px", opacity: 0.5 }}>
            {packed.map(item => (
              <label key={item.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "4px 0", cursor: "pointer", userSelect: "none" }}>
                <input type="checkbox" className="checkbox" checked={true} onChange={() => onToggle(item.id)} />
                <span style={{ flex: 1, fontSize: "13.5px", textDecoration: "line-through", color: "var(--text-3)" }}>{item.text}</span>
                <button className="btn-icon" onClick={() => onDelete(item.id)}><XIcon /></button>
              </label>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function OutfitsTab({ outfits, days, onAdd, onUpdate, onDelete }: {
  outfits: Outfit[]; days: string[];
  onAdd: (o: Omit<Outfit, "id">) => void;
  onUpdate: (id: string, patch: Partial<Outfit>) => void;
  onDelete: (id: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<Omit<Outfit, "id">>({ day: days[0] ?? "", description: "", items: "", packed: false });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "12px" }}>
        <button className="btn btn-primary" onClick={() => setAdding(x => !x)}>{adding ? "Cancel" : "+ Add outfit"}</button>
      </div>

      {adding && (
        <div className="card" style={{ marginBottom: "14px" }}>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "10px" }}>
            {days.length > 0 ? (
              <div style={{ flex: "1 1 130px" }}>
                <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "3px" }}>Day</label>
                <select className="input" value={form.day} onChange={e => setForm(x => ({ ...x, day: e.target.value }))}>
                  {days.map(d => <option key={d} value={d}>{new Date(d + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</option>)}
                </select>
              </div>
            ) : (
              <div style={{ flex: "1 1 130px" }}>
                <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "3px" }}>Day / label</label>
                <input className="input" placeholder="Day 1, Saturday…" value={form.day} onChange={e => setForm(x => ({ ...x, day: e.target.value }))} />
              </div>
            )}
            <div style={{ flex: "2 1 180px" }}>
              <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "3px" }}>Outfit name / description</label>
              <input className="input" placeholder="e.g. Floral set + boots" value={form.description} autoFocus onChange={e => setForm(x => ({ ...x, description: e.target.value }))} />
            </div>
          </div>
          <div style={{ marginBottom: "10px" }}>
            <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "3px" }}>Items (top, bottoms, shoes, accessories…)</label>
            <textarea className="input" rows={2} placeholder="White crop top, denim shorts, platform sandals, bucket hat…"
              value={form.items} onChange={e => setForm(x => ({ ...x, items: e.target.value }))}
              style={{ resize: "vertical", fontFamily: "inherit", fontSize: "13px" }} />
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <button className="btn btn-primary" onClick={() => { onAdd(form); setForm(x => ({ ...x, description: "", items: "" })); setAdding(false); }}>Add outfit</button>
            <button className="btn btn-secondary" onClick={() => setAdding(false)}>Cancel</button>
          </div>
        </div>
      )}

      {outfits.length === 0 && !adding && <div className="card"><p className="empty">No outfits planned yet.</p></div>}

      {/* Group by day */}
      {Array.from(new Set(outfits.map(o => o.day))).map(day => {
        const group = outfits.filter(o => o.day === day);
        const dayLabel = days.includes(day) ? new Date(day + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" }) : day;
        return (
          <div key={day} className="card" style={{ marginBottom: "12px" }}>
            <p className="card-title" style={{ marginBottom: "10px" }}>{dayLabel || "Unassigned"}</p>
            {group.map(o => (
              <div key={o.id} style={{ padding: "8px 0", borderBottom: "1px solid var(--border)" }}
                onMouseEnter={e => e.currentTarget.querySelectorAll<HTMLElement>(".o-del").forEach(el => el.style.opacity = "1")}
                onMouseLeave={e => e.currentTarget.querySelectorAll<HTMLElement>(".o-del").forEach(el => el.style.opacity = "0")}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: o.items ? "4px" : 0 }}>
                  <input type="checkbox" className="checkbox" checked={o.packed} onChange={() => onUpdate(o.id, { packed: !o.packed })} title="Packed" />
                  <span style={{ flex: 1, fontWeight: 600, fontSize: "13.5px", color: o.packed ? "var(--text-3)" : "var(--text)", textDecoration: o.packed ? "line-through" : "none" }}>{o.description}</span>
                  <button className="btn-icon o-del" style={{ opacity: 0 }} onClick={() => onDelete(o.id)}><XIcon /></button>
                </div>
                {o.items && <p style={{ fontSize: "12px", color: "var(--text-3)", margin: "0 0 0 26px" }}>{o.items}</p>}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
