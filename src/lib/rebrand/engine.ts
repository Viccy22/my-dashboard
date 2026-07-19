// ============================================================================
// The Rebrand — the task engine (spec §15) and body math (spec §8)
//
// The engine's whole job: given a date and the task definitions, decide which
// tasks apply that day and attach today's done/skipped state. It must NEVER
// branch on a task's category — adding a new category or task type requires
// zero changes here. That's the test the spec sets (§15).
// ============================================================================

import type {
  RebrandSettings,
  TaskCompletion,
  TaskDefinition,
  TodayTask,
  WeightEntry,
} from "./types";
import { TIME_BLOCK_ORDER } from "./types";

// A YYYY-MM-DD string for a Date, in LOCAL time (not UTC — we care about the
// user's calendar day, and she checks tasks off at 5am her time).
export function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayStr(): string {
  return toDateStr(new Date());
}

// Parse a YYYY-MM-DD as a LOCAL date (append T00:00:00 so it isn't shifted to
// the previous day by the browser's timezone).
function parseLocal(dateStr: string): Date {
  return new Date(dateStr + "T00:00:00");
}

// Is `dateStr` the first occurrence of its own weekday in its month? Used for
// `monthly` tasks — e.g. "first Saturday of the month". True when the day of
// the month is 1–7 (any weekday's first occurrence is always in that window).
function isFirstWeekdayOfMonth(dateStr: string): boolean {
  const dom = parseLocal(dateStr).getDate();
  return dom >= 1 && dom <= 7;
}

// ---------------------------------------------------------------------------
// The core rule: does this definition apply on this date? (spec §15 step 2)
// ---------------------------------------------------------------------------
export function taskAppliesOnDate(t: TaskDefinition, dateStr: string): boolean {
  const dow = parseLocal(dateStr).getDay(); // 0=Sun … 6=Sat
  switch (t.recurrence) {
    case "daily":
      return true;
    case "weekdays":
      return dow >= 1 && dow <= 5;
    case "specific_days":
    case "weekly":
      return t.daysOfWeek.includes(dow);
    case "monthly":
      return t.daysOfWeek.includes(dow) && isFirstWeekdayOfMonth(dateStr);
    case "once":
      return t.onceDate === dateStr;
  }
}

// ---------------------------------------------------------------------------
// getTasksForDate — the one function the spec asked for (§15).
// 1. active definitions   2. filter by recurrence   3. attach completion state
// 4. sort by time_block then sort_order. Non-negotiables are surfaced via the
// isNonNegotiable flag already on each task; the UI does the pinning.
// ---------------------------------------------------------------------------
export function getTasksForDate(
  definitions: TaskDefinition[],
  completions: TaskCompletion[],
  dateStr: string
): TodayTask[] {
  // Index completions by taskId for this date so the join is O(1) per task.
  const onThisDay = new Map<string, TaskCompletion>();
  for (const c of completions) {
    if (c.date === dateStr) onThisDay.set(c.taskId, c);
  }

  const tasks = definitions
    .filter((t) => t.active && taskAppliesOnDate(t, dateStr))
    .map((t): TodayTask => {
      const c = onThisDay.get(t.id);
      return { ...t, done: !!c && !c.skipped, skipped: !!c && c.skipped };
    });

  tasks.sort((a, b) => {
    const ba = TIME_BLOCK_ORDER.indexOf(a.timeBlock);
    const bb = TIME_BLOCK_ORDER.indexOf(b.timeBlock);
    if (ba !== bb) return ba - bb;
    return a.sortOrder - b.sortOrder;
  });

  return tasks;
}

// ---------------------------------------------------------------------------
// Completion mutations. Checking a box INSERTS a completion; unchecking DELETES
// it (spec §15 — no update path). Skipping toggles the skipped flag.
// These are pure: they return a new completions array.
// ---------------------------------------------------------------------------
export function setCompletion(
  completions: TaskCompletion[],
  taskId: string,
  dateStr: string,
  state: "done" | "skipped" | "none"
): TaskCompletion[] {
  // Always drop any existing record for this (task, date) first.
  const without = completions.filter((c) => !(c.taskId === taskId && c.date === dateStr));
  if (state === "none") return without;
  return [
    ...without,
    { taskId, date: dateStr, skipped: state === "skipped", completedAt: new Date().toISOString() },
  ];
}

// Convenience for the checkbox: done ⇄ none.
export function toggleDone(completions: TaskCompletion[], taskId: string, dateStr: string, currentlyDone: boolean): TaskCompletion[] {
  return setCompletion(completions, taskId, dateStr, currentlyDone ? "none" : "done");
}

