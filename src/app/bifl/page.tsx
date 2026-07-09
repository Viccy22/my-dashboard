"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

type PurchaseStatus =
  | "researching" | "waiting_finances" | "waiting_sale"
  | "saving" | "ready" | "purchased" | "paused" | "no_longer_wanted";

type PurchaseType     = "need" | "upgrade" | "luxury" | "dream";
type PurchaseArea     = "home" | "personal_style" | "dogs" | "car" | "health" | "work" | "travel" | "emergency" | "other";
type PurchasePriority = "high" | "medium" | "low";

type ReadinessCheck = {
  researchedAlternatives: boolean;
  replacingLowQuality:    boolean;
  improvesDaily:          boolean;
  financiallyReady:       boolean;
  saleComingUp:           boolean;
  wantedFor30Days:        boolean;
  bestForNeeds:           boolean;
  wantWithoutAudience:    boolean;
};

type PriceSighting = { id: string; date: string; price: number; retailer: string; note: string };

type BIFLItem = {
  id: string;
  name: string;
  brand: string;
  model: string;
  category: string;
  type: PurchaseType;
  area: PurchaseArea;
  priority: PurchasePriority;
  status: PurchaseStatus;
  // Pricing
  estimatedPrice: number;
  currentBestPrice: number;
  salePrice: number;
  targetPrice: number;
  savedAmount: number;
  expectedLifespan: number;
  // Research
  whyWantIt: string;
  howImprovesLife: string;
  qualityNotes: string;
  researchNotes: string;
  replacesItem: string;
  currentItemCondition: string;
  // Timing
  targetDate: string;
  blackFridayNotes: string;
  retailers: string;
  links: string;
  // Readiness
  readiness: ReadinessCheck;
  // Price log
  priceSightings: PriceSighting[];
  // Completed
  purchasedDate: string;
  purchasedPrice: number;
  purchasedWhere: string;
  finalNotes: string;
  // Meta
  createdAt: string;
  order: number;
};

type BIFLData = { items: BIFLItem[]; categories: string[] };
type DashData  = { bifl?: BIFLData; finances?: { currentBalance?: number }; moneyPlan?: { goals?: { name: string; current: number; target: number; done: boolean }[] }; [key: string]: unknown };
type SaveStatus = "idle" | "saving" | "saved" | "error";

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_META: Record<PurchaseStatus, { label: string; color: string; bg: string }> = {
  researching:       { label: "Researching",             color: "var(--text-3)",    bg: "var(--surface-raised)"  },
  waiting_finances:  { label: "Waiting — Finances",      color: "var(--yellow)",    bg: "var(--yellow-dim)"      },
  waiting_sale:      { label: "Waiting for Sale",        color: "var(--yellow)",    bg: "var(--yellow-dim)"      },
  saving:            { label: "Saving",                  color: "var(--accent)",    bg: "var(--accent-dim)"      },
  ready:             { label: "Ready to Buy",            color: "var(--green)",     bg: "var(--green-dim)"       },
  purchased:         { label: "Purchased",               color: "var(--green)",     bg: "var(--green-dim)"       },
  paused:            { label: "Paused",                  color: "var(--text-3)",    bg: "var(--surface-raised)"  },
  no_longer_wanted:  { label: "No Longer Wanted",        color: "var(--text-3)",    bg: "var(--surface-raised)"  },
};

const TYPE_META: Record<PurchaseType, { label: string; color: string }> = {
  need:    { label: "Need",    color: "var(--red)"        },
  upgrade: { label: "Upgrade", color: "var(--yellow)"     },
  luxury:  { label: "Luxury",  color: "var(--accent)"     },
  dream:   { label: "Dream",   color: "var(--accent-text)"},
};

const AREA_META: Record<PurchaseArea, { label: string; icon: string }> = {
  home:          { label: "Home",             icon: "🏠" },
  personal_style:{ label: "Personal Style",   icon: "✨" },
  dogs:          { label: "Dogs",             icon: "🐾" },
  car:           { label: "Car & Travel",     icon: "🚗" },
  health:        { label: "Health & Fitness", icon: "💪" },
  work:          { label: "Work",             icon: "💼" },
  travel:        { label: "Travel",           icon: "✈️" },
  emergency:     { label: "Emergency Prep",   icon: "🛡️" },
  other:         { label: "Other",            icon: "📦" },
};

const PRIORITY_META: Record<PurchasePriority, { label: string; color: string }> = {
  high:   { label: "High",   color: "var(--red)"    },
  medium: { label: "Medium", color: "var(--yellow)" },
  low:    { label: "Low",    color: "var(--text-3)" },
};

const DEFAULT_CATEGORIES = [
  "Home Upgrades", "Cleaning & Organization", "Appliances", "Furniture",
  "Wardrobe", "Shoes", "Bags & Accessories", "Beauty & Personal Care",
  "Fitness & Running", "Dog Care", "Vehicle & Travel", "Work From Home",
  "Emergency Preparedness", "Dream Luxury Items",
];

const READINESS_QUESTIONS: { key: keyof ReadinessCheck; question: string; note: string }[] = [
  { key: "researchedAlternatives", question: "Have I researched alternatives at different price points?",      note: "Know what else exists before committing." },
  { key: "replacingLowQuality",    question: "Is this replacing something broken, worn out, or low quality?", note: "Replacements often have the clearest ROI." },
  { key: "improvesDaily",          question: "Will this meaningfully improve my day-to-day life?",            note: "Not just aesthetics — actual daily function." },
  { key: "financiallyReady",       question: "Can I afford this without hurting debt payoff, savings, or bills?", note: "Check money plan before marking ready." },
  { key: "saleComingUp",           question: "Have I checked for upcoming sales or better timing?",           note: "Black Friday, Prime Day, seasonal markdowns." },
  { key: "wantedFor30Days",        question: "Have I wanted this for at least 30 days?",                     note: "Time kills impulse. Still want it? Then it counts." },
  { key: "bestForNeeds",           question: "Is this the best version for my needs, not just the most beautiful?", note: "Honest about function over aspiration." },
  { key: "wantWithoutAudience",    question: "Would I still want this if no one else would ever see it?",    note: "Screens out status purchases." },
];

// ── Defaults ──────────────────────────────────────────────────────────────────

function blankReadiness(): ReadinessCheck {
  return { researchedAlternatives: false, replacingLowQuality: false, improvesDaily: false, financiallyReady: false, saleComingUp: false, wantedFor30Days: false, bestForNeeds: false, wantWithoutAudience: false };
}

function blankItem(): Omit<BIFLItem, "id" | "createdAt" | "order"> {
  return {
    name: "", brand: "", model: "", category: "", type: "upgrade", area: "home",
    priority: "medium", status: "researching",
    estimatedPrice: 0, currentBestPrice: 0, salePrice: 0, targetPrice: 0, savedAmount: 0, expectedLifespan: 0,
    whyWantIt: "", howImprovesLife: "", qualityNotes: "", researchNotes: "",
    replacesItem: "", currentItemCondition: "", targetDate: "",
    blackFridayNotes: "", retailers: "", links: "",
    readiness: blankReadiness(), priceSightings: [],
    purchasedDate: "", purchasedPrice: 0, purchasedWhere: "", finalNotes: "",
  };
}

