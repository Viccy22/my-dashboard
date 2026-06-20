"use client";

import { useEffect, useState, useCallback, useRef } from "react";

type TicketStatus = "interested" | "watching" | "purchased" | "attended" | "skipped";
type Priority     = "must" | "nice" | "luxury";

type CheckItem  = { id: string; category: string; text: string; done: boolean };
type BuyItem    = { id: string; text: string; cost: number; bought: boolean; priority: Priority };
type ArtistSlot = { id: string; day: string; time: string; stage: string; artist: string; notes: string; mustSee: boolean };

type Festival = {
  id: string;
  name: string;
  location: string;
  startDate: string;
  endDate: string;
  ticketStatus: TicketStatus;
  ticketCost: number;
  budget: number;
  notes: string;
  url: string;
  checklist: CheckItem[];
  buyList: BuyItem[];
  artists: ArtistSlot[];
};

type FestData  = { festivals: Festival[] };
type DashData  = { festivals?: FestData; [key: string]: unknown };
type SaveStatus = "idle" | "saving" | "saved" | "error";
type DetailTab  = "info" | "checklist" | "buy" | "artists";

const TICKET_META: Record<TicketStatus, { label: string; color: string; bg: string }> = {
  interested: { label: "Interested", color: "var(--text-3)", bg: "var(--surface-raised)" },
  watching:   { label: "Watching",   color: "var(--yellow)", bg: "var(--yellow-dim)" },
  purchased:  { label: "Purchased",  color: "var(--accent-text)", bg: "var(--accent-dim)" },
  attended:   { label: "Attended",   color: "var(--green)",  bg: "var(--green-dim)" },
  skipped:    { label: "Skipped",    color: "var(--text-3)", bg: "var(--surface-raised)" },
};

const CHECKLIST_CATEGORIES = ["Camping", "Clothing", "Toiletries", "Electronics", "Food & Drink", "Festival Essentials", "Other"];

const DEFAULT_CHECKLIST: Omit<CheckItem, "id">[] = [
  // Camping
  { category: "Camping", text: "Tent + extra stakes", done: false },
  { category: "Camping", text: "Sleeping bag", done: false },
  { category: "Camping", text: "Air mattress + pump", done: false },
  { category: "Camping", text: "Pillow", done: false },
  { category: "Camping", text: "Tarp / canopy", done: false },
  { category: "Camping", text: "Camping chairs", done: false },
  { category: "Camping", text: "Headlamp + batteries", done: false },
  { category: "Camping", text: "Trash bags", done: false },
  // Clothing
  { category: "Clothing", text: "Festival outfits (1 per day)", done: false },
  { category: "Clothing", text: "Comfortable walking shoes", done: false },
  { category: "Clothing", text: "Rain poncho", done: false },
  { category: "Clothing", text: "Hat / sun hat", done: false },
  { category: "Clothing", text: "Sunglasses", done: false },
  { category: "Clothing", text: "Layers / hoodie for night", done: false },
  // Toiletries
  { category: "Toiletries", text: "Sunscreen (SPF 50+)", done: false },
  { category: "Toiletries", text: "Bug spray", done: false },
  { category: "Toiletries", text: "Deodorant", done: false },
  { category: "Toiletries", text: "Wet wipes / body wipes", done: false },
  { category: "Toiletries", text: "Hand sanitizer", done: false },
  { category: "Toiletries", text: "Medications / prescriptions", done: false },
  { category: "Toiletries", text: "Feminine products", done: false },
  { category: "Toiletries", text: "Dry shampoo", done: false },
  // Electronics
  { category: "Electronics", text: "Phone charger", done: false },
  { category: "Electronics", text: "Portable battery pack (high capacity)", done: false },
  { category: "Electronics", text: "Earplugs (foam + reusable)", done: false },
  { category: "Electronics", text: "Camera", done: false },
  // Food & Drink
  { category: "Food & Drink", text: "Refillable water bottle / hydration pack", done: false },
  { category: "Food & Drink", text: "Snacks (bars, trail mix)", done: false },
  { category: "Food & Drink", text: "Cooler + ice", done: false },
  // Festival Essentials
  { category: "Festival Essentials", text: "Ticket / wristband confirmation", done: false },
  { category: "Festival Essentials", text: "Government ID", done: false },
  { category: "Festival Essentials", text: "Cash (small bills)", done: false },
  { category: "Festival Essentials", text: "Fanny pack / crossbody bag", done: false },
  { category: "Festival Essentials", text: "Portable fan / misting fan", done: false },
  { category: "Festival Essentials", text: "Glow sticks / LED accessories", done: false },
];

