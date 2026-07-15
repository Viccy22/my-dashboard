"use client";

import { useEffect, useCallback, useRef, useMemo, useState } from "react";

// ── Types ──────────────────────────────────────────────────────────────────────

type Goal = {
  id: string; name: string; target: number; current: number;
  done: boolean; paused: boolean; notes?: string; creditScoreGate?: number;
};

type SinkingBucket = {
  id: string; name: string; annual: number; current: number;
  eventDate?: string; paused: boolean;
};

type ContribYear = { year: number; hsa: number; roth: number };

type DebtAccount = { id: string; name: string; balance: number; apr: number; type: string };

type Settings = {
  buffer: number;
  sinkingMonthly: number; studentLoanMonthly: number; hsaMonthly: number;
  takehomePre: number; takehomePost: number;
  paydayAnchor: string; pivotDate: string;
  hsaAnnualLimit: number; rothAnnualLimit: number;
  efTarget: number; survivalMonthly: number; discretionaryMonthly: number;
};

type MoneyPlanData = {
  settings: Settings;
  goals: Goal[];
  sinkingBuckets: SinkingBucket[];
  sinkingPoolBalance: number;
  hsaBalance: number; rothBalance: number;
  contributions: ContribYear[];
  moveDone: Record<string, boolean>;
};

type DashData = { moneyPlan?: MoneyPlanData; [k: string]: unknown };
type SaveStatus = "idle" | "saving" | "saved" | "error";

// ── Defaults ───────────────────────────────────────────────────────────────────

const DEFAULT_SETTINGS: Settings = {
  buffer: 1500, sinkingMonthly: 512, studentLoanMonthly: 281, hsaMonthly: 200,
  takehomePre: 1540, takehomePost: 1368.15,
  paydayAnchor: "2026-07-01", pivotDate: "2026-09-01",
  hsaAnnualLimit: 4300, rothAnnualLimit: 7000,
  efTarget: 5610, survivalMonthly: 935, discretionaryMonthly: 350,
};

const DEFAULT_GOALS: Goal[] = [
  { id: "starter_ef",    name: "Starter Emergency Fund",    target: 3000,  current: 0, done: false, paused: false },
  { id: "water_heater",  name: "Water Heater Replacement",  target: 1800,  current: 0, done: false, paused: false },
  { id: "ac_cushion",    name: "AC Cash Cushion",           target: 4000,  current: 0, done: false, paused: false },
  { id: "core_ef",       name: "Core Emergency Fund",       target: 5610,  current: 0, done: false, paused: false, notes: "6-month survival cushion. Optional: $8,700 includes sinking costs." },
  { id: "rav4_down",     name: "RAV4 Down Payment",         target: 5000,  current: 0, done: false, paused: false, creditScoreGate: 700, notes: "Requires credit score ≥700 (~Feb 2027)" },
  { id: "rav4_mods",     name: "RAV4 Mods Fund",            target: 4000,  current: 0, done: false, paused: false },
  { id: "roth_ira",      name: "Roth IRA",                  target: 7000,  current: 0, done: false, paused: false, notes: "Annual cap — resets Jan 1. Max $7,000/yr." },
  { id: "home_projects", name: "Extra Loan / Home Projects", target: 5000, current: 0, done: false, paused: false, notes: "Fridge, washer/dryer, fans, flooring. Update target as needed." },
];

const DEFAULT_DEBTS: DebtAccount[] = [
  { id: "dbt1", name: "Capital One Platinum",    balance: 687.65,   apr: 28.99, type: "credit_card" },
  { id: "dbt2", name: "Capital One Venture",     balance: 2059.45,  apr: 28.49, type: "credit_card" },
  { id: "dbt3", name: "Capital One Savor",       balance: 2889.35,  apr: 28.24, type: "credit_card" },
  { id: "dbt4", name: "Capital One Quicksilver", balance: 989.41,   apr: 26.49, type: "credit_card" },
  { id: "dbt5", name: "Ollo",                    balance: 6027.98,  apr: 27.99, type: "credit_card" },
  { id: "dbt6", name: "Care Credit",             balance: 2269.59,  apr: 33,    type: "credit_card" },
];

const DEFAULT_SINKING: SinkingBucket[] = [
  { id: "bonnaroo",     name: "Bonnaroo (supplies + boarding)", annual: 1700, current: 0, eventDate: "2027-06-01", paused: false },
  { id: "okeechobee",   name: "Okeechobee (supplies + boarding)", annual: 1150, current: 0, eventDate: "2027-03-01", paused: false },
  { id: "cruise",       name: "Annual Cruise",                  annual: 1200, current: 0, paused: false },
  { id: "zorro_well",   name: "Zorro Senior Wellness",          annual: 600,  current: 0, paused: false },
  { id: "magic_suite",  name: "Magic Suite Nights (2–3×/yr)",  annual: 750,  current: 0, paused: false },
  { id: "disney_party", name: "Disney Halloween + Christmas",   annual: 300,  current: 0, paused: false },
  { id: "petfolk",      name: "Zorro Petfolk Subscription",     annual: 200,  current: 0, eventDate: "2027-02-01", paused: false },
  { id: "cody_shots",   name: "Cody's Shots",                   annual: 150,  current: 0, eventDate: "2027-06-01", paused: false },
  { id: "car_tag",      name: "Car Tag / Registration",         annual: 90,   current: 0, paused: false },
];

