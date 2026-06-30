"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

type Priority = "emergency" | "need" | "replacement" | "qol" | "convenience" | "seasonal" | "luxury" | "dream";
type Status   = "researching" | "waiting_sale" | "ready" | "purchased" | "archived";
type Season   = "any" | "black_friday" | "prime_day" | "memorial_day" | "labor_day" | "spring" | "summer" | "fall" | "winter";

type PriceObservation = { id: string; date: string; price: number; retailer: string; note: string };

type Variant = {
  id: string;
  name: string;
  price: number;
  retailer: string;
  notes: string;
  selected: boolean;
};

type HouseholdItem = {
  id: string;
  name: string;
  category: string;
  room: string;
  priority: Priority;
  status: Status;
  // Pricing
  estimatedPrice: number;
  currentBestPrice: number;
  targetPrice: number;
  lowestSeenPrice: number;
  estimatedTax: number;
  shippingCost: number;
  // Details
  retailer: string;
  brand: string;
  model: string;
  estimatedLifespan: number;
  replacesExisting: boolean;
  replacesWhat: string;
  // Timing
  targetSeason: Season;
  targetDate: string;
  // Funding
  savedAmount: number;
  // Research
  notes: string;
  priceHistory: PriceObservation[];
  // Comparison variants
  variants: Variant[];
  // Completed
  purchasedDate: string;
  purchasedPrice: number;
  purchasedRetailer: string;
  satisfactionRating: number;
  postPurchaseNotes: string;
  // Meta
  createdAt: string;
  order: number;
};

type HouseholdPlannerData = {
  items: HouseholdItem[];
  categories: string[];
  rooms: string[];
};

type DashData = { householdPlanner?: HouseholdPlannerData; [key: string]: unknown };
type SaveStatus = "idle" | "saving" | "saved" | "error";

// ── Constants ─────────────────────────────────────────────────────────────────

const PRIORITY_META: Record<Priority, { label: string; color: string; bg: string; order: number }> = {
  emergency:   { label: "Emergency",   color: "var(--red)",        bg: "var(--red-dim)",           order: 0 },
  need:        { label: "Need",         color: "var(--red)",        bg: "rgba(248,113,113,0.06)",    order: 1 },
  replacement: { label: "Replacement", color: "var(--yellow)",     bg: "var(--yellow-dim)",         order: 2 },
  qol:         { label: "Quality of Life", color: "var(--green)",  bg: "var(--green-dim)",          order: 3 },
  convenience: { label: "Convenience", color: "var(--accent)",     bg: "var(--accent-dim)",         order: 4 },
  seasonal:    { label: "Seasonal",    color: "var(--yellow)",     bg: "var(--yellow-dim)",         order: 5 },
  luxury:      { label: "Luxury",      color: "var(--text-2)",     bg: "var(--surface-raised)",     order: 6 },
  dream:       { label: "Dream",       color: "var(--accent-text)","bg": "var(--accent-dim)",       order: 7 },
};

const STATUS_META: Record<Status, { label: string; color: string }> = {
  researching:  { label: "Researching",       color: "var(--text-3)" },
  waiting_sale: { label: "Waiting for Sale",  color: "var(--yellow)" },
  ready:        { label: "Ready to Buy",      color: "var(--green)"  },
  purchased:    { label: "Purchased",         color: "var(--accent)" },
  archived:     { label: "Archived",          color: "var(--text-3)" },
};

const SEASON_LABELS: Record<Season, string> = {
  any: "Any time", black_friday: "Black Friday", prime_day: "Prime Day",
  memorial_day: "Memorial Day", labor_day: "Labor Day",
  spring: "Spring", summer: "Summer", fall: "Fall", winter: "Winter",
};

const DEFAULT_CATEGORIES = ["Appliances", "Furniture", "Electronics", "Kitchen", "Bedding & Bath", "Outdoor", "Cleaning", "Storage", "Decor", "Tools", "Safety", "Other"];
const DEFAULT_ROOMS = ["Living Room", "Kitchen", "Primary Bedroom", "Bathroom", "Office", "Garage", "Laundry", "Outdoor / Yard", "Whole Home", "Other"];

function seedPlanner(): HouseholdPlannerData {
  return { items: [], categories: [...DEFAULT_CATEGORIES], rooms: [...DEFAULT_ROOMS] };
}