function mkChecklist(): CheckItem[] {
  return DEFAULT_CHECKLIST.map(c => ({ ...c, id: crypto.randomUUID() }));
}

function mkFestival(name: string, location: string, start: string, end: string, status: TicketStatus, cost: number): Festival {
  return {
    id: crypto.randomUUID(), name, location, startDate: start, endDate: end,
    ticketStatus: status, ticketCost: cost, budget: 0, notes: "", url: "",
    checklist: mkChecklist(), buyList: [], artists: [],
  };
}

const SEED_FESTIVALS: Festival[] = [
  mkFestival("Bonnaroo", "Manchester, TN", "2026-06-11", "2026-06-14", "purchased", 0),
  mkFestival("EDC Orlando", "Orlando, FL", "2026-11-06", "2026-11-08", "purchased", 0),
  mkFestival("Okeechobee Music & Arts", "Okeechobee, FL", "2027-03-05", "2027-03-08", "interested", 0),
];

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
function festDays(start: string, end: string): string[] {
  if (!start || !end) return [];
  const days: string[] = [];
  const cur = new Date(start + "T00:00:00"); const last = new Date(end + "T00:00:00");
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

export default function FestivalsPage() {
  const [rawData, setRawData] = useState<DashData>({});
  const [fests,   setFests]   = useState<Festival[]>([]);
  const [status,  setStatus]  = useState<SaveStatus>("idle");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>("info");
  const [adding,   setAdding]   = useState(false);
  const [newName,  setNewName]  = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/api/data")
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(res => {
        const d: DashData = res.data ?? {};
        setRawData(d);
        const saved = d.festivals?.festivals ?? [];
        setFests(saved.length ? saved : SEED_FESTIVALS);
      })
      .catch(() => setStatus("error"))
      .finally(() => setLoading(false));
  }, []);

  const save = useCallback(async (updated: Festival[]) => {
    setStatus("saving");
    if (timer.current) clearTimeout(timer.current);
    const newData = { ...rawData, festivals: { festivals: updated } };
    setRawData(newData);
    try {
      const res = await fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data: newData }) });
      if (!res.ok) throw new Error();
      setStatus("saved");
    } catch { setStatus("error"); }
    finally { timer.current = setTimeout(() => setStatus("idle"), 2000); }
  }, [rawData]);

  const updateFest = (id: string, patch: Partial<Festival>) => {
    const updated = fests.map(f => f.id === id ? { ...f, ...patch } : f);
    setFests(updated); save(updated);
  };

  const deleteFest = (id: string) => {
    const updated = fests.filter(f => f.id !== id); setFests(updated);
    if (selected === id) setSelected(null); save(updated);
  };

  const addFest = () => {
    if (!newName.trim()) return;
    const f = mkFestival(newName.trim(), "", "", "", "interested", 0);
    const updated = [...fests, f]; setFests(updated); setAdding(false); setNewName("");
    setSelected(f.id); setDetailTab("info"); save(updated);
  };

  if (loading) return <p className="empty" style={{ padding: "32px 0" }}>Loading…</p>;

  const fest = selected ? fests.find(f => f.id === selected) : null;

  // ── DETAIL VIEW ──
  if (fest) {
    const days   = festDays(fest.startDate, fest.endDate);
    const untilStart = fest.startDate ? daysUntil(fest.startDate) : null;
    const isPast = untilStart !== null && untilStart < 0;
    const checkDone = fest.checklist.filter(c => c.done).length;
    const buyTotal  = fest.buyList.reduce((s, b) => s + b.cost, 0);
    const boughtTotal = fest.buyList.filter(b => b.bought).reduce((s, b) => s + b.cost, 0);

    const toggleCheck = (itemId: string) => {
      const cl = fest.checklist.map(c => c.id === itemId ? { ...c, done: !c.done } : c);
      updateFest(fest.id, { checklist: cl });
    };
    const addCheckItem = (category: string, text: string) => {
      if (!text.trim()) return;
      updateFest(fest.id, { checklist: [...fest.checklist, { id: crypto.randomUUID(), category, text: text.trim(), done: false }] });
    };
    const deleteCheckItem = (itemId: string) => {
      updateFest(fest.id, { checklist: fest.checklist.filter(c => c.id !== itemId) });
    };
    const addBuyItem = (text: string, cost: number, priority: Priority) => {
      if (!text.trim()) return;
      updateFest(fest.id, { buyList: [...fest.buyList, { id: crypto.randomUUID(), text: text.trim(), cost, bought: false, priority }] });
    };
    const toggleBuy = (itemId: string) => {
      updateFest(fest.id, { buyList: fest.buyList.map(b => b.id === itemId ? { ...b, bought: !b.bought } : b) });
    };
    const deleteBuyItem = (itemId: string) => {
      updateFest(fest.id, { buyList: fest.buyList.filter(b => b.id !== itemId) });
    };
    const addArtist = (slot: Omit<ArtistSlot, "id">) => {
      if (!slot.artist.trim()) return;
      updateFest(fest.id, { artists: [...fest.artists, { ...slot, id: crypto.randomUUID() }] });
    };
    const deleteArtist = (id: string) => {
      updateFest(fest.id, { artists: fest.artists.filter(a => a.id !== id) });
    };
    const toggleMustSee = (id: string) => {
      updateFest(fest.id, { artists: fest.artists.map(a => a.id === id ? { ...a, mustSee: !a.mustSee } : a) });
    };

    return (
      <div style={{ maxWidth: "820px" }}>
        {status !== "idle" && <div className={`toast${status === "error" ? " error" : ""}`}>{status === "saving" ? "Saving…" : status === "saved" ? "Saved" : "Error saving."}</div>}

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
          <button className="btn-icon" onClick={() => setSelected(null)} title="Back"><BackIcon /></button>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 700 }}>{fest.name}</h2>
            {fest.location && <p style={{ margin: 0, fontSize: "13px", color: "var(--text-3)" }}>{fest.location} · {dateRange(fest.startDate, fest.endDate)}</p>}
          </div>
          {untilStart !== null && !isPast && (
            <div style={{ textAlign: "center", background: untilStart <= 30 ? "var(--accent-dim)" : "var(--surface-raised)", borderRadius: "10px", padding: "8px 16px" }}>
              <p style={{ margin: 0, fontSize: "24px", fontWeight: 800, color: "var(--accent-text)", fontVariantNumeric: "tabular-nums" }}>{untilStart}</p>
              <p style={{ margin: 0, fontSize: "10px", color: "var(--text-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>days away</p>
            </div>
          )}
          {isPast && <span style={{ fontSize: "12px", fontWeight: 600, padding: "4px 10px", borderRadius: "99px", background: "var(--green-dim)", color: "var(--green)" }}>{TICKET_META["attended"].label}</span>}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "4px", marginBottom: "16px" }}>
          {(["info","checklist","buy","artists"] as DetailTab[]).map(t => (
            <button key={t} onClick={() => setDetailTab(t)}
              className={detailTab === t ? "btn btn-primary" : "btn btn-secondary"}
              style={{ fontSize: "13px", padding: "6px 14px", textTransform: "capitalize" }}>
              {t === "buy" ? "Buy list" : t === "artists" ? "Artist schedule" : t}
              {t === "checklist" && ` (${checkDone}/${fest.checklist.length})`}
            </button>
          ))}
        </div>

        {/* ── INFO ── */}
        {detailTab === "info" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div className="card">
              <p className="card-title" style={{ marginBottom: "12px" }}>Festival details</p>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "10px" }}>
                <div style={{ flex: "2 1 160px" }}>
                  <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "3px" }}>Location</label>
                  <input className="input" value={fest.location} placeholder="City, State" onChange={e => updateFest(fest.id, { location: e.target.value })} />
                </div>
                <div style={{ flex: "1 1 130px" }}>
                  <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "3px" }}>Start date</label>
                  <input className="input" type="date" value={fest.startDate} onChange={e => updateFest(fest.id, { startDate: e.target.value })} />
                </div>
                <div style={{ flex: "1 1 130px" }}>
                  <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "3px" }}>End date</label>
                  <input className="input" type="date" value={fest.endDate} onChange={e => updateFest(fest.id, { endDate: e.target.value })} />
                </div>
              </div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "10px" }}>
                <div style={{ flex: "1 1 140px" }}>
                  <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "3px" }}>Ticket status</label>
                  <select className="input" value={fest.ticketStatus} onChange={e => updateFest(fest.id, { ticketStatus: e.target.value as TicketStatus })}>
                    {(Object.keys(TICKET_META) as TicketStatus[]).map(s => <option key={s} value={s}>{TICKET_META[s].label}</option>)}
                  </select>
                </div>
                <div style={{ flex: "1 1 120px" }}>
                  <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "3px" }}>Ticket cost ($)</label>
                  <input className="input" type="number" step="0.01" min="0" value={fest.ticketCost || ""} placeholder="0"
                    onChange={e => updateFest(fest.id, { ticketCost: parseFloat(e.target.value) || 0 })} />
                </div>
                <div style={{ flex: "1 1 120px" }}>
                  <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "3px" }}>Total budget ($)</label>
                  <input className="input" type="number" step="1" min="0" value={fest.budget || ""} placeholder="0"
                    onChange={e => updateFest(fest.id, { budget: parseFloat(e.target.value) || 0 })} />
                </div>
              </div>
              <div style={{ marginBottom: "10px" }}>
                <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "3px" }}>Website / tickets URL</label>
                <input className="input" value={fest.url} placeholder="https://…" onChange={e => updateFest(fest.id, { url: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "3px" }}>Notes</label>
                <textarea className="input" value={fest.notes} rows={3} placeholder="Camping spot, carpool, meetup plans…"
                  onChange={e => updateFest(fest.id, { notes: e.target.value })}
                  style={{ resize: "vertical", fontFamily: "inherit", fontSize: "13.5px" }} />
              </div>
            </div>

            {/* Budget summary */}
            {(fest.budget > 0 || buyTotal > 0) && (
              <div className="card">
                <p className="card-title" style={{ marginBottom: "10px" }}>Budget summary</p>
                <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                  {fest.budget > 0 && <div><p style={{ fontSize: "11px", color: "var(--text-3)", margin: "0 0 2px" }}>Total budget</p><p style={{ fontSize: "20px", fontWeight: 700, margin: 0 }}>${fest.budget.toLocaleString()}</p></div>}
                  {fest.ticketCost > 0 && <div><p style={{ fontSize: "11px", color: "var(--text-3)", margin: "0 0 2px" }}>Tickets</p><p style={{ fontSize: "20px", fontWeight: 700, margin: 0 }}>${fest.ticketCost.toLocaleString()}</p></div>}
                  {buyTotal > 0 && <div><p style={{ fontSize: "11px", color: "var(--text-3)", margin: "0 0 2px" }}>Buy list total</p><p style={{ fontSize: "20px", fontWeight: 700, margin: 0 }}>${buyTotal.toFixed(0)}</p></div>}
                  {buyTotal > 0 && <div><p style={{ fontSize: "11px", color: "var(--text-3)", margin: "0 0 2px" }}>Already bought</p><p style={{ fontSize: "20px", fontWeight: 700, margin: 0, color: "var(--green)" }}>${boughtTotal.toFixed(0)}</p></div>}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── CHECKLIST ── */}
        {detailTab === "checklist" && (
          <ChecklistTab checklist={fest.checklist} onToggle={toggleCheck} onAdd={addCheckItem} onDelete={deleteCheckItem} />
        )}

        {/* ── BUY LIST ── */}
        {detailTab === "buy" && (
          <BuyTab buyList={fest.buyList} onAdd={addBuyItem} onToggle={toggleBuy} onDelete={deleteBuyItem} />
        )}

        {/* ── ARTISTS ── */}
        {detailTab === "artists" && (
          <ArtistsTab artists={fest.artists} days={days} onAdd={addArtist} onDelete={deleteArtist} onToggleMustSee={toggleMustSee} />
        )}
      </div>
    );
  }

  // ── LIST VIEW ──
  const upcoming = fests.filter(f => !f.startDate || daysUntil(f.startDate) >= 0).sort((a, b) => (a.startDate || "9").localeCompare(b.startDate || "9"));
  const past     = fests.filter(f => f.startDate && daysUntil(f.startDate) < 0).sort((a, b) => b.startDate.localeCompare(a.startDate));

  return (
    <div style={{ maxWidth: "820px" }}>
      {status !== "idle" && <div className={`toast${status === "error" ? " error" : ""}`}>{status === "saving" ? "Saving…" : status === "saved" ? "Saved" : "Error saving."}</div>}

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "16px", gap: "8px" }}>
        {adding ? (
          <>
            <input className="input" placeholder="Festival name" value={newName} autoFocus onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === "Enter" && addFest()} style={{ width: "220px" }} />
            <button className="btn btn-primary" onClick={addFest}>Add</button>
            <button className="btn btn-secondary" onClick={() => setAdding(false)}>Cancel</button>
          </>
        ) : (
          <button className="btn btn-primary" onClick={() => setAdding(true)}>+ Add festival</button>
        )}
      </div>

      {upcoming.length === 0 && past.length === 0 && <div className="card"><p className="empty">No festivals yet.</p></div>}

      {upcoming.map(f => <FestCard key={f.id} fest={f} onSelect={() => { setSelected(f.id); setDetailTab("info"); }} onDelete={() => deleteFest(f.id)} />)}

      {past.length > 0 && (
        <details style={{ marginTop: "16px" }}>
          <summary style={{ fontSize: "12px", color: "var(--text-3)", cursor: "pointer", userSelect: "none", padding: "4px 0", fontWeight: 600 }}>
            {past.length} past festival{past.length !== 1 ? "s" : ""}
          </summary>
          <div style={{ marginTop: "8px", opacity: 0.55 }}>
            {past.map(f => <FestCard key={f.id} fest={f} onSelect={() => { setSelected(f.id); setDetailTab("info"); }} onDelete={() => deleteFest(f.id)} />)}
          </div>
        </details>
      )}
    </div>
  );
}