// ---------------------------------------------------------------------------
// The headline for a day, e.g. "Wednesday — Closet day" (spec §16).
// Reads the day's zone task (a non-negotiable home task with a zone) if there
// is one; otherwise just the weekday.
// ---------------------------------------------------------------------------
const ZONE_WORD: Record<string, string> = {
  kitchen: "Kitchen",
  living_room: "Living room",
  bedroom: "Bedroom",
  bathroom: "Bathroom",
  closet: "Closet",
  entryway: "Entryway",
};

export function dayHeadline(tasks: TodayTask[], dateStr: string): string {
  const weekday = parseLocal(dateStr).toLocaleDateString("en-US", { weekday: "long" });
  const dow = parseLocal(dateStr).getDay();
  if (dow === 0) return `${weekday} — no zone (rest)`;
  if (dow === 5) return `${weekday} — reset day`;
  // Find today's zone task among the non-negotiables.
  const zoneTask = tasks.find((t) => t.zone && t.isNonNegotiable && t.category === "home");
  if (zoneTask?.zone) return `${weekday} — ${ZONE_WORD[zoneTask.zone]} day`;
  if (dow === 6) return `${weekday} — Bathroom reset`;
  return weekday;
}

// ============================================================================
// BODY MATH (spec §8). All of this is DERIVED — never stored.
// ============================================================================

// BMR, Mifflin-St Jeor, female. Inputs: weight (lb), height (in), age.
export function bmr(weightLb: number, heightIn: number, age: number): number {
  return 10 * (weightLb / 2.2046) + 6.25 * (heightIn * 2.54) - 5 * age - 161;
}

export function tdee(bmrValue: number, activityMultiplier: number): number {
  return bmrValue * activityMultiplier;
}

// One point on the honest, decaying projection curve.
export type ProjectionPoint = { monthIndex: number; date: string; weight: number };

// Build the weight projection month by month. Each month we recompute BMR from
// THAT month's weight, so the curve decays honestly as she gets lighter — the
// deficit shrinks as she does (spec §8). Stops at goal or after `maxMonths`.
export function projectWeightCurve(settings: RebrandSettings, startDate = new Date(), maxMonths = 30): ProjectionPoint[] {
  const points: ProjectionPoint[] = [];
  let weight = settings.startWeightLb;
  const d = new Date(startDate.getFullYear(), startDate.getMonth(), 1);

  for (let i = 0; i <= maxMonths; i++) {
    points.push({ monthIndex: i, date: toDateStr(d), weight: Math.round(weight * 10) / 10 });
    if (weight <= settings.goalWeightLb) break;

    // Recompute this month's burn from the current (lighter) weight.
    const monthlyDeficit = realDailyDeficit(settings, weight);
    const monthlyLoss = (monthlyDeficit * 30.4) / 3500;
    weight = Math.max(settings.goalWeightLb, weight - monthlyLoss);
    d.setMonth(d.getMonth() + 1);
  }
  return points;
}

// Real daily deficit at a given weight: (TDEE − intake) × adherence (spec §8).
// The adherence factor — not a lower calorie number — is the lever that
// shortens the timeline.
export function realDailyDeficit(settings: RebrandSettings, weightLb: number): number {
  const t = tdee(bmr(weightLb, settings.heightIn, settings.age), settings.activityMultiplier);
  return (t - settings.dailyCalorieTarget) * settings.adherenceFactor;
}

// Weekly loss rate (lb/week) at a given weight — for the "~1.2 lb/week now,
// ~0.6 near goal" note next to the chart.
export function weeklyLossAt(settings: RebrandSettings, weightLb: number): number {
  const daily = realDailyDeficit(settings, weightLb);
  return (daily * 7) / 3500;
}

// The date the curve crosses goal weight (spec: "around the turn of 2028").
export function projectedGoalDate(settings: RebrandSettings, startDate = new Date()): string | null {
  const curve = projectWeightCurve(settings, startDate);
  const hit = curve.find((p) => p.weight <= settings.goalWeightLb);
  return hit ? hit.date : null;
}

// ---------------------------------------------------------------------------
// Derived daily targets (spec §8). Fiber ramps over 6 weeks; water rises with
// it or it backfires.
// ---------------------------------------------------------------------------
export function proteinTarget(settings: RebrandSettings): number {
  return settings.goalWeightLb; // 1 g per lb of goal weight
}

// Fiber grams for a given number of weeks since starting (0-indexed weeks).
export function fiberTargetForWeek(weeksIn: number): number {
  if (weeksIn < 2) return 18;
  if (weeksIn < 4) return 24;
  if (weeksIn < 6) return 28;
  return 32;
}

export const WATER_TARGET_OZ = 100;
export const STEPS_TARGET = 10000;

// Most recent logged weight, or null.
export function latestWeight(log: WeightEntry[]): WeightEntry | null {
  if (log.length === 0) return null;
  return [...log].sort((a, b) => b.loggedOn.localeCompare(a.loggedOn))[0];
}