const SEED_ITEMS: BIFLItem[] = [
  {
    id: "bifl1", name: "High-Quality Vacuum", brand: "Dyson", model: "V15 Detect", category: "Cleaning & Organization",
    type: "need", area: "home", priority: "high", status: "waiting_finances",
    estimatedPrice: 650, currentBestPrice: 599, salePrice: 499, targetPrice: 499, savedAmount: 0, expectedLifespan: 10,
    whyWantIt: "Current vacuum struggles with pet hair and leaves me re-cleaning constantly.",
    howImprovesLife: "Cleaner floors in less time — less frustration, better air quality for the dogs.",
    qualityNotes: "Dyson lasts 10+ years with proper filter cleaning. Cost per year ~$60 vs cheap vacuums at $40/yr that break in 2.",
    researchNotes: "Also considering Shark IQ but Dyson has better long-term support. Best Buy usually runs sales around Black Friday.",
    replacesItem: "Current Bissell that's 4 years old and losing suction", currentItemCondition: "Declining — filters replaced but still weak",
    targetDate: "2026-11-29", blackFridayNotes: "V15 dropped to $499 Black Friday 2024. Expect similar in 2025.",
    retailers: "Best Buy, Costco, Dyson.com", links: "",
    readiness: { researchedAlternatives: true, replacingLowQuality: true, improvesDaily: true, financiallyReady: false, saleComingUp: true, wantedFor30Days: true, bestForNeeds: true, wantWithoutAudience: true },
    priceSightings: [{ id: "ps1", date: "2024-11-29", price: 499, retailer: "Best Buy", note: "Black Friday deal — V15 was $499 down from $650" }],
    purchasedDate: "", purchasedPrice: 0, purchasedWhere: "", finalNotes: "", createdAt: "2026-07-01", order: 0,
  },
  {
    id: "bifl2", name: "Classic Leather Tote", brand: "Lo & Sons", model: "O.G. Tote", category: "Bags & Accessories",
    type: "luxury", area: "personal_style", priority: "low", status: "researching",
    estimatedPrice: 195, currentBestPrice: 195, salePrice: 0, targetPrice: 150, savedAmount: 0, expectedLifespan: 15,
    whyWantIt: "Want a bag that lasts years and works for work, errands, and weekend trips without looking worn.",
    howImprovesLife: "One quality bag vs. constantly replacing cheap ones that fall apart or look rough fast.",
    qualityNotes: "Lo & Sons has lifetime repair guarantee. Nylon + leather trim holds up. ~$13/year over 15 years.",
    researchNotes: "Also considering Longchamp Le Pliage ($160), Cuyana Triple Zip ($295). Lo & Sons has best organizational layout for my use.",
    replacesItem: "Amazon bag that's fraying after 1 year", currentItemCondition: "Failing — strap stitching coming apart",
    targetDate: "2026-12-01", blackFridayNotes: "Lo & Sons runs 20% off around Black Friday. Also check end of season.",
    retailers: "Lo & Sons website, Nordstrom", links: "",
    readiness: { researchedAlternatives: true, replacingLowQuality: true, improvesDaily: false, financiallyReady: false, saleComingUp: false, wantedFor30Days: true, bestForNeeds: false, wantWithoutAudience: true },
    priceSightings: [],
    purchasedDate: "", purchasedPrice: 0, purchasedWhere: "", finalNotes: "", createdAt: "2026-07-01", order: 1,
  },
  {
    id: "bifl3", name: "Quality Running Shoes", brand: "Brooks", model: "Ghost 16", category: "Fitness & Running",
    type: "upgrade", area: "health", priority: "high", status: "saving",
    estimatedPrice: 140, currentBestPrice: 130, salePrice: 0, targetPrice: 110, savedAmount: 40, expectedLifespan: 2,
    whyWantIt: "Feet and knees hurt after runs. Cheap shoes are costing me more in pain than savings are worth.",
    howImprovesLife: "Pain-free running means I actually do it. Health investment.",
    qualityNotes: "Brooks Ghost is consistently rated top for neutral runners. ~$70/year — worth it.",
    researchNotes: "Went to Fleet Feet for a gait analysis — Ghost 16 recommended. Also tried Saucony Ride 17.",
    replacesItem: "Old Nike Reacts that are 18 months old", currentItemCondition: "Midsole compressed — no more cushioning",
    targetDate: "2026-08-01", blackFridayNotes: "",
    retailers: "Fleet Feet, Brooks.com, Running Warehouse", links: "",
    readiness: { researchedAlternatives: true, replacingLowQuality: true, improvesDaily: true, financiallyReady: false, saleComingUp: false, wantedFor30Days: true, bestForNeeds: true, wantWithoutAudience: true },
    priceSightings: [{ id: "ps2", date: "2026-06-15", price: 130, retailer: "Brooks.com", note: "Regular price — no sale currently" }],
    purchasedDate: "", purchasedPrice: 0, purchasedWhere: "", finalNotes: "", createdAt: "2026-07-01", order: 2,
  },
  {
    id: "bifl4", name: "Organic Cotton Duvet Set", brand: "Coyuchi", model: "Relaxed Organic Percale", category: "Home Upgrades",
    type: "upgrade", area: "home", priority: "low", status: "waiting_finances",
    estimatedPrice: 320, currentBestPrice: 320, salePrice: 0, targetPrice: 240, savedAmount: 0, expectedLifespan: 12,
    whyWantIt: "Current bedding is 6 years old, thin, and pills. Better sleep quality matters.",
    howImprovesLife: "Better temperature regulation, actual comfort, less tossing. Worth it for sleep.",
    qualityNotes: "Coyuchi GOTS certified organic. Percale is cool and crisp. ~$27/year over 12 years. Regular Target bedding = ~$40/year replacing every 2-3 years.",
    researchNotes: "Also considering Parachute ($250) and Brooklinen ($200). Coyuchi is most durable per reviews. Parachute is a solid runner-up.",
    replacesItem: "Target comforter from 2018", currentItemCondition: "Lumpy, thin, pills badly",
    targetDate: "2027-01-01", blackFridayNotes: "Coyuchi runs 25% off Black Friday. That would bring set to ~$240.",
    retailers: "Coyuchi.com, REI", links: "",
    readiness: { researchedAlternatives: true, replacingLowQuality: true, improvesDaily: true, financiallyReady: false, saleComingUp: true, wantedFor30Days: true, bestForNeeds: false, wantWithoutAudience: true },
    priceSightings: [],
    purchasedDate: "", purchasedPrice: 0, purchasedWhere: "", finalNotes: "", createdAt: "2026-07-01", order: 3,
  },
  {
    id: "bifl5", name: "Adventure Dog Harness", brand: "Ruffwear", model: "Front Range Harness", category: "Dog Care",
    type: "upgrade", area: "dogs", priority: "medium", status: "waiting_sale",
    estimatedPrice: 90, currentBestPrice: 85, salePrice: 0, targetPrice: 65, savedAmount: 0, expectedLifespan: 8,
    whyWantIt: "Current harness is pulling uncomfortable and the clasps are weakening. Safety concern.",
    howImprovesLife: "Better walks, safer control, more comfortable for the dog.",
    qualityNotes: "Ruffwear is the gold standard for dog gear. ~$11/year. Amazon harness lasted 8 months.",
    researchNotes: "Size M fits Zorro. Also looked at Julius-K9 but Ruffwear has better padding for sensitive dogs.",
    replacesItem: "Amazon basic harness", currentItemCondition: "Clasp weakening — feels unsafe on stronger pulls",
    targetDate: "2026-09-01", blackFridayNotes: "Ruffwear does 20% off Black Friday via their website.",
    retailers: "Ruffwear.com, REI, Chewy", links: "",
    readiness: { researchedAlternatives: true, replacingLowQuality: true, improvesDaily: true, financiallyReady: false, saleComingUp: false, wantedFor30Days: true, bestForNeeds: true, wantWithoutAudience: true },
    priceSightings: [{ id: "ps3", date: "2026-06-20", price: 85, retailer: "REI", note: "Regular price. REI member sale coming up in October?" }],
    purchasedDate: "", purchasedPrice: 0, purchasedWhere: "", finalNotes: "", createdAt: "2026-07-01", order: 4,
  },
];

