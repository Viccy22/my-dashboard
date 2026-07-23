"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

type Schedule =
  | { type: "monthly";   dayOfMonth: number }
  | { type: "weekly";    dayOfWeek: number }
  | { type: "biweekly";  anchorDate: string }
  | { type: "yearly";    month: number; day: number }
  | { type: "quarterly"; anchorDate: string }
  | { type: "once";      date: string };

type RecurringItem = {
  id: string;
  name: string;
  amount: number;
  schedule: Schedule;
  category: string;
  startDate?: string;
  endDate?: string;
  active: boolean;
  isTransfer?: boolean;
};

type Transaction = {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
};

// A one-time amount exception for a specific occurrence of a recurring item
type Override = {
  id: string;
  itemId: string;
  date: string;
  amount: number;
};

// A one-time date override for moving a payment to a different date
type DateOverride = {
  id: string;
  itemId: string;
  scheduledDate: string; // Original scheduled date
  newDate: string; // New date to show payment
};

type SavingsTransaction = { id: string; date: string; description: string; amount: number; };
type SavingsBucket = { id: string; name: string; targetAmount?: number; transactions: SavingsTransaction[]; };
type SavingsData = { totalBalance: number | null; buckets: SavingsBucket[]; };

type DebtAccount = {
  id: string; name: string; type: string; balance: number;
  limit?: number; minPayment: number; apr: number;
  annualFee?: number; annualFeeMonth?: number;
  deferred?: boolean; deferredUntil?: string; notes?: string;
};

type BNPLInstallment = {
  date: string;
  amount: number;
  isEstimated?: boolean;
};

type BNPLFrequency = "weekly" | "biweekly" | "monthly";

type BNPLPlan = {
  id: string;
  merchant: string;
  provider: string;
  originalAmount: number;
  paidToDate: number;
  remainingBalance: number;
  regularInstallment: number;
  paymentsRemaining: number;
  totalInstallments: number;
  nextDueDate: string;
  finalPaymentDate: string;
  frequency?: BNPLFrequency;
  autopayEnabled?: boolean;
  status: "active" | "completed";
  installments: BNPLInstallment[];
};

type FinancesData = {
  currentBalance: number | null;
  items: RecurringItem[];
  transactions: Transaction[];
  overrides: Override[];
  dateOverrides?: DateOverride[];
  savings?: SavingsData;
  debt?: { accounts: DebtAccount[] };
  bnpl?: { plans: BNPLPlan[] };
};

type DashboardData = { finances?: FinancesData; [key: string]: unknown };
type SaveStatus    = "idle" | "saving" | "saved" | "error";

type RowSource = { type: "recurring"; itemId: string } | { type: "transaction"; txnId: string } | { type: "bnpl"; planId: string } | { type: "empty" };

type CashFlowRow = {
  date: string;
  dayName: string;
  description: string;
  amount: number | null;
  balance: number;
  isPayday: boolean;
  isLow: boolean;
  isToday: boolean;
  isPast: boolean;
  isTransfer: boolean;
  source: RowSource;
};

// ── Seeded bills ──────────────────────────────────────────────────────────────

const SEED_DEBTS: DebtAccount[] = [
  { id: "dbt1", name: "Capital One Platinum",   type: "credit_card",  balance: 687.65,   limit: 1287.65, minPayment: 25,  apr: 28.99 },
  { id: "dbt2", name: "Capital One Venture",    type: "credit_card",  balance: 2059.45,  limit: 3000,    minPayment: 50,  apr: 28.49, annualFee: 95,  annualFeeMonth: 3 },
  { id: "dbt3", name: "Capital One Savor",      type: "credit_card",  balance: 2889.35,  limit: 3000,    minPayment: 97,  apr: 28.24 },
  { id: "dbt4", name: "Capital One Quicksilver",type: "credit_card",  balance: 989.41,   limit: 1000,    minPayment: 35,  apr: 26.49, annualFee: 39,  annualFeeMonth: 7 },
  { id: "dbt5", name: "Ollo",                   type: "credit_card",  balance: 6027.98,  limit: 6200,    minPayment: 200, apr: 27.99 },
  { id: "dbt6", name: "Care Credit",            type: "credit_card",  balance: 2269.59,  limit: 3000,    minPayment: 97,  apr: 0 },
  { id: "dbt7", name: "Nelnet Student Loans",   type: "student_loan", balance: 38669.34, minPayment: 0,  apr: 5.5, deferred: true, deferredUntil: "2028-11-01", notes: "Payments deferred until Nov 2028" },
];

const DEFAULT_ITEMS: RecurringItem[] = [
  { id:"s0",  name:"Bi-weekly paycheck",            amount:+1540,    schedule:{ type:"biweekly", anchorDate:"2026-07-01" }, category:"Income",       active:true, endDate:"2026-08-26" },
  { id:"s0b", name:"Bi-weekly paycheck",            amount:+1368.15, schedule:{ type:"biweekly", anchorDate:"2026-09-09" }, category:"Income",       active:true, startDate:"2026-09-01" },
  { id:"s2",  name:"Car insurance",                 amount:-255,     schedule:{ type:"monthly",  dayOfMonth:25 }, category:"Transport",   active:true },
  // Car payment & OUC electric were converted from monthly lump sums to 4x/month
  // weekly installments in July 2026 (easier to absorb per-paycheck). July itself
  // is a mid-cycle catch-up: 3 OUC payments before the Aug 3 due date, 2 car
  // payments before the Jul 25 due date. From August on, both settle into a
  // clean 4-payments-per-month rhythm on the 1st/8th/15th/22nd.
  { id:"ouc_final", name:"OUC electric (final bill)", amount:-288, schedule:{ type:"once", date:"2026-08-03" }, category:"Household", active:true },
  { id:"ouc_budget", name:"OUC electric (budget billing)", amount:-269, schedule:{ type:"monthly", dayOfMonth:1 }, category:"Household", active:true, startDate:"2026-09-01" },
  { id:"car_july", name:"Car payment (July only)", amount:-60, schedule:{ type:"once", date:"2026-07-25" }, category:"Transport", active:true },
  { id:"car_monthly", name:"Car payment", amount:-460.11, schedule:{ type:"monthly", dayOfMonth:25 }, category:"Transport", active:true, startDate:"2026-08-25", endDate:"2026-11-25" },
  { id:"s4",  name:"Zorro's diet food",             amount:-120,     schedule:{ type:"monthly",  dayOfMonth:1  }, category:"Pets",        active:true },
  { id:"s5",  name:"Groceries",                     amount:-50,      schedule:{ type:"weekly",   dayOfWeek:6   }, category:"Groceries",   active:true },
  { id:"s6",  name:"Gas",                           amount:-40,      schedule:{ type:"monthly",  dayOfMonth:15 }, category:"Transport",   active:true },
  { id:"s7",  name:"Ally CC (min)",                 amount:-224,     schedule:{ type:"monthly",  dayOfMonth:5  }, category:"Credit Card", active:true, endDate:"2026-08-31" },
  { id:"s8",  name:"Capital One Savor (min)",       amount:-110,     schedule:{ type:"monthly",  dayOfMonth:6  }, category:"Credit Card", active:true, endDate:"2026-08-31" },
  { id:"s9",  name:"Capital One Platinum (min)",    amount:-25,      schedule:{ type:"monthly",  dayOfMonth:6  }, category:"Credit Card", active:true, endDate:"2026-08-31" },
  { id:"s10", name:"Capital One Quicksilver (min)", amount:-32,      schedule:{ type:"monthly",  dayOfMonth:11 }, category:"Credit Card", active:true, endDate:"2026-08-31" },
  { id:"s13", name:"Disney Annual Pass",            amount:-67,      schedule:{ type:"monthly",  dayOfMonth:1  }, category:"Subscriptions",active:true },
  { id:"s14", name:"Fitness membership",            amount:-40,      schedule:{ type:"monthly",  dayOfMonth:22 }, category:"Subscriptions",active:true },
  { id:"s15", name:"Extra debt payment",            amount:-100,     schedule:{ type:"monthly",  dayOfMonth:28 }, category:"Debt",        active:true, endDate:"2026-08-31" },
  { id:"s_sinking", name:"Sinking funds → HYSA",  amount:-512, schedule:{ type:"monthly",  dayOfMonth:1  }, category:"Transfer",    active:true, startDate:"2026-09-01", isTransfer:true },
  { id:"s_nelnet",  name:"Student loan → Nelnet", amount:-281, schedule:{ type:"monthly",  dayOfMonth:1  }, category:"Transfer",    active:true, startDate:"2027-01-01", isTransfer:true },
  { id:"s_hsa",     name:"HSA contribution",       amount:-200, schedule:{ type:"monthly",  dayOfMonth:1  }, category:"Transfer",    active:true, startDate:"2027-07-01", isTransfer:true },
];

const SEED_BNPL: BNPLPlan[] = [
  {
    id: "bnpl_instacart1",
    merchant: "Instacart",
    provider: "Instacart pay-in-4",
    originalAmount: 67,
    paidToDate: 33.48,
    remainingBalance: 33.48,
    regularInstallment: 16.74,
    paymentsRemaining: 2,
    totalInstallments: 4,
    nextDueDate: "2026-07-24",
    finalPaymentDate: "2026-08-07",
    autopayEnabled: true,
    status: "active",
    installments: [
      { date: "2026-07-24", amount: 16.74, isEstimated: false },
      { date: "2026-08-07", amount: 16.74, isEstimated: false },
    ],
  },
  {
    id: "bnpl_instacart2",
    merchant: "Instacart",
    provider: "Instacart pay-in-4",
    originalAmount: 90,
    paidToDate: 44.84,
    remainingBalance: 45.16,
    regularInstallment: 22.58,
    paymentsRemaining: 2,
    totalInstallments: 4,
    nextDueDate: "2026-07-31",
    finalPaymentDate: "2026-08-14",
    autopayEnabled: true,
    status: "active",
    installments: [
      { date: "2026-07-31", amount: 22.58, isEstimated: false },
      { date: "2026-08-14", amount: 22.58, isEstimated: false },
    ],
  },
  {
    id: "bnpl_steam",
    merchant: "Steam",
    provider: "Steam pay-in-4",
    originalAmount: 96,
    paidToDate: 49.02,
    remainingBalance: 46.98,
    regularInstallment: 23.49,
    paymentsRemaining: 2,
    totalInstallments: 4,
    nextDueDate: "2026-07-31",
    finalPaymentDate: "2026-08-14",
    autopayEnabled: true,
    status: "active",
    installments: [
      { date: "2026-07-31", amount: 23.49, isEstimated: false },
      { date: "2026-08-14", amount: 23.49, isEstimated: false },
    ],
  },
  {
    id: "bnpl_amazon_affirm1",
    merchant: "Amazon",
    provider: "Affirm",
    originalAmount: 181.12,
    paidToDate: 0,
    remainingBalance: 180.11,
    regularInstallment: 22.64,
    paymentsRemaining: 8,
    totalInstallments: 8,
    nextDueDate: "2026-08-17",
    finalPaymentDate: "2027-03-17",
    autopayEnabled: true,
    status: "active",
    installments: [
      { date: "2026-08-17", amount: 22.64, isEstimated: true },
      { date: "2026-09-17", amount: 22.64, isEstimated: true },
      { date: "2026-10-17", amount: 22.64, isEstimated: true },
      { date: "2026-11-17", amount: 22.64, isEstimated: true },
      { date: "2026-12-17", amount: 22.64, isEstimated: true },
      { date: "2027-01-17", amount: 22.64, isEstimated: true },
      { date: "2027-02-17", amount: 22.64, isEstimated: true },
      { date: "2027-03-17", amount: 21.63, isEstimated: true },
    ],
  },
  {
    id: "bnpl_amazon_affirm2",
    merchant: "Amazon",
    provider: "Affirm",
    originalAmount: 968.58,
    paidToDate: 415.24,
    remainingBalance: 553.34,
    regularInstallment: 53.81,
    paymentsRemaining: 11,
    totalInstallments: 11,
    nextDueDate: "2026-07-25",
    finalPaymentDate: "2027-05-25",
    autopayEnabled: true,
    status: "active",
    installments: [
      { date: "2026-07-25", amount: 53.81, isEstimated: false },
      { date: "2026-08-25", amount: 53.81, isEstimated: false },
      { date: "2026-09-25", amount: 53.81, isEstimated: false },
      { date: "2026-10-25", amount: 53.81, isEstimated: false },
      { date: "2026-11-25", amount: 53.81, isEstimated: false },
      { date: "2026-12-25", amount: 53.81, isEstimated: false },
      { date: "2027-01-25", amount: 53.81, isEstimated: false },
      { date: "2027-02-25", amount: 53.81, isEstimated: false },
      { date: "2027-03-25", amount: 53.81, isEstimated: false },
      { date: "2027-04-25", amount: 53.81, isEstimated: false },
      { date: "2027-05-25", amount: 15.24, isEstimated: false },
    ],
  },
  {
    id: "bnpl_amazon_affirm3",
    merchant: "Amazon",
    provider: "Affirm",
    originalAmount: 292.85,
    paidToDate: 114.20,
    remainingBalance: 228.29,
    regularInstallment: 28.55,
    paymentsRemaining: 8,
    totalInstallments: 8,
    nextDueDate: "2026-08-02",
    finalPaymentDate: "2027-03-02",
    autopayEnabled: false,
    status: "active",
    installments: [
      { date: "2026-08-02", amount: 28.55, isEstimated: true },
      { date: "2026-09-02", amount: 28.55, isEstimated: true },
      { date: "2026-10-02", amount: 28.55, isEstimated: true },
      { date: "2026-11-02", amount: 28.55, isEstimated: true },
      { date: "2026-12-02", amount: 28.55, isEstimated: true },
      { date: "2027-01-02", amount: 28.55, isEstimated: true },
      { date: "2027-02-02", amount: 28.55, isEstimated: true },
      { date: "2027-03-02", amount: 28.44, isEstimated: true },
    ],
  },
  {
    id: "bnpl_disney_affirm",
    merchant: "Disney World",
    provider: "Affirm",
    originalAmount: 318.62,
    paidToDate: 117.40,
    remainingBalance: 234.00,
    regularInstallment: 58.70,
    paymentsRemaining: 4,
    totalInstallments: 4,
    nextDueDate: "2026-08-07",
    finalPaymentDate: "2026-11-07",
    autopayEnabled: true,
    status: "active",
    installments: [
      { date: "2026-08-07", amount: 58.70, isEstimated: false },
      { date: "2026-09-07", amount: 58.70, isEstimated: false },
      { date: "2026-10-07", amount: 58.70, isEstimated: false },
      { date: "2026-11-07", amount: 57.90, isEstimated: false },
    ],
  },
  {
    id: "bnpl_guinthers",
    merchant: "SP Guinthers",
    provider: "Klarna",
    originalAmount: 135,
    paidToDate: 68.54,
    remainingBalance: 66.46,
    regularInstallment: 33.75,
    paymentsRemaining: 2,
    totalInstallments: 2,
    nextDueDate: "2026-07-29",
    finalPaymentDate: "2026-08-12",
    autopayEnabled: false,
    status: "active",
    installments: [
      { date: "2026-07-29", amount: 33.75, isEstimated: false },
      { date: "2026-08-12", amount: 32.71, isEstimated: false },
    ],
  },
  {
    id: "bnpl_painted_oem",
    merchant: "Painted OEM Parts",
    provider: "Klarna",
    originalAmount: 294.22,
    paidToDate: 110.34,
    remainingBalance: 183.88,
    regularInstallment: 36.78,
    paymentsRemaining: 5,
    totalInstallments: 5,
    nextDueDate: "2026-07-29",
    finalPaymentDate: "2026-09-23",
    autopayEnabled: false,
    status: "active",
    installments: [
      { date: "2026-07-29", amount: 36.78, isEstimated: false },
      { date: "2026-08-12", amount: 36.78, isEstimated: false },
      { date: "2026-08-26", amount: 36.78, isEstimated: false },
      { date: "2026-09-09", amount: 36.78, isEstimated: true },
      { date: "2026-09-23", amount: 36.76, isEstimated: true },
    ],
  },
  {
    id: "bnpl_divorce_horse",
    merchant: "Divorce Horse",
    provider: "PayPal Pay Later",
    originalAmount: 294.72,
    paidToDate: 221.04,
    remainingBalance: 73.68,
    regularInstallment: 73.68,
    paymentsRemaining: 1,
    totalInstallments: 6,
    nextDueDate: "2026-08-02",
    finalPaymentDate: "2026-08-02",
    autopayEnabled: false,
    status: "active",
    installments: [
      { date: "2026-08-02", amount: 73.68, isEstimated: false },
    ],
  },
  {
    id: "bnpl_amazon_payin4_1",
    merchant: "Amazon",
    provider: "Pay-in-4",
    originalAmount: 32.50,
    paidToDate: 0,
    remainingBalance: 32.50,
    regularInstallment: 32.50,
    paymentsRemaining: 1,
    totalInstallments: 1,
    nextDueDate: "2026-07-30",
    finalPaymentDate: "2026-07-30",
    autopayEnabled: false,
    status: "active",
    installments: [
      { date: "2026-07-30", amount: 32.50, isEstimated: false },
    ],
  },
  {
    id: "bnpl_amazon_payin4_2",
    merchant: "Amazon",
    provider: "Pay-in-4",
    originalAmount: 31.13,
    paidToDate: 0,
    remainingBalance: 31.13,
    regularInstallment: 31.13,
    paymentsRemaining: 1,
    totalInstallments: 1,
    nextDueDate: "2026-08-06",
    finalPaymentDate: "2026-08-06",
    autopayEnabled: false,
    status: "active",
    installments: [
      { date: "2026-08-06", amount: 31.13, isEstimated: false },
    ],
  },
];