function seedPlan(): MoneyPlanData {
  return {
    settings: DEFAULT_SETTINGS,
    goals: DEFAULT_GOALS,
    sinkingBuckets: DEFAULT_SINKING,
    sinkingPoolBalance: 0, hsaBalance: 0, rothBalance: 0,
    contributions: [],
    moveDone: {},
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function todayStr() { return new Date().toISOString().slice(0, 10); }

function addDays(d: string, n: number): string {
  const dt = new Date(d + "T00:00:00"); dt.setDate(dt.getDate() + n);
  return dt.toISOString().slice(0, 10);
}

function fmtDate(s: string) {
  return new Date(s + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fmtDateFull(s: string) {
  return new Date(s + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmt$(n: number, sign = false) {
  const abs = Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (sign && n > 0) return `+$${abs}`;
  return (n < 0 ? "-$" : "$") + abs;
}

function uid() { return Math.random().toString(36).slice(2, 9); }

function isPayday(date: string, anchor: string): boolean {
  const a = new Date(anchor + "T00:00:00");
  const d = new Date(date + "T00:00:00");
  const diff = Math.round((d.getTime() - a.getTime()) / 86400000);
  return diff >= 0 && diff % 14 === 0;
}

// Compute next N paydays from anchor at or after fromDate
function nextPaydays(anchor: string, from: string, count: number): string[] {
  const result: string[] = [];
  let cur = anchor;
  // walk anchor forward to first date >= from
  while (cur < from) cur = addDays(cur, 14);
  // also walk back in case anchor is in past
  if (cur > from) {
    // find first payday >= from
    let t = anchor;
    const a = new Date(anchor + "T00:00:00");
    const f = new Date(from + "T00:00:00");
    const diff = Math.round((f.getTime() - a.getTime()) / 86400000);
    const steps = Math.ceil(diff / 14);
    t = addDays(anchor, steps * 14);
    if (t < from) t = addDays(t, 14);
    cur = t;
  }
  while (result.length < count) { result.push(cur); cur = addDays(cur, 14); }
  return result;
}

// Which calendar months have 3 paydays given an anchor?
function threePaycheckMonths(anchor: string, from: string, months: number): string[] {
  const result: string[] = [];
  const end = addDays(from, months * 30);
  const pays = nextPaydays(anchor, from, months * 3);
  const byMonth: Record<string, number> = {};
  for (const p of pays) {
    if (p > end) break;
    const key = p.slice(0, 7);
    byMonth[key] = (byMonth[key] ?? 0) + 1;
  }
  for (const [k, v] of Object.entries(byMonth)) if (v >= 3) result.push(k);
  return result.sort();
}

// ── Forward projection ────────────────────────────────────────────────────────

type ProjectedState = {
  goals: Goal[];
  debts: DebtAccount[];
  contributions: ContribYear[];
  paychecksSimulated: number;
  monthsSimulated: number;
};

function projectStateToDate(
  targetDate: string, today: string,
  settings: Settings, goals: Goal[], debts: DebtAccount[],
  contributions: ContribYear[], financeItems: FinanceItem[],
): ProjectedState {
  const daysBetween = Math.round((new Date(targetDate + "T00:00:00").getTime() - new Date(today + "T00:00:00").getTime()) / 86400000);
  if (daysBetween <= 0) return { goals, debts, contributions, paychecksSimulated: 0, monthsSimulated: 0 };

  let projGoals = goals.map(g => ({ ...g }));
  let projDebts = debts.map(d => ({ ...d }));
  let projContribs = contributions.map(c => ({ ...c }));

  // Get all paydays between today (exclusive) and targetDate (exclusive)
  const pays = nextPaydays(settings.paydayAnchor, addDays(today, 1), Math.ceil(daysBetween / 7) + 2)
    .filter(p => p > today && p < targetDate);

  let paychecksSimulated = 0;
  const monthsSeen = new Set<string>();
  const layerADoneThisMonth = new Set<string>(); // track monthly Layer A per month

  for (const payday of pays) {
    const isPost = payday >= settings.pivotDate;
    const take = isPost ? settings.takehomePost : settings.takehomePre;
    const moKey = payday.slice(0, 7);
    monthsSeen.add(moKey);
    paychecksSimulated++;

    // Bills between this payday and the next payday (exclusive)
    const nextPay = addDays(payday, 14);
    const billsAmt = billsBetween(financeItems, payday, nextPay < targetDate ? addDays(nextPay, -1) : addDays(targetDate, -1))
      .reduce((s, b) => s + b.amount, 0);

    let rem = Math.max(0, take - billsAmt);

    // Layer A — monthly items, only charge once per month
    if (isPost && !layerADoneThisMonth.has(moKey)) {
      layerADoneThisMonth.add(moKey);
      const sinkAmt = Math.min(rem, settings.sinkingMonthly); rem -= sinkAmt;
      const nlAmt = Math.min(rem, settings.studentLoanMonthly); rem -= nlAmt;
      const starterDone = projGoals.find(g => g.id === "starter_ef")?.done ?? false;
      if (starterDone && rem > 0) {
        const yr = parseInt(moKey.slice(0, 4));
        const c = projContribs.find(x => x.year === yr) ?? { year: yr, hsa: 0, roth: 0 };
        const hsaRoom = Math.max(0, settings.hsaAnnualLimit - c.hsa);
        const hsaAmt = Math.min(rem, settings.hsaMonthly, hsaRoom);
        if (hsaAmt > 0) {
          const exists = projContribs.find(x => x.year === yr);
          if (exists) projContribs = projContribs.map(x => x.year === yr ? { ...x, hsa: x.hsa + hsaAmt } : x);
          else projContribs = [...projContribs, { year: yr, hsa: hsaAmt, roth: 0 }];
          rem -= hsaAmt;
        }
      }
    }

    // Subtract discretionary (rough)
    rem = Math.max(0, rem - settings.discretionaryMonthly / 2); // half per paycheck

    if (!isPost) {
      // Pre-pivot: pay down cards by APR desc
      const cards = [...projDebts].filter(d => d.type === "credit_card" && d.balance > 0).sort((a, b) => b.apr - a.apr);
      for (const card of cards) {
        if (rem <= 0) break;
        const pay = Math.min(rem, card.balance);
        projDebts = projDebts.map(d => d.id === card.id ? { ...d, balance: Math.max(0, d.balance - pay) } : d);
        rem -= pay;
      }
    } else {
      // Post-pivot: Layer B goal waterfall
      const active = projGoals.filter(g => !g.done && !g.paused);
      for (const g of active) {
        if (rem <= 0) break;
        const needed = g.target - g.current;
        const pay = Math.min(rem, needed);
        projGoals = projGoals.map(x => x.id === g.id ? { ...x, current: x.current + pay, done: x.current + pay >= x.target } : x);
        rem -= pay;
      }
      // Any remainder → Roth
      if (rem > 0) {
        const yr = parseInt(moKey.slice(0, 4));
        const c = projContribs.find(x => x.year === yr) ?? { year: yr, hsa: 0, roth: 0 };
        const rothRoom = Math.max(0, settings.rothAnnualLimit - c.roth);
        const rothAmt = Math.min(rem, rothRoom);
        if (rothAmt > 0) {
          const exists = projContribs.find(x => x.year === yr);
          if (exists) projContribs = projContribs.map(x => x.year === yr ? { ...x, roth: x.roth + rothAmt } : x);
          else projContribs = [...projContribs, { year: yr, hsa: 0, roth: rothAmt }];
        }
      }
    }
  }

  return { goals: projGoals, debts: projDebts, contributions: projContribs, paychecksSimulated, monthsSimulated: monthsSeen.size };
}

// ── Finance item schedule helpers ─────────────────────────────────────────────

type FinanceItem = {
  id: string; name: string; amount: number; active: boolean;
  startDate?: string; endDate?: string;
  schedule: { type: string; dayOfMonth?: number; dayOfWeek?: number; anchorDate?: string; date?: string; month?: number; day?: number };
};

function billAppliesToDate(item: FinanceItem, dateStr: string): boolean {
  if (!item.active) return false;
  if (item.startDate && dateStr < item.startDate) return false;
  if (item.endDate && dateStr > item.endDate) return false;
  const d = new Date(dateStr + "T00:00:00");
  const s = item.schedule;
  switch (s.type) {
    case "monthly":  return d.getDate() === s.dayOfMonth;
    case "weekly":   return d.getDay() === s.dayOfWeek;
    case "biweekly": {
      if (!s.anchorDate) return false;
      const anchor = new Date(s.anchorDate + "T00:00:00");
      const diff = Math.round((d.getTime() - anchor.getTime()) / 86400000);
      return diff >= 0 && diff % 14 === 0;
    }
    case "yearly": return (d.getMonth() + 1) === s.month && d.getDate() === s.day;
    case "once":   return dateStr === s.date;
    default:       return false;
  }
}

function billsBetween(items: FinanceItem[], fromDate: string, toDate: string): { date: string; name: string; amount: number }[] {
  const results: { date: string; name: string; amount: number }[] = [];
  const from = new Date(fromDate + "T00:00:00");
  const to   = new Date(toDate   + "T00:00:00");
  for (let cur = new Date(from); cur <= to; cur.setDate(cur.getDate() + 1)) {
    const ds = cur.toISOString().slice(0, 10);
    for (const item of items) {
      if (item.amount < 0 && billAppliesToDate(item, ds)) {
        results.push({ date: ds, name: item.name, amount: Math.abs(item.amount) });
      }
    }
  }
  return results;
}

type SweepLine = { name: string; amount: number; type: "buffer" | "layerA" | "goal" | "extra"; warn?: boolean };

function sweepBalance(
  balance: number, settings: Settings, goals: Goal[],
  contributions: ContribYear[], today: string, debtAccounts: DebtAccount[] = [],
  billsReserved = 0,
): SweepLine[] {
  const isPivot = today >= settings.pivotDate;
  const surplus = balance - settings.buffer - billsReserved;
  const lines: SweepLine[] = [{ name: "Checking buffer (floor)", amount: settings.buffer, type: "buffer" }];
  if (billsReserved > 0) lines.push({ name: "Reserved — bills before next paycheck", amount: billsReserved, type: "buffer" });
  if (surplus <= 0) return lines;

  let rem = surplus;

  if (!isPivot) {
    // Pre-pivot: cascade through cards by APR descending, capped at each balance
    const cards = [...debtAccounts]
      .filter(d => d.type === "credit_card" && d.balance > 0)
      .sort((a, b) => b.apr - a.apr);
    for (const card of cards) {
      if (rem <= 0) break;
      const amt = Math.min(rem, card.balance);
      lines.push({ name: `Pay down ${card.name} (${card.apr}% APR)`, amount: amt, type: "layerA" });
      rem -= amt;
    }
    if (rem > 0) lines.push({ name: "All cards paid — move to HYSA savings cushion", amount: rem, type: "goal" });
    return lines;
  }

  // Layer A
  if (rem > 0) {
    const amt = Math.min(rem, settings.sinkingMonthly);
    lines.push({ name: "Sinking Funds → HYSA", amount: amt, type: "layerA" });
    rem -= amt;
  }
  if (rem > 0) {
    const amt = Math.min(rem, settings.studentLoanMonthly);
    lines.push({ name: "Student Loan → Nelnet (captures 6% match)", amount: amt, type: "layerA", warn: amt < settings.studentLoanMonthly });
    rem -= amt;
  }
  // HSA only if starter EF done
  const starterDone = goals.find(g => g.id === "starter_ef")?.done ?? false;
  if (starterDone && rem > 0) {
    const year = parseInt(today.slice(0, 4));
    const contrib = contributions.find(c => c.year === year);
    const hsaUsed = contrib?.hsa ?? 0;
    const hsaRoom = Math.max(0, settings.hsaAnnualLimit - hsaUsed);
    const amt = Math.min(rem, settings.hsaMonthly, hsaRoom);
    if (amt > 0) { lines.push({ name: `HSA Contribution ($${hsaRoom.toLocaleString()} remaining this year)`, amount: amt, type: "layerA" }); rem -= amt; }
  }

  // Layer B: goal waterfall
  const active = goals.filter(g => !g.done && !g.paused);
  for (const g of active) {
    if (rem <= 0) break;
    const needed = g.target - g.current;
    if (needed <= 0) continue;
    const amt = Math.min(rem, needed);
    lines.push({ name: g.name, amount: amt, type: "goal" });
    rem -= amt;
  }

  if (rem > 0) {
    const year = parseInt(today.slice(0, 4));
    const contrib = contributions.find(c => c.year === year);
    const rothUsed = contrib?.roth ?? 0;
    const rothRoom = Math.max(0, settings.rothAnnualLimit - rothUsed);
    if (rothRoom > 0) {
      const amt = Math.min(rem, rothRoom);
      lines.push({ name: `Roth IRA ($${rothRoom.toLocaleString()} remaining this year)`, amount: amt, type: "extra" });
      rem -= amt;
    }
    if (rem > 0) lines.push({ name: "Roth IRA maxed — consider taxable brokerage or extra mortgage payment", amount: rem, type: "extra" });
  }
  return lines;
}

function daysUntil(date: string, from: string): number {
  return Math.round((new Date(date + "T00:00:00").getTime() - new Date(from + "T00:00:00").getTime()) / 86400000);
}

// ── Icons ──────────────────────────────────────────────────────────────────────

const ChevronUp = () => <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 9l4.5-5 4.5 5"/></svg>;
const ChevronDown = () => <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 4l4.5 5 4.5-5"/></svg>;
const XIcon = () => <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M2 2l9 9M11 2l-9 9"/></svg>;
const CheckIcon = () => <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 7l3.5 3.5L11 3"/></svg>;
const PlusIcon = () => <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M6.5 2v9M2 6.5h9"/></svg>;
const AlertIcon = () => <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6.5 1.5l5.5 9.5H1L6.5 1.5z" strokeLinejoin="round"/><path d="M6.5 5.5v3" strokeLinecap="round"/><circle cx="6.5" cy="9.5" r=".5" fill="currentColor" stroke="none"/></svg>;

// ── Inline editor ──────────────────────────────────────────────────────────────

function InlineEdit({ value, onSave, prefix = "$", style }: {
  value: number; onSave: (v: number) => void; prefix?: string; style?: React.CSSProperties;
}) {
  const [editing, setEditing] = useState(false);
  const [raw, setRaw] = useState("");
  if (editing) return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
      <input autoFocus className="input" type="number" step="0.01" value={raw}
        onChange={e => setRaw(e.target.value)} style={{ width: "100px", padding: "2px 7px", fontSize: "13px" }}
        onKeyDown={e => { if (e.key === "Enter") { onSave(parseFloat(raw) || 0); setEditing(false); } if (e.key === "Escape") setEditing(false); }} />
      <button className="btn-icon" onClick={() => { onSave(parseFloat(raw) || 0); setEditing(false); }}><CheckIcon /></button>
      <button className="btn-icon" onClick={() => setEditing(false)}><XIcon /></button>
    </span>
  );
  return (
    <span style={{ cursor: "pointer", borderBottom: "1px dashed var(--border-strong)", ...style }}
      onClick={() => { setRaw(String(value)); setEditing(true); }}>
      {prefix}{value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </span>
  );
}

function InlineTextEdit({ value, onSave, style }: { value: string; onSave: (v: string) => void; style?: React.CSSProperties }) {
  const [editing, setEditing] = useState(false);
  const [raw, setRaw] = useState("");
  if (editing) return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
      <input autoFocus className="input" type="text" value={raw}
        onChange={e => setRaw(e.target.value)} style={{ width: "180px", padding: "2px 7px", fontSize: "13px" }}
        onKeyDown={e => { if (e.key === "Enter") { onSave(raw); setEditing(false); } if (e.key === "Escape") setEditing(false); }} />
      <button className="btn-icon" onClick={() => { onSave(raw); setEditing(false); }}><CheckIcon /></button>
      <button className="btn-icon" onClick={() => setEditing(false)}><XIcon /></button>
    </span>
  );
  return (
    <span style={{ cursor: "pointer", borderBottom: "1px dashed var(--border-strong)", ...style }}
      onClick={() => { setRaw(value); setEditing(true); }}>{value}</span>
  );
}

// ── Progress bar ───────────────────────────────────────────────────────────────

function ProgressBar({ current, target, color = "var(--accent)" }: { current: number; target: number; color?: string }) {
  const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0;
  return (
    <div style={{ height: "5px", borderRadius: "99px", background: "var(--surface-overlay)", overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: "99px", transition: "width 0.3s" }} />
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function MoneyPlanPage() {
  const rawRef = useRef<DashData>({});
  const [plan, setPlan] = useState<MoneyPlanData>(seedPlan());
  const [debtAccounts, setDebtAccounts] = useState<DebtAccount[]>(DEFAULT_DEBTS);
  const [financeItems, setFinanceItems] = useState<FinanceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const statusTimer = useRef<ReturnType<typeof setTimeout>>();

  // Which section tab is showing (phase/warning banners above stay always visible)
  const [tab, setTab] = useState<"today" | "planning" | "settings">("today");

  // ── Load ───────────────────────────────────────────────────────────────────

  useEffect(() => {
    fetch("/api/data").then(r => r.json()).then(({ data }) => {
      rawRef.current = data ?? {};
      // Load recurring bill items for upcoming-bills calculation
      const items = (data?.finances?.items ?? []) as FinanceItem[];
      if (items.length) setFinanceItems(items);
      // Load CC balances — merge DB data over defaults so saved balances win
      const dbAccounts = (data?.finances?.debt?.accounts ?? []) as DebtAccount[];
      if (dbAccounts.length) {
        setDebtAccounts(DEFAULT_DEBTS.map(d => {
          const found = dbAccounts.find(a => a.id === d.id);
          return found ? { ...d, balance: found.balance } : d;
        }));
      }
      const saved = data?.moneyPlan as MoneyPlanData | undefined;
      if (saved) {
        // Migrate: ensure new fields exist
        const goals = saved.goals ?? DEFAULT_GOALS;
        const sinking = saved.sinkingBuckets ?? DEFAULT_SINKING;
        setPlan({
          ...seedPlan(),
          ...saved,
          goals,
          sinkingBuckets: sinking,
          settings: { ...DEFAULT_SETTINGS, ...(saved.settings ?? {}) },
        });
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  // ── Save ───────────────────────────────────────────────────────────────────

  const save = useCallback((updated: MoneyPlanData) => {
    const newData = { ...rawRef.current, moneyPlan: updated };
    rawRef.current = newData;
    setStatus("saving");
    fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data: newData }) })
      .then(r => r.ok ? setStatus("saved") : setStatus("error"))
      .catch(() => setStatus("error"))
      .finally(() => {
        clearTimeout(statusTimer.current);
        statusTimer.current = setTimeout(() => setStatus("idle"), 2200);
      });
  }, []);

  const update = useCallback((fn: (p: MoneyPlanData) => MoneyPlanData) => {
    setPlan(prev => { const next = fn(prev); save(next); return next; });
  }, [save]);

  const updateDebtBalance = useCallback((id: string, newBalance: number) => {
    setDebtAccounts(prev => {
      const updated = prev.map(d => d.id === id ? { ...d, balance: newBalance } : d);
      // Write back to the shared finances data blob
      const finances = rawRef.current.finances as ({ debt?: { accounts: unknown[] } } | undefined);
      const newData = {
        ...rawRef.current,
        finances: { ...(finances ?? {}), debt: { accounts: updated } },
      };
      rawRef.current = newData;
      setStatus("saving");
      fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data: newData }) })
        .then(r => r.ok ? setStatus("saved") : setStatus("error"))
        .catch(() => setStatus("error"))
        .finally(() => { clearTimeout(statusTimer.current); statusTimer.current = setTimeout(() => setStatus("idle"), 2200); });
      return updated;
    });
  }, []);

  // ── Derived ────────────────────────────────────────────────────────────────

  const today = useMemo(() => todayStr(), []);
  const isPivot = today >= plan.settings.pivotDate;

  const upcomingPaydays = useMemo(() => nextPaydays(plan.settings.paydayAnchor, today, 6), [plan.settings.paydayAnchor, today]);
  const nextPayday = upcomingPaydays[0];

  // Show all bills for the rest of the current month
  const upcomingBills = useMemo(() => {
    const d = new Date(today + "T00:00:00");
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    const toDate = lastDay.toISOString().slice(0, 10);
    return billsBetween(financeItems, today, toDate);
  }, [financeItems, today]);

  // Only reserve bills that hit BEFORE the next paycheck (exclusive)
  const billsReserved = useMemo(() => {
    if (!nextPayday) return 0;
    const dayBefore = new Date(nextPayday + "T00:00:00");
    dayBefore.setDate(dayBefore.getDate() - 1);
    const toDate = dayBefore.toISOString().slice(0, 10);
    return billsBetween(financeItems, today, toDate).reduce((s, b) => s + b.amount, 0);
  }, [financeItems, today, nextPayday]);

  const billsTotal = billsReserved;
  const nextPaydayDays = daysUntil(nextPayday, today);

  const accelMonths = useMemo(() => threePaycheckMonths(plan.settings.paydayAnchor, today, 18), [plan.settings.paydayAnchor, today]);

  const activeGoal = useMemo(() => plan.goals.find(g => !g.done && !g.paused), [plan.goals]);

  const year = parseInt(today.slice(0, 4));
  const yearContrib = plan.contributions.find(c => c.year === year) ?? { year, hsa: 0, roth: 0 };

  // Estimated monthly surplus for goal contributions
  const estMonthlyGoalAmt = useMemo(() => {
    if (!isPivot) return 0;
    const take = plan.settings.takehomePost * 2;
    const layerA = plan.settings.sinkingMonthly + plan.settings.studentLoanMonthly +
      (plan.goals.find(g => g.id === "starter_ef")?.done ? plan.settings.hsaMonthly : 0);
    return Math.max(0, take - plan.settings.survivalMonthly - plan.settings.discretionaryMonthly - layerA);
  }, [isPivot, plan.settings, plan.goals]);

  // ── Sinking warnings ───────────────────────────────────────────────────────

  const sinkingWarnings = useMemo(() => {
    return plan.sinkingBuckets.filter(b => {
      if (!b.eventDate || b.paused) return false;
      const days = daysUntil(b.eventDate, today);
      if (days < 0 || days > 120) return false;
      const monthsLeft = days / 30;
      const monthlyNeeded = b.annual / 12;
      const stillNeeded = b.annual - b.current;
      const projectedSaved = b.current + monthlyNeeded * monthsLeft;
      return projectedSaved < b.annual * 0.9 && stillNeeded > 0;
    });
  }, [plan.sinkingBuckets, today]);

  // ── Today's moves ──────────────────────────────────────────────────────────

  const todayMoves = useMemo(() => {
    type Move = { id: string; label: string; amount: number; note?: string; warn?: boolean };
    const moves: Move[] = [];
    const isToday1st = today.slice(8) === "01";
    const isTodayPayday = isPayday(today, plan.settings.paydayAnchor) && today >= plan.settings.paydayAnchor;

    if (isTodayPayday || (nextPaydayDays <= 0)) {
      // Payday — show it for context
    }

    if (isPivot && isToday1st) {
      moves.push({ id: "sinking", label: "Transfer to Sinking Funds → HYSA", amount: plan.settings.sinkingMonthly });
      moves.push({ id: "nelnet", label: "Pay Nelnet student loan", amount: plan.settings.studentLoanMonthly, warn: false });
      const starterDone = plan.goals.find(g => g.id === "starter_ef")?.done ?? false;
      if (starterDone) {
        const hsaRoom = plan.settings.hsaAnnualLimit - yearContrib.hsa;
        if (hsaRoom > 0) moves.push({ id: "hsa", label: "Contribute to HSA", amount: Math.min(plan.settings.hsaMonthly, hsaRoom) });
      }
      if (activeGoal) {
        const surplus = estMonthlyGoalAmt;
        if (surplus > 0) {
          const amt = Math.min(surplus, activeGoal.target - activeGoal.current);
          if (amt > 0) moves.push({ id: "goal_" + activeGoal.id, label: `→ ${activeGoal.name}`, amount: amt, note: "Est. surplus after Layer A" });
        }
      }
    } else if (!isPivot && isToday1st) {
      moves.push({ id: "pre_card", label: "Pay down highest-APR card (CareCredit first)", amount: 0, note: "Amount = whatever is above your $1,500 buffer after expenses" });
    }

    return moves;
  }, [today, plan.settings, plan.goals, isPivot, activeGoal, estMonthlyGoalAmt, nextPaydayDays, yearContrib.hsa]);

  // ── Sweep state ────────────────────────────────────────────────────────────

  const [sweepInput, setSweepInput] = useState("");
  const sweepLines = useMemo(() => {
    const n = parseFloat(sweepInput);
    if (isNaN(n) || n <= 0) return null;
    return sweepBalance(n, plan.settings, plan.goals, plan.contributions, today, debtAccounts, billsTotal);
  }, [sweepInput, plan.settings, plan.goals, plan.contributions, today, debtAccounts, billsTotal]);

  // ── Settings edit state ────────────────────────────────────────────────────

  const [showSettings, setShowSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState<Settings>(plan.settings);
  useEffect(() => { setSettingsForm(plan.settings); }, [plan.settings]);

  // ── Goal editing ───────────────────────────────────────────────────────────

  const [addGoalOpen, setAddGoalOpen] = useState(false);
  const [newGoalForm, setNewGoalForm] = useState({ name: "", target: "" });

  // ── Sinking editing ────────────────────────────────────────────────────────

  const [addSinkOpen, setAddSinkOpen] = useState(false);
  const [newSinkForm, setNewSinkForm] = useState({ name: "", annual: "", eventDate: "" });

  // ── Found money ────────────────────────────────────────────────────────────

  const [foundMoneyInput, setFoundMoneyInput] = useState("");
  const [foundMoneyDate, setFoundMoneyDate] = useState("");
  const foundMoneyLines = useMemo(() => {
    const n = parseFloat(foundMoneyInput);
    if (isNaN(n) || n <= 0) return null;
    const useDate = foundMoneyDate || today;
    const d = new Date(useDate + "T00:00:00");
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    const monthEnd = lastDay.toISOString().slice(0, 10);
    const windfallBills = billsBetween(financeItems, useDate, monthEnd);
    const windfallReserved = windfallBills.reduce((s, b) => s + b.amount, 0);
    // If a future date is set, project forward to that date first
    const proj = foundMoneyDate && foundMoneyDate > today
      ? projectStateToDate(foundMoneyDate, today, plan.settings, plan.goals, debtAccounts, plan.contributions, financeItems)
      : null;
    const sweepGoals = proj?.goals ?? plan.goals;
    const sweepDebts = proj?.debts ?? debtAccounts;
    const sweepContribs = proj?.contributions ?? plan.contributions;
    return {
      lines: sweepBalance(n, plan.settings, sweepGoals, sweepContribs, useDate, sweepDebts, windfallReserved),
      bills: windfallBills, reserved: windfallReserved, useDate, proj,
    };
  }, [foundMoneyInput, foundMoneyDate, plan.settings, plan.goals, plan.contributions, today, debtAccounts, financeItems]);

  // ── Future money planner ───────────────────────────────────────────────────

  const [planDate, setPlanDate] = useState("");
  const [planAmount, setPlanAmount] = useState("");
  const futurePlanLines = useMemo(() => {
    const n = parseFloat(planAmount);
    if (isNaN(n) || n <= 0 || !planDate) return null;
    // Bills remaining in the month of that future date
    const d = new Date(planDate + "T00:00:00");
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    const monthEnd = lastDay.toISOString().slice(0, 10);
    const futureBills = billsBetween(financeItems, planDate, monthEnd);
    const futureReserved = futureBills.reduce((s, b) => s + b.amount, 0);
    return { lines: sweepBalance(n, plan.settings, plan.goals, plan.contributions, planDate, debtAccounts, futureReserved), bills: futureBills, reserved: futureReserved };
  }, [planDate, planAmount, plan.settings, plan.goals, plan.contributions, debtAccounts, financeItems]);

  // ── Student loan deferment ─────────────────────────────────────────────────

  const deferEndDate = "2028-11-27";
  const deferDays = daysUntil(deferEndDate, today);
  const showDeferAlert = deferDays > 0 && deferDays <= 210;

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) return <p className="empty" style={{ padding: "32px 0" }}>Loading…</p>;

  const s = plan.settings;

  return (
    <div style={{ maxWidth: "900px" }}>
      {status !== "idle" && (
        <div className={`toast${status === "error" ? " error" : ""}`}>
          {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : "Could not save — check connection."}
        </div>
      )}

      {/* ── Phase banner ────────────────────────────────────────────────────── */}
      {!isPivot ? (
        <div style={{ background: "var(--yellow-dim)", border: "1px solid rgba(251,191,36,0.2)", borderRadius: "8px", padding: "12px 16px", marginBottom: "16px", display: "flex", gap: "10px", alignItems: "flex-start" }}>
          <span style={{ color: "var(--yellow)", flexShrink: 0, marginTop: "1px" }}><AlertIcon /></span>
          <div>
            <span style={{ fontWeight: 600, color: "var(--yellow)", fontSize: "13px" }}>Phase 0 — Pre-Pivot</span>
            <span style={{ color: "var(--text-2)", fontSize: "12.5px" }}> · Cards still active. Keep $1,500 buffer, push every dollar above it to CareCredit (33% APR). Layer A commitments begin <strong>{fmtDateFull(s.pivotDate)}</strong>.</span>
          </div>
        </div>
      ) : (
        <div style={{ background: "var(--green-dim)", border: "1px solid rgba(74,222,128,0.15)", borderRadius: "8px", padding: "12px 16px", marginBottom: "16px" }}>
          <span style={{ fontWeight: 600, color: "var(--green)", fontSize: "13px" }}>Phase 1 — Post-Pivot active</span>
          <span style={{ color: "var(--text-2)", fontSize: "12.5px" }}> · 401k loan paid off cards. Take-home {fmt$(s.takehomePost)}/paycheck. Layer A commitments on.</span>
        </div>
      )}

      {/* ── Sinking warnings ────────────────────────────────────────────────── */}
      {sinkingWarnings.map(w => (
        <div key={w.id} style={{ background: "var(--red-dim)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: "8px", padding: "10px 16px", marginBottom: "10px", display: "flex", gap: "8px", alignItems: "center" }}>
          <span style={{ color: "var(--red)" }}><AlertIcon /></span>
          <span style={{ fontSize: "13px", color: "var(--text)" }}>
            <strong style={{ color: "var(--red)" }}>{w.name}</strong>: {fmtDateFull(w.eventDate!)} ({daysUntil(w.eventDate!, today)}d away) — {fmt$(w.current)} saved of {fmt$(w.annual)} target. Add {fmt$(Math.ceil((w.annual - w.current) / Math.max(1, daysUntil(w.eventDate!, today) / 14)))}/paycheck to catch up.
          </span>
        </div>
      ))}

      {/* ── Deferment alert ─────────────────────────────────────────────────── */}
      {showDeferAlert && (
        <div style={{ background: "var(--yellow-dim)", border: "1px solid rgba(251,191,36,0.2)", borderRadius: "8px", padding: "10px 16px", marginBottom: "10px" }}>
          <span style={{ color: "var(--yellow)", fontWeight: 600 }}>Student loan deferment ends {fmtDateFull(deferEndDate)}</span>
          <span style={{ color: "var(--text-2)", fontSize: "12.5px" }}> — {deferDays} days. Time to decide: pay off, income-driven plan, or standard payments. Interest may capitalize at deferment end.</span>
        </div>
      )}

      {/* ── Section tabs ── */}
      <div style={{ display: "flex", gap: "6px", marginBottom: "14px", flexWrap: "wrap" }}>
        {([
          { key: "today",    label: "Today & This Month" },
          { key: "planning", label: "Planning & Goals" },
          { key: "settings", label: "Limits & Settings" },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={tab === t.key ? "btn btn-primary" : "btn btn-secondary"}
            style={{ fontSize: "13px", padding: "6px 16px" }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "today" && (
      <div className="dash-grid dash-main-aside" style={{ gap: "16px" }}>

        {/* ── LEFT COLUMN ─────────────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* WHAT DO I MOVE TODAY */}
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <p className="card-title" style={{ margin: 0 }}>What do I move today?</p>
              <span style={{ fontSize: "12px", color: "var(--text-3)" }}>
                Next payday: <strong style={{ color: "var(--green)" }}>{fmtDate(nextPayday)}</strong>
                {nextPaydayDays === 0 ? " 🎉 Today!" : ` (${nextPaydayDays}d)`}
              </span>
            </div>

            {todayMoves.length === 0 ? (
              <div>
                <p style={{ fontSize: "13px", color: "var(--text-2)", marginBottom: "10px" }}>
                  {!isPivot
                    ? "No transfers due today. Check your balance above your $1,500 buffer and send any excess to CareCredit."
                    : "No monthly transfers are due today. Monthly moves happen on the 1st."}
                </p>
                {/* Show upcoming schedule */}
                <div style={{ background: "var(--surface-raised)", borderRadius: "6px", padding: "10px 14px" }}>
                  <p style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>Next payday: {fmtDate(nextPayday)}</p>
                  {upcomingPaydays.slice(0, 4).map((pd, i) => {
                    const mo = pd.slice(0, 7);
                    const isAccel = accelMonths.includes(mo);
                    return (
                      <div key={pd} style={{ fontSize: "12.5px", color: i === 0 ? "var(--green)" : "var(--text-3)", display: "flex", gap: "8px", padding: "2px 0" }}>
                        <span style={{ minWidth: "70px" }}>{fmtDate(pd)}</span>
                        <span>{fmt$(isPivot ? s.takehomePost : s.takehomePre)}</span>
                        {isAccel && <span style={{ color: "var(--yellow)", fontWeight: 600, fontSize: "11px" }}>⚡ 3-paycheck month</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {todayMoves.map(m => {
                  const key = `${today}-${m.id}`;
                  const done = plan.moveDone[key] ?? false;
                  return (
                    <div key={m.id} className="row" style={{ background: done ? "var(--surface-raised)" : "transparent", opacity: done ? 0.5 : 1, padding: "8px 10px", borderRadius: "6px" }}>
                      <input type="checkbox" className="checkbox" checked={done}
                        onChange={() => update(p => ({ ...p, moveDone: { ...p.moveDone, [key]: !done } }))} />
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: "13.5px", textDecoration: done ? "line-through" : "none" }}>{m.label}</span>
                        {m.note && <p style={{ fontSize: "11.5px", color: "var(--text-3)", margin: "2px 0 0" }}>{m.note}</p>}
                        {m.id === "nelnet" && <p style={{ fontSize: "11px", color: "var(--yellow)", margin: "2px 0 0" }}>⚠ Match-protected — never skip</p>}
                      </div>
                      {m.amount > 0 && <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600, fontSize: "14px", color: "var(--accent)" }}>{fmt$(m.amount)}</span>}
                    </div>
                  );
                })}
              </div>
            )}

            {/* 3-paycheck months preview */}
            {accelMonths.length > 0 && (
              <div style={{ marginTop: "12px", borderTop: "1px solid var(--border)", paddingTop: "10px" }}>
                <p style={{ fontSize: "11px", fontWeight: 600, color: "var(--yellow)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>⚡ Accelerator months (3 paychecks)</p>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {accelMonths.slice(0, 6).map(m => (
                    <span key={m} style={{ fontSize: "12px", padding: "2px 8px", background: "var(--yellow-dim)", color: "var(--yellow)", borderRadius: "4px", fontWeight: 500 }}>
                      {new Date(m + "-01T00:00:00").toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                    </span>
                  ))}
                </div>
                <p style={{ fontSize: "11.5px", color: "var(--text-3)", marginTop: "6px" }}>Extra {fmt$(isPivot ? s.takehomePost : s.takehomePre)} check → send to current top goal.</p>
              </div>
            )}
          </div>

          {/* DOLLAR SWEEP TOOL */}
          <div className="card">
            <p className="card-title">Dollar Sweep — Assign Every Dollar</p>
            <p style={{ fontSize: "12.5px", color: "var(--text-3)", marginBottom: "12px" }}>Enter your current checking balance to see exactly where it all goes.</p>

            {/* CC balance updater (pre-pivot only, or always visible if cards remain) */}
            {debtAccounts.filter(d => d.type === "credit_card" && d.balance > 0).length > 0 && (
              <details style={{ marginBottom: "14px" }}>
                <summary style={{ fontSize: "12px", color: "var(--text-3)", cursor: "pointer", userSelect: "none", padding: "4px 0" }}>
                  Update card balances <span style={{ color: "var(--text-3)", fontSize: "11px" }}>(click to expand)</span>
                </summary>
                <div style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "8px" }}>
                  {debtAccounts.filter(d => d.type === "credit_card").sort((a, b) => b.apr - a.apr).map(d => (
                    <div key={d.id} style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <span style={{ flex: 1, fontSize: "12.5px", color: "var(--text-2)" }}>{d.name} <span style={{ color: "var(--text-3)", fontSize: "11px" }}>({d.apr}% APR)</span></span>
                      <div style={{ display: "flex", alignItems: "center", background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: "6px", padding: "0 10px" }}>
                        <span style={{ color: "var(--text-3)", marginRight: "4px", fontSize: "12px" }}>$</span>
                        <input type="number" step="0.01" min="0"
                          defaultValue={d.balance.toFixed(2)}
                          onBlur={e => { const v = parseFloat(e.target.value); if (!isNaN(v) && v !== d.balance) updateDebtBalance(d.id, v); }}
                          onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                          style={{ background: "none", border: "none", outline: "none", color: "var(--text)", fontFamily: "inherit", fontSize: "13px", width: "90px" }} />
                      </div>
                      {d.balance === 0 && <span style={{ fontSize: "11px", color: "var(--green)" }}>✓ Paid</span>}
                    </div>
                  ))}
                  <p style={{ fontSize: "11px", color: "var(--text-3)", margin: 0 }}>Tab away or press Enter to save. Updates Bills &amp; Budget page too.</p>
                </div>
              </details>
            )}
            {/* Upcoming bills — always show full pay period */}
            <div style={{ background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: "6px", padding: "10px 14px", marginBottom: "14px" }}>
              <p style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-2)", margin: "0 0 6px" }}>
                Bills remaining this month
                {billsReserved > 0 && <span style={{ color: "var(--yellow)", marginLeft: "8px" }}>— {fmt$(billsReserved)} due before paycheck ({nextPayday})</span>}
              </p>
              {upcomingBills.length === 0 ? (
                <p style={{ fontSize: "12px", color: "var(--text-3)", margin: 0 }}>No bills found — make sure Bills &amp; Budget has loaded at least once.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                  {upcomingBills.map((b, i) => {
                    const beforePayday = nextPayday && b.date < nextPayday;
                    return (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                        <span style={{ color: beforePayday ? "var(--text)" : "var(--text-3)" }}>
                          {beforePayday && <span style={{ color: "var(--yellow)", marginRight: "4px" }}>⚠</span>}
                          {new Date(b.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })} — {b.name}
                        </span>
                        <span style={{ color: beforePayday ? "var(--red)" : "var(--text-3)" }}>−{fmt$(b.amount)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
              <p style={{ fontSize: "11px", color: "var(--text-3)", margin: "6px 0 0" }}>
                ⚠ = before next paycheck and reserved in sweep. Dimmed = after paycheck arrives.
              </p>
            </div>

            <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: "6px", padding: "0 12px", flex: "0 0 160px" }}>
                <span style={{ color: "var(--text-3)", marginRight: "4px" }}>$</span>
                <input type="number" step="0.01" placeholder="e.g. 4200.00"
                  style={{ background: "none", border: "none", outline: "none", color: "var(--text)", fontSize: "14px", width: "110px", fontFamily: "inherit" }}
                  value={sweepInput} onChange={e => setSweepInput(e.target.value)} />
              </div>
              {sweepInput && <button className="btn btn-ghost" style={{ fontSize: "12px" }} onClick={() => setSweepInput("")}>Clear</button>}
            </div>

            {sweepLines && (
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {sweepLines.map((l, i) => (
                  <div key={i} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "7px 12px", borderRadius: "6px",
                    background: l.type === "buffer" ? "var(--surface-raised)" : l.type === "layerA" ? "rgba(129,140,248,0.06)" : l.type === "goal" ? "var(--green-dim)" : "var(--yellow-dim)",
                  }}>
                    <div>
                      <span style={{ fontSize: "13px", color: l.type === "goal" ? "var(--green)" : l.type === "extra" ? "var(--yellow)" : "var(--text)" }}>
                        {l.type === "layerA" && "→ "}{l.type === "goal" && "⬡ "}{l.name}
                      </span>
                      {l.warn && <span style={{ marginLeft: "8px", fontSize: "11px", color: "var(--red)" }}>⚠ underfunded — match at risk</span>}
                    </div>
                    <span style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums", fontSize: "14px",
                      color: l.type === "buffer" ? "var(--text-3)" : l.type === "layerA" ? "var(--accent)" : l.type === "goal" ? "var(--green)" : "var(--yellow)" }}>
                      {fmt$(l.amount)}
                    </span>
                  </div>
                ))}
                <div style={{ borderTop: "1px solid var(--border)", marginTop: "6px", paddingTop: "6px", display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "12px", color: "var(--text-3)" }}>Total assigned</span>
                  <span style={{ fontWeight: 700, fontSize: "13px", color: "var(--text-2)" }}>{fmt$(sweepLines.reduce((a, l) => a + l.amount, 0))}</span>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* ── RIGHT COLUMN (tab: today) ───────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* LAYER A SUMMARY */}
          <div className="card">
            <p className="card-title">Layer A — Monthly Off-the-Top</p>
            {!isPivot && <p style={{ fontSize: "12px", color: "var(--text-3)", marginBottom: "8px" }}>Starts {fmtDateFull(s.pivotDate)}</p>}
            {[
              { label: "Sinking Funds → HYSA", amount: s.sinkingMonthly, note: "Pooled account" },
              { label: "Student Loan → Nelnet", amount: s.studentLoanMonthly, note: "Captures 6% 401k match — never skip", warn: true },
              { label: "HSA Contribution", amount: s.hsaMonthly, note: "After Starter EF funded" },
              { label: "Discretionary (stays in checking)", amount: s.discretionaryMonthly, note: "Personal $200 + fun $150 — not transferred" },
            ].map(item => (
              <div key={item.label} className="row" style={{ padding: "6px 8px" }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: "13px", color: item.warn ? "var(--yellow)" : "var(--text)" }}>{item.label}</span>
                  {item.note && <p style={{ fontSize: "11.5px", color: "var(--text-3)", margin: "1px 0 0" }}>{item.note}</p>}
                </div>
                <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600, color: "var(--accent)", fontSize: "13.5px" }}>{fmt$(item.amount)}</span>
              </div>
            ))}
          </div>

        </div>
      </div>
      )}

      {tab === "planning" && (
      <div className="dash-grid dash-main-aside" style={{ gap: "16px" }}>

        {/* ── LEFT COLUMN (tab: planning) ──────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* GOAL WATERFALL */}
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <p className="card-title" style={{ margin: 0 }}>Goal Waterfall — Layer B</p>
              <button className="btn btn-secondary" style={{ fontSize: "12px", padding: "4px 10px" }} onClick={() => setAddGoalOpen(true)}>
                <PlusIcon /> Add goal
              </button>
            </div>
            <p style={{ fontSize: "12px", color: "var(--text-3)", marginBottom: "12px" }}>Surplus fills these in order. Drag or use ▲▼ to reprioritize. Click any value to edit.</p>

            {estMonthlyGoalAmt > 0 && (
              <div style={{ fontSize: "12px", color: "var(--text-3)", marginBottom: "10px", padding: "6px 10px", background: "var(--surface-raised)", borderRadius: "5px" }}>
                Est. monthly surplus for goals: <strong style={{ color: "var(--text)" }}>{fmt$(estMonthlyGoalAmt)}</strong>
                <span style={{ color: "var(--text-3)" }}> (2 paychecks − survival − Layer A − discretionary)</span>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {plan.goals.map((g, idx) => {
                const pct = g.target > 0 ? Math.min(100, (g.current / g.target) * 100) : 0;
                const isActive = !g.done && !g.paused && idx === plan.goals.findIndex(x => !x.done && !x.paused);
                const monthsToFund = estMonthlyGoalAmt > 0 ? Math.ceil((g.target - g.current) / estMonthlyGoalAmt) : null;
                return (
                  <div key={g.id} style={{ padding: "12px 14px", borderRadius: "7px", border: `1px solid ${isActive ? "rgba(129,140,248,0.3)" : "var(--border)"}`, background: g.done ? "var(--surface-raised)" : isActive ? "rgba(129,140,248,0.05)" : "transparent", opacity: g.paused ? 0.5 : 1 }}>
                    <div style={{ display: "flex", gap: "8px", alignItems: "flex-start", marginBottom: g.done ? 0 : "8px" }}>
                      {/* Reorder */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px", flexShrink: 0 }}>
                        <button className="btn-icon" style={{ padding: "2px" }} onClick={() => update(p => { const a = [...p.goals]; if (idx > 0) { [a[idx-1], a[idx]] = [a[idx], a[idx-1]]; } return { ...p, goals: a }; })} disabled={idx === 0}><ChevronUp /></button>
                        <button className="btn-icon" style={{ padding: "2px" }} onClick={() => update(p => { const a = [...p.goals]; if (idx < a.length-1) { [a[idx], a[idx+1]] = [a[idx+1], a[idx]]; } return { ...p, goals: a }; })} disabled={idx === plan.goals.length - 1}><ChevronDown /></button>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
                          {isActive && <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--accent-text)", background: "var(--accent-dim)", padding: "1px 6px", borderRadius: "3px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Active</span>}
                          {g.done && <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--green)", background: "var(--green-dim)", padding: "1px 6px", borderRadius: "3px" }}>✓ Done</span>}
                          {g.paused && <span style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-3)", padding: "1px 6px", background: "var(--surface-overlay)", borderRadius: "3px" }}>Paused</span>}
                          {g.creditScoreGate && !g.done && <span style={{ fontSize: "10px", color: "var(--yellow)", padding: "1px 6px", background: "var(--yellow-dim)", borderRadius: "3px" }}>Score ≥{g.creditScoreGate} required</span>}
                          <span style={{ fontWeight: 600, fontSize: "13.5px", color: g.done ? "var(--text-3)" : "var(--text)" }}>
                            <InlineTextEdit value={g.name} onSave={v => update(p => ({ ...p, goals: p.goals.map(x => x.id === g.id ? { ...x, name: v } : x) }))} />
                          </span>
                        </div>
                        {g.notes && <p style={{ fontSize: "11.5px", color: "var(--text-3)", margin: "3px 0 0" }}>{g.notes}</p>}
                      </div>
                      {/* Actions */}
                      <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
                        {!g.done && <button className="btn-icon" title={g.paused ? "Resume" : "Pause"} onClick={() => update(p => ({ ...p, goals: p.goals.map(x => x.id === g.id ? { ...x, paused: !x.paused } : x) }))}>
                          {g.paused ? <span style={{ fontSize: "11px" }}>▶</span> : <span style={{ fontSize: "11px" }}>⏸</span>}
                        </button>}
                        {!g.done && <button className="btn-icon" title="Mark done" onClick={() => update(p => ({ ...p, goals: p.goals.map(x => x.id === g.id ? { ...x, done: true, current: x.target } : x) }))}><CheckIcon /></button>}
                        {g.done && <button className="btn-icon" title="Reopen goal" style={{ fontSize: "11px", color: "var(--text-3)" }} onClick={() => update(p => ({ ...p, goals: p.goals.map(x => x.id === g.id ? { ...x, done: false } : x) }))}>↩</button>}
                        <button className="btn-icon" title="Delete" onClick={() => { if (confirm(`Delete goal "${g.name}"?`)) update(p => ({ ...p, goals: p.goals.filter(x => x.id !== g.id) })); }}><XIcon /></button>
                      </div>
                    </div>

                    {!g.done && (
                      <>
                        <ProgressBar current={g.current} target={g.target} color={isActive ? "var(--accent)" : "var(--text-3)"} />
                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "5px", alignItems: "baseline" }}>
                          <span style={{ fontSize: "12px", color: "var(--text-3)" }}>
                            <InlineEdit value={g.current} onSave={v => update(p => ({ ...p, goals: p.goals.map(x => x.id === g.id ? { ...x, current: v } : x) }))} style={{ color: "var(--text-2)" }} /> saved
                            {g.id === "core_ef" && <span style={{ marginLeft: "6px" }}><button className="btn-ghost" style={{ fontSize: "10px", padding: "1px 5px" }} onClick={() => update(p => ({ ...p, goals: p.goals.map(x => x.id === "core_ef" ? { ...x, target: x.target === 5610 ? 8700 : 5610 } : x) }))}>Switch to {g.target === 5610 ? "$8,700" : "$5,610"}</button></span>}
                          </span>
                          <span style={{ fontSize: "12.5px", color: isActive ? "var(--accent-text)" : "var(--text-3)", fontVariantNumeric: "tabular-nums" }}>
                            <InlineEdit value={g.target} onSave={v => update(p => ({ ...p, goals: p.goals.map(x => x.id === g.id ? { ...x, target: v } : x) }))} style={{ fontWeight: 600 }} /> target
                            {monthsToFund && !g.paused && isActive && <span style={{ color: "var(--text-3)", marginLeft: "6px" }}>~{monthsToFund}mo</span>}
                          </span>
                        </div>
                        <div style={{ fontSize: "11.5px", color: "var(--text-3)", marginTop: "2px" }}>
                          {fmt$(Math.max(0, g.target - g.current))} remaining · {pct.toFixed(0)}% funded
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Add goal form */}
            {addGoalOpen && (
              <div style={{ marginTop: "12px", padding: "12px", background: "var(--surface-raised)", borderRadius: "7px", display: "flex", flexDirection: "column", gap: "8px" }}>
                <p style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-2)", margin: 0 }}>Add Goal</p>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <input className="input" placeholder="Goal name" value={newGoalForm.name} onChange={e => setNewGoalForm(f => ({ ...f, name: e.target.value }))} style={{ flex: "2 1 160px" }} />
                  <div style={{ display: "flex", alignItems: "center", background: "var(--surface-overlay)", border: "1px solid var(--border)", borderRadius: "6px", padding: "0 10px", flex: "1 1 120px" }}>
                    <span style={{ color: "var(--text-3)", marginRight: "4px" }}>$</span>
                    <input type="number" placeholder="Target" value={newGoalForm.target} onChange={e => setNewGoalForm(f => ({ ...f, target: e.target.value }))}
                      style={{ background: "none", border: "none", outline: "none", color: "var(--text)", fontFamily: "inherit", fontSize: "13.5px", width: "80px" }} />
                  </div>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button className="btn btn-primary" style={{ fontSize: "12.5px" }} onClick={() => {
                    if (!newGoalForm.name.trim()) return;
                    update(p => ({ ...p, goals: [...p.goals, { id: uid(), name: newGoalForm.name.trim(), target: parseFloat(newGoalForm.target) || 0, current: 0, done: false, paused: false }] }));
                    setNewGoalForm({ name: "", target: "" }); setAddGoalOpen(false);
                  }}>Add</button>
                  <button className="btn btn-secondary" style={{ fontSize: "12.5px" }} onClick={() => setAddGoalOpen(false)}>Cancel</button>
                </div>
              </div>
            )}
          </div>

          {/* WINDFALL ESTIMATOR */}
          <div className="card">
            <p className="card-title">Windfall Estimator</p>
            <p style={{ fontSize: "12.5px", color: "var(--text-3)", marginBottom: "12px" }}>
              Got a tax refund, bonus, settlement, or gift? Enter the amount — and optionally a future date — to see exactly where it should go, with bills for that month already accounted for.
            </p>
            <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap", marginBottom: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: "6px", padding: "0 12px" }}>
                <span style={{ color: "var(--text-3)", marginRight: "4px" }}>$</span>
                <input type="number" step="0.01" placeholder="Amount (e.g. 6000)"
                  style={{ background: "none", border: "none", outline: "none", color: "var(--text)", fontSize: "14px", width: "130px", fontFamily: "inherit" }}
                  value={foundMoneyInput} onChange={e => setFoundMoneyInput(e.target.value)} />
              </div>
              <input type="date" className="input" style={{ width: "160px" }} placeholder="Date (optional)"
                value={foundMoneyDate} onChange={e => setFoundMoneyDate(e.target.value)} />
              {(foundMoneyInput || foundMoneyDate) && <button className="btn btn-ghost" style={{ fontSize: "12px" }} onClick={() => { setFoundMoneyInput(""); setFoundMoneyDate(""); }}>Clear</button>}
            </div>
            {foundMoneyDate && <p style={{ fontSize: "11.5px", color: "var(--text-3)", marginBottom: "10px" }}>Projecting forward to <strong style={{ color: "var(--text-2)" }}>{fmtDateFull(foundMoneyDate)}</strong> — simulates regular paychecks, card paydowns, and goal progress between now and then, then applies your windfall on top.</p>}
            {foundMoneyLines && (() => {
              const { lines, bills, reserved, proj } = foundMoneyLines;
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>

                  {/* Projected state panel (only when future date set) */}
                  {proj && (
                    <div style={{ background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: "7px", padding: "12px 14px" }}>
                      <p style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 8px" }}>
                        Projected State by {fmtDateFull(foundMoneyDate)} · {proj.paychecksSimulated} paycheck{proj.paychecksSimulated !== 1 ? "s" : ""} simulated
                      </p>

                      {/* CC balances */}
                      {proj.debts.filter(d => d.type === "credit_card").length > 0 && (
                        <div style={{ marginBottom: "10px" }}>
                          <p style={{ fontSize: "11px", color: "var(--text-3)", margin: "0 0 5px" }}>Credit cards by then</p>
                          {proj.debts.filter(d => d.type === "credit_card").sort((a, b) => b.apr - a.apr).map(d => {
                            const orig = debtAccounts.find(x => x.id === d.id);
                            const paid = orig ? Math.max(0, orig.balance - d.balance) : 0;
                            return (
                              <div key={d.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", padding: "2px 0" }}>
                                <span style={{ color: "var(--text-2)" }}>{d.name}</span>
                                <span>
                                  {d.balance === 0
                                    ? <span style={{ color: "var(--green)", fontWeight: 600 }}>Paid off ✓</span>
                                    : <span style={{ color: "var(--text)" }}>{fmt$(d.balance)} <span style={{ color: "var(--green)", fontSize: "11px" }}>({fmt$(paid)} paid down)</span></span>
                                  }
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Goal progress */}
                      {proj.goals.filter(g => !g.paused).length > 0 && (
                        <div style={{ marginBottom: "10px" }}>
                          <p style={{ fontSize: "11px", color: "var(--text-3)", margin: "0 0 5px" }}>Goals by then</p>
                          {proj.goals.filter(g => !g.paused).map(g => {
                            const orig = plan.goals.find(x => x.id === g.id);
                            const gained = orig ? Math.max(0, g.current - orig.current) : 0;
                            return (
                              <div key={g.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", padding: "2px 0" }}>
                                <span style={{ color: g.done ? "var(--green)" : "var(--text-2)" }}>{g.name}</span>
                                <span>
                                  {g.done
                                    ? <span style={{ color: "var(--green)", fontWeight: 600 }}>Done ✓</span>
                                    : <span style={{ color: "var(--text)" }}>{fmt$(g.current)}<span style={{ color: "var(--text-3)", fontSize: "11px" }}>/{fmt$(g.target)}{gained > 0 ? ` (+${fmt$(gained)})` : ""}</span></span>
                                  }
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* HSA/Roth projections */}
                      {(() => {
                        const yr = parseInt((foundMoneyDate || today).slice(0, 4));
                        const projC = proj.contributions.find(c => c.year === yr);
                        const origC = plan.contributions.find(c => c.year === yr);
                        const hsaGain = projC ? projC.hsa - (origC?.hsa ?? 0) : 0;
                        const rothGain = projC ? projC.roth - (origC?.roth ?? 0) : 0;
                        if (hsaGain <= 0 && rothGain <= 0) return null;
                        return (
                          <div>
                            <p style={{ fontSize: "11px", color: "var(--text-3)", margin: "0 0 5px" }}>Tax-advantaged contributions by then</p>
                            {hsaGain > 0 && <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", padding: "2px 0" }}><span style={{ color: "var(--text-2)" }}>HSA contributed</span><span style={{ color: "var(--green)" }}>+{fmt$(hsaGain)}</span></div>}
                            {rothGain > 0 && <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", padding: "2px 0" }}><span style={{ color: "var(--text-2)" }}>Roth IRA contributed</span><span style={{ color: "var(--green)" }}>+{fmt$(rothGain)}</span></div>}
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* Bills that month */}
                  {bills.length > 0 && (
                    <div style={{ background: "var(--surface-raised)", borderRadius: "6px", padding: "10px 12px" }}>
                      <p style={{ fontSize: "11.5px", fontWeight: 600, color: "var(--text-3)", margin: "0 0 5px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                        Bills that month — {fmt$(reserved)} reserved from windfall
                      </p>
                      {bills.map((b, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "var(--text-2)", padding: "1px 0" }}>
                          <span>{new Date(b.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })} — {b.name}</span>
                          <span style={{ color: "var(--red)" }}>−{fmt$(b.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Windfall sweep */}
                  <div>
                    <p style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 6px" }}>
                      Where the {fmt$(parseFloat(foundMoneyInput))} goes
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      {lines.map((l, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 10px", background: l.type === "buffer" ? "var(--surface-raised)" : l.type === "goal" ? "var(--green-dim)" : l.type === "extra" ? "var(--yellow-dim)" : "rgba(129,140,248,0.06)", borderRadius: "5px" }}>
                          <span style={{ fontSize: "13px", color: l.type === "buffer" ? "var(--text-3)" : l.type === "goal" ? "var(--green)" : l.type === "extra" ? "var(--yellow)" : "var(--accent-text)" }}>
                            {l.type !== "buffer" && "→ "}{l.name}
                          </span>
                          <span style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums", color: l.type === "buffer" ? "var(--text-3)" : l.type === "goal" ? "var(--green)" : l.type === "extra" ? "var(--yellow)" : "var(--accent)" }}>{fmt$(l.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* FUTURE MONEY PLANNER */}
          <div className="card">
            <p className="card-title">Future Money Planner</p>
            <p style={{ fontSize: "12.5px", color: "var(--text-3)", marginBottom: "12px" }}>Know a bonus, refund, or extra check is coming? Enter the date and amount to see exactly where it should go — bills for that month are automatically accounted for.</p>
            <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap", marginBottom: "10px" }}>
              <input type="date" className="input" style={{ width: "160px" }}
                value={planDate} onChange={e => setPlanDate(e.target.value)} />
              <div style={{ display: "flex", alignItems: "center", background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: "6px", padding: "0 12px" }}>
                <span style={{ color: "var(--text-3)", marginRight: "4px" }}>$</span>
                <input type="number" step="0.01" placeholder="Amount"
                  style={{ background: "none", border: "none", outline: "none", color: "var(--text)", fontSize: "14px", width: "120px", fontFamily: "inherit" }}
                  value={planAmount} onChange={e => setPlanAmount(e.target.value)} />
              </div>
              {(planDate || planAmount) && <button className="btn btn-ghost" style={{ fontSize: "12px" }} onClick={() => { setPlanDate(""); setPlanAmount(""); }}>Clear</button>}
            </div>

            {futurePlanLines && (() => {
              const { lines, bills, reserved } = futurePlanLines;
              return (
                <div>
                  {/* Bills that month */}
                  {bills.length > 0 && (
                    <div style={{ marginBottom: "12px", background: "var(--surface-raised)", borderRadius: "6px", padding: "10px 12px" }}>
                      <p style={{ fontSize: "11.5px", fontWeight: 600, color: "var(--text-3)", margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                        Bills that month — {fmt$(reserved)} reserved
                      </p>
                      {bills.map((b, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "var(--text-2)", padding: "1px 0" }}>
                          <span>{new Date(b.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })} — {b.name}</span>
                          <span style={{ color: "var(--red)" }}>−{fmt$(b.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Where the money goes */}
                  <p style={{ fontSize: "11.5px", fontWeight: 600, color: "var(--text-3)", margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.04em" }}>Where it goes</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    {lines.map((l, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 10px", borderRadius: "5px", background: l.type === "buffer" ? "var(--surface-raised)" : l.type === "goal" ? "var(--green-dim)" : l.type === "extra" ? "var(--accent-dim)" : "rgba(129,140,248,0.06)" }}>
                        <span style={{ fontSize: "13px", color: l.type === "buffer" ? "var(--text-3)" : l.type === "goal" ? "var(--green)" : l.type === "extra" ? "var(--accent-text)" : "var(--accent-text)" }}>
                          {l.type === "buffer" ? "" : "→ "}{l.name}
                        </span>
                        <span style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums", color: l.type === "buffer" ? "var(--text-3)" : l.type === "goal" ? "var(--green)" : "var(--accent)" }}>{fmt$(l.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>

        </div>

        {/* ── RIGHT COLUMN (tab: planning) ─────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* SINKING FUND BUCKETS */}
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <div>
                <p className="card-title" style={{ margin: 0 }}>Sinking Funds</p>
                <p style={{ fontSize: "11.5px", color: "var(--text-3)", marginTop: "3px" }}>Fund at <InlineEdit value={s.sinkingMonthly} onSave={v => update(p => ({ ...p, settings: { ...p.settings, sinkingMonthly: v } }))} style={{ color: "var(--accent-text)" }} />/mo pooled</p>
              </div>
              <button className="btn-icon" title="Add bucket" onClick={() => setAddSinkOpen(true)}><PlusIcon /></button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {plan.sinkingBuckets.map(b => {
                const daysLeft = b.eventDate ? daysUntil(b.eventDate, today) : null;
                const isWarn = sinkingWarnings.some(w => w.id === b.id);
                return (
                  <div key={b.id} style={{ opacity: b.paused ? 0.5 : 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "4px" }}>
                      <span style={{ fontSize: "12.5px", color: isWarn ? "var(--red)" : "var(--text)", fontWeight: 500 }}>
                        <InlineTextEdit value={b.name} onSave={v => update(p => ({ ...p, sinkingBuckets: p.sinkingBuckets.map(x => x.id === b.id ? { ...x, name: v } : x) }))} />
                      </span>
                      <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                        {isWarn && <span style={{ color: "var(--red)", fontSize: "11px" }}><AlertIcon /></span>}
                        <button className="btn-icon" style={{ padding: "1px 4px", fontSize: "11px" }} onClick={() => update(p => ({ ...p, sinkingBuckets: p.sinkingBuckets.map(x => x.id === b.id ? { ...x, paused: !x.paused } : x) }))}>
                          {b.paused ? "▶" : "⏸"}
                        </button>
                        <button className="btn-icon" style={{ padding: "1px 4px" }} onClick={() => { if (confirm(`Delete "${b.name}"?`)) update(p => ({ ...p, sinkingBuckets: p.sinkingBuckets.filter(x => x.id !== b.id) })); }}><XIcon /></button>
                      </div>
                    </div>
                    <ProgressBar current={b.current} target={b.annual} color={isWarn ? "var(--red)" : "var(--accent)"} />
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px", fontSize: "11.5px", color: "var(--text-3)" }}>
                      <span>
                        <InlineEdit value={b.current} onSave={v => update(p => ({ ...p, sinkingBuckets: p.sinkingBuckets.map(x => x.id === b.id ? { ...x, current: v } : x) }))} style={{ color: "var(--text-2)" }} />
                        {" / "}
                        <InlineEdit value={b.annual} onSave={v => update(p => ({ ...p, sinkingBuckets: p.sinkingBuckets.map(x => x.id === b.id ? { ...x, annual: v } : x) }))} style={{ color: "var(--text-2)" }} />
                        {" · $"}{(b.annual / 12).toFixed(0)}/mo
                      </span>
                      {b.eventDate && (
                        <span style={{ color: isWarn ? "var(--red)" : "var(--text-3)" }}>
                          {fmtDate(b.eventDate)}{daysLeft !== null && daysLeft >= 0 ? ` (${daysLeft}d)` : ""}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: "10px", borderTop: "1px solid var(--border)", paddingTop: "8px", display: "flex", justifyContent: "space-between", fontSize: "12px", color: "var(--text-3)" }}>
              <span>Total annual: <strong style={{ color: "var(--text-2)" }}>{fmt$(plan.sinkingBuckets.reduce((a, b) => a + b.annual, 0))}</strong></span>
              <span>Monthly: <strong style={{ color: "var(--text-2)" }}>{fmt$(plan.sinkingBuckets.reduce((a, b) => a + b.annual, 0) / 12)}</strong></span>
            </div>
            <p style={{ fontSize: "11px", color: "var(--text-3)", marginTop: "4px" }}>Pool funds at {fmt$(s.sinkingMonthly)}/mo — the $0.33 overage builds a tiny cushion. Track each sub-bucket to its annual target.</p>

            {addSinkOpen && (
              <div style={{ marginTop: "12px", padding: "12px", background: "var(--surface-raised)", borderRadius: "7px", display: "flex", flexDirection: "column", gap: "8px" }}>
                <p style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-2)", margin: 0 }}>Add Sinking Bucket</p>
                <input className="input" placeholder="Bucket name" value={newSinkForm.name} onChange={e => setNewSinkForm(f => ({ ...f, name: e.target.value }))} />
                <div style={{ display: "flex", gap: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", background: "var(--surface-overlay)", border: "1px solid var(--border)", borderRadius: "6px", padding: "0 10px", flex: 1 }}>
                    <span style={{ color: "var(--text-3)", marginRight: "4px", fontSize: "12px" }}>$/yr</span>
                    <input type="number" placeholder="Annual cost" value={newSinkForm.annual} onChange={e => setNewSinkForm(f => ({ ...f, annual: e.target.value }))}
                      style={{ background: "none", border: "none", outline: "none", color: "var(--text)", fontFamily: "inherit", fontSize: "13px", width: "80px" }} />
                  </div>
                  <input className="input" type="date" placeholder="Event date (opt.)" value={newSinkForm.eventDate} onChange={e => setNewSinkForm(f => ({ ...f, eventDate: e.target.value }))} style={{ flex: 1 }} />
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button className="btn btn-primary" style={{ fontSize: "12.5px" }} onClick={() => {
                    if (!newSinkForm.name.trim()) return;
                    update(p => ({ ...p, sinkingBuckets: [...p.sinkingBuckets, { id: uid(), name: newSinkForm.name.trim(), annual: parseFloat(newSinkForm.annual) || 0, current: 0, eventDate: newSinkForm.eventDate || undefined, paused: false }] }));
                    setNewSinkForm({ name: "", annual: "", eventDate: "" }); setAddSinkOpen(false);
                  }}>Add</button>
                  <button className="btn btn-secondary" style={{ fontSize: "12.5px" }} onClick={() => setAddSinkOpen(false)}>Cancel</button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
      )}

      {tab === "settings" && (
      <div className="dash-grid dash-main-aside" style={{ gap: "16px" }}>

        {/* ── LEFT COLUMN (tab: settings) ──────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* CONTRIBUTION LIMITS */}
          <div className="card">
            <p className="card-title">Tax-Advantaged Limits — {year}</p>
            {[
              { label: "HSA (self-only HDHP)", limit: s.hsaAnnualLimit, used: yearContrib.hsa, key: "hsa" as const },
              { label: "Roth IRA", limit: s.rothAnnualLimit, used: yearContrib.roth, key: "roth" as const },
            ].map(acc => {
              const room = acc.limit - acc.used;
              return (
                <div key={acc.key} style={{ marginBottom: "12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span style={{ fontSize: "12.5px", color: "var(--text)" }}>{acc.label}</span>
                    <span style={{ fontSize: "12px", color: room <= 0 ? "var(--red)" : "var(--text-3)" }}>
                      {fmt$(acc.used)} / <InlineEdit value={acc.limit} onSave={v => update(p => ({ ...p, settings: { ...p.settings, [acc.key === "hsa" ? "hsaAnnualLimit" : "rothAnnualLimit"]: v } }))} style={{ color: "var(--text-2)" }} />
                    </span>
                  </div>
                  <ProgressBar current={acc.used} target={acc.limit} color={room <= 0 ? "var(--red)" : "var(--green)"} />
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px", fontSize: "11.5px", color: "var(--text-3)" }}>
                    <span style={{ color: room <= 0 ? "var(--red)" : "var(--green)" }}>{room > 0 ? fmt$(room) + " remaining" : "FULL — overflow to next goal"}</span>
                    <button className="btn-ghost" style={{ fontSize: "11px", padding: "1px 6px" }}
                      onClick={() => { const amt = parseFloat(prompt(`Log ${acc.label} contribution ($):`) ?? ""); if (!isNaN(amt) && amt > 0) update(p => { const existing = p.contributions.find(c => c.year === year); const updated = existing ? p.contributions.map(c => c.year === year ? { ...c, [acc.key]: c[acc.key] + amt } : c) : [...p.contributions, { year, hsa: 0, roth: 0, [acc.key]: amt }]; return { ...p, contributions: updated }; }); }}>
                      + Log contribution
                    </button>
                  </div>
                </div>
              );
            })}
            <p style={{ fontSize: "11px", color: "var(--text-3)", marginTop: "4px" }}>IRS limits change yearly — update each January. Click the limit value to edit.</p>
          </div>

        </div>

        {/* ── RIGHT COLUMN (tab: settings) ─────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* SETTINGS */}
          <div className="card">
            <button style={{ background: "none", border: "none", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", padding: 0, fontFamily: "inherit" }}
              onClick={() => setShowSettings(v => !v)}>
              <p className="card-title" style={{ margin: 0 }}>Settings & Defaults</p>
              <span style={{ color: "var(--text-3)", fontSize: "12px" }}>{showSettings ? "Hide" : "Edit"}</span>
            </button>

            {showSettings && (
              <div style={{ marginTop: "14px", display: "flex", flexDirection: "column", gap: "10px" }}>
                {([
                  ["Checking buffer (floor)", "buffer"],
                  ["Sinking funds monthly", "sinkingMonthly"],
                  ["Student loan match monthly", "studentLoanMonthly"],
                  ["HSA monthly contribution", "hsaMonthly"],
                  ["Take-home pre-pivot", "takehomePre"],
                  ["Take-home post-pivot", "takehomePost"],
                  ["Monthly survival expenses", "survivalMonthly"],
                  ["Monthly discretionary", "discretionaryMonthly"],
                ] as [string, keyof Settings][]).map(([label, key]) => (
                  <div key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                    <label style={{ fontSize: "12.5px", color: "var(--text-2)", flex: 1 }}>{label}</label>
                    <div style={{ display: "flex", alignItems: "center", background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: "6px", padding: "0 10px", flex: "0 0 120px" }}>
                      <span style={{ color: "var(--text-3)", marginRight: "4px" }}>$</span>
                      <input type="number" step="0.01" value={settingsForm[key] as number}
                        onChange={e => setSettingsForm(f => ({ ...f, [key]: parseFloat(e.target.value) || 0 }))}
                        style={{ background: "none", border: "none", outline: "none", color: "var(--text)", fontFamily: "inherit", fontSize: "13.5px", width: "80px" }} />
                    </div>
                  </div>
                ))}
                {(["paydayAnchor", "pivotDate"] as const).map(key => (
                  <div key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                    <label style={{ fontSize: "12.5px", color: "var(--text-2)", flex: 1 }}>{key === "paydayAnchor" ? "Payday anchor date" : "Pivot date (Sept 2026)"}</label>
                    <input className="input" type="date" value={settingsForm[key] as string}
                      onChange={e => setSettingsForm(f => ({ ...f, [key]: e.target.value }))}
                      style={{ flex: "0 0 148px" }} />
                  </div>
                ))}
                <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                  <button className="btn btn-primary" style={{ fontSize: "12.5px" }} onClick={() => { update(p => ({ ...p, settings: settingsForm })); setShowSettings(false); }}>Save settings</button>
                  <button className="btn btn-ghost" style={{ fontSize: "12.5px" }} onClick={() => { if (confirm("Reset all settings to defaults from the original plan?")) { setSettingsForm(DEFAULT_SETTINGS); update(p => ({ ...p, settings: DEFAULT_SETTINGS })); } }}>Reset to defaults</button>
                </div>
                <div style={{ borderTop: "1px solid var(--border)", paddingTop: "10px" }}>
                  <button className="btn btn-ghost" style={{ fontSize: "12px", color: "var(--red)" }} onClick={() => { if (confirm("Reset ENTIRE money plan to defaults? This deletes all goal progress, sinking balances, and settings.")) { const fresh = seedPlan(); setPlan(fresh); save(fresh); setShowSettings(false); } }}>
                    ⚠ Reset entire money plan to defaults
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
      )}

      {/* Annual reset checklist (Jan) — only shown on the Limits & Settings tab */}
      {tab === "settings" && today.slice(5, 10) <= "01-31" && (
        <div style={{ marginTop: "16px", background: "var(--yellow-dim)", border: "1px solid rgba(251,191,36,0.2)", borderRadius: "8px", padding: "14px 18px" }}>
          <p style={{ fontWeight: 600, color: "var(--yellow)", fontSize: "13px", margin: "0 0 8px" }}>📋 January Annual Reset Checklist</p>
          {["Update IRS contribution limits (HSA, Roth, 401k) — see Settings", "Confirm HDHP self-only vs family coverage", "Refresh sinking fund event costs if prices changed", "Re-baseline savings bucket balances against real accounts", "Review goal targets — adjust Core EF between $5,610 and $8,700 if needed"].map((item, i) => (
            <div key={i} style={{ display: "flex", gap: "8px", alignItems: "flex-start", marginBottom: "4px" }}>
              <input type="checkbox" className="checkbox" style={{ marginTop: "2px" }} onChange={() => {}} />
              <span style={{ fontSize: "12.5px", color: "var(--text-2)" }}>{item}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
