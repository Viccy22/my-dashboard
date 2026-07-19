// ============================================================================
// The Rebrand — data access (spec §20: "All DB queries in lib/rebrand/…")
//
// Every dashboard feature reads/writes one shared JSONB blob via /api/data.
// This module is the Rebrand's slice of that: load, seed idempotently, and
// save — without ever clobbering another feature's data in the blob.
// ============================================================================

import type { RebrandData, TaskDefinition, WeightEntry } from "./types";
import {
  SEED_BRAND_CORE,
  SEED_REFERENCE,
  SEED_ROADMAP,
  SEED_SETTINGS,
  SEED_TASKS,
  SEED_VERSION,
} from "./seed";

// The whole dashboard blob is an open record; we only ever touch `rebrand`.
export type DashData = { rebrand?: RebrandData; [key: string]: unknown };

function emptyRebrand(): RebrandData {
  return {
    taskDefinitions: [],
    completions: [],
    settings: { ...SEED_SETTINGS },
    weightLog: [],
    weeklyReviews: [],
    referenceContent: [],
    brandCore: [],
    roadmapItems: [],
    seedVersion: 0,
  };
}

// Upsert-by-id merge: keep every existing row (with your edits), add any seed
// row whose id isn't present yet. This is what makes re-seeding idempotent and
// safe to re-run (spec §18). It never deletes or overwrites your rows.
function mergeById<T extends { id: string }>(existing: T[], seed: T[]): T[] {
  const seen = new Set(existing.map((r) => r.id));
  const additions = seed.filter((r) => !seen.has(r.id));
  return [...existing, ...additions];
}

// One-time corrections to fields on EXISTING task rows, keyed to the seed
// version they shipped in. mergeById only adds missing rows — it deliberately
// never touches a row you already have (so your edits always win). A genuine
// bug fix to a seeded task's schedule has to go here instead, gated so it only
// ever applies once per version bump and never re-applies after that.
const VERSIONED_PATCHES: { minVersion: number; taskId: string; patch: Partial<TaskDefinition> }[] = [
  { minVersion: 2, taskId: "rb-breakfast", patch: { recurrence: "weekdays" } },
];

function applyVersionedPatches(tasks: TaskDefinition[], fromVersion: number): TaskDefinition[] {
  const due = VERSIONED_PATCHES.filter((p) => fromVersion < p.minVersion);
  if (due.length === 0) return tasks;
  return tasks.map((t) => {
    const patch = due.find((p) => p.taskId === t.id);
    return patch ? { ...t, ...patch.patch } : t;
  });
}

// Apply the seed to whatever is (or isn't) already saved. Pure — returns a new
// RebrandData. Completions, weight log and weekly reviews are user data and are
// never seeded, only carried through.
export function applySeed(existing: RebrandData | undefined, rawData: DashData): RebrandData {
  const base = existing ?? emptyRebrand();
  const priorVersion = base.seedVersion ?? 0;

  const merged: RebrandData = {
    ...base,
    taskDefinitions: applyVersionedPatches(mergeById(base.taskDefinitions, SEED_TASKS), priorVersion),
    referenceContent: mergeById(base.referenceContent, SEED_REFERENCE),
    brandCore: mergeById(base.brandCore, SEED_BRAND_CORE),
    roadmapItems: mergeById(base.roadmapItems, SEED_ROADMAP),
    // Settings: seed only the first time (when there was no saved rebrand yet).
    settings: existing ? base.settings : { ...SEED_SETTINGS },
    seedVersion: SEED_VERSION,
  };

  // One-time migration (approved): pull existing weight history out of the old
  // /health page into the Rebrand's weight log, so the Body page is the single
  // source of truth. Only runs while the log is still empty, so it's safe to
  // re-run and never duplicates.
  if (merged.weightLog.length === 0) {
    const healthWeight = (rawData as { weight?: { entries?: { id?: string; date: string; weight: number }[] } }).weight;
    const entries = healthWeight?.entries ?? [];
    if (entries.length > 0) {
      merged.weightLog = entries.map((e, i): WeightEntry => ({
        id: e.id ?? `mig-${i}`,
        loggedOn: e.date,
        weightLb: e.weight,
      }));
    }
  }

  return merged;
}

// Load the blob, extract + seed the rebrand slice. Returns both the seeded
// rebrand data and the raw blob (needed so save() can write back without
// dropping other features' keys).
export async function loadRebrand(): Promise<{ rebrand: RebrandData; rawData: DashData }> {
  const res = await fetch("/api/data");
  if (!res.ok) throw new Error("Failed to load dashboard data");
  const json = await res.json();
  const rawData: DashData = json.data ?? {};
  const rebrand = applySeed(rawData.rebrand, rawData);
  return { rebrand, rawData };
}

// Save the rebrand slice back into the shared blob, preserving every other key.
export async function saveRebrand(rawData: DashData, rebrand: RebrandData): Promise<DashData> {
  const newData: DashData = { ...rawData, rebrand };
  const res = await fetch("/api/data", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: newData }),
  });
  if (!res.ok) throw new Error("Failed to save");
  return newData;
}

// ---------------------------------------------------------------------------
// Small derived helpers used by the hub + home widget bottom strip (spec §16).
// ---------------------------------------------------------------------------
import { MILESTONES, type Milestone } from "./seed";
import { todayStr } from "./engine";
import type { WeeklyReview } from "./types";

// The next milestone on or after today, with days remaining.
export function nextMilestone(today = todayStr()): { milestone: Milestone; daysAway: number } | null {
  const upcoming = MILESTONES.filter((m) => m.date >= today).sort((a, b) => a.date.localeCompare(b.date))[0];
  if (!upcoming) return null;
  const days = Math.round((new Date(upcoming.date + "T00:00:00").getTime() - new Date(today + "T00:00:00").getTime()) / 86400000);
  return { milestone: upcoming, daysAway: days };
}

// Self-trust streak: consecutive most-recent weekly reviews where at least
// 7/10 of promises were kept. This is the metric the spec calls load-bearing
// (§8) — how many weeks in a row you've mostly kept faith with yourself.
export function selfTrustStreak(reviews: WeeklyReview[]): number {
  const sorted = [...reviews].sort((a, b) => b.weekEnding.localeCompare(a.weekEnding));
  let streak = 0;
  for (const r of sorted) {
    if (r.selfTrust >= 7) streak++;
    else break;
  }
  return streak;
}