// Sept 2026 plan items — always injected at render time regardless of stored data
const PLAN_ITEMS: RecurringItem[] = [
  { id:"s0b",          name:"Bi-weekly paycheck",       amount:+1368.15, schedule:{ type:"biweekly", anchorDate:"2026-09-09" }, category:"Income",   active:true, startDate:"2026-09-01" },
  { id:"s_sinking",    name:"Sinking funds → HYSA",    amount:-512,     schedule:{ type:"monthly",  dayOfMonth:1 }, category:"Transfer", active:true, startDate:"2026-09-01", isTransfer:true },
  { id:"s_ef_starter", name:"→ Starter EF ($3k goal)", amount:-400,     schedule:{ type:"monthly",  dayOfMonth:5 }, category:"Transfer", active:true, startDate:"2026-09-01", endDate:"2026-11-30", isTransfer:true },
  { id:"s_wh_fund",    name:"→ Water heater ($1.8k)",  amount:-600,     schedule:{ type:"monthly",  dayOfMonth:5 }, category:"Transfer", active:true, startDate:"2026-12-01", endDate:"2027-02-28", isTransfer:true },
  { id:"s_nelnet",     name:"Student loan → Nelnet",   amount:-281,     schedule:{ type:"monthly",  dayOfMonth:1 }, category:"Transfer", active:true, startDate:"2027-01-01", isTransfer:true },
  { id:"s_ac_cushion", name:"→ AC cushion ($4k goal)", amount:-500,     schedule:{ type:"monthly",  dayOfMonth:5 }, category:"Transfer", active:true, startDate:"2027-03-01", endDate:"2027-11-30", isTransfer:true },
  { id:"s_hsa",        name:"HSA contribution",         amount:-200,     schedule:{ type:"monthly",  dayOfMonth:1 }, category:"Transfer", active:true, startDate:"2027-07-01", isTransfer:true },
  { id:"s_core_ef",    name:"→ Core EF ($5.6k goal)",  amount:-600,     schedule:{ type:"monthly",  dayOfMonth:5 }, category:"Transfer", active:true, startDate:"2027-12-01", isTransfer:true },
];

function seedFinances(): FinancesData {
  return { currentBalance: null, items: DEFAULT_ITEMS, transactions: [], overrides: [] };
}

