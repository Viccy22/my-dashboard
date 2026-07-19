// ============================================================================
// The Rebrand — data model
//
// WHY this file exists: every other dashboard feature stores its state as a
// typed slice of one big JSONB blob (see `src/lib/db.ts` + `/api/data`). The
// Rebrand follows the same pattern so the whole app keeps ONE storage
// paradigm. These types are the §14 "data model" from the build spec, expressed
// as TypeScript instead of SQL tables — same shape, same fields, same rules.
//
// The golden rule (spec Rule 1): every fact lives in exactly ONE place. Task
// TEXT lives only in `TaskDefinition`. The Today view never stores its own copy
// of a task — it GENERATES the list from these definitions each day.
// ============================================================================

// Category is for DISPLAY GROUPING ONLY. The task engine must never branch on
// it — adding a new category requires zero engine changes (spec §15).
export type RebrandCategory =
  | "morning"
  | "home"
  | "laundry"
  | "dog"
  | "body"
  | "beauty"
  | "dental"
  | "mindset"
  | "evening";

// The six physical spaces that get cleaned (spec §3). Nullable on tasks that
// aren't tied to a room.
export type RebrandZone =
  | "kitchen"
  | "living_room"
  | "bedroom"
  | "bathroom"
  | "closet"
  | "entryway";

// How often a task recurs. The engine (getTasksForDate) turns this into a
// yes/no answer for any given date.
export type RebrandRecurrence =
  | "daily" //          every single day
  | "weekdays" //       Mon–Fri
  | "specific_days" //  only the weekdays listed in daysOfWeek
  | "weekly" //         once a week, on the single day in daysOfWeek
  | "monthly" //        the FIRST matching weekday of the month
  | "once"; //          a single calendar date (onceDate)

// When in the day a task happens. Drives the Today view's grouping order.
export type RebrandTimeBlock = "early_am" | "workday" | "after_work" | "evening";

export const TIME_BLOCK_ORDER: RebrandTimeBlock[] = [
  "early_am",
  "workday",
  "after_work",
  "evening",
];

export const TIME_BLOCK_LABELS: Record<RebrandTimeBlock, string> = {
  early_am: "Early AM",
  workday: "Workday",
  after_work: "After Work",
  evening: "Evening",
};

// A task RULE — not a daily instance. This is the single source of truth for a
// task's text and scheduling. Editable on the Home Systems page; read
// everywhere else.
export type TaskDefinition = {
  id: string;
  title: string; // short, scannable — what shows in the list
  detail: string; // the why/how, revealed on tap. NOT shown in the list.
  category: RebrandCategory;
  zone: RebrandZone | null;
  recurrence: RebrandRecurrence;
  daysOfWeek: number[]; // 0 = Sunday … 6 = Saturday
  timeBlock: RebrandTimeBlock;
  estMinutes: number;
  isNonNegotiable: boolean; // the five in §5 — pinned + styled distinctly
  active: boolean;
  sortOrder: number;
  onceDate?: string | null; // YYYY-MM-DD, only used when recurrence === "once"
};

// A completion exists as a row ONLY when a task was acted on that day (spec
// §14). No pre-generated rows. `skipped` lets "not today" be distinct from
// "not done yet" (a missing record).
export type TaskCompletion = {
  taskId: string;
  date: string; // YYYY-MM-DD — the day it applies to
  skipped: boolean;
  completedAt: string; // ISO timestamp of the tap
};

// The §8 body inputs. EVERYTHING derived (BMR, TDEE, the projection curve,
// protein/fiber/water targets) is calculated in code from these — never stored.
export type RebrandSettings = {
  heightIn: number;
  age: number;
  startWeightLb: number;
  goalWeightLb: number;
  activityMultiplier: number;
  dailyCalorieTarget: number;
  adherenceFactor: number;
  wakeTime: string; // "HH:MM"
  workStart: string;
  workEndMonThu: string;
  workEndFri: string;
  lightsOut: string;
};

export type WeightEntry = {
  id: string;
  loggedOn: string; // YYYY-MM-DD, one per day
  weightLb: number;
};

// The §8 weekly-review fields. self_trust is the load-bearing metric.
export type WeeklyReview = {
  id: string;
  weekEnding: string; // YYYY-MM-DD, unique
  weightLb: number | null;
  pilatesSessions: number; // /5
  armSessions: number; // /5
  steps10kDays: number; // /5
  proteinDays: number; // /7
  nightRoutineDays: number; // /7
  bathroomDone: boolean;
  selfTrust: number; // /10 — fraction of promises to self kept
  oneSentence: string;
};

// Static teaching copy (bathroom protocol, hand-wash steps, dentist
// expectations, Mel Robbins tools…). In data, not hardcoded, so copy can be
// edited without a redeploy (spec §14).
export type ReferenceItem = {
  id: string;
  section: string; // e.g. "bathroom_protocol"
  subsection: string; // e.g. "layer_1" ("" if none)
  heading: string;
  body: string; // markdown-ish plain text
  sortOrder: number;
};

// The §12 Brand Core worksheet — seeded, editable.
export type BrandCoreItem = {
  id: string;
  prompt: string;
  answer: string;
  sortOrder: number;
};

export type RoadmapStatus = "not_started" | "booked" | "done" | "decided_against";

// The §10 October-onward paid roadmap. `gatedUntil` powers the UI lock.
export type RoadmapItem = {
  id: string;
  phase: number; // 1–4
  targetMonth: string; // "Oct 2026"
  title: string;
  detail: string;
  costEstimate: string; // "$120–180"
  status: RoadmapStatus;
  gatedUntil: string | null; // YYYY-MM-DD — locked until this date
  sortOrder: number;
};

// The whole Rebrand slice of the dashboard blob. `seedVersion` lets the seed
// script run idempotently — re-running only fills in what's missing (spec §18).
export type RebrandData = {
  taskDefinitions: TaskDefinition[];
  completions: TaskCompletion[];
  settings: RebrandSettings;
  weightLog: WeightEntry[];
  weeklyReviews: WeeklyReview[];
  referenceContent: ReferenceItem[];
  brandCore: BrandCoreItem[];
  roadmapItems: RoadmapItem[];
  seedVersion: number;
};

// A task as the Today view sees it: the definition plus today's state.
// Generated on the fly — never persisted.
export type TodayTask = TaskDefinition & {
  done: boolean;
  skipped: boolean;
};