function blankItem(): Omit<HouseholdItem, "id" | "createdAt" | "order"> {
  return {
    name: "", category: "", room: "", priority: "qol", status: "researching",
    estimatedPrice: 0, currentBestPrice: 0, targetPrice: 0, lowestSeenPrice: 0,
    estimatedTax: 0, shippingCost: 0,
    retailer: "", brand: "", model: "",
    estimatedLifespan: 0, replacesExisting: false, replacesWhat: "",
    targetSeason: "any", targetDate: "",
    savedAmount: 0,
    notes: "", priceHistory: [], variants: [],
    purchasedDate: "", purchasedPrice: 0, purchasedRetailer: "",
    satisfactionRating: 0, postPurchaseNotes: "",
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayStr() { return new Date().toISOString().slice(0, 10); }
function fmt$(n: number) { return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }
function totalCost(item: HouseholdItem) { return (item.currentBestPrice || item.estimatedPrice) + item.estimatedTax + item.shippingCost; }
function fundingPct(item: HouseholdItem) { const t = totalCost(item); return t > 0 ? Math.min(100, (item.savedAmount / t) * 100) : 0; }

// ── Icons ─────────────────────────────────────────────────────────────────────

const XIcon = () => <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M2 2l9 9M11 2l-9 9" /></svg>;
const PencilIcon = () => <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M9 2l2 2-7 7H2v-2L9 2z" strokeLinejoin="round" /></svg>;
const PlusIcon = () => <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M6.5 2v9M2 6.5h9" /></svg>;
const TrashIcon = () => <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M2 3.5h9M5 3.5V2h3v1.5M4 3.5l.5 7h4l.5-7" strokeLinejoin="round" /></svg>;
const ArchiveIcon = () => <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="1.5" y="2" width="10" height="2.5" rx="0.5" /><path d="M2.5 4.5v6h8v-6" /><path d="M5 7.5h3" strokeLinecap="round" /></svg>;
const DupeIcon = () => <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="4" y="4" width="7.5" height="7.5" rx="1" /><path d="M2 9.5V2h7.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const StarIcon = ({ filled }: { filled: boolean }) => <svg width="14" height="14" viewBox="0 0 14 14" fill={filled ? "var(--yellow)" : "none"} stroke="var(--yellow)" strokeWidth="1.2"><path d="M7 1.5l1.5 3 3.5.5-2.5 2.5.5 3.5L7 9.5 4 11l.5-3.5L2 5l3.5-.5L7 1.5z" /></svg>;

// ── Price badge ────────────────────────────────────────────────────────────────

function SavingsBadge({ item }: { item: HouseholdItem }) {
  const current = item.currentBestPrice || item.estimatedPrice;
  const target = item.targetPrice;
  if (!current || !target || target >= current) return null;
  const saved = current - target;
  const pct = Math.round((saved / current) * 100);
  return (
    <span style={{ fontSize: "11px", background: "var(--green-dim)", color: "var(--green)", padding: "2px 6px", borderRadius: "4px" }}>
      Save {pct}% if you wait
    </span>
  );
}

// ── Item Form (drawer) ─────────────────────────────────────────────────────────

type ItemFormProps = {
  initial: Partial<HouseholdItem>;
  categories: string[];
  rooms: string[];
  onSave: (data: Omit<HouseholdItem, "id" | "createdAt" | "order">) => void;
  onClose: () => void;
  isEdit?: boolean;
};

function ItemForm({ initial, categories, rooms, onSave, onClose, isEdit }: ItemFormProps) {
  const blank = blankItem();
  const [form, setForm] = useState<Omit<HouseholdItem, "id" | "createdAt" | "order">>({ ...blank, ...initial });
  const [section, setSection] = useState<"basic" | "pricing" | "timing" | "notes" | "variants" | "completed">("basic");
  const [addingVariant, setAddingVariant] = useState(false);
  const [variantForm, setVariantForm] = useState({ name: "", price: "", retailer: "", notes: "" });
  const [addingObs, setAddingObs] = useState(false);
  const [obsForm, setObsForm] = useState({ price: "", retailer: "", note: "" });

  const set = (k: keyof typeof form, v: unknown) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSave = () => {
    if (!form.name.trim()) { alert("Item name is required."); return; }
    onSave(form);
  };

  const addVariant = () => {
    if (!variantForm.name.trim()) return;
    const v: Variant = { id: crypto.randomUUID(), name: variantForm.name, price: parseFloat(variantForm.price) || 0, retailer: variantForm.retailer, notes: variantForm.notes, selected: false };
    set("variants", [...form.variants, v]);
    setVariantForm({ name: "", price: "", retailer: "", notes: "" });
    setAddingVariant(false);
  };

  const selectVariant = (id: string) => set("variants", form.variants.map(v => ({ ...v, selected: v.id === id })));
  const deleteVariant = (id: string) => set("variants", form.variants.filter(v => v.id !== id));

  const addObs = () => {
    if (!obsForm.price) return;
    const o: PriceObservation = { id: crypto.randomUUID(), date: todayStr(), price: parseFloat(obsForm.price) || 0, retailer: obsForm.retailer, note: obsForm.note };
    set("priceHistory", [...form.priceHistory, o]);
    setObsForm({ price: "", retailer: "", note: "" });
    setAddingObs(false);
  };

  const sections: { key: typeof section; label: string }[] = [
    { key: "basic",     label: "Details"   },
    { key: "pricing",   label: "Pricing"   },
    { key: "timing",    label: "Timing"    },
    { key: "notes",     label: "Notes"     },
    { key: "variants",  label: "Compare"   },
    ...(isEdit && form.status === "purchased" ? [{ key: "completed" as typeof section, label: "Purchase Log" }] : []),
  ];

  const inp = (style?: React.CSSProperties) => ({ className: "input", style: { fontSize: "13px", ...style } });

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex" }}>
      <div style={{ flex: 1, background: "rgba(0,0,0,0.5)" }} onClick={onClose} />
      <div style={{ width: "min(520px, 100vw)", background: "var(--surface)", borderLeft: "1px solid var(--border)", display: "flex", flexDirection: "column", overflowY: "auto" }}>
        {/* Header */}
        <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
          <h2 style={{ margin: 0, fontSize: "15px", fontWeight: 600, flex: 1 }}>{isEdit ? "Edit Item" : "Add Upgrade"}</h2>
          <button className="btn-icon" onClick={onClose}><XIcon /></button>
        </div>

        {/* Section tabs */}
        <div style={{ display: "flex", gap: "2px", padding: "10px 12px 0", flexShrink: 0, overflowX: "auto" }}>
          {sections.map(s => (
            <button key={s.key} onClick={() => setSection(s.key)}
              style={{ background: section === s.key ? "var(--accent-dim)" : "transparent", color: section === s.key ? "var(--accent-text)" : "var(--text-3)", border: "none", borderRadius: "5px", padding: "5px 10px", fontSize: "12px", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
              {s.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex: 1, padding: "16px 20px", display: "flex", flexDirection: "column", gap: "12px" }}>

          {/* BASIC */}
          {section === "basic" && <>
            <div>
              <label style={{ fontSize: "11.5px", color: "var(--text-3)", display: "block", marginBottom: "4px" }}>Item Name *</label>
              <input {...inp()} placeholder="e.g. Robot Vacuum" value={form.name} onChange={e => set("name", e.target.value)} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div>
                <label style={{ fontSize: "11.5px", color: "var(--text-3)", display: "block", marginBottom: "4px" }}>Category</label>
                <select {...inp()} value={form.category} onChange={e => set("category", e.target.value)}>
                  <option value="">Select…</option>
                  {categories.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: "11.5px", color: "var(--text-3)", display: "block", marginBottom: "4px" }}>Room</label>
                <select {...inp()} value={form.room} onChange={e => set("room", e.target.value)}>
                  <option value="">Select…</option>
                  {rooms.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div>
                <label style={{ fontSize: "11.5px", color: "var(--text-3)", display: "block", marginBottom: "4px" }}>Priority</label>
                <select {...inp()} value={form.priority} onChange={e => set("priority", e.target.value as Priority)}>
                  {(Object.keys(PRIORITY_META) as Priority[]).map(p => <option key={p} value={p}>{PRIORITY_META[p].label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: "11.5px", color: "var(--text-3)", display: "block", marginBottom: "4px" }}>Status</label>
                <select {...inp()} value={form.status} onChange={e => set("status", e.target.value as Status)}>
                  {(Object.keys(STATUS_META) as Status[]).filter(s => s !== "archived").map(s => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div>
                <label style={{ fontSize: "11.5px", color: "var(--text-3)", display: "block", marginBottom: "4px" }}>Preferred Retailer</label>
                <input {...inp()} placeholder="e.g. Costco" value={form.retailer} onChange={e => set("retailer", e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: "11.5px", color: "var(--text-3)", display: "block", marginBottom: "4px" }}>Brand / Model</label>
                <input {...inp()} placeholder="e.g. Shark AI Ultra" value={form.brand} onChange={e => set("brand", e.target.value)} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div>
                <label style={{ fontSize: "11.5px", color: "var(--text-3)", display: "block", marginBottom: "4px" }}>Est. Lifespan (years)</label>
                <input {...inp()} type="number" min="0" placeholder="e.g. 10" value={form.estimatedLifespan || ""} onChange={e => set("estimatedLifespan", parseFloat(e.target.value) || 0)} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", paddingTop: "18px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px", color: "var(--text-2)" }}>
                  <input type="checkbox" className="checkbox" checked={form.replacesExisting} onChange={e => set("replacesExisting", e.target.checked)} />
                  Replaces existing item
                </label>
              </div>
            </div>
            {form.replacesExisting && (
              <div>
                <label style={{ fontSize: "11.5px", color: "var(--text-3)", display: "block", marginBottom: "4px" }}>What does it replace?</label>
                <input {...inp()} placeholder="e.g. Broken Hoover upright" value={form.replacesWhat} onChange={e => set("replacesWhat", e.target.value)} />
              </div>
            )}
          </>}

          {/* PRICING */}
          {section === "pricing" && <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              {([ ["estimatedPrice","Estimated Price"], ["currentBestPrice","Current Best Price"], ["targetPrice","Target / Wait-for Price"], ["lowestSeenPrice","Lowest Price I've Seen"], ["estimatedTax","Est. Tax"], ["shippingCost","Shipping Cost"] ] as const).map(([k, label]) => (
                <div key={k}>
                  <label style={{ fontSize: "11.5px", color: "var(--text-3)", display: "block", marginBottom: "4px" }}>{label}</label>
                  <div style={{ display: "flex", alignItems: "center", background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: "6px", padding: "0 10px" }}>
                    <span style={{ color: "var(--text-3)", marginRight: "4px", fontSize: "13px" }}>$</span>
                    <input type="number" step="0.01" min="0" placeholder="0.00"
                      style={{ background: "none", border: "none", outline: "none", color: "var(--text)", fontFamily: "inherit", fontSize: "13px", width: "100%", padding: "8px 0" }}
                      value={form[k] || ""}
                      onChange={e => set(k, parseFloat(e.target.value) || 0)} />
                  </div>
                </div>
              ))}
            </div>

            {/* Total */}
            {totalCost({ ...form } as HouseholdItem) > 0 && (
              <div style={{ background: "var(--surface-raised)", borderRadius: "6px", padding: "10px 14px", display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: "13px", color: "var(--text-2)" }}>Total Expected Cost</span>
                <span style={{ fontWeight: 600, color: "var(--text)" }}>{fmt$(totalCost({ ...form } as HouseholdItem))}</span>
              </div>
            )}

            {/* Mentally set aside */}
            <div>
              <label style={{ fontSize: "11.5px", color: "var(--text-3)", display: "block", marginBottom: "4px" }}>Amount Set Aside (mental budget)</label>
              <div style={{ display: "flex", alignItems: "center", background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: "6px", padding: "0 10px" }}>
                <span style={{ color: "var(--text-3)", marginRight: "4px", fontSize: "13px" }}>$</span>
                <input type="number" step="0.01" min="0" placeholder="0.00"
                  style={{ background: "none", border: "none", outline: "none", color: "var(--text)", fontFamily: "inherit", fontSize: "13px", width: "100%", padding: "8px 0" }}
                  value={form.savedAmount || ""}
                  onChange={e => set("savedAmount", parseFloat(e.target.value) || 0)} />
              </div>
            </div>

            {/* Price observations */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <label style={{ fontSize: "11.5px", color: "var(--text-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Sale History / Price Sightings</label>
                <button className="btn-icon" onClick={() => setAddingObs(true)}><PlusIcon /></button>
              </div>
              {form.priceHistory.map(o => (
                <div key={o.id} style={{ display: "flex", gap: "8px", alignItems: "flex-start", padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "12.5px", color: "var(--text-2)" }}>{o.retailer} — <span style={{ color: "var(--green)", fontWeight: 600 }}>{fmt$(o.price)}</span></div>
                    {o.note && <div style={{ fontSize: "11.5px", color: "var(--text-3)" }}>{o.note}</div>}
                    <div style={{ fontSize: "11px", color: "var(--text-3)" }}>{o.date}</div>
                  </div>
                  <button className="btn-icon" onClick={() => set("priceHistory", form.priceHistory.filter(x => x.id !== o.id))}><XIcon /></button>
                </div>
              ))}
              {addingObs && (
                <div style={{ background: "var(--surface-raised)", borderRadius: "6px", padding: "10px", marginTop: "8px", display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                    <input {...inp()} type="number" placeholder="Price" value={obsForm.price} onChange={e => setObsForm(p => ({ ...p, price: e.target.value }))} />
                    <input {...inp()} placeholder="Retailer" value={obsForm.retailer} onChange={e => setObsForm(p => ({ ...p, retailer: e.target.value }))} />
                  </div>
                  <input {...inp()} placeholder="Note (e.g. Black Friday deal, was $299)" value={obsForm.note} onChange={e => setObsForm(p => ({ ...p, note: e.target.value }))} />
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button className="btn btn-primary" style={{ fontSize: "12px", padding: "6px 12px" }} onClick={addObs}>Add</button>
                    <button className="btn btn-ghost" style={{ fontSize: "12px" }} onClick={() => setAddingObs(false)}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          </>}

          {/* TIMING */}
          {section === "timing" && <>
            <div>
              <label style={{ fontSize: "11.5px", color: "var(--text-3)", display: "block", marginBottom: "4px" }}>Best Sale Season to Buy</label>
              <select {...inp()} value={form.targetSeason} onChange={e => set("targetSeason", e.target.value as Season)}>
                {(Object.keys(SEASON_LABELS) as Season[]).map(s => <option key={s} value={s}>{SEASON_LABELS[s]}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: "11.5px", color: "var(--text-3)", display: "block", marginBottom: "4px" }}>Target Purchase Date (optional)</label>
              <input {...inp()} type="date" value={form.targetDate} onChange={e => set("targetDate", e.target.value)} />
            </div>
            <div style={{ background: "var(--surface-raised)", borderRadius: "6px", padding: "12px 14px", fontSize: "12.5px", color: "var(--text-3)", lineHeight: 1.6 }}>
              Use the Notes tab to record sale-specific observations — e.g. &quot;Costco usually drops this price in November&quot; or &quot;Amazon Prime Day 2025 had it at $189.&quot;
            </div>
          </>}

          {/* NOTES */}
          {section === "notes" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <label style={{ fontSize: "11.5px", color: "var(--text-3)", display: "block", marginBottom: "6px" }}>Research Notes</label>
              <textarea className="input" placeholder="Record everything here — retailer observations, sale history, recommendations, model comparisons, YouTube reviews you watched, anything useful..."
                value={form.notes} onChange={e => set("notes", e.target.value)}
                style={{ flex: 1, minHeight: "360px", resize: "vertical", fontSize: "13px", lineHeight: 1.6 }} />
              <p style={{ fontSize: "11px", color: "var(--text-3)", marginTop: "6px" }}>Notes auto-save when you click Save Item.</p>
            </div>
          )}

          {/* VARIANTS / COMPARE */}
          {section === "variants" && <>
            <p style={{ fontSize: "12.5px", color: "var(--text-3)", margin: 0 }}>Compare multiple versions or models. Mark one as selected when you decide.</p>
            {form.variants.map(v => (
              <div key={v.id} style={{ background: v.selected ? "var(--green-dim)" : "var(--surface-raised)", border: `1px solid ${v.selected ? "var(--green)" : "var(--border)"}`, borderRadius: "6px", padding: "10px 12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text)" }}>{v.name}</div>
                    {v.retailer && <div style={{ fontSize: "12px", color: "var(--text-3)" }}>{v.retailer}</div>}
                    {v.price > 0 && <div style={{ fontSize: "13px", color: "var(--green)", fontWeight: 600, marginTop: "2px" }}>{fmt$(v.price)}</div>}
                    {v.notes && <div style={{ fontSize: "12px", color: "var(--text-2)", marginTop: "4px" }}>{v.notes}</div>}
                  </div>
                  <div style={{ display: "flex", gap: "4px" }}>
                    {!v.selected && <button className="btn btn-ghost" style={{ fontSize: "11px", padding: "3px 8px" }} onClick={() => selectVariant(v.id)}>Select</button>}
                    {v.selected && <span style={{ fontSize: "11px", color: "var(--green)", padding: "3px 0" }}>✓ Selected</span>}
                    <button className="btn-icon" onClick={() => deleteVariant(v.id)}><XIcon /></button>
                  </div>
                </div>
              </div>
            ))}
            {addingVariant ? (
              <div style={{ background: "var(--surface-raised)", borderRadius: "6px", padding: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
                <input {...inp()} placeholder="Name / model" value={variantForm.name} onChange={e => setVariantForm(p => ({ ...p, name: e.target.value }))} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", background: "var(--surface-overlay)", border: "1px solid var(--border)", borderRadius: "6px", padding: "0 10px" }}>
                    <span style={{ color: "var(--text-3)", marginRight: "4px", fontSize: "13px" }}>$</span>
                    <input type="number" step="0.01" placeholder="Price" style={{ background: "none", border: "none", outline: "none", color: "var(--text)", fontFamily: "inherit", fontSize: "13px", padding: "8px 0", width: "100%" }} value={variantForm.price} onChange={e => setVariantForm(p => ({ ...p, price: e.target.value }))} />
                  </div>
                  <input {...inp()} placeholder="Retailer" value={variantForm.retailer} onChange={e => setVariantForm(p => ({ ...p, retailer: e.target.value }))} />
                </div>
                <input {...inp()} placeholder="Notes (features, pros/cons)" value={variantForm.notes} onChange={e => setVariantForm(p => ({ ...p, notes: e.target.value }))} />
                <div style={{ display: "flex", gap: "6px" }}>
                  <button className="btn btn-primary" style={{ fontSize: "12px", padding: "6px 12px" }} onClick={addVariant}>Add Option</button>
                  <button className="btn btn-ghost" style={{ fontSize: "12px" }} onClick={() => setAddingVariant(false)}>Cancel</button>
                </div>
              </div>
            ) : (
              <button className="btn btn-secondary" style={{ fontSize: "12px" }} onClick={() => setAddingVariant(true)}>
                + Add Option to Compare
              </button>
            )}
          </>}

          {/* COMPLETED */}
          {section === "completed" && <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div>
                <label style={{ fontSize: "11.5px", color: "var(--text-3)", display: "block", marginBottom: "4px" }}>Purchase Date</label>
                <input {...inp()} type="date" value={form.purchasedDate} onChange={e => set("purchasedDate", e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: "11.5px", color: "var(--text-3)", display: "block", marginBottom: "4px" }}>Actual Price Paid</label>
                <div style={{ display: "flex", alignItems: "center", background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: "6px", padding: "0 10px" }}>
                  <span style={{ color: "var(--text-3)", marginRight: "4px", fontSize: "13px" }}>$</span>
                  <input type="number" step="0.01" min="0" placeholder="0.00"
                    style={{ background: "none", border: "none", outline: "none", color: "var(--text)", fontFamily: "inherit", fontSize: "13px", width: "100%", padding: "8px 0" }}
                    value={form.purchasedPrice || ""}
                    onChange={e => set("purchasedPrice", parseFloat(e.target.value) || 0)} />
                </div>
              </div>
            </div>
            <div>
              <label style={{ fontSize: "11.5px", color: "var(--text-3)", display: "block", marginBottom: "4px" }}>Where Purchased</label>
              <input {...inp()} placeholder="e.g. Costco online" value={form.purchasedRetailer} onChange={e => set("purchasedRetailer", e.target.value)} />
            </div>
            {form.estimatedPrice > 0 && form.purchasedPrice > 0 && (
              <div style={{ background: "var(--green-dim)", borderRadius: "6px", padding: "10px 14px", display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: "13px", color: "var(--text-2)" }}>Saved vs. estimate</span>
                <span style={{ fontWeight: 600, color: "var(--green)" }}>{fmt$(form.estimatedPrice - form.purchasedPrice)}</span>
              </div>
            )}
            <div>
              <label style={{ fontSize: "11.5px", color: "var(--text-3)", display: "block", marginBottom: "6px" }}>Satisfaction Rating</label>
              <div style={{ display: "flex", gap: "4px" }}>
                {[1,2,3,4,5].map(n => (
                  <button key={n} style={{ background: "none", border: "none", cursor: "pointer", padding: "2px" }} onClick={() => set("satisfactionRating", n)}>
                    <StarIcon filled={n <= form.satisfactionRating} />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={{ fontSize: "11.5px", color: "var(--text-3)", display: "block", marginBottom: "4px" }}>Post-Purchase Notes</label>
              <textarea className="input" placeholder="How is it? Would you buy it again?" value={form.postPurchaseNotes} onChange={e => set("postPurchaseNotes", e.target.value)} style={{ minHeight: "100px", fontSize: "13px" }} />
            </div>
          </>}
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 20px", borderTop: "1px solid var(--border)", display: "flex", gap: "8px", flexShrink: 0 }}>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSave}>{isEdit ? "Save Changes" : "Add Item"}</button>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Item Card ─────────────────────────────────────────────────────────────────

function ItemCard({ item, onEdit, onArchive, onDelete, onDuplicate, onRestore }: {
  item: HouseholdItem;
  onEdit: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onRestore?: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pm = PRIORITY_META[item.priority];
  const sm = STATUS_META[item.status];
  const cost = totalCost(item);
  const pct = fundingPct(item);
  const isArchived = item.status === "archived";
  const isPurchased = item.status === "purchased";

  return (
    <div className="card" style={{ opacity: isArchived ? 0.55 : 1, position: "relative" }}>
      <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
        {/* Priority stripe */}
        <div style={{ width: "3px", minHeight: "60px", borderRadius: "99px", background: pm.color, flexShrink: 0, marginTop: "2px" }} />

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Top row */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", marginBottom: "4px" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--text)" }}>{item.name}</span>
              {item.brand && <span style={{ fontSize: "12px", color: "var(--text-3)", marginLeft: "6px" }}>{item.brand}</span>}
            </div>
            <span style={{ fontSize: "11px", background: pm.bg, color: pm.color, padding: "2px 7px", borderRadius: "4px", flexShrink: 0 }}>{pm.label}</span>
          </div>

          {/* Meta row */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "8px" }}>
            {item.room && <span style={{ fontSize: "11.5px", color: "var(--text-3)" }}>{item.room}</span>}
            {item.room && item.category && <span style={{ fontSize: "11.5px", color: "var(--text-3)" }}>·</span>}
            {item.category && <span style={{ fontSize: "11.5px", color: "var(--text-3)" }}>{item.category}</span>}
            {item.targetSeason !== "any" && <span style={{ fontSize: "11.5px", color: "var(--yellow)" }}>🗓 {SEASON_LABELS[item.targetSeason]}</span>}
            {item.replacesExisting && <span style={{ fontSize: "11.5px", color: "var(--text-3)" }}>↩ Replacement</span>}
          </div>

          {/* Price row */}
          <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap", marginBottom: "8px" }}>
            {cost > 0 && <span style={{ fontSize: "14px", fontWeight: 600, color: isPurchased ? "var(--green)" : "var(--text)" }}>{fmt$(isPurchased ? item.purchasedPrice : cost)}</span>}
            {!isPurchased && item.targetPrice > 0 && item.targetPrice < (item.currentBestPrice || item.estimatedPrice) && (
              <span style={{ fontSize: "12px", color: "var(--text-3)" }}>target {fmt$(item.targetPrice)}</span>
            )}
            <SavingsBadge item={item} />
            {item.retailer && <span style={{ fontSize: "12px", color: "var(--text-3)" }}>{item.retailer}</span>}
          </div>

          {/* Funding progress (non-purchased) */}
          {!isPurchased && !isArchived && cost > 0 && (
            <div style={{ marginBottom: "6px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                <span style={{ fontSize: "11px", color: "var(--text-3)" }}>
                  {item.savedAmount > 0 ? `${fmt$(item.savedAmount)} set aside` : "Nothing set aside yet"}
                </span>
                <span style={{ fontSize: "11px", color: pct >= 100 ? "var(--green)" : "var(--text-3)" }}>{Math.round(pct)}%</span>
              </div>
              <div style={{ height: "4px", borderRadius: "99px", background: "var(--surface-overlay)", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pct}%`, background: pct >= 100 ? "var(--green)" : "var(--accent)", borderRadius: "99px", transition: "width 0.3s" }} />
              </div>
            </div>
          )}

          {/* Purchased summary */}
          {isPurchased && item.purchasedDate && (
            <div style={{ fontSize: "12px", color: "var(--text-3)", marginBottom: "4px" }}>
              Bought {item.purchasedDate}{item.purchasedRetailer ? ` at ${item.purchasedRetailer}` : ""}
              {item.estimatedPrice > 0 && item.purchasedPrice > 0 && item.purchasedPrice < item.estimatedPrice &&
                <span style={{ color: "var(--green)", marginLeft: "6px" }}>saved {fmt$(item.estimatedPrice - item.purchasedPrice)}</span>}
              {item.satisfactionRating > 0 && <span style={{ marginLeft: "8px" }}>{"★".repeat(item.satisfactionRating)}{"☆".repeat(5 - item.satisfactionRating)}</span>}
            </div>
          )}

          {/* Status + actions */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "11.5px", color: sm.color }}>{sm.label}</span>
            {item.variants.length > 0 && <span style={{ fontSize: "11px", color: "var(--text-3)" }}>{item.variants.length} options</span>}
            {item.notes && <span style={{ fontSize: "11px", color: "var(--text-3)" }}>has notes</span>}
            {item.priceHistory.length > 0 && <span style={{ fontSize: "11px", color: "var(--text-3)" }}>{item.priceHistory.length} price sighting{item.priceHistory.length !== 1 ? "s" : ""}</span>}
          </div>
        </div>

        {/* Action menu */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          <button className="btn-icon" onClick={() => setMenuOpen(p => !p)} style={{ fontSize: "16px", lineHeight: 1 }}>⋯</button>
          {menuOpen && (
            <div style={{ position: "absolute", right: 0, top: "28px", background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: "7px", padding: "4px", minWidth: "150px", zIndex: 10, boxShadow: "0 4px 16px rgba(0,0,0,0.4)" }}
              onMouseLeave={() => setMenuOpen(false)}>
              <button className="btn-ghost" style={{ width: "100%", justifyContent: "flex-start", gap: "8px", fontSize: "13px", padding: "6px 10px" }} onClick={() => { setMenuOpen(false); onEdit(); }}><PencilIcon /> Edit</button>
              <button className="btn-ghost" style={{ width: "100%", justifyContent: "flex-start", gap: "8px", fontSize: "13px", padding: "6px 10px" }} onClick={() => { setMenuOpen(false); onDuplicate(); }}><DupeIcon /> Duplicate</button>
              {!isArchived && <button className="btn-ghost" style={{ width: "100%", justifyContent: "flex-start", gap: "8px", fontSize: "13px", padding: "6px 10px" }} onClick={() => { setMenuOpen(false); onArchive(); }}><ArchiveIcon /> Archive</button>}
              {isArchived && onRestore && <button className="btn-ghost" style={{ width: "100%", justifyContent: "flex-start", gap: "8px", fontSize: "13px", padding: "6px 10px" }} onClick={() => { setMenuOpen(false); onRestore(); }}>↩ Restore</button>}
              <div style={{ height: "1px", background: "var(--border)", margin: "4px 0" }} />
              <button className="btn-ghost" style={{ width: "100%", justifyContent: "flex-start", gap: "8px", fontSize: "13px", padding: "6px 10px", color: "var(--red)" }} onClick={() => { setMenuOpen(false); if (confirm("Delete this item permanently?")) onDelete(); }}><TrashIcon /> Delete</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Summary bar ───────────────────────────────────────────────────────────────

function SummaryBar({ items }: { items: HouseholdItem[] }) {
  const active = items.filter(i => i.status !== "archived" && i.status !== "purchased");
  const purchased = items.filter(i => i.status === "purchased");
  const readyToBuy = active.filter(i => i.status === "ready");
  const totalValue = active.reduce((s, i) => s + totalCost(i), 0);
  const totalSaved = active.reduce((s, i) => s + i.savedAmount, 0);
  const totalSpent = purchased.reduce((s, i) => s + (i.purchasedPrice || totalCost(i)), 0);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "16px" }}>
      {[
        { label: "Active Items",      value: String(active.length),   sub: `${readyToBuy.length} ready to buy`, color: "var(--text)" },
        { label: "Total Planned",     value: fmt$(totalValue),         sub: `across ${active.length} items`,    color: "var(--text)" },
        { label: "Set Aside",         value: fmt$(totalSaved),         sub: `${totalValue > 0 ? Math.round((totalSaved/totalValue)*100) : 0}% funded overall`, color: "var(--green)" },
        { label: "Purchased (total)", value: fmt$(totalSpent),         sub: `${purchased.length} items done`,  color: "var(--accent)" },
      ].map(s => (
        <div key={s.label} className="card" style={{ padding: "12px 16px" }}>
          <p style={{ fontSize: "11px", color: "var(--text-3)", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.04em" }}>{s.label}</p>
          <p style={{ fontSize: "18px", fontWeight: 700, color: s.color, margin: "0 0 2px" }}>{s.value}</p>
          <p style={{ fontSize: "11px", color: "var(--text-3)", margin: 0 }}>{s.sub}</p>
        </div>
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function HouseholdPlannerPage() {
  const rawRef = useRef<DashData>({});
  const [data, setData] = useState<HouseholdPlannerData>(seedPlanner());
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const statusTimer = useRef<ReturnType<typeof setTimeout>>();

  // UI state
  const [view, setView] = useState<"active" | "purchased" | "archived">("active");
  const [drawerItem, setDrawerItem] = useState<HouseholdItem | null | "new">(null);
  const [search, setSearch] = useState("");
  const [filterPriority, setFilterPriority] = useState<Priority | "">("");
  const [filterRoom, setFilterRoom] = useState("");
  const [filterStatus, setFilterStatus] = useState<Status | "">("");
  const [sortBy, setSortBy] = useState<"priority" | "cost" | "funding" | "date" | "name">("priority");
  const [groupBy, setGroupBy] = useState<"none" | "room" | "category" | "priority">("none");

  // ── Persist ───────────────────────────────────────────────────────────────

  const save = useCallback((d: HouseholdPlannerData) => {
    const newData = { ...rawRef.current, householdPlanner: d };
    rawRef.current = newData;
    setStatus("saving");
    fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data: newData }) })
      .then(r => r.ok ? setStatus("saved") : setStatus("error"))
      .catch(() => setStatus("error"))
      .finally(() => { clearTimeout(statusTimer.current); statusTimer.current = setTimeout(() => setStatus("idle"), 2200); });
  }, []);

  const update = useCallback((fn: (p: HouseholdPlannerData) => HouseholdPlannerData) => {
    setData(prev => { const next = fn(prev); save(next); return next; });
  }, [save]);

  // ── Load ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    fetch("/api/data").then(r => r.json()).then(({ data: d }) => {
      rawRef.current = d ?? {};
      const saved = d?.householdPlanner as HouseholdPlannerData | undefined;
      if (saved) setData({ ...seedPlanner(), ...saved, categories: saved.categories ?? DEFAULT_CATEGORIES, rooms: saved.rooms ?? DEFAULT_ROOMS });
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  // ── Item CRUD ─────────────────────────────────────────────────────────────

  const addItem = (form: Omit<HouseholdItem, "id" | "createdAt" | "order">) => {
    update(p => ({ ...p, items: [...p.items, { ...form, id: crypto.randomUUID(), createdAt: todayStr(), order: p.items.length }] }));
    setDrawerItem(null);
  };

  const editItem = (id: string, form: Omit<HouseholdItem, "id" | "createdAt" | "order">) => {
    update(p => ({ ...p, items: p.items.map(i => i.id === id ? { ...i, ...form } : i) }));
    setDrawerItem(null);
  };

  const archiveItem = (id: string) => update(p => ({ ...p, items: p.items.map(i => i.id === id ? { ...i, status: "archived" } : i) }));
  const restoreItem = (id: string) => update(p => ({ ...p, items: p.items.map(i => i.id === id ? { ...i, status: "researching" } : i) }));
  const deleteItem  = (id: string) => update(p => ({ ...p, items: p.items.filter(i => i.id !== id) }));
  const duplicateItem = (item: HouseholdItem) => update(p => ({ ...p, items: [...p.items, { ...item, id: crypto.randomUUID(), name: item.name + " (copy)", createdAt: todayStr(), order: p.items.length, status: "researching" as Status }] }));

  // ── Filtered / sorted items ───────────────────────────────────────────────

  const visibleItems = useMemo(() => {
    let items = data.items.filter(i => {
      if (view === "active")    return i.status !== "archived" && i.status !== "purchased";
      if (view === "purchased") return i.status === "purchased";
      if (view === "archived")  return i.status === "archived";
      return true;
    });

    if (search) {
      const q = search.toLowerCase();
      items = items.filter(i => i.name.toLowerCase().includes(q) || i.brand.toLowerCase().includes(q) || i.retailer.toLowerCase().includes(q) || i.notes.toLowerCase().includes(q) || i.room.toLowerCase().includes(q));
    }
    if (filterPriority) items = items.filter(i => i.priority === filterPriority);
    if (filterRoom)     items = items.filter(i => i.room === filterRoom);
    if (filterStatus)   items = items.filter(i => i.status === filterStatus);

    items = [...items].sort((a, b) => {
      if (sortBy === "priority") return PRIORITY_META[a.priority].order - PRIORITY_META[b.priority].order;
      if (sortBy === "cost")     return totalCost(b) - totalCost(a);
      if (sortBy === "funding")  return fundingPct(b) - fundingPct(a);
      if (sortBy === "date")     return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
      if (sortBy === "name")     return a.name.localeCompare(b.name);
      return 0;
    });

    return items;
  }, [data.items, view, search, filterPriority, filterRoom, filterStatus, sortBy]);

  const grouped = useMemo(() => {
    if (groupBy === "none") return [{ key: "", items: visibleItems }];
    const map = new Map<string, HouseholdItem[]>();
    for (const item of visibleItems) {
      const key = groupBy === "room" ? item.room || "No room" : groupBy === "category" ? item.category || "No category" : PRIORITY_META[item.priority].label;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return Array.from(map.entries()).map(([key, items]) => ({ key, items }));
  }, [visibleItems, groupBy]);

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) return <div className="page" style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-3)" }}>Loading…</div>;

  const hasFilters = !!(search || filterPriority || filterRoom || filterStatus);

  return (
    <div className="page">
      {/* Header */}
      <div style={{ marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px" }}>
          <h1 style={{ margin: 0, fontSize: "20px", fontWeight: 600, color: "var(--text)" }}>Household Upgrade Planner</h1>
          <span style={{ fontSize: "11px", color: "var(--text-3)", background: "var(--surface-raised)", padding: "3px 8px", borderRadius: "5px" }}>
            {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : status === "error" ? "Error" : ""}
          </span>
        </div>
        <p style={{ margin: 0, fontSize: "13px", color: "var(--text-3)" }}>Plan quality-of-life purchases intentionally — track prices, wait for sales, and see how each item fits your financial picture.</p>
      </div>

      {/* Summary */}
      <SummaryBar items={data.items} />

      {/* View tabs */}
      <div style={{ display: "flex", gap: "4px", marginBottom: "14px" }}>
        {(["active", "purchased", "archived"] as const).map(v => (
          <button key={v} onClick={() => setView(v)}
            style={{ background: view === v ? "var(--accent-dim)" : "var(--surface-raised)", color: view === v ? "var(--accent-text)" : "var(--text-3)", border: `1px solid ${view === v ? "var(--accent)" : "var(--border)"}`, borderRadius: "6px", padding: "6px 14px", fontSize: "13px", cursor: "pointer", fontFamily: "inherit" }}>
            {v === "active" ? `Active (${data.items.filter(i => i.status !== "archived" && i.status !== "purchased").length})` : v === "purchased" ? `Purchased (${data.items.filter(i => i.status === "purchased").length})` : `Archived (${data.items.filter(i => i.status === "archived").length})`}
          </button>
        ))}
        <button className="btn btn-primary" style={{ marginLeft: "auto", fontSize: "13px", display: "flex", alignItems: "center", gap: "5px" }} onClick={() => setDrawerItem("new")}>
          <PlusIcon /> Add Upgrade
        </button>
      </div>

      {/* Filter / search bar */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "14px", alignItems: "center" }}>
        <input className="input" placeholder="Search items, brands, rooms, notes…" value={search} onChange={e => setSearch(e.target.value)} style={{ flex: "1 1 200px", maxWidth: "280px", fontSize: "13px" }} />
        <select className="input" value={filterPriority} onChange={e => setFilterPriority(e.target.value as Priority | "")} style={{ fontSize: "13px", width: "auto" }}>
          <option value="">All priorities</option>
          {(Object.keys(PRIORITY_META) as Priority[]).map(p => <option key={p} value={p}>{PRIORITY_META[p].label}</option>)}
        </select>
        <select className="input" value={filterRoom} onChange={e => setFilterRoom(e.target.value)} style={{ fontSize: "13px", width: "auto" }}>
          <option value="">All rooms</option>
          {data.rooms.map(r => <option key={r}>{r}</option>)}
        </select>
        {view === "active" && (
          <select className="input" value={filterStatus} onChange={e => setFilterStatus(e.target.value as Status | "")} style={{ fontSize: "13px", width: "auto" }}>
            <option value="">All statuses</option>
            {(["researching", "waiting_sale", "ready"] as Status[]).map(s => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
          </select>
        )}
        <select className="input" value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)} style={{ fontSize: "13px", width: "auto" }}>
          <option value="priority">Sort: Priority</option>
          <option value="cost">Sort: Cost (high–low)</option>
          <option value="funding">Sort: Funding %</option>
          <option value="date">Sort: Newest</option>
          <option value="name">Sort: A–Z</option>
        </select>
        <select className="input" value={groupBy} onChange={e => setGroupBy(e.target.value as typeof groupBy)} style={{ fontSize: "13px", width: "auto" }}>
          <option value="none">No grouping</option>
          <option value="room">Group: Room</option>
          <option value="category">Group: Category</option>
          <option value="priority">Group: Priority</option>
        </select>
        {hasFilters && <button className="btn btn-ghost" style={{ fontSize: "12px" }} onClick={() => { setSearch(""); setFilterPriority(""); setFilterRoom(""); setFilterStatus(""); }}>Clear filters</button>}
      </div>

      {/* Item list */}
      {visibleItems.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "40px 20px" }}>
          <p style={{ color: "var(--text-3)", margin: "0 0 12px" }}>{hasFilters ? "No items match your filters." : view === "active" ? "No upgrades planned yet." : view === "purchased" ? "No purchases recorded yet." : "Nothing archived."}</p>
          {!hasFilters && view === "active" && <button className="btn btn-primary" onClick={() => setDrawerItem("new")}>Add your first upgrade</button>}
        </div>
      ) : (
        grouped.map(({ key, items }) => (
          <div key={key}>
            {key && <p style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", margin: "16px 0 8px" }}>{key}</p>}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: key ? "8px" : 0 }}>
              {items.map(item => (
                <ItemCard key={item.id} item={item}
                  onEdit={() => setDrawerItem(item)}
                  onArchive={() => archiveItem(item.id)}
                  onDelete={() => deleteItem(item.id)}
                  onDuplicate={() => duplicateItem(item)}
                  onRestore={() => restoreItem(item.id)}
                />
              ))}
            </div>
          </div>
        ))
      )}

      {/* Drawer */}
      {drawerItem !== null && (
        <ItemForm
          initial={drawerItem === "new" ? {} : drawerItem}
          categories={data.categories}
          rooms={data.rooms}
          isEdit={drawerItem !== "new"}
          onClose={() => setDrawerItem(null)}
          onSave={form => drawerItem === "new" ? addItem(form) : editItem((drawerItem as HouseholdItem).id, form)}
        />
      )}
    </div>
  );
}