// A little icon per bill category, just for quick visual scanning of the list.
const CATEGORY_META: Record<string, string> = {
  Income: "💰", Transport: "🚗", Household: "🏠", Pets: "🐾", Groceries: "🛒",
  "Credit Card": "💳", BNPL: "🧾", Subscriptions: "🔁", Debt: "📉", Transfer: "🔀", Other: "📦",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayStr() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

// Advances a date by one occurrence of a BNPL payment frequency. Monthly
// advances by calendar month (keeps day-of-month) rather than a flat 30 days.
function addByFrequency(dateStr: string, freq: "weekly" | "biweekly" | "monthly"): string {
  if (freq === "weekly") return addDays(dateStr, 7);
  if (freq === "biweekly") return addDays(dateStr, 14);
  const d = new Date(dateStr + "T00:00:00");
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
}

function itemAppliesToDate(item: RecurringItem, dateStr: string): boolean {
  if (!item.active) return false;
  if (item.endDate && dateStr > item.endDate) return false;
  if (item.startDate && dateStr < item.startDate) return false;
  const date = new Date(dateStr + "T00:00:00");
  switch (item.schedule.type) {
    case "monthly":  return date.getDate() === item.schedule.dayOfMonth;
    case "weekly":   return date.getDay()  === item.schedule.dayOfWeek;
    case "biweekly": {
      const anchor = new Date(item.schedule.anchorDate + "T00:00:00");
      const diff   = Math.round((date.getTime() - anchor.getTime()) / 86400000);
      return diff >= 0 && diff % 14 === 0;
    }
    case "yearly":    return (date.getMonth() + 1) === item.schedule.month && date.getDate() === item.schedule.day;
    case "quarterly": {
      const anchor = new Date(item.schedule.anchorDate + "T00:00:00");
      if (date < anchor) return false;
      // Check if date falls on same day-of-month as anchor, 3/6/9/12... months later
      const monthsDiff =
        (date.getFullYear() - anchor.getFullYear()) * 12 +
        (date.getMonth() - anchor.getMonth());
      return monthsDiff >= 0 && monthsDiff % 3 === 0 && date.getDate() === anchor.getDate();
    }
    case "once": return dateStr === item.schedule.date;
  }
}

function generateCashFlow(
  startBalance: number,
  startDate: string,
  days: number,
  items: RecurringItem[],
  transactions: Transaction[],
  overrides: Override[],
  dateOverrides?: DateOverride[],
  bnplPlans?: BNPLPlan[],
): CashFlowRow[] {
  const rows: CashFlowRow[] = [];
  const today = todayStr();
  let balance = startBalance;

  for (let i = 0; i < days; i++) {
    const dateStr = addDays(startDate, i);
    const date    = new Date(dateStr + "T00:00:00");
    const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
    const isToday = dateStr === today;
    const isPast  = dateStr < today;

    const hits: Array<{ description: string; amount: number; source: RowSource; isTransfer: boolean }> = [];

    // Recurring items — income first, then expenses
    const dayItems = items.filter(it => itemAppliesToDate(it, dateStr));
    dayItems.sort((a, b) => b.amount - a.amount);
    for (const it of dayItems) {
      const ov = overrides.find(o => o.itemId === it.id && o.date === dateStr);
      hits.push({ description: it.name, amount: ov ? ov.amount : it.amount, source: { type: "recurring", itemId: it.id }, isTransfer: !!it.isTransfer });
    }

    // Check for date-overridden items (moved to this date from another date)
    const movedItems = dateOverrides?.filter(d => d.newDate === dateStr) ?? [];
    for (const moved of movedItems) {
      const item = items.find(it => it.id === moved.itemId);
      if (item) {
        const ov = overrides.find(o => o.itemId === item.id && o.date === dateStr);
        hits.push({ description: item.name, amount: ov ? ov.amount : item.amount, source: { type: "recurring", itemId: item.id }, isTransfer: !!item.isTransfer });
      }
    }

    // Remove items that were moved to a different date
    const movedAwayItemIds = dateOverrides?.filter(d => d.scheduledDate === dateStr).map(d => d.itemId) ?? [];
    const filteredHits = hits.filter(h => h.source.type !== "recurring" || !movedAwayItemIds.includes(h.source.type === "recurring" ? h.source.itemId : ""));

    // Logged transactions
    for (const t of transactions.filter(t => t.date === dateStr)) {
      filteredHits.push({ description: t.description, amount: t.amount, source: { type: "transaction", txnId: t.id }, isTransfer: false });
    }

    // BNPL installments
    if (bnplPlans) {
      for (const plan of bnplPlans) {
        for (const inst of plan.installments) {
          if (inst.date === dateStr) {
            filteredHits.push({ description: `${plan.merchant} (BNPL)`, amount: -inst.amount, source: { type: "bnpl", planId: plan.id }, isTransfer: false });
          }
        }
      }
    }

    if (filteredHits.length === 0) {
      rows.push({ date: dateStr, dayName, description: "—", amount: null, balance, isPayday: false, isLow: balance < 300, isToday, isPast, source: { type: "empty" }, isTransfer: false });
    } else {
      for (const hit of filteredHits) {
        balance += hit.amount;
        rows.push({ date: dateStr, dayName, description: hit.description, amount: hit.amount, balance, isPayday: hit.amount > 0 && !hit.isTransfer, isLow: balance < 300, isToday, isPast, source: hit.source, isTransfer: hit.isTransfer });
      }
    }
  }
  return rows;
}

function fmt$(n: number): string {
  return (n < 0 ? "-$" : "$") + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(s: string): string {
  return new Date(s + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
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

const CheckIcon = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M2 7l3.5 3.5L11 3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ── Inline amount editor (used in both table rows and bills list) ──────────────

function AmountEditor({
  current,
  onSave,
  onCancel,
}: {
  current: number;
  onSave: (val: number) => void;
  onCancel: () => void;
}) {
  const [raw, setRaw] = useState(String(Math.abs(current)));
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); inputRef.current?.select(); }, []);

  const commit = () => {
    const n = parseFloat(raw.replace(/,/g, "").replace(/\$/g, ""));
    if (isNaN(n)) return;
    // Preserve sign of original
    onSave(current < 0 ? -Math.abs(n) : Math.abs(n));
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
      <span style={{ fontSize: "13px", color: "var(--text-3)" }}>{current < 0 ? "-$" : "+$"}</span>
      <input
        ref={inputRef}
        type="number"
        step="0.01"
        min="0"
        value={raw}
        onChange={e => setRaw(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") onCancel(); }}
        style={{ width: "80px", background: "var(--surface-overlay)", border: "1px solid var(--accent)", borderRadius: "4px", color: "var(--text)", fontSize: "13px", padding: "2px 6px", fontFamily: "inherit", outline: "none" }}
      />
      <button className="btn-icon" onClick={commit} title="Save" style={{ color: "var(--green)" }}><CheckIcon /></button>
      <button className="btn-icon" onClick={onCancel} title="Cancel"><XIcon /></button>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

type EditingRow = { date: string; source: RowSource; currentAmount: number };
type EditingBill = { id: string; field: "amount" };

export default function FinancesPage() {
  const [finances, setFinances] = useState<FinancesData>(seedFinances());
  const [status,   setStatus]   = useState<SaveStatus>("idle");
  const [loading,  setLoading]  = useState(true);
  const timer      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rawDataRef = useRef<DashboardData>({});

  const [editingBalance, setEditingBalance] = useState(false);
  const [balanceInput,   setBalanceInput]   = useState("");

  // ── BNPL state ────────────────────────────────────────────────────────────
  const [bnplPlans, setBNPLPlans] = useState<BNPLPlan[]>(SEED_BNPL);
  const [editingBnplId, setEditingBnplId] = useState<string | null>(null);
  const [bnplPaymentsInput, setBnplPaymentsInput] = useState("");
  const [expandedBnplId, setExpandedBnplId] = useState<string | null>(null);
  const [editingBnplNameId, setEditingBnplNameId] = useState<string | null>(null);
  const [bnplNameInput, setBnplNameInput] = useState("");

  // ── Savings state ──────────────────────────────────────────────────────────
  const [savings,        setSavings]        = useState<SavingsData>({ totalBalance: null, buckets: [] });
  const [editSavingsBal, setEditSavingsBal] = useState(false);
  const [savingsBalInput,setSavingsBalInput]= useState("");
  const [addingBucket,   setAddingBucket]   = useState(false);
  const [newBucketName,  setNewBucketName]  = useState("");
  const [newBucketTarget,setNewBucketTarget]= useState("");
  const [expandedBucket, setExpandedBucket] = useState<string | null>(null);
  const [bucketTxnAmount,setBucketTxnAmount]= useState<Record<string, string>>({});
  const [bucketTxnDesc,  setBucketTxnDesc]  = useState<Record<string, string>>({});
  const [bucketTxnType,  setBucketTxnType]  = useState<Record<string, "add" | "take">>({});

  // ── Debt state ─────────────────────────────────────────────────────────────
  const [debtAccounts,   setDebtAccounts]   = useState<DebtAccount[]>([]);
  const [editingDebtId,  setEditingDebtId]  = useState<string | null>(null);
  const [debtBalInput,   setDebtBalInput]   = useState("");
  const [addingDebt,     setAddingDebt]     = useState(false);
  const [newDebt,        setNewDebt]        = useState<Omit<DebtAccount,"id">>({ name: "", type: "credit_card", balance: 0, minPayment: 0, apr: 0 });
  const [debtTxnAmount,  setDebtTxnAmount]  = useState<Record<string, string>>({});
  const [debtTxnType,    setDebtTxnType]    = useState<Record<string, "payment" | "charge">>({});

  const [txnAmount, setTxnAmount] = useState("");
  const [txnDesc,   setTxnDesc]   = useState("");
  const [txnDate,   setTxnDate]   = useState(todayStr());
  const [txnType,   setTxnType]   = useState<"expense" | "income">("expense");

  const [daysToShow,   setDaysToShow]   = useState(60);
  const [forecastDate, setForecastDate] = useState("");

  // Which section tab is showing (Balance/Add Transaction stay always visible above these)
  const [tab, setTab] = useState<"cashflow" | "savings" | "debt" | "bills">("cashflow");

  // Which row in the table is being edited
  const [editingRow,  setEditingRow]  = useState<EditingRow | null>(null);
  // Which bill in the list is being edited
  const [editingBill, setEditingBill] = useState<EditingBill | null>(null);

  // ── Date override state ────────────────────────────────────────────────────
  const [editingDateOverride, setEditingDateOverride] = useState<{ itemId: string; scheduledDate: string } | null>(null);
  const [dateOverrideInput, setDateOverrideInput] = useState("");
  const [editingBillEndDate, setEditingBillEndDate] = useState<string | null>(null);
  const [endDateInput, setEndDateInput] = useState("");

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/data")
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(res => {
        const d: DashboardData = res.data ?? {};
        rawDataRef.current = d;
        const f = d.finances ?? seedFinances();
        if (!f.items || f.items.length === 0) f.items = DEFAULT_ITEMS;
        if (!f.overrides) f.overrides = [];
        // Auto-add Care Credit bill if missing
        if (!f.items.some(it => it.name.toLowerCase().includes("care credit"))) {
          f.items = [...f.items, { id: "carecredit_min", name: "Care Credit (min)", amount: -97, schedule: { type: "monthly", dayOfMonth: 19 }, category: "Credit Card", active: true, endDate: "2026-08-31" }];
        }

        // ── Migrations ────────────────────────────────────────────────────────
        let migrated = false;

        // Fix paycheck anchor June 25 → July 1 and amount $1,400 → $1,540
        const s0Item = f.items.find(it => it.id === "s0");
        if (s0Item?.schedule.type === "biweekly" && (s0Item.schedule as { anchorDate: string }).anchorDate === "2026-06-25") {
          f.items = f.items.map(it => it.id === "s0" ? { ...it,
            amount: it.amount === 1400 ? 1540 : it.amount,
            endDate: it.endDate ?? "2026-08-26",
            schedule: { type: "biweekly" as const, anchorDate: "2026-07-01" },
          } : it);
          migrated = true;
        }

        // Add post-Sept paycheck ($1,368.15, 401k loan repayment baked in)
        if (!f.items.some(it => it.id === "s0b")) {
          f.items = [...f.items, { id: "s0b", name: "Bi-weekly paycheck", amount: 1368.15, schedule: { type: "biweekly" as const, anchorDate: "2026-09-09" }, category: "Income", active: true }];
          migrated = true;
        }

        // Add endDate to CC/extra-debt items (paid off via 401k loan Sept 2026)
        const ccEndDate = "2026-08-31";
        const ccIds = ["s7", "s8", "s9", "s10", "s15", "carecredit_min"];
        f.items = f.items.map(it => {
          if (ccIds.includes(it.id) && !it.endDate) { migrated = true; return { ...it, endDate: ccEndDate }; }
          return it;
        });

        // Add sinking funds transfer ($512/mo, starts Sept 1 2026)
        if (!f.items.some(it => it.id === "s_sinking")) {
          f.items = [...f.items, { id: "s_sinking", name: "Sinking funds → HYSA", amount: -512, schedule: { type: "monthly" as const, dayOfMonth: 1 }, category: "Transfer", active: true, startDate: "2026-09-01", isTransfer: true }];
          migrated = true;
        }

        // Add student loan payment to Nelnet ($281/mo, starts Jan 1 2027)
        if (!f.items.some(it => it.id === "s_nelnet")) {
          f.items = [...f.items, { id: "s_nelnet", name: "Student loan → Nelnet", amount: -281, schedule: { type: "monthly" as const, dayOfMonth: 1 }, category: "Transfer", active: true, startDate: "2027-01-01", isTransfer: true }];
          migrated = true;
        }

        // Add HSA contribution ($200/mo, starts Jul 1 2027 — after Affirm plans end + AC cushion funded)
        if (!f.items.some(it => it.id === "s_hsa")) {
          f.items = [...f.items, { id: "s_hsa", name: "HSA contribution", amount: -200, schedule: { type: "monthly" as const, dayOfMonth: 1 }, category: "Transfer", active: true, startDate: "2027-07-01", isTransfer: true }];
          migrated = true;
        }

        // Remove old split payment items (car/OUC weekly + catchups) — replaced with single monthly payments
        const oldSplitIds = ["ouc_catchup1", "ouc_catchup2", "ouc_catchup3", "car_catchup1", "car_catchup2", "car_wk1", "car_wk2", "car_wk3", "car_wk4", "ouc_wk1", "ouc_wk2", "ouc_wk3", "ouc_wk4"];
        if (f.items.some(it => oldSplitIds.includes(it.id))) {
          f.items = f.items.filter(it => !oldSplitIds.includes(it.id));
          migrated = true;
        }

        setFinances(f);
        // Savings & debt
        setSavings(f.savings ?? { totalBalance: null, buckets: [] });
        setDebtAccounts(f.debt?.accounts ?? SEED_DEBTS);
        // BNPL plans
        setBNPLPlans(f.bnpl?.plans ?? SEED_BNPL);

        // Auto-save after migrations so they persist
        if (migrated) {
          const newData = { ...d, finances: f };
          rawDataRef.current = newData;
          fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data: newData }) }).catch(() => {});
        }
      })
      .catch(() => {
        setStatus("error");
        // Initialize BNPL plans from seed even if API fails
        setBNPLPlans(SEED_BNPL);
      })
      .finally(() => setLoading(false));
  }, []);

  // ── Save ──────────────────────────────────────────────────────────────────
  const save = useCallback(async (fin: FinancesData) => {
    setStatus("saving");
    if (timer.current) clearTimeout(timer.current);
    const newData = { ...rawDataRef.current, finances: fin };
    rawDataRef.current = newData;
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
      timer.current = setTimeout(() => setStatus("idle"), 2000);
    }
  }, []);

  // ── Savings helpers ───────────────────────────────────────────────────────
  const saveSavings = useCallback(async (sv: SavingsData, debts?: DebtAccount[]) => {
    setStatus("saving");
    if (timer.current) clearTimeout(timer.current);
    const baseFin = (rawDataRef.current.finances ?? seedFinances()) as FinancesData;
    const fin = { ...baseFin, savings: sv, debt: { accounts: debts ?? debtAccounts } };
    const newData = { ...rawDataRef.current, finances: fin };
    rawDataRef.current = newData;
    setFinances(fin);
    try {
      const res = await fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data: newData }) });
      if (!res.ok) throw new Error();
      setStatus("saved");
    } catch { setStatus("error"); }
    finally { timer.current = setTimeout(() => setStatus("idle"), 2000); }
  }, [debtAccounts]);

  const saveDebts = useCallback(async (debts: DebtAccount[]) => {
    setStatus("saving");
    if (timer.current) clearTimeout(timer.current);
    const baseFin = (rawDataRef.current.finances ?? seedFinances()) as FinancesData;
    const fin = { ...baseFin, savings: baseFin.savings ?? savings, debt: { accounts: debts } };
    const newData = { ...rawDataRef.current, finances: fin };
    rawDataRef.current = newData;
    setFinances(fin);
    try {
      const res = await fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data: newData }) });
      if (!res.ok) throw new Error();
      setStatus("saved");
    } catch { setStatus("error"); }
    finally { timer.current = setTimeout(() => setStatus("idle"), 2000); }
  }, [savings]);

  // ── BNPL ──────────────────────────────────────────────────────────────────
  const saveBnplPlans = useCallback(async (plans: BNPLPlan[]) => {
    setStatus("saving");
    if (timer.current) clearTimeout(timer.current);
    const baseFin = (rawDataRef.current.finances ?? seedFinances()) as FinancesData;
    const fin = { ...baseFin, bnpl: { plans } };
    const newData = { ...rawDataRef.current, finances: fin };
    rawDataRef.current = newData;
    setFinances(fin);
    setBNPLPlans(plans);
    try {
      const res = await fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data: newData }) });
      if (!res.ok) throw new Error();
      setStatus("saved");
    } catch { setStatus("error"); }
    finally { timer.current = setTimeout(() => setStatus("idle"), 2000); }
  }, []);

  // Change how many payments are left on a BNPL plan. Trims from the latest
  // dated future installment when reducing; extends at the existing cadence
  // (interval between the last two installments, or 30 days) when increasing.
  const updateBnplPaymentsRemaining = (planId: string, newCount: number) => {
    if (newCount < 0) return;
    const plan = bnplPlans.find(p => p.id === planId);
    if (!plan) return;
    const today = todayStr();
    const past = plan.installments.filter(i => i.date < today).sort((a, b) => a.date.localeCompare(b.date));
    let future = plan.installments.filter(i => i.date >= today).sort((a, b) => a.date.localeCompare(b.date));

    if (newCount <= future.length) {
      future = future.slice(0, newCount);
    } else {
      const last = future[future.length - 1] ?? past[past.length - 1];
      let lastDate = last?.date ?? today;
      const freq = plan.frequency ?? "monthly";
      const amount = plan.regularInstallment;
      while (future.length < newCount) {
        lastDate = addByFrequency(lastDate, freq);
        future.push({ date: lastDate, amount, isEstimated: true });
      }
    }

    const newInstallments = [...past, ...future];
    const remainingBalance = Math.round(future.reduce((s, i) => s + i.amount, 0) * 100) / 100;
    const updated: BNPLPlan = {
      ...plan,
      installments: newInstallments,
      paymentsRemaining: future.length,
      totalInstallments: past.length + future.length,
      remainingBalance,
      nextDueDate: future[0]?.date ?? plan.nextDueDate,
      finalPaymentDate: future[future.length - 1]?.date ?? plan.finalPaymentDate,
      status: future.length === 0 ? "completed" : "active",
    };
    const updatedPlans = bnplPlans.map(p => p.id === planId ? updated : p);
    setEditingBnplId(null);
    saveBnplPlans(updatedPlans);
  };

  const deleteBnplInstallment = (planId: string, date: string) => {
    const plan = bnplPlans.find(p => p.id === planId);
    if (!plan) return;
    const newInstallments = plan.installments.filter(i => i.date !== date);
    const today = todayStr();
    const future = newInstallments.filter(i => i.date >= today);
    const updated: BNPLPlan = {
      ...plan,
      installments: newInstallments,
      paymentsRemaining: future.length,
      totalInstallments: newInstallments.length,
      remainingBalance: Math.round(future.reduce((s, i) => s + i.amount, 0) * 100) / 100,
      nextDueDate: future[0]?.date ?? plan.nextDueDate,
      finalPaymentDate: future[future.length - 1]?.date ?? plan.finalPaymentDate,
      status: future.length === 0 ? "completed" : "active",
    };
    saveBnplPlans(bnplPlans.map(p => p.id === planId ? updated : p));
  };

  const renameBnplPlan = (planId: string, name: string) => {
    if (!name.trim()) return;
    saveBnplPlans(bnplPlans.map(p => p.id === planId ? { ...p, merchant: name.trim() } : p));
  };

  const setBnplFrequency = (planId: string, freq: BNPLFrequency) => {
    saveBnplPlans(bnplPlans.map(p => p.id === planId ? { ...p, frequency: freq } : p));
  };

  const deleteBnplPlan = (planId: string) => {
    saveBnplPlans(bnplPlans.filter(p => p.id !== planId));
  };

  const [addingBnpl, setAddingBnpl] = useState(false);
  const [newBnpl, setNewBnpl] = useState({
    name: "", provider: "", amount: "", numPayments: "4",
    frequency: "biweekly" as BNPLFrequency, startDate: todayStr(),
  });

  const addBnplPlan = () => {
    const amount = parseFloat(newBnpl.amount.replace(/,/g, "").replace(/\$/g, ""));
    const numPayments = parseInt(newBnpl.numPayments, 10);
    if (!newBnpl.name.trim() || isNaN(amount) || amount <= 0 || isNaN(numPayments) || numPayments <= 0 || !newBnpl.startDate) return;

    const installments: BNPLInstallment[] = [];
    let date = newBnpl.startDate;
    for (let i = 0; i < numPayments; i++) {
      installments.push({ date, amount });
      if (i < numPayments - 1) date = addByFrequency(date, newBnpl.frequency);
    }

    const plan: BNPLPlan = {
      id: crypto.randomUUID(),
      merchant: newBnpl.name.trim(),
      provider: newBnpl.provider.trim() || newBnpl.frequency,
      originalAmount: Math.round(amount * numPayments * 100) / 100,
      paidToDate: 0,
      remainingBalance: Math.round(amount * numPayments * 100) / 100,
      regularInstallment: amount,
      paymentsRemaining: numPayments,
      totalInstallments: numPayments,
      nextDueDate: installments[0].date,
      finalPaymentDate: installments[installments.length - 1].date,
      frequency: newBnpl.frequency,
      autopayEnabled: false,
      status: "active",
      installments,
    };

    saveBnplPlans([...bnplPlans, plan]);
    setAddingBnpl(false);
    setNewBnpl({ name: "", provider: "", amount: "", numPayments: "4", frequency: "biweekly", startDate: todayStr() });
  };

  // ── Balance ───────────────────────────────────────────────────────────────
  const saveBalance = () => {
    const val = parseFloat(balanceInput.replace(/,/g, "").replace(/\$/g, ""));
    if (isNaN(val)) return;
    const updated = { ...finances, currentBalance: val };
    setFinances(updated); setEditingBalance(false); save(updated);
  };

  // ── Add transaction ───────────────────────────────────────────────────────
  const addTransaction = () => {
    const amt = parseFloat(txnAmount.replace(/,/g, "").replace(/\$/g, ""));
    if (isNaN(amt) || !txnDesc.trim() || !txnDate) return;
    const txn: Transaction = {
      id: crypto.randomUUID(), date: txnDate,
      description: txnDesc.trim(),
      amount: txnType === "expense" ? -Math.abs(amt) : Math.abs(amt),
      category: txnType === "expense" ? "Expense" : "Income",
    };
    const updated = { ...finances, transactions: [...finances.transactions, txn] };
    setFinances(updated);
    setTxnAmount(""); setTxnDesc(""); setTxnDate(todayStr());
    save(updated);
  };

  const deleteTransaction = (id: string) => {
    const updated = { ...finances, transactions: finances.transactions.filter(t => t.id !== id) };
    setFinances(updated); save(updated);
  };

  // ── Edit row amount ───────────────────────────────────────────────────────
  const saveRowEdit = (newAmount: number) => {
    if (!editingRow) return;
    const { date, source } = editingRow;
    const updated = { ...finances };

    if (source.type === "recurring") {
      // Create or replace an override for this specific occurrence
      const existing = updated.overrides.find(o => o.itemId === source.itemId && o.date === date);
      if (existing) {
        updated.overrides = updated.overrides.map(o =>
          o.itemId === source.itemId && o.date === date ? { ...o, amount: newAmount } : o
        );
      } else {
        updated.overrides = [...updated.overrides, {
          id: crypto.randomUUID(),
          itemId: source.itemId,
          date,
          amount: newAmount,
        }];
      }
    } else if (source.type === "transaction") {
      updated.transactions = updated.transactions.map(t =>
        t.id === source.txnId ? { ...t, amount: newAmount } : t
      );
    } else if (source.type === "bnpl") {
      // BNPL installments are fixed payment amounts and cannot be edited
      return;
    }

    setFinances(updated); setEditingRow(null); save(updated);
  };

  // Clear a one-time override (restore default amount)
  const clearOverride = (itemId: string, date: string) => {
    const updated = { ...finances, overrides: finances.overrides.filter(o => !(o.itemId === itemId && o.date === date)) };
    setFinances(updated); save(updated);
  };

  // ── Add / delete bill ─────────────────────────────────────────────────────
  const [addingBill, setAddingBill] = useState(false);
  const [newBill, setNewBill] = useState<Omit<RecurringItem, "id">>({
    name: "", amount: 0, schedule: { type: "monthly", dayOfMonth: 1 }, category: "Household", active: true,
  });

  const addBill = () => {
    if (!newBill.name.trim() || newBill.amount === 0) return;
    const item: RecurringItem = { ...newBill, id: crypto.randomUUID() };
    const updated = { ...finances, items: [...finances.items, item] };
    setFinances(updated); setAddingBill(false);
    setNewBill({ name: "", amount: 0, schedule: { type: "monthly", dayOfMonth: 1 }, category: "Household", active: true });
    save(updated);
  };

  const deleteBill = (id: string) => {
    const updated = { ...finances, items: finances.items.filter(it => it.id !== id) };
    setFinances(updated); save(updated);
  };

  // ── Edit bill base amount ─────────────────────────────────────────────────
  const saveBillAmount = (itemId: string, newAmount: number) => {
    const updated = { ...finances, items: finances.items.map(it => it.id === itemId ? { ...it, amount: newAmount } : it) };
    setFinances(updated); setEditingBill(null); save(updated);
  };

  // ── OUC monthly bill → auto-splits across the 4 weekly OUC items ──────────
  // OUC varies by season, so instead of editing 4 amounts separately, enter
  // this month's real bill once and it divides by 4 across ouc_wk1..4.
  const oucWeeklyIds = ["ouc_wk1", "ouc_wk2", "ouc_wk3", "ouc_wk4"];
  const oucCurrentMonthly = Math.abs(finances.items.find(it => it.id === "ouc_wk1")?.amount ?? 0) * 4;
  const [editingOuc, setEditingOuc] = useState(false);
  const [oucInput, setOucInput] = useState("");
  const saveOucMonthly = (newMonthlyTotal: number) => {
    if (newMonthlyTotal <= 0) return;
    const weekly = Math.round((newMonthlyTotal / 4) * 100) / 100;
    const updated = { ...finances, items: finances.items.map(it => oucWeeklyIds.includes(it.id) ? { ...it, amount: -weekly } : it) };
    setFinances(updated); setEditingOuc(false); save(updated);
  };

  // ── Edit transaction amount ───────────────────────────────────────────────
  const saveTransactionAmount = (txnId: string, newAmount: number) => {
    const updated = { ...finances, transactions: finances.transactions.map(t => t.id === txnId ? { ...t, amount: newAmount } : t) };
    setFinances(updated); save(updated);
  };

  // ── Edit bill end date ─────────────────────────────────────────────────────
  const saveBillEndDate = (itemId: string) => {
    const date = endDateInput.trim();
    if (!date) return;
    const updated = { ...finances, items: finances.items.map(it => it.id === itemId ? { ...it, endDate: date } : it) };
    setFinances(updated); setEditingBillEndDate(null); setEndDateInput(""); save(updated);
  };

  const clearBillEndDate = (itemId: string) => {
    const updated = { ...finances, items: finances.items.map(it => it.id === itemId ? { ...it, endDate: undefined } : it) };
    setFinances(updated); setEditingBillEndDate(null); setEndDateInput(""); save(updated);
  };

  // ── Move payment date (date override) ───────────────────────────────────────
  const saveDateOverride = () => {
    if (!editingDateOverride) return;
    const newDate = dateOverrideInput.trim();
    if (!newDate) return;
    const updated = { ...finances, dateOverrides: [...(finances.dateOverrides ?? [])] };
    const existing = updated.dateOverrides.find(d => d.itemId === editingDateOverride.itemId && d.scheduledDate === editingDateOverride.scheduledDate);
    if (existing) {
      updated.dateOverrides = updated.dateOverrides.map(d =>
        d.itemId === editingDateOverride.itemId && d.scheduledDate === editingDateOverride.scheduledDate
          ? { ...d, newDate }
          : d
      );
    } else {
      updated.dateOverrides.push({
        id: crypto.randomUUID(),
        itemId: editingDateOverride.itemId,
        scheduledDate: editingDateOverride.scheduledDate,
        newDate,
      });
    }
    setFinances(updated); setEditingDateOverride(null); setDateOverrideInput(""); save(updated);
  };

  const removeDateOverride = (itemId: string, scheduledDate: string) => {
    const updated = { ...finances, dateOverrides: (finances.dateOverrides ?? []).filter(d => !(d.itemId === itemId && d.scheduledDate === scheduledDate)) };
    setFinances(updated); save(updated);
  };

  // ── Effective items — always include plan items + fix CC end dates ────────
  const effectiveItems = useMemo(() => {
    let items = finances.items.map(it => {
      // Always cap s0 (pre-Sept paycheck) at Aug 26 so it never overlaps s0b
      if (it.id === "s0") {
        const sched = it.schedule as { anchorDate?: string };
        const fixes: Partial<RecurringItem> = {};
        if (it.schedule.type === "biweekly" && sched.anchorDate === "2026-06-25") {
          fixes.amount = it.amount === 1400 ? 1540 : it.amount;
          fixes.schedule = { type: "biweekly" as const, anchorDate: "2026-07-01" };
        }
        if (!it.endDate || it.endDate > "2026-08-26") fixes.endDate = "2026-08-26";
        return Object.keys(fixes).length ? { ...it, ...fixes } : it;
      }
      // Always ensure s0b doesn't fire before Sept (biweekly fires in both directions)
      if (it.id === "s0b") {
        const fixes: Partial<RecurringItem> = {};
        if (!it.startDate || it.startDate > "2026-09-01") fixes.startDate = "2026-09-01";
        const sched = it.schedule as { anchorDate?: string };
        if (it.schedule.type !== "biweekly" || sched.anchorDate !== "2026-09-09")
          fixes.schedule = { type: "biweekly" as const, anchorDate: "2026-09-09" };
        return Object.keys(fixes).length ? { ...it, ...fixes } : it;
      }
      // Cap all Credit Card items at Aug 31 2026 (paid off via 401k loan)
      if (it.category === "Credit Card" && (!it.endDate || it.endDate > "2026-08-31")) {
        return { ...it, endDate: "2026-08-31" };
      }
      return it;
    });
    // Inject plan items that aren't already in stored data
    for (const p of PLAN_ITEMS) {
      if (!items.some(it => it.id === p.id)) items = [...items, p];
    }
    return items;
  }, [finances.items]);

  // ── Cash flow ─────────────────────────────────────────────────────────────
  const allRows = useMemo(() => {
    if (finances.currentBalance == null) return [];
    return generateCashFlow(finances.currentBalance, todayStr(), 365, effectiveItems, finances.transactions, finances.overrides, finances.dateOverrides, bnplPlans);
  }, [finances, effectiveItems, bnplPlans]);

  const displayRows = useMemo(() => {
    const today = todayStr();
    const cutoff = addDays(today, daysToShow);
    return allRows.filter(r => r.date >= today && r.date <= cutoff);
  }, [allRows, daysToShow]);

  const forecastBalance = useMemo(() => {
    if (!forecastDate || allRows.length === 0) return null;
    const rows = allRows.filter(r => r.date <= forecastDate);
    if (!rows.length) return finances.currentBalance;
    return rows[rows.length - 1].balance;
  }, [forecastDate, allRows, finances.currentBalance]);

  const lowDays    = useMemo(() => displayRows.filter(r => !r.isPast && r.balance < 300), [displayRows]);
  const nextPayday = useMemo(() => allRows.find(r => r.isPayday && r.date >= todayStr()), [allRows]);
  const lowestPoint = useMemo(() => {
    if (displayRows.length === 0) return null;
    return displayRows.reduce((min, r) => r.balance < min.balance ? r : min, displayRows[0]);
  }, [displayRows]);

  const upcomingMoves = useMemo(() => {
    const today = todayStr();
    const moves: Array<{ date: string; name: string; amount: number }> = [];
    for (let i = 0; i <= 7; i++) {
      const d = addDays(today, i);
      for (const it of effectiveItems.filter(it => it.isTransfer && it.active)) {
        if (itemAppliesToDate(it, d)) moves.push({ date: d, name: it.name, amount: it.amount });
      }
    }
    return moves;
  }, [effectiveItems]);

  if (loading) return <p className="empty" style={{ padding: "32px 0" }}>Loading…</p>;

  const hasBalance = finances.currentBalance != null;

  return (
    <div style={{ maxWidth: "900px" }}>
      {status !== "idle" && (
        <div className={`toast${status === "error" ? " error" : ""}`}>
          {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : "Could not save — check connection."}
        </div>
      )}

      {/* ── Balance + Forecast ── */}
      <div className="card" style={{ marginBottom: "16px" }}>
        <div style={{ display: "flex", gap: "24px", flexWrap: "wrap", alignItems: "flex-start" }}>

          <div style={{ flex: "1 1 220px" }}>
            <p className="card-title" style={{ marginBottom: "8px" }}>Current Balance</p>
            {editingBalance ? (
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <input className="input" type="number" step="0.01" placeholder="e.g. 1245.50"
                  value={balanceInput} onChange={e => setBalanceInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && saveBalance()} autoFocus style={{ width: "160px" }} />
                <button className="btn btn-primary" onClick={saveBalance}>Save</button>
                <button className="btn btn-secondary" onClick={() => setEditingBalance(false)}>Cancel</button>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
                <span style={{ fontSize: "28px", fontWeight: 700, fontVariantNumeric: "tabular-nums",
                  color: hasBalance && finances.currentBalance! < 300 ? "var(--red)" : "var(--text)" }}>
                  {hasBalance ? fmt$(finances.currentBalance!) : "—"}
                </span>
                <button className="btn btn-secondary" style={{ fontSize: "12px", padding: "3px 10px" }}
                  onClick={() => { setBalanceInput(String(finances.currentBalance ?? "")); setEditingBalance(true); }}>
                  {hasBalance ? "Update" : "Set balance"}
                </button>
              </div>
            )}
            {!hasBalance && <p className="empty" style={{ marginTop: "6px" }}>Enter your current checking account balance to start your projection.</p>}
          </div>

          {hasBalance && (
            <div style={{ flex: "1 1 220px" }}>
              <p className="card-title" style={{ marginBottom: "8px" }}>Balance on Date</p>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <input className="input" type="date" value={forecastDate}
                  min={todayStr()} max={addDays(todayStr(), 365)}
                  onChange={e => setForecastDate(e.target.value)} style={{ width: "160px" }} />
                {forecastBalance != null && (
                  <span style={{ fontSize: "20px", fontWeight: 700, fontVariantNumeric: "tabular-nums",
                    color: forecastBalance < 0 ? "var(--red)" : forecastBalance < 300 ? "var(--yellow)" : "var(--green)" }}>
                    {fmt$(forecastBalance)}
                  </span>
                )}
              </div>
            </div>
          )}

          {hasBalance && (
            <div style={{ flex: "1 1 180px", display: "flex", flexDirection: "column", gap: "6px" }}>
              <p className="card-title" style={{ marginBottom: "4px" }}>Outlook</p>
              {nextPayday && <div style={{ fontSize: "12.5px", color: "var(--green)" }}>Next payday: <strong>{fmtDate(nextPayday.date)}</strong> (+{fmt$(nextPayday.amount!)})</div>}
              {lowestPoint && <div style={{ fontSize: "12.5px", color: lowestPoint.balance < 300 ? "var(--red)" : "var(--text-3)" }}>Lowest point: <strong>{fmtDate(lowestPoint.date)}</strong> ({fmt$(lowestPoint.balance)})</div>}
              {lowDays.length > 0 && <div style={{ fontSize: "12px", color: "var(--red)" }}>⚠ {lowDays.length} days below $300 in next year</div>}
              {upcomingMoves.length > 0 && (
                <div style={{ borderTop: "1px solid var(--border)", paddingTop: "8px", marginTop: "4px" }}>
                  <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--accent-text)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>Money moves due</p>
                  {upcomingMoves.map((m, i) => (
                    <div key={i} style={{ fontSize: "12px", color: "var(--accent-text)" }}>
                      → {m.name}: <strong>{fmt$(-m.amount)}</strong> by {fmtDate(m.date)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Add Transaction ── */}
      {hasBalance && (
        <div className="card" style={{ marginBottom: "16px" }}>
          <p className="card-title">Add Transaction</p>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "flex-end" }}>
            <div style={{ display: "flex", borderRadius: "6px", overflow: "hidden", border: "1px solid var(--border)", flexShrink: 0 }}>
              {(["expense","income"] as const).map(t => (
                <button key={t} onClick={() => setTxnType(t)} style={{
                  padding: "8px 14px", fontFamily: "inherit", fontSize: "13px", fontWeight: 500,
                  cursor: "pointer", border: "none", transition: "all 0.1s",
                  background: txnType === t ? (t === "expense" ? "var(--red-dim)" : "var(--green-dim)") : "var(--surface-raised)",
                  color: txnType === t ? (t === "expense" ? "var(--red)" : "var(--green)") : "var(--text-3)",
                }}>
                  {t === "expense" ? "− Spent" : "+ Income"}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: "6px", padding: "0 12px", flex: "0 0 130px" }}>
              <span style={{ color: "var(--text-3)", fontSize: "14px", marginRight: "4px" }}>$</span>
              <input style={{ background: "none", border: "none", outline: "none", color: "var(--text)", fontSize: "14px", width: "90px", fontFamily: "inherit" }}
                type="number" step="0.01" min="0" placeholder="0.00"
                value={txnAmount} onChange={e => setTxnAmount(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addTransaction()} />
            </div>
            <input className="input" type="text" placeholder="Description…" value={txnDesc}
              onChange={e => setTxnDesc(e.target.value)} onKeyDown={e => e.key === "Enter" && addTransaction()}
              style={{ flex: "2 1 180px" }} />
            <input className="input" type="date" value={txnDate}
              onChange={e => setTxnDate(e.target.value)} style={{ flex: "0 0 148px" }} />
            <button className="btn btn-primary" onClick={addTransaction}>Add</button>
          </div>

          {finances.transactions.length > 0 && (
            <div style={{ marginTop: "14px" }}>
              <p style={{ fontSize: "11px", color: "var(--text-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>Recent Entries</p>
              {[...finances.transactions].sort((a,b) => b.date.localeCompare(a.date)).slice(0, 8).map(t => (
                <div key={t.id} className="row" style={{ padding: "6px 8px" }}>
                  <span style={{ fontSize: "12px", color: "var(--text-3)", minWidth: "60px" }}>{fmtDate(t.date)}</span>
                  <span style={{ flex: 1, fontSize: "13.5px", color: "var(--text)" }}>{t.description}</span>
                  <span style={{ fontSize: "13.5px", fontWeight: 600, fontVariantNumeric: "tabular-nums",
                    color: t.amount < 0 ? "var(--red)" : "var(--green)" }}>
                    {fmt$(t.amount)}
                  </span>
                  <button className="btn-icon" title="Edit amount"
                    onClick={() => saveTransactionAmount(t.id, 0) /* opens modal-less inline — handled below */}
                    style={{ display: "none" }} />
                  <button className="btn-icon" onClick={() => deleteTransaction(t.id)}><XIcon /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Date Override Editor ── */}
      {editingDateOverride && (
        <div className="card" style={{ marginBottom: "16px", background: "var(--surface-raised)", border: "2px solid var(--accent)" }}>
          <p className="card-title" style={{ marginBottom: "12px" }}>Move Payment Date</p>
          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap", marginBottom: "12px" }}>
            <span style={{ fontSize: "13px", color: "var(--text)" }}>Scheduled: <strong>{fmtDate(editingDateOverride.scheduledDate)}</strong></span>
            <span style={{ fontSize: "13px", color: "var(--text-3)" }}>→ Move to:</span>
            <input type="date" className="input" value={dateOverrideInput} autoFocus
              onChange={e => setDateOverrideInput(e.target.value)} style={{ flex: 0, width: "150px" }} />
            <button className="btn btn-primary" style={{ fontSize: "12px", padding: "6px 12px" }} onClick={saveDateOverride}>Move Payment</button>
            <button className="btn btn-secondary" style={{ fontSize: "12px", padding: "6px 12px" }} onClick={() => { setEditingDateOverride(null); setDateOverrideInput(""); }}>Cancel</button>
            {(finances.dateOverrides ?? []).some(d => d.itemId === editingDateOverride.itemId && d.scheduledDate === editingDateOverride.scheduledDate) && (
              <button className="btn btn-secondary" style={{ fontSize: "12px", padding: "6px 12px", color: "var(--red)" }}
                onClick={() => { removeDateOverride(editingDateOverride.itemId, editingDateOverride.scheduledDate); setEditingDateOverride(null); }}>Remove Override</button>
            )}
          </div>
          <p style={{ fontSize: "11.5px", color: "var(--text-3)", marginBottom: "0" }}>This moves only this one occurrence. Future occurrences will follow the normal schedule.</p>
        </div>
      )}

      {/* ── Section tabs ── */}
      {hasBalance && (
        <div style={{ display: "flex", gap: "6px", marginBottom: "14px", flexWrap: "wrap" }}>
          {([
            { key: "cashflow", label: "Cash Flow" },
            { key: "savings",  label: "Savings & Goals" },
            { key: "debt",     label: "Debt Tracker" },
            { key: "bills",    label: "Recurring Bills" },
          ] as const).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={tab === t.key ? "btn btn-primary" : "btn btn-secondary"}
              style={{ fontSize: "13px", padding: "6px 16px" }}>
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Cash Flow Table ── */}
      {tab === "cashflow" && hasBalance && (
        <div className="card">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px", flexWrap: "wrap", gap: "8px" }}>
            <div>
              <p className="card-title" style={{ margin: 0 }}>Daily Cash Flow</p>
              <p style={{ fontSize: "11.5px", color: "var(--text-3)", marginTop: "3px" }}>
                Click the pencil icon on any row to change that amount.
              </p>
            </div>
            <div style={{ display: "flex", gap: "4px" }}>
              {[30, 60, 90, 180, 365].map(d => (
                <button key={d} onClick={() => setDaysToShow(d)} style={{
                  padding: "4px 10px", borderRadius: "5px", fontFamily: "inherit",
                  fontSize: "12px", fontWeight: 500, cursor: "pointer",
                  border: "1px solid var(--border)", transition: "all 0.1s",
                  background: daysToShow === d ? "var(--accent-dim)" : "transparent",
                  color: daysToShow === d ? "var(--accent-text)" : "var(--text-3)",
                }}>
                  {d === 365 ? "1yr" : `${d}d`}
                </button>
              ))}
            </div>
          </div>

          {/* Headers + Rows (horizontal scroll on mobile) */}
          <div className="mobile-scroll-x">
          <div style={{ minWidth: "480px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "80px 36px 1fr 130px 100px 28px", gap: "0 6px", padding: "5px 8px", borderBottom: "1px solid var(--border)", marginBottom: "2px" }}>
            {["Date","Day","Description","Amount","Balance",""].map(h => (
              <span key={h} style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</span>
            ))}
          </div>

          {/* Rows */}
          <div style={{ maxHeight: "520px", overflowY: "auto" }}>
            {displayRows.map((row, i) => {
              const rowKey = `${row.date}-${i}`;
              const isEditing = editingRow && editingRow.date === row.date &&
                ((row.source.type === "recurring" && editingRow.source.type === "recurring" && row.source.itemId === (editingRow.source as { type: "recurring"; itemId: string }).itemId) ||
                 (row.source.type === "transaction" && editingRow.source.type === "transaction" && row.source.txnId === (editingRow.source as { type: "transaction"; txnId: string }).txnId));
              const hasOverride = row.source.type === "recurring" &&
                finances.overrides.some(o => o.itemId === (row.source as { type: "recurring"; itemId: string }).itemId && o.date === row.date);
              const canEdit = row.source.type !== "empty";

              return (
                <div key={rowKey} style={{
                  display: "grid",
                  gridTemplateColumns: "80px 36px 1fr 130px 100px 28px",
                  gap: "0 6px",
                  padding: "5px 8px",
                  borderRadius: "4px",
                  background: row.isToday ? "var(--accent-dim)" : row.isPayday ? "var(--green-dim)" : row.isTransfer ? "rgba(129,140,248,0.04)" : "transparent",
                  opacity: row.isPast ? 0.45 : 1,
                }}>
                  <span style={{ fontSize: "12.5px", color: row.isToday ? "var(--accent-text)" : "var(--text-3)", fontWeight: row.isToday ? 600 : 400 }}>
                    {fmtDate(row.date)}{row.isToday ? " ←" : ""}
                  </span>
                  <span style={{ fontSize: "12px", color: "var(--text-3)" }}>{row.dayName}</span>
                  <span style={{ fontSize: "13px", color: row.isPayday ? "var(--green)" : row.isTransfer ? "var(--accent-text)" : row.description === "—" ? "var(--text-3)" : "var(--text)", fontWeight: row.isPayday || row.isTransfer ? 500 : 400 }}>
                    {row.isTransfer ? "→ " : ""}{row.description}
                    {hasOverride && <span style={{ fontSize: "10px", color: "var(--accent-text)", marginLeft: "6px", fontWeight: 600 }}>edited</span>}
                  </span>

                  {/* Amount — inline editor or display */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
                    {isEditing ? (
                      <AmountEditor
                        current={editingRow!.currentAmount}
                        onSave={saveRowEdit}
                        onCancel={() => setEditingRow(null)}
                      />
                    ) : (
                      <span style={{ fontSize: "13px", fontVariantNumeric: "tabular-nums",
                        color: row.amount == null ? "transparent" : row.isTransfer ? "var(--accent)" : row.amount > 0 ? "var(--green)" : "var(--red)",
                        fontWeight: 500 }}>
                        {row.amount != null ? fmt$(row.amount) : ""}
                      </span>
                    )}
                  </div>

                  <span style={{ fontSize: "13px", fontVariantNumeric: "tabular-nums", textAlign: "right", fontWeight: 600,
                    color: row.isLow ? "var(--red)" : row.balance < 500 ? "var(--yellow)" : "var(--text)" }}>
                    {fmt$(row.balance)}
                  </span>

                  {/* Edit / clear button */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
                    {canEdit && !isEditing && (
                      <>
                        {row.source.type === "recurring" && (
                          <button className="btn-icon" title="Move this payment to a different date"
                            style={{ opacity: 0.3 }}
                            onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
                            onMouseLeave={e => (e.currentTarget.style.opacity = "0.3")}
                            onClick={() => {
                              if (row.source.type === "recurring") {
                                const itemId = row.source.itemId;
                                setEditingDateOverride({ itemId, scheduledDate: row.date });
                                const existing = (finances.dateOverrides ?? []).find(d => d.itemId === itemId && d.scheduledDate === row.date);
                                setDateOverrideInput(existing?.newDate ?? "");
                              }
                            }}>
                            📅
                          </button>
                        )}
                        {hasOverride ? (
                          <button className="btn-icon" title="Clear edit (restore default)"
                            style={{ color: "var(--accent-text)", opacity: 0.7 }}
                            onClick={() => clearOverride((row.source as { type: "recurring"; itemId: string }).itemId, row.date)}>
                            <XIcon />
                          </button>
                        ) : (
                          <button className="btn-icon" title="Edit this amount (one-time)"
                            style={{ opacity: 0.3 }}
                            onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
                            onMouseLeave={e => (e.currentTarget.style.opacity = "0.3")}
                            onClick={() => setEditingRow({ date: row.date, source: row.source, currentAmount: row.amount ?? 0 })}>
                            <PencilIcon />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          </div>{/* end minWidth wrapper */}
          </div>{/* end mobile-scroll-x */}
        </div>
      )}

      {/* ── Savings ── */}
      {tab === "savings" && (
        <div className="card">
          <p className="card-title">Savings &amp; Goals</p>

          {/* Total savings balance */}
          <div style={{ marginBottom: "16px", paddingBottom: "14px", borderBottom: "1px solid var(--border)" }}>
            <p className="card-title" style={{ marginBottom: "8px" }}>Total Savings Balance</p>
            {editSavingsBal ? (
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <input className="input" type="number" step="0.01" placeholder="0.00" value={savingsBalInput}
                  onChange={e => setSavingsBalInput(e.target.value)} autoFocus
                  onKeyDown={e => { if (e.key === "Enter") { const v = parseFloat(savingsBalInput); if (!isNaN(v)) { const sv = { ...savings, totalBalance: v }; setSavings(sv); saveSavings(sv); } setEditSavingsBal(false); } }}
                  style={{ width: "160px" }} />
                <button className="btn btn-primary" onClick={() => { const v = parseFloat(savingsBalInput); if (!isNaN(v)) { const sv = { ...savings, totalBalance: v }; setSavings(sv); saveSavings(sv); } setEditSavingsBal(false); }}>Save</button>
                <button className="btn btn-secondary" onClick={() => setEditSavingsBal(false)}>Cancel</button>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
                <span style={{ fontSize: "26px", fontWeight: 700, color: "var(--green)", fontVariantNumeric: "tabular-nums" }}>
                  {savings.totalBalance != null ? fmt$(savings.totalBalance) : "—"}
                </span>
                <button className="btn btn-secondary" style={{ fontSize: "12px", padding: "3px 10px" }}
                  onClick={() => { setSavingsBalInput(String(savings.totalBalance ?? "")); setEditSavingsBal(true); }}>
                  {savings.totalBalance != null ? "Update" : "Set balance"}
                </button>
              </div>
            )}
            {savings.buckets.length > 0 && (
              <p style={{ fontSize: "12px", color: "var(--text-3)", marginTop: "6px" }}>
                Allocated to buckets: {fmt$(savings.buckets.reduce((s, b) => s + b.transactions.reduce((a, t) => a + t.amount, 0), 0))}
                {savings.totalBalance != null && (
                  <> · Unallocated: {fmt$(savings.totalBalance - savings.buckets.reduce((s, b) => s + b.transactions.reduce((a, t) => a + t.amount, 0), 0))}</>
                )}
              </p>
            )}
          </div>

          {/* Add bucket */}
          {addingBucket ? (
            <div style={{ background: "var(--surface-raised)", borderRadius: "8px", padding: "12px", marginBottom: "14px" }}>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "8px" }}>
                <input className="input" placeholder="Bucket name (e.g. Emergency Fund)" value={newBucketName} autoFocus
                  onChange={e => setNewBucketName(e.target.value)} style={{ flex: "2 1 160px" }} />
                <div style={{ display: "flex", alignItems: "center", background: "var(--surface-overlay)", border: "1px solid var(--border)", borderRadius: "6px", padding: "0 10px", flex: "1 1 130px" }}>
                  <span style={{ color: "var(--text-3)", fontSize: "13px", marginRight: "4px" }}>Goal $</span>
                  <input style={{ background: "none", border: "none", outline: "none", color: "var(--text)", fontSize: "13px", width: "80px", fontFamily: "inherit" }}
                    type="number" step="0.01" min="0" placeholder="optional"
                    value={newBucketTarget} onChange={e => setNewBucketTarget(e.target.value)} />
                </div>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button className="btn btn-primary" onClick={() => {
                  if (!newBucketName.trim()) return;
                  const bucket: SavingsBucket = { id: crypto.randomUUID(), name: newBucketName.trim(), targetAmount: newBucketTarget ? parseFloat(newBucketTarget) : undefined, transactions: [] };
                  const sv = { ...savings, buckets: [...savings.buckets, bucket] };
                  setSavings(sv); saveSavings(sv); setAddingBucket(false); setNewBucketName(""); setNewBucketTarget("");
                }}>Add bucket</button>
                <button className="btn btn-secondary" onClick={() => setAddingBucket(false)}>Cancel</button>
              </div>
            </div>
          ) : (
            <button className="btn btn-secondary" style={{ fontSize: "12px", padding: "4px 12px", marginBottom: "14px" }} onClick={() => setAddingBucket(true)}>+ Add savings bucket</button>
          )}

          {/* Bucket list */}
          {savings.buckets.length === 0 && !addingBucket && <p className="empty">No savings buckets yet. Create one above to track what you&apos;re saving for.</p>}
          {savings.buckets.map(bucket => {
            const total = bucket.transactions.reduce((a, t) => a + t.amount, 0);
            const pct   = bucket.targetAmount ? Math.min(100, (total / bucket.targetAmount) * 100) : null;
            const isExp = expandedBucket === bucket.id;
            return (
              <div key={bucket.id} style={{ border: "1px solid var(--border)", borderRadius: "8px", marginBottom: "10px", overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", cursor: "pointer", background: isExp ? "var(--surface-raised)" : "transparent" }}
                  onClick={() => setExpandedBucket(isExp ? null : bucket.id)}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "14px", fontWeight: 600 }}>{bucket.name}</span>
                      <span style={{ fontSize: "16px", fontWeight: 800, color: "var(--green)", fontVariantNumeric: "tabular-nums" }}>{fmt$(total)}</span>
                      {bucket.targetAmount && <span style={{ fontSize: "12px", color: "var(--text-3)" }}>of {fmt$(bucket.targetAmount)}</span>}
                    </div>
                    {pct !== null && (
                      <div style={{ height: "4px", borderRadius: "99px", background: "var(--surface-overlay)", marginTop: "6px", overflow: "hidden" }}>
                        <div style={{ height: "100%", borderRadius: "99px", background: pct >= 100 ? "var(--green)" : "var(--accent)", width: `${pct}%`, transition: "width 0.3s" }} />
                      </div>
                    )}
                  </div>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ transform: isExp ? "rotate(180deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }}>
                    <path d="M3 5l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>

                {isExp && (
                  <div style={{ padding: "12px 14px", borderTop: "1px solid var(--border)" }}>
                    {/* Add/take form */}
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "12px", alignItems: "flex-end" }}>
                      <div style={{ display: "flex", borderRadius: "6px", overflow: "hidden", border: "1px solid var(--border)", flexShrink: 0 }}>
                        {(["add", "take"] as const).map(t => (
                          <button key={t} onClick={() => setBucketTxnType(x => ({ ...x, [bucket.id]: t }))}
                            style={{ padding: "6px 12px", fontFamily: "inherit", fontSize: "12px", fontWeight: 500, cursor: "pointer", border: "none", transition: "all 0.1s",
                              background: (bucketTxnType[bucket.id] ?? "add") === t ? (t === "add" ? "var(--green-dim)" : "var(--red-dim)") : "var(--surface-raised)",
                              color: (bucketTxnType[bucket.id] ?? "add") === t ? (t === "add" ? "var(--green)" : "var(--red)") : "var(--text-3)" }}>
                            {t === "add" ? "+ Add" : "− Take"}
                          </button>
                        ))}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: "6px", padding: "0 10px", flex: "0 0 110px" }}>
                        <span style={{ color: "var(--text-3)", fontSize: "13px", marginRight: "4px" }}>$</span>
                        <input style={{ background: "none", border: "none", outline: "none", color: "var(--text)", fontSize: "13px", width: "70px", fontFamily: "inherit" }}
                          type="number" step="0.01" min="0" placeholder="0.00"
                          value={bucketTxnAmount[bucket.id] ?? ""} onChange={e => setBucketTxnAmount(x => ({ ...x, [bucket.id]: e.target.value }))} />
                      </div>
                      <input className="input" placeholder="Description…" value={bucketTxnDesc[bucket.id] ?? ""}
                        onChange={e => setBucketTxnDesc(x => ({ ...x, [bucket.id]: e.target.value }))}
                        style={{ flex: "2 1 140px" }} />
                      <button className="btn btn-primary" style={{ padding: "7px 12px" }} onClick={() => {
                        const amt = parseFloat(bucketTxnAmount[bucket.id] ?? "");
                        if (isNaN(amt) || amt <= 0) return;
                        const sign = (bucketTxnType[bucket.id] ?? "add") === "add" ? 1 : -1;
                        const txn: SavingsTransaction = { id: crypto.randomUUID(), date: todayStr(), description: (bucketTxnDesc[bucket.id] ?? "").trim() || ((bucketTxnType[bucket.id] ?? "add") === "add" ? "Deposit" : "Withdrawal"), amount: sign * amt };
                        const upd = savings.buckets.map(b => b.id === bucket.id ? { ...b, transactions: [...b.transactions, txn] } : b);
                        const sv = { ...savings, buckets: upd };
                        setSavings(sv); saveSavings(sv);
                        setBucketTxnAmount(x => ({ ...x, [bucket.id]: "" })); setBucketTxnDesc(x => ({ ...x, [bucket.id]: "" }));
                      }}>Log</button>
                    </div>

                    {/* Transaction log */}
                    {bucket.transactions.length === 0 ? (
                      <p className="empty" style={{ margin: "4px 0" }}>No transactions yet.</p>
                    ) : (
                      <div>
                        <p style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>Log</p>
                        {[...bucket.transactions].sort((a, b) => b.date.localeCompare(a.date)).map(t => (
                          <div key={t.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "4px 0", borderBottom: "1px solid var(--border)" }}>
                            <span style={{ fontSize: "11.5px", color: "var(--text-3)", minWidth: "60px" }}>{fmtDate(t.date)}</span>
                            <span style={{ flex: 1, fontSize: "13px" }}>{t.description}</span>
                            <span style={{ fontSize: "13px", fontWeight: 600, fontVariantNumeric: "tabular-nums", color: t.amount >= 0 ? "var(--green)" : "var(--red)" }}>
                              {t.amount >= 0 ? "+" : ""}{fmt$(t.amount)}
                            </span>
                            <button className="btn-icon" onClick={() => {
                              const upd = savings.buckets.map(b => b.id === bucket.id ? { ...b, transactions: b.transactions.filter(tx => tx.id !== t.id) } : b);
                              const sv = { ...savings, buckets: upd }; setSavings(sv); saveSavings(sv);
                            }}><XIcon /></button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Delete bucket */}
                    <button className="btn btn-secondary" style={{ fontSize: "11px", padding: "3px 10px", color: "var(--red)", marginTop: "12px" }}
                      onClick={() => { if (!confirm(`Delete "${bucket.name}"?`)) return; const sv = { ...savings, buckets: savings.buckets.filter(b => b.id !== bucket.id) }; setSavings(sv); saveSavings(sv); setExpandedBucket(null); }}>
                      Delete bucket
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Debt Tracker ── */}
      {tab === "debt" && (
        <div className="card">
          <p className="card-title">Debt Tracker &amp; Snowball Plan ({debtAccounts.filter(d => !d.deferred && d.balance > 0).length} active)</p>
          <p style={{ fontSize: "12px", color: "var(--text-3)", marginBottom: "14px" }}>
            Snowball method: pay minimums on all debts, put extra money toward the <strong>smallest balance first</strong>.
            Total monthly minimums: <strong style={{ color: "var(--text)" }}>{fmt$(debtAccounts.filter(d => !d.deferred).reduce((s, d) => s + d.minPayment, 0))}</strong>
          </p>

          {/* Add debt form */}
          {addingDebt ? (
            <div style={{ background: "var(--surface-raised)", borderRadius: "8px", padding: "12px", marginBottom: "14px" }}>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "8px" }}>
                <input className="input" placeholder="Name" value={newDebt.name} autoFocus onChange={e => setNewDebt(d => ({ ...d, name: e.target.value }))} style={{ flex: "2 1 160px" }} />
                <select className="input" value={newDebt.type} onChange={e => setNewDebt(d => ({ ...d, type: e.target.value }))} style={{ flex: "1 1 120px" }}>
                  <option value="credit_card">Credit Card</option>
                  <option value="student_loan">Student Loan</option>
                  <option value="car">Car Loan</option>
                  <option value="personal">Personal Loan</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "8px" }}>
                {(["balance", "limit", "minPayment", "apr"] as const).map(field => (
                  <div key={field} style={{ display: "flex", alignItems: "center", background: "var(--surface-overlay)", border: "1px solid var(--border)", borderRadius: "6px", padding: "0 10px", flex: "1 1 100px" }}>
                    <span style={{ color: "var(--text-3)", fontSize: "11px", marginRight: "4px", flexShrink: 0 }}>{field === "apr" ? "APR%" : field === "minPayment" ? "Min $" : field === "limit" ? "Limit $" : "Balance $"}</span>
                    <input style={{ background: "none", border: "none", outline: "none", color: "var(--text)", fontSize: "13px", width: "70px", fontFamily: "inherit" }}
                      type="number" step="0.01" min="0" placeholder="0"
                      value={field === "apr" ? (newDebt.apr || "") : field === "minPayment" ? (newDebt.minPayment || "") : field === "limit" ? (newDebt.limit || "") : (newDebt.balance || "")}
                      onChange={e => setNewDebt(d => ({ ...d, [field]: parseFloat(e.target.value) || 0 }))} />
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button className="btn btn-primary" onClick={() => {
                  if (!newDebt.name.trim()) return;
                  const acct: DebtAccount = { ...newDebt, id: crypto.randomUUID() };
                  const upd = [...debtAccounts, acct];
                  setDebtAccounts(upd); saveDebts(upd); setAddingDebt(false);
                  setNewDebt({ name: "", type: "credit_card", balance: 0, minPayment: 0, apr: 0 });
                }}>Add</button>
                <button className="btn btn-secondary" onClick={() => setAddingDebt(false)}>Cancel</button>
              </div>
            </div>
          ) : (
            <button className="btn btn-secondary" style={{ fontSize: "12px", padding: "4px 12px", marginBottom: "14px" }} onClick={() => setAddingDebt(true)}>+ Add debt account</button>
          )}

          {/* Debt list — sorted by balance (snowball order) */}
          {[...debtAccounts].sort((a, b) => a.balance - b.balance).map((acct) => {
            const pct = acct.limit ? Math.min(100, (acct.balance / acct.limit) * 100) : null;
            const monthlyRate = acct.apr / 100 / 12;
            const interestRatio = monthlyRate > 0 ? (monthlyRate * acct.balance) / acct.minPayment : 0;
            const paymentBelowInterest = !acct.deferred && acct.minPayment > 0 && monthlyRate > 0 && interestRatio >= 1;
            const monthsToPayoff = acct.deferred ? null
              : acct.minPayment <= 0 ? null
              : paymentBelowInterest ? null
              : monthlyRate > 0
                ? Math.ceil(-Math.log(1 - interestRatio) / Math.log(1 + monthlyRate))
                : Math.ceil(acct.balance / acct.minPayment);
            const isEditingBal = editingDebtId === acct.id;
            const activeNonDeferred = debtAccounts.filter(d => !d.deferred && d.balance > 0).sort((a, b) => a.balance - b.balance);
            const snowballRank = activeNonDeferred.findIndex(d => d.id === acct.id);
            return (
              <div key={acct.id} style={{ border: "1px solid var(--border)", borderRadius: "8px", marginBottom: "10px", padding: "12px 14px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: "160px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      {snowballRank === 0 && !acct.deferred && acct.balance > 0 && (
                        <span style={{ fontSize: "10px", fontWeight: 700, background: "var(--accent)", color: "white", padding: "1px 6px", borderRadius: "99px" }}>Snowball #1</span>
                      )}
                      {snowballRank > 0 && !acct.deferred && acct.balance > 0 && (
                        <span style={{ fontSize: "10px", color: "var(--text-3)", background: "var(--surface-raised)", padding: "1px 6px", borderRadius: "99px" }}>#{snowballRank + 1}</span>
                      )}
                      <span style={{ fontSize: "14px", fontWeight: 600 }}>{acct.name}</span>
                      {acct.deferred && <span style={{ fontSize: "10px", color: "var(--yellow)", fontWeight: 600, background: "var(--yellow-dim)", padding: "1px 6px", borderRadius: "99px" }}>Deferred {acct.deferredUntil ? `until ${new Date(acct.deferredUntil + "T00:00:00").toLocaleDateString("en-US", { month: "short", year: "numeric" })}` : ""}</span>}
                    </div>
                    <div style={{ display: "flex", gap: "12px", marginTop: "4px", flexWrap: "wrap" }}>
                      {acct.minPayment > 0 && <span style={{ fontSize: "12px", color: "var(--text-3)" }}>Min: {fmt$(acct.minPayment)}/mo</span>}
                      {acct.apr > 0 && <span style={{ fontSize: "12px", color: "var(--text-3)" }}>APR: {acct.apr}%</span>}
                      {acct.annualFee && <span style={{ fontSize: "12px", color: "var(--yellow)" }}>Annual fee ${acct.annualFee} ({["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][(acct.annualFeeMonth ?? 1) - 1]})</span>}
                      {paymentBelowInterest && <span style={{ fontSize: "12px", color: "var(--red)", fontWeight: 600 }}>⚠ Min payment doesn&apos;t cover interest — balance will grow</span>}
                      {!paymentBelowInterest && monthsToPayoff !== null && monthsToPayoff > 0 && monthsToPayoff < 999 && <span style={{ fontSize: "12px", color: "var(--text-3)" }}>~{monthsToPayoff} mo to pay off at min</span>}
                    </div>
                    {acct.notes && <p style={{ fontSize: "11.5px", color: "var(--text-3)", margin: "4px 0 0", fontStyle: "italic" }}>{acct.notes}</p>}
                  </div>

                  {/* Balance */}
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    {isEditingBal ? (
                      <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                        <input className="input" type="number" step="0.01" value={debtBalInput} onChange={e => setDebtBalInput(e.target.value)} style={{ width: "100px" }} autoFocus
                          onKeyDown={e => { if (e.key === "Enter") { const v = parseFloat(debtBalInput); if (!isNaN(v)) { const upd = debtAccounts.map(d => d.id === acct.id ? { ...d, balance: v } : d); setDebtAccounts(upd); saveDebts(upd); } setEditingDebtId(null); }}} />
                        <button className="btn btn-primary" style={{ fontSize: "11px", padding: "3px 8px" }} onClick={() => { const v = parseFloat(debtBalInput); if (!isNaN(v)) { const upd = debtAccounts.map(d => d.id === acct.id ? { ...d, balance: v } : d); setDebtAccounts(upd); saveDebts(upd); } setEditingDebtId(null); }}>Save</button>
                        <button className="btn btn-secondary" style={{ fontSize: "11px", padding: "3px 6px" }} onClick={() => setEditingDebtId(null)}>✕</button>
                      </div>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ fontSize: "20px", fontWeight: 800, color: acct.balance > 0 ? "var(--red)" : "var(--green)", fontVariantNumeric: "tabular-nums" }}>{fmt$(acct.balance)}</span>
                        {acct.limit && <span style={{ fontSize: "11.5px", color: "var(--text-3)" }}>/ {fmt$(acct.limit)}</span>}
                        <button className="btn-icon" title="Edit balance" onClick={() => { setEditingDebtId(acct.id); setDebtBalInput(String(acct.balance)); }}><PencilIcon /></button>
                      </div>
                    )}
                    {/* Utilization bar */}
                    {pct !== null && (
                      <div style={{ height: "4px", borderRadius: "99px", background: "var(--surface-raised)", marginTop: "6px", width: "140px", overflow: "hidden" }}>
                        <div style={{ height: "100%", borderRadius: "99px", background: pct >= 90 ? "var(--red)" : pct >= 70 ? "var(--yellow)" : "var(--green)", width: `${pct}%` }} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Log payment / charge */}
                {!acct.deferred && (
                  <div style={{ display: "flex", gap: "6px", marginTop: "10px", alignItems: "center", flexWrap: "wrap" }}>
                    <div style={{ display: "flex", borderRadius: "6px", overflow: "hidden", border: "1px solid var(--border)" }}>
                      {(["payment", "charge"] as const).map(t => (
                        <button key={t} onClick={() => setDebtTxnType(x => ({ ...x, [acct.id]: t }))}
                          style={{ padding: "5px 10px", fontFamily: "inherit", fontSize: "11.5px", fontWeight: 500, cursor: "pointer", border: "none", transition: "all 0.1s",
                            background: (debtTxnType[acct.id] ?? "payment") === t ? (t === "payment" ? "var(--green-dim)" : "var(--red-dim)") : "var(--surface-raised)",
                            color: (debtTxnType[acct.id] ?? "payment") === t ? (t === "payment" ? "var(--green)" : "var(--red)") : "var(--text-3)" }}>
                          {t === "payment" ? "Pay" : "Charge"}
                        </button>
                      ))}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: "6px", padding: "0 8px", flex: "0 0 100px" }}>
                      <span style={{ color: "var(--text-3)", fontSize: "13px", marginRight: "3px" }}>$</span>
                      <input style={{ background: "none", border: "none", outline: "none", color: "var(--text)", fontSize: "13px", width: "60px", fontFamily: "inherit" }}
                        type="number" step="0.01" min="0" placeholder="0.00"
                        value={debtTxnAmount[acct.id] ?? ""} onChange={e => setDebtTxnAmount(x => ({ ...x, [acct.id]: e.target.value }))} />
                    </div>
                    <button className="btn btn-primary" style={{ fontSize: "12px", padding: "5px 12px" }} onClick={() => {
                      const amt = parseFloat(debtTxnAmount[acct.id] ?? "");
                      if (isNaN(amt) || amt <= 0) return;
                      const sign = (debtTxnType[acct.id] ?? "payment") === "payment" ? -1 : 1;
                      const newBal = Math.max(0, acct.balance + sign * amt);
                      const upd = debtAccounts.map(d => d.id === acct.id ? { ...d, balance: newBal } : d);
                      setDebtAccounts(upd); saveDebts(upd);
                      setDebtTxnAmount(x => ({ ...x, [acct.id]: "" }));
                    }}>Log</button>
                    <button className="btn-icon" style={{ opacity: 0.4, marginLeft: "auto" }} title="Delete account"
                      onClick={() => { if (!confirm(`Delete "${acct.name}"?`)) return; const upd = debtAccounts.filter(d => d.id !== acct.id); setDebtAccounts(upd); saveDebts(upd); }}>
                      <XIcon />
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {/* Snowball summary */}
          {debtAccounts.filter(d => !d.deferred && d.balance > 0).length > 0 && (
            <div style={{ marginTop: "10px", padding: "12px", background: "var(--accent-dim)", borderRadius: "8px" }}>
              <p style={{ fontSize: "12px", fontWeight: 700, color: "var(--accent)", marginBottom: "6px" }}>Snowball Payoff Order</p>
              <p style={{ fontSize: "12px", color: "var(--text-2)", margin: 0 }}>
                {[...debtAccounts].filter(d => !d.deferred && d.balance > 0).sort((a, b) => a.balance - b.balance).map((d, i) => (
                  <span key={d.id}>{i > 0 && " → "}<strong>{d.name}</strong> ({fmt$(d.balance)})</span>
                ))}
              </p>
              <p style={{ fontSize: "12px", color: "var(--text-3)", marginTop: "6px" }}>
                Total debt: {fmt$(debtAccounts.reduce((s, d) => s + d.balance, 0))} ·
                Monthly minimums: {fmt$(debtAccounts.filter(d => !d.deferred).reduce((s, d) => s + d.minPayment, 0))}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Recurring Bills ── */}
      {tab === "bills" && hasBalance && (
        <div className="card">
          <p className="card-title">Recurring bills &amp; income ({finances.items.filter(i => i.active && !i.id.startsWith("sub_")).length} active)</p>

            {/* Add bill form */}
            {addingBill ? (
              <div style={{ background: "var(--surface-raised)", borderRadius: "8px", padding: "12px", marginBottom: "14px", display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <input className="input" placeholder="Name (e.g. Rent)" value={newBill.name} autoFocus style={{ flex: "2 1 150px" }}
                    onChange={e => setNewBill(b => ({ ...b, name: e.target.value }))} />
                  <div style={{ display: "flex", alignItems: "center", gap: "4px", background: "var(--surface-overlay)", border: "1px solid var(--border)", borderRadius: "6px", padding: "0 10px", flex: "0 0 130px" }}>
                    <select style={{ background: "none", border: "none", outline: "none", color: "var(--text)", fontSize: "13px", fontFamily: "inherit", cursor: "pointer" }}
                      value={newBill.amount >= 0 ? "income" : "expense"}
                      onChange={e => setNewBill(b => ({ ...b, amount: e.target.value === "income" ? Math.abs(b.amount) : -Math.abs(b.amount) }))}>
                      <option value="expense">− Expense</option>
                      <option value="income">+ Income</option>
                    </select>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: "6px", padding: "0 10px", flex: "0 0 110px" }}>
                    <span style={{ color: "var(--text-3)", fontSize: "13px", marginRight: "4px" }}>$</span>
                    <input style={{ background: "none", border: "none", outline: "none", color: "var(--text)", fontSize: "13px", width: "70px", fontFamily: "inherit" }}
                      type="number" step="0.01" min="0" placeholder="0.00"
                      value={Math.abs(newBill.amount) || ""}
                      onChange={e => { const n = parseFloat(e.target.value) || 0; setNewBill(b => ({ ...b, amount: b.amount < 0 ? -n : n })); }} />
                  </div>
                  <select className="input" style={{ flex: "1 1 110px" }} value={newBill.category}
                    onChange={e => setNewBill(b => ({ ...b, category: e.target.value }))}>
                    {["Income","Transport","Household","Pets","Groceries","Credit Card","BNPL","Subscriptions","Debt","Transfer","Other"].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                  <select className="input" style={{ flex: "0 0 140px" }}
                    value={newBill.schedule.type}
                    onChange={e => {
                      const t = e.target.value as Schedule["type"];
                      const sched: Schedule = t === "monthly" ? { type: "monthly", dayOfMonth: 1 }
                        : t === "weekly" ? { type: "weekly", dayOfWeek: 0 }
                        : t === "biweekly" ? { type: "biweekly", anchorDate: new Date().toISOString().slice(0,10) }
                        : t === "yearly" ? { type: "yearly", month: 1, day: 1 }
                        : t === "quarterly" ? { type: "quarterly", anchorDate: new Date().toISOString().slice(0,10) }
                        : { type: "once", date: new Date().toISOString().slice(0,10) };
                      setNewBill(b => ({ ...b, schedule: sched }));
                    }}>
                    <option value="monthly">Monthly</option>
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Every 2 weeks</option>
                    <option value="yearly">Yearly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="once">One-time</option>
                  </select>
                  {newBill.schedule.type === "monthly" && (
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ fontSize: "12.5px", color: "var(--text-3)" }}>Day of month:</span>
                      <input className="input" type="number" min="1" max="28" style={{ width: "60px" }}
                        value={(newBill.schedule as { type: "monthly"; dayOfMonth: number }).dayOfMonth}
                        onChange={e => setNewBill(b => ({ ...b, schedule: { type: "monthly", dayOfMonth: parseInt(e.target.value) || 1 } }))} />
                    </div>
                  )}
                  {newBill.schedule.type === "weekly" && (
                    <select className="input" style={{ flex: "0 0 120px" }}
                      value={(newBill.schedule as { type: "weekly"; dayOfWeek: number }).dayOfWeek}
                      onChange={e => setNewBill(b => ({ ...b, schedule: { type: "weekly", dayOfWeek: parseInt(e.target.value) } }))}>
                      {["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"].map((d,i) => <option key={d} value={i}>{d}</option>)}
                    </select>
                  )}
                  {(newBill.schedule.type === "biweekly" || newBill.schedule.type === "quarterly") && (
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ fontSize: "12.5px", color: "var(--text-3)" }}>Starting:</span>
                      <input className="input" type="date" style={{ width: "150px" }}
                        value={(newBill.schedule as { anchorDate: string }).anchorDate}
                        onChange={e => setNewBill(b => ({ ...b, schedule: { ...b.schedule, anchorDate: e.target.value } as Schedule }))} />
                    </div>
                  )}
                  {newBill.schedule.type === "yearly" && (
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ fontSize: "12.5px", color: "var(--text-3)" }}>Month:</span>
                      <input className="input" type="number" min="1" max="12" style={{ width: "60px" }}
                        value={(newBill.schedule as { type: "yearly"; month: number; day: number }).month}
                        onChange={e => setNewBill(b => ({ ...b, schedule: { ...(b.schedule as { type: "yearly"; month: number; day: number }), month: parseInt(e.target.value) || 1 } }))} />
                      <span style={{ fontSize: "12.5px", color: "var(--text-3)" }}>Day:</span>
                      <input className="input" type="number" min="1" max="31" style={{ width: "60px" }}
                        value={(newBill.schedule as { type: "yearly"; month: number; day: number }).day}
                        onChange={e => setNewBill(b => ({ ...b, schedule: { ...(b.schedule as { type: "yearly"; month: number; day: number }), day: parseInt(e.target.value) || 1 } }))} />
                    </div>
                  )}
                  {newBill.schedule.type === "once" && (
                    <input className="input" type="date" style={{ width: "150px" }}
                      value={(newBill.schedule as { date: string }).date}
                      onChange={e => setNewBill(b => ({ ...b, schedule: { type: "once", date: e.target.value } }))} />
                  )}
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button className="btn btn-primary" onClick={addBill}>Add bill</button>
                  <button className="btn btn-secondary" onClick={() => setAddingBill(false)}>Cancel</button>
                </div>
              </div>
            ) : (
              <button className="btn btn-secondary" style={{ fontSize: "12px", padding: "4px 12px", marginBottom: "12px" }}
                onClick={() => setAddingBill(true)}>+ Add recurring bill or income</button>
            )}

            <p style={{ fontSize: "11.5px", color: "var(--text-3)", marginBottom: "12px" }}>
              Pencil = change all future amounts. To edit just one occurrence, use the pencil in the cash flow table above.
            </p>

            {oucCurrentMonthly > 0 && (
              <div style={{ background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: "8px", padding: "10px 12px", marginBottom: "14px", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "12.5px", color: "var(--text-2)" }}>OUC monthly bill (varies by season):</span>
                {editingOuc ? (
                  <>
                    <div style={{ display: "flex", alignItems: "center", background: "var(--surface-overlay)", border: "1px solid var(--border)", borderRadius: "6px", padding: "0 10px" }}>
                      <span style={{ color: "var(--text-3)", fontSize: "13px", marginRight: "4px" }}>$</span>
                      <input autoFocus style={{ background: "none", border: "none", outline: "none", color: "var(--text)", fontSize: "13px", width: "80px", fontFamily: "inherit" }}
                        type="number" step="0.01" min="0" placeholder={oucCurrentMonthly.toFixed(2)}
                        value={oucInput}
                        onChange={e => setOucInput(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") saveOucMonthly(parseFloat(oucInput) || 0); if (e.key === "Escape") setEditingOuc(false); }} />
                    </div>
                    <button className="btn btn-primary" style={{ fontSize: "11px", padding: "3px 10px" }} onClick={() => saveOucMonthly(parseFloat(oucInput) || 0)}>Save</button>
                    <button className="btn btn-secondary" style={{ fontSize: "11px", padding: "3px 10px" }} onClick={() => setEditingOuc(false)}>Cancel</button>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--text)" }}>{fmt$(-oucCurrentMonthly)}</span>
                    <span style={{ fontSize: "11.5px", color: "var(--text-3)" }}>→ {fmt$(-oucCurrentMonthly / 4)}/week × 4</span>
                    <button className="btn-icon" title="Update this month's OUC bill" onClick={() => { setOucInput(""); setEditingOuc(true); }}><PencilIcon /></button>
                  </>
                )}
              </div>
            )}

            {["Income","Transport","Household","Pets","Groceries","Credit Card","BNPL","Subscriptions","Debt","Transfer","Other"].map(cat => {
              const catItems = finances.items.filter(it => it.category === cat && !it.id.startsWith("sub_"));
              if (!catItems.length) return null;
              return (
                <details key={cat} style={{ marginBottom: "8px" }} open={cat === "Income"}>
                  <summary style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.07em", padding: "5px 0", cursor: "pointer", userSelect: "none" }}>
                    {CATEGORY_META[cat] ?? ""} {cat} ({catItems.length})
                  </summary>
                  {catItems.map(item => {
                    const s = item.schedule;
                    const schedLabel = s.type === "monthly"   ? `${s.dayOfMonth}th of month`
                                      : s.type === "weekly"   ? ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][s.dayOfWeek] + " weekly"
                                      : s.type === "biweekly" ? "Every 2 weeks"
                                      : s.type === "yearly"   ? `${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][s.month-1]} ${s.day}`
                                      : s.type === "quarterly"? "Quarterly"
                                      : "One-time";
                    const isBillEditing = editingBill?.id === item.id;
                    const isEndDateEditing = editingBillEndDate === item.id;
                    return (
                      <div key={item.id} style={{ marginBottom: "10px", background: "var(--surface-raised)", borderRadius: "6px", padding: "8px", border: "1px solid var(--border)" }}>
                        <div className="row" style={{ padding: "0", opacity: item.active ? 1 : 0.35, alignItems: "center", marginBottom: "6px" }}
                          onMouseEnter={e => e.currentTarget.querySelectorAll<HTMLElement>(".bill-act").forEach(el => el.style.opacity = "1")}
                          onMouseLeave={e => e.currentTarget.querySelectorAll<HTMLElement>(".bill-act").forEach(el => el.style.opacity = "0")}>
                          <div style={{ flex: 1 }}>
                            <span style={{ fontSize: "13.5px", color: "var(--text)" }}>{item.name}</span>
                            {isEndDateEditing ? (
                              <div style={{ marginTop: "6px", display: "flex", gap: "6px", alignItems: "center" }}>
                                <span style={{ fontSize: "11px", color: "var(--text-3)" }}>Ends:</span>
                                <input type="date" className="input" value={endDateInput} autoFocus
                                  onChange={e => setEndDateInput(e.target.value)} style={{ flex: 0, width: "150px" }} />
                                <button className="btn btn-primary" style={{ fontSize: "10px", padding: "3px 10px" }} onClick={() => saveBillEndDate(item.id)}>Save</button>
                                <button className="btn btn-secondary" style={{ fontSize: "10px", padding: "3px 10px" }} onClick={() => setEditingBillEndDate(null)}>Cancel</button>
                                {item.endDate && <button className="btn btn-secondary" style={{ fontSize: "10px", padding: "3px 10px", color: "var(--red)" }} onClick={() => clearBillEndDate(item.id)}>Clear</button>}
                              </div>
                            ) : (
                              <>
                                {item.endDate && <span style={{ fontSize: "11px", color: "var(--text-3)", marginLeft: "8px" }}>ends {fmtDate(item.endDate)}</span>}
                                <span style={{ fontSize: "11.5px", color: "var(--text-3)", marginLeft: "8px" }}>{schedLabel}</span>
                              </>
                            )}
                          </div>
                          {isBillEditing ? (
                            <AmountEditor current={item.amount} onSave={val => saveBillAmount(item.id, val)} onCancel={() => setEditingBill(null)} />
                          ) : (
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <span style={{ fontSize: "13.5px", fontWeight: 600, fontVariantNumeric: "tabular-nums", color: item.amount > 0 ? "var(--green)" : "var(--text-2)" }}>
                                {fmt$(item.amount)}
                              </span>
                              <button className="btn-icon bill-act" title="Edit base amount" style={{ opacity: 0 }}
                                onClick={() => setEditingBill({ id: item.id, field: "amount" })}><PencilIcon /></button>
                            </div>
                          )}
                          <button className="btn-icon bill-act" title="Edit end date" style={{ opacity: 0 }}
                            onClick={() => { setEditingBillEndDate(item.id); setEndDateInput(item.endDate ?? ""); }}><PencilIcon /></button>
                          <button className="btn btn-secondary" style={{ fontSize: "11px", padding: "3px 9px", flexShrink: 0 }}
                            onClick={() => { const u = { ...finances, items: finances.items.map(it => it.id === item.id ? { ...it, active: !it.active } : it) }; setFinances(u); save(u); }}>
                            {item.active ? "Pause" : "Resume"}
                          </button>
                          <button className="btn-icon bill-act" title="Delete" style={{ opacity: 0, color: "var(--red)" }} onClick={() => deleteBill(item.id)}><XIcon /></button>
                        </div>
                      </div>
                    );
                  })}
                </details>
              );
            })}

            {/* BNPL Plans section */}
            <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px solid var(--border)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                  <p style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.07em", margin: 0 }}>
                    💳 BNPL PLANS ({bnplPlans.length})
                  </p>
                  {!addingBnpl && (
                    <button className="btn btn-secondary" style={{ fontSize: "11px", padding: "3px 10px" }} onClick={() => setAddingBnpl(true)}>+ Add Plan</button>
                  )}
                </div>

                {addingBnpl && (
                  <div style={{ background: "var(--surface-raised)", borderRadius: "6px", padding: "10px", border: "1px solid var(--accent)", marginBottom: "10px", display: "flex", flexDirection: "column", gap: "8px" }}>
                    <input className="input" type="text" placeholder="Name (e.g. Amazon, Best Buy…)" value={newBnpl.name}
                      onChange={e => setNewBnpl({ ...newBnpl, name: e.target.value })} style={{ fontSize: "13px" }} autoFocus />
                    <input className="input" type="text" placeholder="Provider (e.g. Affirm, Klarna…)" value={newBnpl.provider}
                      onChange={e => setNewBnpl({ ...newBnpl, provider: e.target.value })} style={{ fontSize: "13px" }} />
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      <div style={{ display: "flex", alignItems: "center", background: "var(--surface-overlay)", border: "1px solid var(--border)", borderRadius: "6px", padding: "0 10px", flex: "1 1 100px" }}>
                        <span style={{ color: "var(--text-3)", fontSize: "13px", marginRight: "4px" }}>$</span>
                        <input style={{ background: "none", border: "none", outline: "none", color: "var(--text)", fontSize: "13px", width: "100%", padding: "8px 0", fontFamily: "inherit" }}
                          type="number" step="0.01" min="0" placeholder="Amount / payment"
                          value={newBnpl.amount} onChange={e => setNewBnpl({ ...newBnpl, amount: e.target.value })} />
                      </div>
                      <input className="input" type="number" min="1" step="1" placeholder="# payments" value={newBnpl.numPayments}
                        onChange={e => setNewBnpl({ ...newBnpl, numPayments: e.target.value })} style={{ fontSize: "13px", flex: "0 0 110px" }} />
                      <select className="input" value={newBnpl.frequency}
                        onChange={e => setNewBnpl({ ...newBnpl, frequency: e.target.value as BNPLFrequency })}
                        style={{ fontSize: "13px", flex: "0 0 120px" }}>
                        <option value="weekly">Weekly</option>
                        <option value="biweekly">Biweekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                      <input className="input" type="date" value={newBnpl.startDate}
                        onChange={e => setNewBnpl({ ...newBnpl, startDate: e.target.value })} style={{ fontSize: "13px", flex: "0 0 148px" }} />
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button className="btn btn-primary" style={{ fontSize: "12px", padding: "6px 14px" }} onClick={addBnplPlan}>Add Plan</button>
                      <button className="btn btn-secondary" style={{ fontSize: "12px", padding: "6px 14px" }} onClick={() => setAddingBnpl(false)}>Cancel</button>
                    </div>
                  </div>
                )}

                {bnplPlans.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {bnplPlans.map(plan => {
                    const today = todayStr();
                    const futureInstallments = plan.installments.filter(i => i.date >= today).sort((a, b) => a.date.localeCompare(b.date));
                    const pastInstallments = plan.installments.filter(i => i.date < today).sort((a, b) => a.date.localeCompare(b.date));
                    const completedInstallments = pastInstallments.length;
                    const paymentsLeft = futureInstallments.length; // always derived live — never trust the stored count
                    const progress = plan.totalInstallments > 0 ? (completedInstallments / plan.totalInstallments) * 100 : 100;
                    const nextInstallment = futureInstallments[0];
                    const isExpanded = expandedBnplId === plan.id;
                    return (
                      <div key={plan.id} style={{ background: "var(--surface-raised)", borderRadius: "6px", padding: "10px", border: "1px solid var(--border)" }}>
                        <div className="row" style={{ padding: "0", alignItems: "flex-start", marginBottom: "8px" }}>
                          <div style={{ flex: 1 }}>
                            {editingBnplNameId === plan.id ? (
                              <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "2px" }}>
                                <input type="text" autoFocus value={bnplNameInput}
                                  onChange={e => setBnplNameInput(e.target.value)}
                                  onKeyDown={e => { if (e.key === "Enter") { renameBnplPlan(plan.id, bnplNameInput); setEditingBnplNameId(null); } if (e.key === "Escape") setEditingBnplNameId(null); }}
                                  style={{ background: "var(--surface-overlay)", border: "1px solid var(--accent)", borderRadius: "4px", color: "var(--text)", fontSize: "13.5px", fontWeight: 600, padding: "2px 6px", fontFamily: "inherit", outline: "none" }} />
                                <button className="btn-icon" title="Save" style={{ color: "var(--green)" }}
                                  onClick={() => { renameBnplPlan(plan.id, bnplNameInput); setEditingBnplNameId(null); }}><CheckIcon /></button>
                                <button className="btn-icon" title="Cancel" onClick={() => setEditingBnplNameId(null)}><XIcon /></button>
                              </div>
                            ) : (
                              <div style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--text)", marginBottom: "2px", display: "flex", alignItems: "center", gap: "6px" }}>
                                {plan.merchant}
                                <button className="btn-icon" title="Rename" style={{ opacity: 0.4 }}
                                  onClick={() => { setEditingBnplNameId(plan.id); setBnplNameInput(plan.merchant); }}><PencilIcon /></button>
                                <button className="btn-icon" title="Delete plan" style={{ opacity: 0.4, marginLeft: "auto" }}
                                  onClick={() => { if (confirm(`Remove ${plan.merchant} from BNPL plans?`)) deleteBnplPlan(plan.id); }}><XIcon /></button>
                              </div>
                            )}
                            <div style={{ fontSize: "11px", color: "var(--text-3)", marginBottom: "2px", display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                              <span>{plan.provider} •</span>
                              <select value={plan.frequency ?? "monthly"} onChange={e => setBnplFrequency(plan.id, e.target.value as BNPLFrequency)}
                                style={{ background: "var(--surface-overlay)", border: "1px solid var(--border)", borderRadius: "4px", color: "var(--text-3)", fontSize: "11px", padding: "1px 4px", fontFamily: "inherit" }}>
                                <option value="weekly">Weekly</option>
                                <option value="biweekly">Biweekly</option>
                                <option value="monthly">Monthly</option>
                              </select>
                              <span>•</span>
                              {editingBnplId === plan.id ? (
                                <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                  <input
                                    type="number" min="0" step="1" autoFocus
                                    value={bnplPaymentsInput}
                                    onChange={e => setBnplPaymentsInput(e.target.value)}
                                    onKeyDown={e => {
                                      if (e.key === "Enter") { const n = parseInt(bnplPaymentsInput, 10); if (!isNaN(n)) updateBnplPaymentsRemaining(plan.id, n); }
                                      if (e.key === "Escape") setEditingBnplId(null);
                                    }}
                                    style={{ width: "48px", background: "var(--surface-overlay)", border: "1px solid var(--accent)", borderRadius: "4px", color: "var(--text)", fontSize: "11px", padding: "1px 4px", fontFamily: "inherit", outline: "none" }}
                                  />
                                  <span>payments left</span>
                                  <button className="btn-icon" title="Save" style={{ color: "var(--green)" }}
                                    onClick={() => { const n = parseInt(bnplPaymentsInput, 10); if (!isNaN(n)) updateBnplPaymentsRemaining(plan.id, n); }}><CheckIcon /></button>
                                  <button className="btn-icon" title="Cancel" onClick={() => setEditingBnplId(null)}><XIcon /></button>
                                </span>
                              ) : (
                                <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                  {paymentsLeft} payments left
                                  <button className="btn-icon" title="Edit payments left" style={{ opacity: 0.5 }}
                                    onClick={() => { setEditingBnplId(plan.id); setBnplPaymentsInput(String(paymentsLeft)); }}><PencilIcon /></button>
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: "11px", color: "var(--text-3)" }}>Original: {fmt$(plan.originalAmount)} | Paid: {fmt$(plan.paidToDate)} | Remaining: {fmt$(plan.remainingBalance)}</div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: "13.5px", fontWeight: 600, fontVariantNumeric: "tabular-nums", color: "var(--text-2)", marginBottom: "4px" }}>{fmt$(plan.remainingBalance)}</div>
                            <button className="btn-icon" title={isExpanded ? "Hide installments" : "Show installments"}
                              style={{ fontSize: "10px", color: "var(--text-3)", background: "var(--surface-overlay)", padding: "2px 6px", borderRadius: "3px", display: "inline-block", border: "none", cursor: "pointer", fontFamily: "inherit" }}
                              onClick={() => setExpandedBnplId(isExpanded ? null : plan.id)}>
                              {completedInstallments}/{plan.totalInstallments} {isExpanded ? "▲" : "▼"}
                            </button>
                          </div>
                        </div>
                        <div style={{ background: "var(--surface-overlay)", height: "4px", borderRadius: "2px", overflow: "hidden", marginBottom: "8px" }}>
                          <div style={{ background: "var(--green)", height: "100%", width: `${progress}%` }}></div>
                        </div>
                        {nextInstallment && (
                          <div style={{ fontSize: "11px", color: "var(--text-3)" }}>
                            Next: {fmt$(nextInstallment.amount)} on {fmtDate(nextInstallment.date)}{nextInstallment.isEstimated ? " (est.)" : ""}
                          </div>
                        )}
                        {isExpanded && (
                          <div style={{ marginTop: "8px", paddingTop: "8px", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "4px" }}>
                            {plan.installments.length === 0 && <div style={{ fontSize: "11px", color: "var(--text-3)" }}>No installments.</div>}
                            {[...plan.installments].sort((a, b) => a.date.localeCompare(b.date)).map(inst => (
                              <div key={inst.date} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "11.5px" }}>
                                <span style={{ color: inst.date < today ? "var(--text-3)" : "var(--text-2)", opacity: inst.date < today ? 0.6 : 1 }}>
                                  {fmtDate(inst.date)}{inst.isEstimated ? " (est.)" : ""}{inst.date < today ? " ✓" : ""}
                                </span>
                                <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                  <span style={{ fontVariantNumeric: "tabular-nums", color: "var(--text-2)" }}>{fmt$(inst.amount)}</span>
                                  <button className="btn-icon" title="Remove this installment" style={{ opacity: 0.5 }}
                                    onClick={() => deleteBnplInstallment(plan.id, inst.date)}><XIcon /></button>
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                )}
              </div>

            {/* Subscription-synced items read-only section */}
            {finances.items.some(it => it.id.startsWith("sub_")) && (
              <div style={{ marginTop: "8px", paddingTop: "12px", borderTop: "1px solid var(--border)" }}>
                <p style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "5px" }}>
                  From Subscriptions <a href="/subscriptions" style={{ fontSize: "10px", color: "var(--accent)", marginLeft: "6px", textDecoration: "none", fontWeight: 400 }}>Manage →</a>
                </p>
                {finances.items.filter(it => it.id.startsWith("sub_")).map(item => (
                  <div key={item.id} className="row" style={{ padding: "5px 8px", opacity: item.active ? 0.7 : 0.3 }}>
                    <span style={{ flex: 1, fontSize: "13px", color: "var(--text-2)" }}>{item.name}</span>
                    <span style={{ fontSize: "13px", fontWeight: 600, fontVariantNumeric: "tabular-nums", color: "var(--text-2)" }}>{fmt$(item.amount)}</span>
                  </div>
                ))}
              </div>
            )}
        </div>
      )}
    </div>
  );
}