function FestCard({ fest, onSelect, onDelete }: { fest: Festival; onSelect: () => void; onDelete: () => void }) {
  const days    = fest.startDate ? daysUntil(fest.startDate) : null;
  const isPast  = days !== null && days < 0;
  const meta    = TICKET_META[fest.ticketStatus];
  const checkPct = fest.checklist.length ? Math.round((fest.checklist.filter(c => c.done).length / fest.checklist.length) * 100) : 0;
  const mustSee = fest.artists.filter(a => a.mustSee).length;

  return (
    <div className="card" style={{ marginBottom: "12px", cursor: "pointer" }} onClick={onSelect}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "16px", fontWeight: 700, color: "var(--text)" }}>{fest.name}</span>
            <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "99px", background: meta.bg, color: meta.color }}>{meta.label}</span>
          </div>
          <p style={{ fontSize: "12.5px", color: "var(--text-3)", margin: "0 0 8px" }}>
            {fest.location && `${fest.location} · `}{dateRange(fest.startDate, fest.endDate)}
          </p>
          <div style={{ display: "flex", gap: "12px", fontSize: "12px", color: "var(--text-3)", flexWrap: "wrap" }}>
            {fest.checklist.length > 0 && <span>Packed: {checkPct}%</span>}
            {fest.buyList.length > 0 && <span>Buy list: {fest.buyList.filter(b => b.bought).length}/{fest.buyList.length}</span>}
            {mustSee > 0 && <span>⭐ {mustSee} must-see</span>}
            {fest.budget > 0 && <span>Budget: ${fest.budget.toLocaleString()}</span>}
          </div>
          {fest.checklist.length > 0 && (
            <div style={{ height: "4px", borderRadius: "99px", background: "var(--surface-raised)", marginTop: "8px", overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: "99px", background: "var(--green)", width: `${checkPct}%` }} />
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

function ChecklistTab({ checklist, onToggle, onAdd, onDelete }: {
  checklist: CheckItem[]; onToggle: (id: string) => void;
  onAdd: (cat: string, text: string) => void; onDelete: (id: string) => void;
}) {
  const [newCat,  setNewCat]  = useState("Camping");
  const [newText, setNewText] = useState("");

  return (
    <div>
      <div className="card" style={{ marginBottom: "12px" }}>
        <p className="card-title" style={{ marginBottom: "10px" }}>Add item</p>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <select className="input" style={{ flex: "1 1 140px" }} value={newCat} onChange={e => setNewCat(e.target.value)}>
            {CHECKLIST_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input className="input" style={{ flex: "2 1 180px" }} placeholder="Item…" value={newText}
            onChange={e => setNewText(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { onAdd(newCat, newText); setNewText(""); } }} />
          <button className="btn btn-primary" onClick={() => { onAdd(newCat, newText); setNewText(""); }}>Add</button>
        </div>
      </div>
      {CHECKLIST_CATEGORIES.map(cat => {
        const items = checklist.filter(c => c.category === cat);
        if (!items.length) return null;
        const done = items.filter(c => c.done).length;
        return (
          <div key={cat} className="card" style={{ marginBottom: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
              <p className="card-title" style={{ margin: 0 }}>{cat}</p>
              <span style={{ fontSize: "11.5px", color: done === items.length ? "var(--green)" : "var(--text-3)" }}>{done}/{items.length}</span>
            </div>
            {items.map(item => (
              <label key={item.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "4px 0", cursor: "pointer", userSelect: "none" }}
                onMouseEnter={e => e.currentTarget.querySelectorAll<HTMLElement>(".ci-del").forEach(el => el.style.opacity = "1")}
                onMouseLeave={e => e.currentTarget.querySelectorAll<HTMLElement>(".ci-del").forEach(el => el.style.opacity = "0")}>
                <span style={{ width: "18px", height: "18px", borderRadius: "5px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: item.done ? "var(--green)" : "var(--surface-raised)", border: item.done ? "none" : "1px solid var(--border)" }}
                  onClick={() => onToggle(item.id)}>
                  {item.done && <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="white" strokeWidth="1.8"><path d="M1.5 5l2.5 2.5L8.5 2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                </span>
                <span style={{ flex: 1, fontSize: "13px", color: item.done ? "var(--text-3)" : "var(--text)", textDecoration: item.done ? "line-through" : "none" }}>{item.text}</span>
                <button className="btn-icon ci-del" style={{ opacity: 0 }} onClick={() => onDelete(item.id)}><XIcon /></button>
              </label>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function BuyTab({ buyList, onAdd, onToggle, onDelete }: {
  buyList: BuyItem[]; onAdd: (text: string, cost: number, priority: Priority) => void;
  onToggle: (id: string) => void; onDelete: (id: string) => void;
}) {
  const [text, setText]         = useState("");
  const [cost, setCost]         = useState("");
  const [priority, setPriority] = useState<Priority>("must");

  const PRIORITY_COLOR: Record<Priority, string> = { must: "var(--red)", nice: "var(--yellow)", luxury: "var(--text-3)" };

  const pending = buyList.filter(b => !b.bought);
  const bought  = buyList.filter(b => b.bought);
  const totalPending = pending.reduce((s, b) => s + b.cost, 0);

  return (
    <div>
      <div className="card" style={{ marginBottom: "12px" }}>
        <p className="card-title" style={{ marginBottom: "10px" }}>Add to buy list</p>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <input className="input" style={{ flex: "2 1 160px" }} placeholder="Item to buy…" value={text} onChange={e => setText(e.target.value)} />
          <div style={{ display: "flex", alignItems: "center", background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: "6px", padding: "0 10px", flex: "0 0 110px" }}>
            <span style={{ color: "var(--text-3)", marginRight: "4px", fontSize: "13px" }}>$</span>
            <input style={{ background: "none", border: "none", outline: "none", color: "var(--text)", fontSize: "13px", width: "70px", fontFamily: "inherit" }}
              type="number" step="0.01" min="0" placeholder="0.00" value={cost} onChange={e => setCost(e.target.value)} />
          </div>
          <select className="input" style={{ flex: "0 0 120px" }} value={priority} onChange={e => setPriority(e.target.value as Priority)}>
            <option value="must">Must have</option>
            <option value="nice">Nice to have</option>
            <option value="luxury">Luxury</option>
          </select>
          <button className="btn btn-primary" onClick={() => { onAdd(text, parseFloat(cost) || 0, priority); setText(""); setCost(""); }}>Add</button>
        </div>
      </div>

      {pending.length > 0 && (
        <div className="card" style={{ marginBottom: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
            <p className="card-title" style={{ margin: 0 }}>Still need to buy</p>
            <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-2)" }}>${totalPending.toFixed(2)}</span>
          </div>
          {(["must","nice","luxury"] as Priority[]).map(p => {
            const group = pending.filter(b => b.priority === p);
            if (!group.length) return null;
            return (
              <div key={p} style={{ marginBottom: "8px" }}>
                <p style={{ fontSize: "10px", fontWeight: 700, color: PRIORITY_COLOR[p], textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 4px" }}>
                  {p === "must" ? "Must have" : p === "nice" ? "Nice to have" : "Luxury"}
                </p>
                {group.map(item => (
                  <div key={item.id} className="row"
                    onMouseEnter={e => e.currentTarget.querySelectorAll<HTMLElement>(".b-del").forEach(el => el.style.opacity = "1")}
                    onMouseLeave={e => e.currentTarget.querySelectorAll<HTMLElement>(".b-del").forEach(el => el.style.opacity = "0")}>
                    <input type="checkbox" className="checkbox" checked={false} onChange={() => onToggle(item.id)} />
                    <span style={{ flex: 1, fontSize: "13.5px" }}>{item.text}</span>
                    {item.cost > 0 && <span style={{ fontSize: "13px", color: "var(--text-2)", fontVariantNumeric: "tabular-nums" }}>${item.cost.toFixed(2)}</span>}
                    <button className="btn-icon b-del" style={{ opacity: 0 }} onClick={() => onDelete(item.id)}><XIcon /></button>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {bought.length > 0 && (
        <details>
          <summary style={{ fontSize: "12px", color: "var(--text-3)", cursor: "pointer", userSelect: "none", padding: "4px 0" }}>
            {bought.length} bought (${bought.reduce((s,b) => s+b.cost,0).toFixed(2)} spent)
          </summary>
          <div className="card" style={{ marginTop: "8px", opacity: 0.5 }}>
            {bought.map(item => (
              <div key={item.id} className="row done">
                <input type="checkbox" className="checkbox" checked={true} onChange={() => onToggle(item.id)} />
                <span style={{ flex: 1, fontSize: "13.5px", textDecoration: "line-through" }}>{item.text}</span>
                {item.cost > 0 && <span style={{ fontSize: "13px", color: "var(--text-3)" }}>${item.cost.toFixed(2)}</span>}
                <button className="btn-icon" onClick={() => onDelete(item.id)}><XIcon /></button>
              </div>
            ))}
          </div>
        </details>
      )}

      {buyList.length === 0 && <div className="card"><p className="empty">Nothing on the buy list yet.</p></div>}
    </div>
  );
}

function ArtistsTab({ artists, days, onAdd, onDelete, onToggleMustSee }: {
  artists: ArtistSlot[]; days: string[];
  onAdd: (slot: Omit<ArtistSlot, "id">) => void;
  onDelete: (id: string) => void;
  onToggleMustSee: (id: string) => void;
}) {
  const [form, setForm] = useState<Omit<ArtistSlot, "id">>({ day: days[0] ?? "", time: "", stage: "", artist: "", notes: "", mustSee: true });
  const [adding, setAdding] = useState(false);

  const byDay = days.map(d => ({ date: d, slots: artists.filter(a => a.day === d).sort((a, b) => a.time.localeCompare(b.time)) }));
  const noDay = artists.filter(a => !a.day || !days.includes(a.day));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "12px" }}>
        <button className="btn btn-primary" onClick={() => setAdding(x => !x)}>{adding ? "Cancel" : "+ Add artist"}</button>
      </div>

      {adding && (
        <div className="card" style={{ marginBottom: "14px" }}>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "10px" }}>
            <div style={{ flex: "2 1 160px" }}>
              <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "3px" }}>Artist / act</label>
              <input className="input" placeholder="Artist name" value={form.artist} autoFocus onChange={e => setForm(x => ({ ...x, artist: e.target.value }))} />
            </div>
            {days.length > 0 ? (
              <div style={{ flex: "1 1 120px" }}>
                <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "3px" }}>Day</label>
                <select className="input" value={form.day} onChange={e => setForm(x => ({ ...x, day: e.target.value }))}>
                  {days.map(d => <option key={d} value={d}>{new Date(d + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</option>)}
                </select>
              </div>
            ) : (
              <div style={{ flex: "1 1 130px" }}>
                <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "3px" }}>Day</label>
                <input className="input" placeholder="Day 1, Friday…" value={form.day} onChange={e => setForm(x => ({ ...x, day: e.target.value }))} />
              </div>
            )}
            <div style={{ flex: "1 1 100px" }}>
              <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "3px" }}>Time</label>
              <input className="input" type="time" value={form.time} onChange={e => setForm(x => ({ ...x, time: e.target.value }))} />
            </div>
            <div style={{ flex: "1 1 120px" }}>
              <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "3px" }}>Stage</label>
              <input className="input" placeholder="Which stage" value={form.stage} onChange={e => setForm(x => ({ ...x, stage: e.target.value }))} />
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: "1px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12.5px", color: "var(--text-2)", cursor: "pointer", userSelect: "none" }}>
                <input type="checkbox" checked={form.mustSee} onChange={e => setForm(x => ({ ...x, mustSee: e.target.checked }))} />
                Must see ⭐
              </label>
            </div>
          </div>
          <input className="input" placeholder="Notes" value={form.notes} onChange={e => setForm(x => ({ ...x, notes: e.target.value }))} style={{ marginBottom: "10px" }} />
          <div style={{ display: "flex", gap: "8px" }}>
            <button className="btn btn-primary" onClick={() => { onAdd(form); setForm(x => ({ ...x, artist: "", time: "", stage: "", notes: "" })); }}>Add</button>
            <button className="btn btn-secondary" onClick={() => setAdding(false)}>Cancel</button>
          </div>
        </div>
      )}

      {artists.length === 0 && !adding && <div className="card"><p className="empty">No artists added yet. Build your schedule above.</p></div>}

      {byDay.map(({ date, slots }) => {
        if (!slots.length) return null;
        const label = new Date(date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
        return (
          <div key={date} className="card" style={{ marginBottom: "12px" }}>
            <p className="card-title" style={{ marginBottom: "10px" }}>{label}</p>
            {slots.map(slot => (
              <div key={slot.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "6px 0", borderBottom: "1px solid var(--border)" }}
                onMouseEnter={e => e.currentTarget.querySelectorAll<HTMLElement>(".a-del").forEach(el => el.style.opacity = "1")}
                onMouseLeave={e => e.currentTarget.querySelectorAll<HTMLElement>(".a-del").forEach(el => el.style.opacity = "0")}>
                <span style={{ fontSize: "12px", color: "var(--text-3)", minWidth: "44px", fontVariantNumeric: "tabular-nums" }}>
                  {slot.time ? new Date(`2000-01-01T${slot.time}`).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "—"}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ fontSize: "13.5px", fontWeight: slot.mustSee ? 700 : 500, color: "var(--text)" }}>{slot.artist}</span>
                    {slot.mustSee && <span style={{ fontSize: "14px" }}>⭐</span>}
                  </div>
                  {(slot.stage || slot.notes) && <span style={{ fontSize: "11.5px", color: "var(--text-3)" }}>{[slot.stage, slot.notes].filter(Boolean).join(" · ")}</span>}
                </div>
                <button className="btn-icon a-del" style={{ opacity: 0 }} onClick={() => onToggleMustSee(slot.id)} title="Toggle must-see">⭐</button>
                <button className="btn-icon a-del" style={{ opacity: 0 }} onClick={() => onDelete(slot.id)}><XIcon /></button>
              </div>
            ))}
          </div>
        );
      })}

      {noDay.length > 0 && (
        <div className="card">
          <p className="card-title" style={{ marginBottom: "10px" }}>TBD</p>
          {noDay.map(slot => (
            <div key={slot.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "5px 0" }}>
              <span style={{ flex: 1, fontSize: "13.5px" }}>{slot.mustSee && "⭐ "}{slot.artist}</span>
              <button className="btn-icon" onClick={() => onDelete(slot.id)}><XIcon /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
