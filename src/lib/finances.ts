export type Schedule =
  | { type: "monthly";   dayOfMonth: number }
  | { type: "weekly";    dayOfWeek: number }
  | { type: "biweekly";  anchorDate: string }
  | { type: "yearly";    month: number; day: number }
  | { type: "quarterly"; anchorDate: string }
  | { type: "once";      date: string };

export type RecurringItem = {
  id: string;
  name: string;
  amount: number;
  schedule: Schedule;
  category: string;
  endDate?: string;
  active: boolean;
};

export function itemAppliesToDate(item: RecurringItem, dateStr: string): boolean {
  if (!item.active) return false;
  if (item.endDate && dateStr > item.endDate) return false;
  const date = new Date(dateStr + "T00:00:00");
  switch (item.schedule.type) {
    case "monthly":   return date.getDate() === item.schedule.dayOfMonth;
    case "weekly":    return date.getDay()  === item.schedule.dayOfWeek;
    case "biweekly": {
      const anchor = new Date(item.schedule.anchorDate + "T00:00:00");
      const diff   = Math.round((date.getTime() - anchor.getTime()) / 86400000);
      return diff >= 0 && diff % 14 === 0;
    }
    case "yearly":    return (date.getMonth() + 1) === item.schedule.month && date.getDate() === item.schedule.day;
    case "quarterly": {
      const anchor = new Date(item.schedule.anchorDate + "T00:00:00");
      const diff   = Math.round((date.getTime() - anchor.getTime()) / 86400000);
      return diff >= 0 && diff % 91 === 0;
    }
    case "once": return dateStr === item.schedule.date;
  }
}

// ── Paycheck + overtime source-of-truth ─────────────────────────────────────
// Canonical paycheck and OT facts and pure helpers. Both the Bills & Budget
// page and the Overtime Planner read from here so take-home pay is derived in
// exactly one place (financial handoff §3.2, "single source of truth").

// Net take-home per paycheck, from the 7/17/26 paystub.
// $1,531.77 before the new 401(k) loan deduction begins; $1,405.53 after.
export const PAYCHECK = {
  netPreLoan: 1531.77,
  netPostLoan: 1405.53,
  // Paydays land on FRIDAYS (new bank does not release 2 days early). The whole
  // biweekly cadence sits on the 2026-07-03 + 14-day grid.
  anchor: "2026-07-03",
  // First post-loan check — the 401(k) loan repayment starts this pay period.
  // User-editable in the planner; changing it reflows every projection.
  loanFirstDeductionDate: "2026-09-11",
} as const;

// Overtime constants (handoff §3.1). OT is time-and-a-half; net uses a flat
// marginal-rate approximation (conservative — real net runs slightly higher).
export const OT = {
  baseHourly: 26.98,
  otHourlyGross: 40.47, // 1.5×
  fedMarginal: 0.22,
  fica: 0.0765, // OASDI 6.2% + Medicare 1.45%
  state: 0, // Florida
  otHourlyNet: 28.47, // 40.47 × (1 − 0.22 − 0.0765), rounded
  weeksPerPeriod: 2,
  maxOtHrsPerWeek: 40,
} as const;

// Confirmed mandatory OT (handoff §2.2): 5 hours worked on a Saturday, landing
// on the given Friday check. Amounts shift with the payday, not the work date.
export const MANDATORY_OT_HOURS: Record<string, number> = {
  "2026-09-11": 5, // worked Sat Aug 29
  "2026-10-09": 5, // worked Sat Sep 26
  "2026-11-06": 5, // worked Sat Oct 24
};

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function fmt$(n: number): string {
  return (n < 0 ? "-$" : "$") + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function fmtDate(s: string): string {
  return new Date(s + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// Base (no-OT) take-home for a given pay date, using the loan-deduction pivot.
export function baseNetForDate(payDate: string, loanFirstDeductionDate: string): number {
  return payDate >= loanFirstDeductionDate ? PAYCHECK.netPostLoan : PAYCHECK.netPreLoan;
}

// Net pay from overtime hours worked on a single check.
export function otNetForHours(hoursOnCheck: number): number {
  return round2(hoursOnCheck * OT.otHourlyNet);
}

// All biweekly Friday paydays in [fromDate, toDate] inclusive, on the canonical grid.
export function paydaysBetween(fromDate: string, toDate: string): string[] {
  const out: string[] = [];
  let d: string = PAYCHECK.anchor;
  // Fast-forward toward the window without an unbounded loop.
  while (d < fromDate) d = addDays(d, 14);
  while (d <= toDate) {
    out.push(d);
    d = addDays(d, 14);
  }
  return out;
}

export type PaycheckProjection = {
  date: string;
  isPostLoan: boolean;
  baseNet: number;
  otHours: number;
  otNet: number;
  totalNet: number;
};

// One row per payday with base pay, OT, and total — the object every downstream
// view (cash flow, budget, goals, mortgage capacity) should read.
export function projectPaychecks(
  fromDate: string,
  toDate: string,
  loanFirstDeductionDate: string,
  hoursByPayDate: Record<string, number>,
): PaycheckProjection[] {
  return paydaysBetween(fromDate, toDate).map(date => {
    const baseNet = baseNetForDate(date, loanFirstDeductionDate);
    const otHours = hoursByPayDate[date] ?? 0;
    const otNet = otNetForHours(otHours);
    return { date, isPostLoan: date >= loanFirstDeductionDate, baseNet, otHours, otNet, totalNet: round2(baseNet + otNet) };
  });
}