function seedData(): BIFLData {
  return { items: SEED_ITEMS, categories: [...DEFAULT_CATEGORIES] };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayStr() { return new Date().toISOString().slice(0, 10); }
function fmt$(n: number) { return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }
function readinessScore(r: ReadinessCheck): number { return Object.values(r).filter(Boolean).length; }
function costPerYear(price: number, years: number): number { return years > 0 ? price / years : 0; }
function activePrice(item: BIFLItem): number { return item.currentBestPrice || item.estimatedPrice; }
function fundingPct(item: BIFLItem): number { const t = activePrice(item); return t > 0 ? Math.min(100, (item.savedAmount / t) * 100) : 0; }

function readinessLabel(score: number): { label: string; color: string } {
  if (score >= 7) return { label: "Ready",         color: "var(--green)"   };
  if (score >= 5) return { label: "Almost Ready",  color: "var(--yellow)"  };
  if (score >= 3) return { label: "Still Deciding",color: "var(--accent)"  };
  return           { label: "Not Yet",              color: "var(--text-3)"  };
}

// ── Icons ─────────────────────────────────────────────────────────────────────

const PlusIcon   = () => <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M6.5 2v9M2 6.5h9" /></svg>;
const PencilIcon = () => <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M9 2l2 2-7 7H2v-2L9 2z" strokeLinejoin="round" /></svg>;
const TrashIcon  = () => <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M2 3.5h9M5 3.5V2h3v1.5M4 3.5l.5 7h4l.5-7" strokeLinejoin="round" /></svg>;
const XIcon      = () => <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M2 2l9 9M11 2l-9 9" /></svg>;

// ── Readiness panel ───────────────────────────────────────────────────────────

function ReadinessPanel({ readiness, onChange }: { readiness: ReadinessCheck; onChange: (r: ReadinessCheck) => void }) {
  const score = readinessScore(readiness);
  const { label, color } = readinessLabel(score);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
        <span style={{ fontSize: "12px", color: "var(--text-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Purchase Readiness</span>
        <span style={{ fontSize: "13px", fontWeight: 700, color }}>{score}/8 — {label}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {READINESS_QUESTIONS.map(q => (
          <label key={q.key} style={{ display: "flex", gap: "10px", cursor: "pointer", alignItems: "flex-start" }}>
            <input type="checkbox" className="checkbox" checked={readiness[q.key]}
              onChange={e => onChange({ ...readiness, [q.key]: e.target.checked })}
              style={{ marginTop: "2px", flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: "13px", color: readiness[q.key] ? "var(--text)" : "var(--text-2)" }}>{q.question}</div>
              <div style={{ fontSize: "11.5px", color: "var(--text-3)", marginTop: "1px" }}>{q.note}</div>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}

// ── Item drawer (full form) ───────────────────────────────────────────────────

type DrawerTab = "overview" | "pricing" | "research" | "readiness" | "sale_log" | "purchased";

function ItemDrawer({ item, categories, onSave, onClose }: {
  item: Partial<BIFLItem>; categories: string[];
  onSave: (data: Omit<BIFLItem, "id" | "createdAt" | "order">) => void;
  onClose: () => void;
}) {
  const blank = blankItem();
  const [form, setForm] = useState<Omit<BIFLItem, "id" | "createdAt" | "order">>({ ...blank, ...item });
  const [tab, setTab] = useState<DrawerTab>("overview");
  const [addingObs, setAddingObs] = useState(false);
  const [obsForm, setObsForm] = useState({ price: "", retailer: "", note: "" });
  const isEdit = !!item.id;

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm(p => ({ ...p, [k]: v }));

  const addSighting = () => {
    if (!obsForm.price) return;
    const s: PriceSighting = { id: crypto.randomUUID(), date: todayStr(), price: parseFloat(obsForm.price) || 0, retailer: obsForm.retailer, note: obsForm.note };
    set("priceSightings", [...form.priceSightings, s]);
    setObsForm({ price: "", retailer: "", note: "" });
    setAddingObs(false);
  };

  const tabs: { key: DrawerTab; label: string }[] = [
    { key: "overview",   label: "Overview"   },
    { key: "pricing",    label: "Pricing"    },
    { key: "research",   label: "Research"   },
    { key: "readiness",  label: "Readiness"  },
    { key: "sale_log",   label: "Sale Log"   },
    ...(isEdit ? [{ key: "purchased" as DrawerTab, label: "Purchased" }] : []),
  ];

  const inp = { className: "input", style: { fontSize: "13px" } };
  const priceInp = (field: "estimatedPrice" | "currentBestPrice" | "salePrice" | "targetPrice" | "savedAmount") => (
    <div style={{ display: "flex", alignItems: "center", background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: "6px", padding: "0 10px" }}>
      <span style={{ color: "var(--text-3)", marginRight: "4px", fontSize: "13px" }}>$</span>
      <input type="number" step="0.01" min="0" placeholder="0.00"
        style={{ background: "none", border: "none", outline: "none", color: "var(--text)", fontFamily: "inherit", fontSize: "13px", width: "100%", padding: "8px 0" }}
        value={form[field] || ""} onChange={e => set(field, parseFloat(e.target.value) || 0)} />
    </div>
  );

  const cpy = form.expectedLifespan > 0 ? costPerYear(activePrice({ ...form } as BIFLItem), form.expectedLifespan) : 0;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex" }}>
      <div style={{ flex: 1, background: "rgba(0,0,0,0.5)" }} onClick={onClose} />
      <div style={{ width: "min(540px, 100vw)", background: "var(--surface)", borderLeft: "1px solid var(--border)", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
          <h2 style={{ margin: 0, fontSize: "15px", fontWeight: 600, flex: 1 }}>{isEdit ? "Edit Item" : "Add Investment Piece"}</h2>
          <button className="btn-icon" onClick={onClose}><XIcon /></button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "2px", padding: "10px 12px 0", flexShrink: 0, overflowX: "auto" }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{ background: tab === t.key ? "var(--accent-dim)" : "transparent", color: tab === t.key ? "var(--accent-text)" : "var(--text-3)", border: "none", borderRadius: "5px", padding: "5px 10px", fontSize: "12px", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: "12px" }}>

          {/* OVERVIEW */}
          {tab === "overview" && <>
            <div>
              <label style={{ fontSize: "11.5px", color: "var(--text-3)", display: "block", marginBottom: "4px" }}>Item Name *</label>
              <input {...inp} placeholder="e.g. All-Clad D3 10-piece set" value={form.name} onChange={e => set("name", e.target.value)} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div>
                <label style={{ fontSize: "11.5px", color: "var(--text-3)", display: "block", marginBottom: "4px" }}>Brand</label>
                <input {...inp} placeholder="e.g. All-Clad" value={form.brand} onChange={e => set("brand", e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: "11.5px", color: "var(--text-3)", display: "block", marginBottom: "4px" }}>Model / Style</label>
                <input {...inp} placeholder="e.g. D3 Stainless" value={form.model} onChange={e => set("model", e.target.value)} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div>
                <label style={{ fontSize: "11.5px", color: "var(--text-3)", display: "block", marginBottom: "4px" }}>Category</label>
                <select {...inp} value={form.category} onChange={e => set("category", e.target.value)}>
                  <option value="">Select…</option>
                  {categories.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: "11.5px", color: "var(--text-3)", display: "block", marginBottom: "4px" }}>Life Area</label>
                <select {...inp} value={form.area} onChange={e => set("area", e.target.value as PurchaseArea)}>
                  {(Object.keys(AREA_META) as PurchaseArea[]).map(a => <option key={a} value={a}>{AREA_META[a].label}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
              <div>
                <label style={{ fontSize: "11.5px", color: "var(--text-3)", display: "block", marginBottom: "4px" }}>Type</label>
                <select {...inp} value={form.type} onChange={e => set("type", e.target.value as PurchaseType)}>
                  {(Object.keys(TYPE_META) as PurchaseType[]).map(t => <option key={t} value={t}>{TYPE_META[t].label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: "11.5px", color: "var(--text-3)", display: "block", marginBottom: "4px" }}>Priority</label>
                <select {...inp} value={form.priority} onChange={e => set("priority", e.target.value as PurchasePriority)}>
                  {(Object.keys(PRIORITY_META) as PurchasePriority[]).map(p => <option key={p} value={p}>{PRIORITY_META[p].label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: "11.5px", color: "var(--text-3)", display: "block", marginBottom: "4px" }}>Status</label>
                <select {...inp} value={form.status} onChange={e => set("status", e.target.value as PurchaseStatus)}>
                  {(Object.keys(STATUS_META) as PurchaseStatus[]).map(s => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label style={{ fontSize: "11.5px", color: "var(--text-3)", display: "block", marginBottom: "4px" }}>What does it replace? (if anything)</label>
              <input {...inp} placeholder="e.g. Current $30 Amazon harness falling apart" value={form.replacesItem} onChange={e => set("replacesItem", e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: "11.5px", color: "var(--text-3)", display: "block", marginBottom: "4px" }}>Current item condition</label>
              <input {...inp} placeholder="e.g. Worn out, clasp broken, pills badly" value={form.currentItemCondition} onChange={e => set("currentItemCondition", e.target.value)} />
            </div>
          </>}

          {/* PRICING */}
          {tab === "pricing" && <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              {([ ["estimatedPrice","Estimated / MSRP"], ["currentBestPrice","Current Best Price"], ["salePrice","Sale / Lowest Seen"], ["targetPrice","My Target Price"], ["savedAmount","Amount Set Aside"] ] as const).map(([k, label]) => (
                <div key={k}>
                  <label style={{ fontSize: "11.5px", color: "var(--text-3)", display: "block", marginBottom: "4px" }}>{label}</label>
                  {priceInp(k)}
                </div>
              ))}
              <div>
                <label style={{ fontSize: "11.5px", color: "var(--text-3)", display: "block", marginBottom: "4px" }}>Expected Lifespan (years)</label>
                <input {...inp} type="number" min="0" placeholder="e.g. 10" value={form.expectedLifespan || ""} onChange={e => set("expectedLifespan", parseFloat(e.target.value) || 0)} />
              </div>
            </div>

            {/* Cost per year insight */}
            {cpy > 0 && (
              <div style={{ background: "var(--accent-dim)", border: "1px solid var(--accent)", borderRadius: "7px", padding: "12px 14px" }}>
                <p style={{ margin: "0 0 4px", fontSize: "12px", color: "var(--accent-text)", fontWeight: 600 }}>Cost Per Year Insight</p>
                <p style={{ margin: 0, fontSize: "13.5px", color: "var(--text)" }}>
                  {fmt$(activePrice({ ...form } as BIFLItem))} over {form.expectedLifespan} years = <strong>{fmt$(Math.round(cpy))}/year</strong>
                </p>
                <p style={{ margin: "4px 0 0", fontSize: "12px", color: "var(--text-3)" }}>Quality items often cost less per year than cheap replacements every 1–2 years.</p>
              </div>
            )}

            {/* Funding bar */}
            {activePrice({ ...form } as BIFLItem) > 0 && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={{ fontSize: "12px", color: "var(--text-3)" }}>{fmt$(form.savedAmount)} of {fmt$(activePrice({ ...form } as BIFLItem))} set aside</span>
                  <span style={{ fontSize: "12px", color: "var(--text-3)" }}>{Math.round(fundingPct({ ...form } as BIFLItem))}%</span>
                </div>
                <div style={{ height: "5px", borderRadius: "99px", background: "var(--surface-overlay)", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${fundingPct({ ...form } as BIFLItem)}%`, background: "var(--accent)", borderRadius: "99px" }} />
                </div>
                {activePrice({ ...form } as BIFLItem) - form.savedAmount > 0 && (
                  <p style={{ margin: "4px 0 0", fontSize: "12px", color: "var(--text-3)" }}>
                    {fmt$(activePrice({ ...form } as BIFLItem) - form.savedAmount)} still needed
                  </p>
                )}
              </div>
            )}

            <div>
              <label style={{ fontSize: "11.5px", color: "var(--text-3)", display: "block", marginBottom: "4px" }}>Preferred Retailers</label>
              <input {...inp} placeholder="e.g. REI, Nordstrom, brand website" value={form.retailers} onChange={e => set("retailers", e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: "11.5px", color: "var(--text-3)", display: "block", marginBottom: "4px" }}>Links (product pages, reviews)</label>
              <textarea className="input" placeholder="Paste URLs here — one per line" value={form.links} onChange={e => set("links", e.target.value)} style={{ minHeight: "70px", fontSize: "12.5px", resize: "vertical" }} />
            </div>
            <div>
              <label style={{ fontSize: "11.5px", color: "var(--text-3)", display: "block", marginBottom: "4px" }}>Target Purchase Date</label>
              <input {...inp} type="date" value={form.targetDate} onChange={e => set("targetDate", e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: "11.5px", color: "var(--text-3)", display: "block", marginBottom: "4px" }}>Black Friday / Holiday Sale Notes</label>
              <textarea className="input" placeholder="e.g. Dyson V15 dropped to $499 BF 2024. Expect similar Nov 2025." value={form.blackFridayNotes} onChange={e => set("blackFridayNotes", e.target.value)} style={{ minHeight: "70px", fontSize: "12.5px", resize: "vertical" }} />
            </div>
          </>}

          {/* RESEARCH */}
          {tab === "research" && <>
            <div>
              <label style={{ fontSize: "11.5px", color: "var(--text-3)", display: "block", marginBottom: "4px" }}>Why do I want this?</label>
              <textarea className="input" placeholder="Be honest — what's the real reason? Function, feeling, or both?" value={form.whyWantIt} onChange={e => set("whyWantIt", e.target.value)} style={{ minHeight: "80px", fontSize: "13px", resize: "vertical" }} />
            </div>
            <div>
              <label style={{ fontSize: "11.5px", color: "var(--text-3)", display: "block", marginBottom: "4px" }}>How does it improve daily life?</label>
              <textarea className="input" placeholder="Concrete improvements — time saved, pain reduced, task done better, less clutter" value={form.howImprovesLife} onChange={e => set("howImprovesLife", e.target.value)} style={{ minHeight: "80px", fontSize: "13px", resize: "vertical" }} />
            </div>
            <div>
              <label style={{ fontSize: "11.5px", color: "var(--text-3)", display: "block", marginBottom: "4px" }}>Quality Notes</label>
              <textarea className="input" placeholder="Why is this version worth it? Materials, durability, warranty, reviews, brand reputation." value={form.qualityNotes} onChange={e => set("qualityNotes", e.target.value)} style={{ minHeight: "90px", fontSize: "13px", resize: "vertical" }} />
            </div>
            <div>
              <label style={{ fontSize: "11.5px", color: "var(--text-3)", display: "block", marginBottom: "4px" }}>Research Notes</label>
              <textarea className="input" placeholder="Alternatives considered, comparisons, YouTube reviews, Reddit recommendations, why this one vs others." value={form.researchNotes} onChange={e => set("researchNotes", e.target.value)} style={{ minHeight: "120px", fontSize: "13px", resize: "vertical" }} />
            </div>
          </>}

          {/* READINESS */}
          {tab === "readiness" && (
            <div>
              <div style={{ background: "var(--surface-raised)", borderRadius: "7px", padding: "12px 14px", marginBottom: "14px", fontSize: "12.5px", color: "var(--text-3)", lineHeight: 1.6 }}>
                These questions help you separate a thoughtful investment from an impulse. You don&apos;t need a perfect score — but be honest with each answer.
              </div>
              <ReadinessPanel readiness={form.readiness} onChange={r => set("readiness", r)} />
            </div>
          )}

          {/* SALE LOG */}
          {tab === "sale_log" && <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <p style={{ margin: 0, fontSize: "12.5px", color: "var(--text-3)" }}>Log prices you find — sales, outlets, secondhand, seasonal deals.</p>
              <button className="btn-icon" onClick={() => setAddingObs(true)}><PlusIcon /></button>
            </div>
            {form.priceSightings.length === 0 && !addingObs && (
              <p style={{ fontSize: "12.5px", color: "var(--text-3)", fontStyle: "italic" }}>No price sightings yet. Add one when you spot a sale.</p>
            )}
            {form.priceSightings.map(s => (
              <div key={s.id} style={{ background: "var(--surface-raised)", borderRadius: "6px", padding: "10px 12px", display: "flex", gap: "10px", alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--green)" }}>{fmt$(s.price)} <span style={{ color: "var(--text-3)", fontWeight: 400 }}>at {s.retailer}</span></div>
                  {s.note && <div style={{ fontSize: "12px", color: "var(--text-2)", marginTop: "2px" }}>{s.note}</div>}
                  <div style={{ fontSize: "11px", color: "var(--text-3)", marginTop: "2px" }}>{s.date}</div>
                </div>
                <button className="btn-icon" onClick={() => set("priceSightings", form.priceSightings.filter(x => x.id !== s.id))}><TrashIcon /></button>
              </div>
            ))}
            {addingObs && (
              <div style={{ background: "var(--surface-raised)", borderRadius: "6px", padding: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", background: "var(--surface-overlay)", border: "1px solid var(--border)", borderRadius: "6px", padding: "0 10px" }}>
                    <span style={{ color: "var(--text-3)", marginRight: "4px", fontSize: "13px" }}>$</span>
                    <input type="number" step="0.01" placeholder="Price" style={{ background: "none", border: "none", outline: "none", color: "var(--text)", fontFamily: "inherit", fontSize: "13px", padding: "8px 0", width: "100%" }} value={obsForm.price} onChange={e => setObsForm(p => ({ ...p, price: e.target.value }))} />
                  </div>
                  <input className="input" placeholder="Where? (Retailer)" style={{ fontSize: "13px" }} value={obsForm.retailer} onChange={e => setObsForm(p => ({ ...p, retailer: e.target.value }))} />
                </div>
                <input className="input" placeholder="Note — was this actually a good deal?" style={{ fontSize: "13px" }} value={obsForm.note} onChange={e => setObsForm(p => ({ ...p, note: e.target.value }))} />
                <div style={{ display: "flex", gap: "6px" }}>
                  <button className="btn btn-primary" style={{ fontSize: "12px", padding: "6px 12px" }} onClick={addSighting}>Save</button>
                  <button className="btn btn-ghost" style={{ fontSize: "12px" }} onClick={() => setAddingObs(false)}>Cancel</button>
                </div>
              </div>
            )}
          </>}

          {/* PURCHASED */}
          {tab === "purchased" && <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div>
                <label style={{ fontSize: "11.5px", color: "var(--text-3)", display: "block", marginBottom: "4px" }}>Purchase Date</label>
                <input {...inp} type="date" value={form.purchasedDate} onChange={e => set("purchasedDate", e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: "11.5px", color: "var(--text-3)", display: "block", marginBottom: "4px" }}>Actual Price Paid</label>
                <div style={{ display: "flex", alignItems: "center", background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: "6px", padding: "0 10px" }}>
                  <span style={{ color: "var(--text-3)", marginRight: "4px", fontSize: "13px" }}>$</span>
                  <input type="number" step="0.01" min="0" placeholder="0.00" style={{ background: "none", border: "none", outline: "none", color: "var(--text)", fontFamily: "inherit", fontSize: "13px", width: "100%", padding: "8px 0" }} value={form.purchasedPrice || ""} onChange={e => set("purchasedPrice", parseFloat(e.target.value) || 0)} />
                </div>
              </div>
            </div>
            <div>
              <label style={{ fontSize: "11.5px", color: "var(--text-3)", display: "block", marginBottom: "4px" }}>Where Purchased</label>
              <input {...inp} placeholder="e.g. REI, brand website, secondhand" value={form.purchasedWhere} onChange={e => set("purchasedWhere", e.target.value)} />
            </div>
            {form.estimatedPrice > 0 && form.purchasedPrice > 0 && (
              <div style={{ background: "var(--green-dim)", borderRadius: "6px", padding: "10px 14px", display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: "13px", color: "var(--text-2)" }}>Saved vs. estimated</span>
                <span style={{ fontWeight: 600, color: "var(--green)" }}>{fmt$(Math.max(0, form.estimatedPrice - form.purchasedPrice))}</span>
              </div>
            )}
            <div>
              <label style={{ fontSize: "11.5px", color: "var(--text-3)", display: "block", marginBottom: "4px" }}>Final Notes</label>
              <textarea className="input" placeholder="Was it worth it? What would you do differently? Post-purchase thoughts." value={form.finalNotes} onChange={e => set("finalNotes", e.target.value)} style={{ minHeight: "100px", fontSize: "13px", resize: "vertical" }} />
            </div>
          </>}
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 20px", borderTop: "1px solid var(--border)", display: "flex", gap: "8px", flexShrink: 0 }}>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => { if (!form.name.trim()) { alert("Item name is required."); return; } onSave(form); }}>
            {isEdit ? "Save Changes" : "Add Item"}
          </button>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Before You Buy card ───────────────────────────────────────────────────────

function BeforeYouBuyCard({ balance, goals }: { balance: number | null; goals: { name: string; current: number; target: number; done: boolean }[] }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  const activeGoals = goals.filter(g => !g.done);
  const underfundedGoals = activeGoals.filter(g => g.current < g.target);

  return (
    <div style={{ background: "var(--accent-dim)", border: "1px solid var(--accent)", borderRadius: "8px", padding: "14px 16px", marginBottom: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <p style={{ margin: "0 0 8px", fontSize: "13px", fontWeight: 600, color: "var(--accent-text)" }}>Before You Buy — Check the Big Picture</p>
        <button className="btn-icon" style={{ fontSize: "12px" }} onClick={() => setDismissed(true)}><XIcon /></button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "5px", fontSize: "12.5px", color: "var(--text-2)" }}>
        {balance !== null && <p style={{ margin: 0 }}>• Checking balance: <strong style={{ color: "var(--text)" }}>${balance.toLocaleString()}</strong></p>}
        {underfundedGoals.length > 0 && <p style={{ margin: 0 }}>• Active savings goals in progress: <strong style={{ color: "var(--text)" }}>{underfundedGoals.map(g => g.name).slice(0, 3).join(", ")}</strong></p>}
        <p style={{ margin: 0 }}>• Does this purchase delay any goal, bill, or debt payoff? If yes — add it here and wait.</p>
        <p style={{ margin: 0 }}>• Will you still want it in 30 days? Then it belongs in your plan — not your cart.</p>
      </div>
    </div>
  );
}

// ── Item card ─────────────────────────────────────────────────────────────────

function ItemCard({ item, onEdit, onDelete }: { item: BIFLItem; onEdit: () => void; onDelete: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const score = readinessScore(item.readiness);
  const rl = readinessLabel(score);
  const sm = STATUS_META[item.status];
  const tm = TYPE_META[item.type];
  const am = AREA_META[item.area];
  const cost = activePrice(item);
  const cpy = item.expectedLifespan > 0 ? costPerYear(cost, item.expectedLifespan) : 0;
  const pct = fundingPct(item);
  const isPurchased = item.status === "purchased";
  const isInactive = item.status === "paused" || item.status === "no_longer_wanted";

  return (
    <div className="card" style={{ opacity: isInactive ? 0.5 : 1 }}>
      <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
        {/* Left accent */}
        <div style={{ width: "3px", minHeight: "56px", borderRadius: "99px", background: tm.color, flexShrink: 0, marginTop: "2px" }} />

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Name row */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", marginBottom: "4px" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--text)" }}>{item.name}</span>
              {item.brand && <span style={{ fontSize: "12px", color: "var(--text-3)", marginLeft: "6px" }}>{item.brand}{item.model ? ` · ${item.model}` : ""}</span>}
            </div>
            <span style={{ fontSize: "11px", background: sm.bg, color: sm.color, padding: "2px 7px", borderRadius: "4px", flexShrink: 0, whiteSpace: "nowrap" }}>{sm.label}</span>
          </div>

          {/* Badges */}
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "8px" }}>
            <span style={{ fontSize: "11px", color: tm.color }}>{tm.label}</span>
            <span style={{ fontSize: "11px", color: "var(--text-3)" }}>·</span>
            <span style={{ fontSize: "11px", color: "var(--text-3)" }}>{am.icon} {am.label}</span>
            {item.category && <><span style={{ fontSize: "11px", color: "var(--text-3)" }}>·</span><span style={{ fontSize: "11px", color: "var(--text-3)" }}>{item.category}</span></>}
            {item.targetDate && <><span style={{ fontSize: "11px", color: "var(--text-3)" }}>·</span><span style={{ fontSize: "11px", color: "var(--text-3)" }}>🗓 {item.targetDate}</span></>}
          </div>

          {/* Price + cost/year */}
          <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap", marginBottom: "8px" }}>
            {cost > 0 && <span style={{ fontSize: "15px", fontWeight: 700, color: isPurchased ? "var(--green)" : "var(--text)" }}>{fmt$(isPurchased ? item.purchasedPrice : cost)}</span>}
            {cpy > 0 && <span style={{ fontSize: "12px", color: "var(--accent-text)", background: "var(--accent-dim)", padding: "2px 7px", borderRadius: "4px" }}>{fmt$(Math.round(cpy))}/yr over {item.expectedLifespan}y</span>}
            {!isPurchased && item.targetPrice > 0 && item.targetPrice < cost && (
              <span style={{ fontSize: "12px", color: "var(--text-3)" }}>target {fmt$(item.targetPrice)}</span>
            )}
          </div>

          {/* Funding bar (if saving or ready) */}
          {!isPurchased && !isInactive && cost > 0 && item.savedAmount > 0 && (
            <div style={{ marginBottom: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                <span style={{ fontSize: "11px", color: "var(--text-3)" }}>{fmt$(item.savedAmount)} set aside</span>
                <span style={{ fontSize: "11px", color: pct >= 100 ? "var(--green)" : "var(--text-3)" }}>{Math.round(pct)}%</span>
              </div>
              <div style={{ height: "4px", borderRadius: "99px", background: "var(--surface-overlay)", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pct}%`, background: pct >= 100 ? "var(--green)" : "var(--accent)", borderRadius: "99px", transition: "width 0.3s" }} />
              </div>
            </div>
          )}

          {/* Bottom row */}
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <span style={{ fontSize: "12px", fontWeight: 600, color: rl.color }}>{score}/8 — {rl.label}</span>
            {item.priceSightings.length > 0 && <span style={{ fontSize: "11px", color: "var(--text-3)" }}>{item.priceSightings.length} price sighting{item.priceSightings.length !== 1 ? "s" : ""}</span>}
            {isPurchased && item.purchasedDate && <span style={{ fontSize: "11.5px", color: "var(--green)" }}>✓ Bought {item.purchasedDate}{item.purchasedWhere ? ` · ${item.purchasedWhere}` : ""}</span>}
          </div>
        </div>

        {/* Menu */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          <button className="btn-icon" onClick={() => setMenuOpen(p => !p)} style={{ fontSize: "16px", lineHeight: 1 }}>⋯</button>
          {menuOpen && (
            <div style={{ position: "absolute", right: 0, top: "28px", background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: "7px", padding: "4px", minWidth: "140px", zIndex: 10, boxShadow: "0 4px 16px rgba(0,0,0,0.4)" }}
              onMouseLeave={() => setMenuOpen(false)}>
              <button className="btn-ghost" style={{ width: "100%", justifyContent: "flex-start", gap: "8px", fontSize: "13px", padding: "6px 10px" }} onClick={() => { setMenuOpen(false); onEdit(); }}><PencilIcon /> Edit</button>
              <div style={{ height: "1px", background: "var(--border)", margin: "4px 0" }} />
              <button className="btn-ghost" style={{ width: "100%", justifyContent: "flex-start", gap: "8px", fontSize: "13px", padding: "6px 10px", color: "var(--red)" }} onClick={() => { setMenuOpen(false); if (confirm("Delete this item?")) onDelete(); }}><TrashIcon /> Delete</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Summary bar ───────────────────────────────────────────────────────────────

function SummaryBar({ items }: { items: BIFLItem[] }) {
  const active   = items.filter(i => !["purchased","paused","no_longer_wanted"].includes(i.status));
  const ready    = items.filter(i => i.status === "ready");
  const purchased = items.filter(i => i.status === "purchased");
  const totalPlanned = active.reduce((s, i) => s + activePrice(i), 0);
  const totalSaved   = active.reduce((s, i) => s + i.savedAmount, 0);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "16px" }}>
      {[
        { label: "Active Items",    value: String(active.length),   sub: `${ready.length} ready to buy`,         color: "var(--text)"     },
        { label: "Total Planned",   value: `$${totalPlanned.toLocaleString()}`, sub: "across active items",      color: "var(--text)"     },
        { label: "Set Aside",       value: `$${totalSaved.toLocaleString()}`,   sub: `${totalPlanned > 0 ? Math.round((totalSaved/totalPlanned)*100) : 0}% funded`, color: "var(--green)" },
        { label: "Purchased",       value: String(purchased.length), sub: `${purchased.length} item${purchased.length !== 1 ? "s" : ""} acquired`, color: "var(--accent)" },
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

// ── View types ────────────────────────────────────────────────────────────────

type ViewFilter = "all" | "near_term" | "future" | "luxury" | "purchased" | "paused";

const VIEW_META: Record<ViewFilter, { label: string; description: string }> = {
  all:       { label: "All Items",          description: "Everything in your investment plan" },
  near_term: { label: "Near-Term",          description: "Saving, ready to buy, or waiting for a sale" },
  future:    { label: "Future Goals",       description: "Researching or waiting for better finances" },
  luxury:    { label: "Luxury & Dream",     description: "Higher-end aspirational pieces" },
  purchased: { label: "Purchased",          description: "Items you've acquired" },
  paused:    { label: "Paused / Not Now",   description: "On hold or no longer wanted" },
};

function itemMatchesView(item: BIFLItem, view: ViewFilter): boolean {
  switch (view) {
    case "all":       return !["paused","no_longer_wanted"].includes(item.status);
    case "near_term": return ["saving","ready","waiting_sale"].includes(item.status);
    case "future":    return ["researching","waiting_finances"].includes(item.status);
    case "luxury":    return ["luxury","dream"].includes(item.type);
    case "purchased": return item.status === "purchased";
    case "paused":    return ["paused","no_longer_wanted"].includes(item.status);
    default: return true;
  }
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function BIFLPage() {
  const rawRef = useRef<DashData>({});
  const [data, setData] = useState<BIFLData>(seedData());
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const statusTimer = useRef<ReturnType<typeof setTimeout>>();

  // UI state
  const [view, setView] = useState<ViewFilter>("all");
  const [drawerItem, setDrawerItem] = useState<BIFLItem | "new" | null>(null);
  const [search, setSearch] = useState("");
  const [filterArea, setFilterArea] = useState<PurchaseArea | "">("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterType, setFilterType] = useState<PurchaseType | "">("");
  const [sortBy, setSortBy] = useState<"priority" | "price" | "readiness" | "date" | "name">("priority");

  // Financial context from shared data
  const [checkingBalance, setCheckingBalance] = useState<number | null>(null);
  const [moneyGoals, setMoneyGoals] = useState<{ name: string; current: number; target: number; done: boolean }[]>([]);

  // ── Persist ────────────────────────────────────────────────────────────

  const save = useCallback((d: BIFLData) => {
    const newData = { ...rawRef.current, bifl: d };
    rawRef.current = newData;
    setSaveStatus("saving");
    fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data: newData }) })
      .then(r => r.ok ? setSaveStatus("saved") : setSaveStatus("error"))
      .catch(() => setSaveStatus("error"))
      .finally(() => { clearTimeout(statusTimer.current); statusTimer.current = setTimeout(() => setSaveStatus("idle"), 2200); });
  }, []);

  const update = useCallback((fn: (p: BIFLData) => BIFLData) => {
    setData(prev => { const next = fn(prev); save(next); return next; });
  }, [save]);

  // ── Load ───────────────────────────────────────────────────────────────

  useEffect(() => {
    fetch("/api/data").then(r => r.json()).then(({ data: d }) => {
      rawRef.current = d ?? {};
      // Load BIFL data
      const saved = d?.bifl as BIFLData | undefined;
      if (saved) setData({ ...seedData(), ...saved, categories: saved.categories ?? DEFAULT_CATEGORIES });
      // Read-only financial context
      if (d?.finances?.currentBalance != null) setCheckingBalance(d.finances.currentBalance as number);
      if (d?.moneyPlan?.goals) setMoneyGoals(d.moneyPlan.goals as { name: string; current: number; target: number; done: boolean }[]);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  // ── Item CRUD ──────────────────────────────────────────────────────────

  const addItem = (form: Omit<BIFLItem, "id" | "createdAt" | "order">) => {
    update(p => ({ ...p, items: [...p.items, { ...form, id: crypto.randomUUID(), createdAt: todayStr(), order: p.items.length }] }));
    setDrawerItem(null);
  };

  const editItem = (id: string, form: Omit<BIFLItem, "id" | "createdAt" | "order">) => {
    update(p => ({ ...p, items: p.items.map(i => i.id === id ? { ...i, ...form } : i) }));
    setDrawerItem(null);
  };

  const deleteItem = (id: string) => update(p => ({ ...p, items: p.items.filter(i => i.id !== id) }));

  // ── Filter + sort ──────────────────────────────────────────────────────

  const PRIORITY_ORDER: Record<PurchasePriority, number> = { high: 0, medium: 1, low: 2 };
  const STATUS_ORDER: Record<PurchaseStatus, number> = { ready: 0, saving: 1, waiting_sale: 2, waiting_finances: 3, researching: 4, paused: 5, no_longer_wanted: 6, purchased: 7 };

  const visible = useMemo(() => {
    let items = data.items.filter(i => itemMatchesView(i, view));
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(i => i.name.toLowerCase().includes(q) || i.brand.toLowerCase().includes(q) || i.category.toLowerCase().includes(q) || i.researchNotes.toLowerCase().includes(q));
    }
    if (filterArea)     items = items.filter(i => i.area === filterArea);
    if (filterCategory) items = items.filter(i => i.category === filterCategory);
    if (filterType)     items = items.filter(i => i.type === filterType);

    return [...items].sort((a, b) => {
      if (sortBy === "priority") { const pd = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]; return pd !== 0 ? pd : STATUS_ORDER[a.status] - STATUS_ORDER[b.status]; }
      if (sortBy === "price")    return activePrice(b) - activePrice(a);
      if (sortBy === "readiness")return readinessScore(b.readiness) - readinessScore(a.readiness);
      if (sortBy === "date")     return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
      if (sortBy === "name")     return a.name.localeCompare(b.name);
      return 0;
    });
  }, [data.items, view, search, filterArea, filterCategory, filterType, sortBy]);

  // ── Render ─────────────────────────────────────────────────────────────

  if (loading) return <div className="page" style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-3)" }}>Loading…</div>;

  const hasFilters = !!(search || filterArea || filterCategory || filterType);

  return (
    <div className="page">
      {/* Header */}
      <div style={{ marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "4px" }}>
          <h1 style={{ margin: 0, fontSize: "20px", fontWeight: 600, color: "var(--text)" }}>Buy It For Life</h1>
          <span style={{ fontSize: "11px", color: "var(--text-3)", background: "var(--surface-raised)", padding: "3px 8px", borderRadius: "5px" }}>
            {saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? "Saved ✓" : saveStatus === "error" ? "Error" : ""}
          </span>
        </div>
        <p style={{ margin: 0, fontSize: "13px", color: "var(--text-3)" }}>Plan quality investments thoughtfully. Research, wait for the right moment, and buy once.</p>
      </div>

      {/* Summary */}
      <SummaryBar items={data.items} />

      {/* Before You Buy */}
      {(view === "near_term" || view === "all") && (
        <BeforeYouBuyCard balance={checkingBalance} goals={moneyGoals} />
      )}

      {/* View tabs */}
      <div style={{ display: "flex", gap: "4px", marginBottom: "14px", flexWrap: "wrap" }}>
        {(Object.keys(VIEW_META) as ViewFilter[]).map(v => (
          <button key={v} onClick={() => setView(v)}
            style={{ background: view === v ? "var(--accent-dim)" : "var(--surface-raised)", color: view === v ? "var(--accent-text)" : "var(--text-3)", border: `1px solid ${view === v ? "var(--accent)" : "var(--border)"}`, borderRadius: "6px", padding: "6px 13px", fontSize: "12.5px", cursor: "pointer", fontFamily: "inherit" }}>
            {VIEW_META[v].label} {v !== "all" && `(${data.items.filter(i => itemMatchesView(i, v)).length})`}
          </button>
        ))}
        <button className="btn btn-primary" style={{ marginLeft: "auto", fontSize: "13px", display: "flex", alignItems: "center", gap: "5px" }} onClick={() => setDrawerItem("new")}>
          <PlusIcon /> Add Item
        </button>
      </div>

      {/* Filter bar */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "14px", alignItems: "center" }}>
        <input className="input" placeholder="Search items, brands, notes…" value={search} onChange={e => setSearch(e.target.value)} style={{ flex: "1 1 180px", maxWidth: "260px", fontSize: "13px" }} />
        <select className="input" value={filterArea} onChange={e => setFilterArea(e.target.value as PurchaseArea | "")} style={{ fontSize: "13px", width: "auto" }}>
          <option value="">All areas</option>
          {(Object.keys(AREA_META) as PurchaseArea[]).map(a => <option key={a} value={a}>{AREA_META[a].label}</option>)}
        </select>
        <select className="input" value={filterCategory} onChange={e => setFilterCategory(e.target.value)} style={{ fontSize: "13px", width: "auto" }}>
          <option value="">All categories</option>
          {data.categories.map(c => <option key={c}>{c}</option>)}
        </select>
        <select className="input" value={filterType} onChange={e => setFilterType(e.target.value as PurchaseType | "")} style={{ fontSize: "13px", width: "auto" }}>
          <option value="">All types</option>
          {(Object.keys(TYPE_META) as PurchaseType[]).map(t => <option key={t} value={t}>{TYPE_META[t].label}</option>)}
        </select>
        <select className="input" value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)} style={{ fontSize: "13px", width: "auto" }}>
          <option value="priority">Sort: Priority</option>
          <option value="readiness">Sort: Most Ready</option>
          <option value="price">Sort: Price</option>
          <option value="date">Sort: Newest</option>
          <option value="name">Sort: A–Z</option>
        </select>
        {hasFilters && <button className="btn btn-ghost" style={{ fontSize: "12px" }} onClick={() => { setSearch(""); setFilterArea(""); setFilterCategory(""); setFilterType(""); }}>Clear</button>}
      </div>

      {/* View description */}
      <p style={{ fontSize: "12.5px", color: "var(--text-3)", marginBottom: "12px" }}>{VIEW_META[view].description} · {visible.length} item{visible.length !== 1 ? "s" : ""}</p>

      {/* Item list */}
      {visible.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "40px 20px" }}>
          <p style={{ color: "var(--text-3)", margin: "0 0 12px" }}>{hasFilters ? "No items match your filters." : "Nothing here yet."}</p>
          {!hasFilters && <button className="btn btn-primary" onClick={() => setDrawerItem("new")}>Add your first investment piece</button>}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {visible.map(item => (
            <ItemCard key={item.id} item={item} onEdit={() => setDrawerItem(item)} onDelete={() => deleteItem(item.id)} />
          ))}
        </div>
      )}

      {/* Drawer */}
      {drawerItem !== null && (
        <ItemDrawer
          item={drawerItem === "new" ? {} : drawerItem}
          categories={data.categories}
          onClose={() => setDrawerItem(null)}
          onSave={form => drawerItem === "new" ? addItem(form) : editItem((drawerItem as BIFLItem).id, form)}
        />
      )}
    </div>
  );
}
