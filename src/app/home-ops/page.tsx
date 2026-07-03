"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

type TaskMode = "normal" | "low_energy" | "emergency" | "deep_clean";
type SopCategory = "morning" | "closing" | "cleaning" | "dogs" | "vehicle" | "home_health" | "custom";
type Recurrence  = "daily" | "weekly" | "monthly" | "as_needed";
type Priority    = "required" | "recommended" | "optional";

type SopTask = {
  id: string;
  name: string;
  notes: string;
  estimatedMinutes: number;
  priority: Priority;
  modes: TaskMode[];
  recurrence: Recurrence;
  order: number;
  active: boolean;
};

type Sop = {
  id: string;
  name: string;
  category: SopCategory;
  icon: string;
  description: string;
  tasks: SopTask[];
  order: number;
  active: boolean;
};

type DayCompletion = { date: string; completedIds: string[] };

type HomeOpsData = {
  sops: Sop[];
  mode: TaskMode;
  completions: DayCompletion[];
};

type DashData   = { homeOps?: HomeOpsData; [key: string]: unknown };
type SaveStatus = "idle" | "saving" | "saved" | "error";

// ── Constants ─────────────────────────────────────────────────────────────────

const MODE_META: Record<TaskMode, { label: string; description: string; color: string; bg: string }> = {
  normal:     { label: "Normal",      description: "Full routine — everything runs",         color: "var(--accent)",  bg: "var(--accent-dim)"   },
  low_energy: { label: "Low Energy",  description: "Essentials only — protect health, dogs", color: "var(--green)",   bg: "var(--green-dim)"    },
  emergency:  { label: "Emergency",   description: "Survival mode — people, dogs, locks",    color: "var(--red)",     bg: "var(--red-dim)"      },
  deep_clean: { label: "Deep Clean",  description: "Full reset when you have time & energy", color: "var(--yellow)",  bg: "var(--yellow-dim)"   },
};

const CATEGORY_META: Record<SopCategory, { label: string; icon: string; color: string }> = {
  morning:    { label: "Morning Shift",   icon: "☀️",  color: "var(--yellow)"     },
  closing:    { label: "Closing Shift",   icon: "🌙",  color: "var(--accent)"     },
  cleaning:   { label: "Daily Cleaning",  icon: "🧹",  color: "var(--green)"      },
  dogs:       { label: "Dog Care",        icon: "🐾",  color: "var(--accent-text)"},
  vehicle:    { label: "Vehicle Care",    icon: "🚗",  color: "var(--text-2)"     },
  home_health:{ label: "Home Health",     icon: "🏠",  color: "var(--green)"      },
  custom:     { label: "Custom",          icon: "📋",  color: "var(--text-3)"     },
};

const TODAY_ORDER: SopCategory[] = ["morning", "dogs", "cleaning", "home_health", "vehicle", "closing"];

const PRIORITY_META: Record<Priority, { label: string; color: string }> = {
  required:    { label: "Required",    color: "var(--red)"    },
  recommended: { label: "Recommended", color: "var(--yellow)" },
  optional:    { label: "Optional",    color: "var(--text-3)" },
};

const RECURRENCE_LABELS: Record<Recurrence, string> = {
  daily: "Daily", weekly: "Weekly", monthly: "Monthly", as_needed: "As needed",
};

const ALL_MODES: TaskMode[] = ["normal", "low_energy", "emergency", "deep_clean"];
const NORMAL_AND_UP: TaskMode[] = ["normal", "deep_clean"];
const ALL_BUT_EMERGENCY: TaskMode[] = ["normal", "low_energy", "deep_clean"];

// ── Default SOPs ──────────────────────────────────────────────────────────────

function makeTask(partial: Partial<SopTask> & { id: string; name: string }): SopTask {
  return {
    notes: "", estimatedMinutes: 5, priority: "recommended",
    modes: NORMAL_AND_UP, recurrence: "daily", order: 0, active: true,
    ...partial,
  };
}

const DEFAULT_SOPS: Sop[] = [
  {
    id: "sop_morning", name: "Morning Shift", category: "morning", icon: "☀️", order: 0, active: true,
    description: "Start the day calmly. Get yourself going, care for the dogs, and set the house up for a manageable day.",
    tasks: [
      makeTask({ id: "m1", name: "Wake up — water, phone check, meds if needed",          order: 0, priority: "required",    modes: ALL_MODES,         estimatedMinutes: 5  }),
      makeTask({ id: "m2", name: "Take dogs outside for morning potty",                    order: 1, priority: "required",    modes: ALL_MODES,         estimatedMinutes: 10 }),
      makeTask({ id: "m3", name: "Check dogs water bowls — refill if low",                 order: 2, priority: "required",    modes: ALL_MODES,         estimatedMinutes: 2  }),
      makeTask({ id: "m4", name: "Give dogs morning feeding",                              order: 3, priority: "required",    modes: ALL_MODES,         estimatedMinutes: 3  }),
      makeTask({ id: "m5", name: "Check pee pads / any overnight accidents — clean up",   order: 4, priority: "required",    modes: ALL_MODES,         estimatedMinutes: 5  }),
      makeTask({ id: "m6", name: "Start one small home reset (coffee table, counter, etc)", order: 5, priority: "recommended", modes: ALL_BUT_EMERGENCY, estimatedMinutes: 5  }),
      makeTask({ id: "m7", name: "Quick dishes / kitchen check",                           order: 6, priority: "recommended", modes: ALL_BUT_EMERGENCY, estimatedMinutes: 5  }),
      makeTask({ id: "m8", name: "Review today's priorities — what actually needs to happen", order: 7, priority: "recommended", modes: NORMAL_AND_UP,  estimatedMinutes: 3  }),
      makeTask({ id: "m9", name: "Check anything urgent — trash, laundry, work bag",       order: 8, priority: "optional",   modes: NORMAL_AND_UP,     estimatedMinutes: 3  }),
      makeTask({ id: "m10", name: "Set AC/fans for the day — check dog comfort",           order: 9, priority: "recommended", modes: ALL_MODES,         estimatedMinutes: 2  }),
    ],
  },
  {
    id: "sop_closing", name: "Closing Shift", category: "closing", icon: "🌙", order: 5, active: true,
    description: "End the day with intention. Reset the home, protect the dogs, and set tomorrow up to start calm.",
    tasks: [
      makeTask({ id: "c1",  name: "Living room reset — pillows, blankets, surfaces",       order: 0,  priority: "recommended", modes: ALL_BUT_EMERGENCY, estimatedMinutes: 8  }),
      makeTask({ id: "c2",  name: "Clear coffee table",                                    order: 1,  priority: "recommended", modes: ALL_BUT_EMERGENCY, estimatedMinutes: 3  }),
      makeTask({ id: "c3",  name: "Medicines + daily-use items organized and accessible",  order: 2,  priority: "required",    modes: ALL_MODES,         estimatedMinutes: 3  }),
      makeTask({ id: "c4",  name: "Check all doors and windows — lock up",                 order: 3,  priority: "required",    modes: ALL_MODES,         estimatedMinutes: 3  }),
      makeTask({ id: "c5",  name: "Check dog water — refill for overnight",                order: 4,  priority: "required",    modes: ALL_MODES,         estimatedMinutes: 2  }),
      makeTask({ id: "c6",  name: "Dogs settled and comfortable for the night",            order: 5,  priority: "required",    modes: ALL_MODES,         estimatedMinutes: 5  }),
      makeTask({ id: "c7",  name: "Trash — check if bins need to go out",                  order: 6,  priority: "recommended", modes: ALL_BUT_EMERGENCY, estimatedMinutes: 3  }),
      makeTask({ id: "c8",  name: "Start or move laundry if needed",                       order: 7,  priority: "recommended", modes: ALL_BUT_EMERGENCY, estimatedMinutes: 3  }),
      makeTask({ id: "c9",  name: "Dishes + kitchen surface reset",                        order: 8,  priority: "recommended", modes: ALL_BUT_EMERGENCY, estimatedMinutes: 10 }),
      makeTask({ id: "c10", name: "Prep anything needed for tomorrow",                     order: 9,  priority: "recommended", modes: NORMAL_AND_UP,     estimatedMinutes: 5  }),
      makeTask({ id: "c11", name: "AC / fans / temperature check for the night",           order: 10, priority: "required",    modes: ALL_MODES,         estimatedMinutes: 2  }),
      makeTask({ id: "c12", name: "Final home-health walk — calm, not critical",           order: 11, priority: "optional",    modes: NORMAL_AND_UP,     estimatedMinutes: 3  }),
    ],
  },
  {
    id: "sop_cleaning", name: "Daily Cleaning", category: "cleaning", icon: "🧹", order: 2, active: true,
    description: "Zone-based cleaning that keeps the home healthy without requiring a full scrub every day. Minimum viable days are valid days.",
    tasks: [
      makeTask({ id: "cl1",  name: "Kitchen — wipe counters, sink, stovetop if used",     order: 0,  priority: "required",    modes: ALL_MODES,         estimatedMinutes: 8  }),
      makeTask({ id: "cl2",  name: "Dog area — pee pads, food/water station, floor",      order: 1,  priority: "required",    modes: ALL_MODES,         estimatedMinutes: 5  }),
      makeTask({ id: "cl3",  name: "Trash — empty any full bins",                         order: 2,  priority: "recommended", modes: ALL_BUT_EMERGENCY, estimatedMinutes: 3  }),
      makeTask({ id: "cl4",  name: "Living room — quick pick-up and surface wipe",        order: 3,  priority: "recommended", modes: ALL_BUT_EMERGENCY, estimatedMinutes: 8  }),
      makeTask({ id: "cl5",  name: "Bathroom — toilet, sink, mirror quick wipe",          order: 4,  priority: "recommended", modes: ALL_BUT_EMERGENCY, estimatedMinutes: 6  }),
      makeTask({ id: "cl6",  name: "Floors — sweep or vacuum main living areas",          order: 5,  priority: "recommended", modes: NORMAL_AND_UP,     estimatedMinutes: 15 }),
      makeTask({ id: "cl7",  name: "Bedroom — make bed, surface pick-up",                order: 6,  priority: "optional",    modes: NORMAL_AND_UP,     estimatedMinutes: 5  }),
      makeTask({ id: "cl8",  name: "Clutter reset — return displaced items to their place",order: 7,  priority: "optional",    modes: NORMAL_AND_UP,     estimatedMinutes: 10 }),
      makeTask({ id: "cl9",  name: "Dog towels / reusable pads — wash or swap",          order: 8,  priority: "optional",    modes: NORMAL_AND_UP,     recurrence: "weekly", estimatedMinutes: 5  }),
      makeTask({ id: "cl10", name: "Deep: full bathroom scrub (tub, toilet, floors)",    order: 9,  priority: "optional",    modes: ["deep_clean"],    estimatedMinutes: 25 }),
      makeTask({ id: "cl11", name: "Deep: mop hard floors",                              order: 10, priority: "optional",    modes: ["deep_clean"],    estimatedMinutes: 20 }),
      makeTask({ id: "cl12", name: "Deep: clean fridge exterior + interior wipe",        order: 11, priority: "optional",    modes: ["deep_clean"],    recurrence: "monthly", estimatedMinutes: 15 }),
    ],
  },
  {
    id: "sop_dogs", name: "Dog Care", category: "dogs", icon: "🐾", order: 1, active: true,
    description: "Everything the dogs need to be safe, comfortable, and healthy. Non-negotiable items are marked Required.",
    tasks: [
      makeTask({ id: "d1",  name: "Morning feeding (both dogs)",                          order: 0,  priority: "required",    modes: ALL_MODES,         estimatedMinutes: 3  }),
      makeTask({ id: "d2",  name: "Morning potty break — outside",                        order: 1,  priority: "required",    modes: ALL_MODES,         estimatedMinutes: 10 }),
      makeTask({ id: "d3",  name: "Fresh water — check and refill both bowls",            order: 2,  priority: "required",    modes: ALL_MODES,         estimatedMinutes: 2  }),
      makeTask({ id: "d4",  name: "Check pee pads — clean or replace if used",           order: 3,  priority: "required",    modes: ALL_MODES,         estimatedMinutes: 5  }),
      makeTask({ id: "d5",  name: "Midday potty check — out or pad check",               order: 4,  priority: "recommended", modes: ALL_MODES,         estimatedMinutes: 10 }),
      makeTask({ id: "d6",  name: "Evening feeding",                                      order: 5,  priority: "required",    modes: ALL_MODES,         estimatedMinutes: 3  }),
      makeTask({ id: "d7",  name: "Evening potty break",                                  order: 6,  priority: "required",    modes: ALL_MODES,         estimatedMinutes: 10 }),
      makeTask({ id: "d8",  name: "Temperature check — fans/AC adequate for dogs",       order: 7,  priority: "required",    modes: ALL_MODES,         estimatedMinutes: 2  }),
      makeTask({ id: "d9",  name: "Accident scan — check floors/rugs for missed spots",  order: 8,  priority: "recommended", modes: ALL_BUT_EMERGENCY, estimatedMinutes: 3  }),
      makeTask({ id: "d10", name: "Quick grooming check — fur, ears, eyes, paws",        order: 9,  priority: "optional",    modes: NORMAL_AND_UP,     recurrence: "weekly", estimatedMinutes: 5  }),
      makeTask({ id: "d11", name: "Dog medications if applicable",                        order: 10, priority: "required",    modes: ALL_MODES,         estimatedMinutes: 2, notes: "Edit this task — add which dog, which med, and timing." }),
      makeTask({ id: "d12", name: "Dog comfort check before bed — settled, not anxious", order: 11, priority: "required",    modes: ALL_MODES,         estimatedMinutes: 3  }),
    ],
  },
  {
    id: "sop_vehicle", name: "Vehicle Care", category: "vehicle", icon: "🚗", order: 4, active: true,
    description: "Keep the car safe, clean, and running without surprise failures. Most items are weekly or monthly — not daily.",
    tasks: [
      makeTask({ id: "v1",  name: "Gas level — fill before it hits a quarter tank",       order: 0,  priority: "recommended", modes: NORMAL_AND_UP,     recurrence: "as_needed", estimatedMinutes: 15 }),
      makeTask({ id: "v2",  name: "Interior trash — clear any wrappers, cups, clutter",   order: 1,  priority: "recommended", modes: NORMAL_AND_UP,     recurrence: "weekly",    estimatedMinutes: 5  }),
      makeTask({ id: "v3",  name: "Visual walkaround — tires, lights, anything obvious",  order: 2,  priority: "optional",    modes: NORMAL_AND_UP,     recurrence: "weekly",    estimatedMinutes: 3  }),
      makeTask({ id: "v4",  name: "Windshield fluid — check level",                       order: 3,  priority: "recommended", modes: NORMAL_AND_UP,     recurrence: "monthly",   estimatedMinutes: 3  }),
      makeTask({ id: "v5",  name: "Tire pressure check",                                  order: 4,  priority: "recommended", modes: NORMAL_AND_UP,     recurrence: "monthly",   estimatedMinutes: 10 }),
      makeTask({ id: "v6",  name: "Interior deep clean — vacuum, wipe surfaces",          order: 5,  priority: "optional",    modes: NORMAL_AND_UP,     recurrence: "monthly",   estimatedMinutes: 30 }),
      makeTask({ id: "v7",  name: "Emergency kit check — jumper cables, first aid, water",order: 6,  priority: "recommended", modes: NORMAL_AND_UP,     recurrence: "monthly",   estimatedMinutes: 5  }),
      makeTask({ id: "v8",  name: "Oil change due — check mileage",                       order: 7,  priority: "recommended", modes: NORMAL_AND_UP,     recurrence: "as_needed", estimatedMinutes: 5, notes: "Oil change every ~5,000 miles. Log current mileage after each change." }),
      makeTask({ id: "v9",  name: "Registration / insurance expiration check",            order: 8,  priority: "required",    modes: NORMAL_AND_UP,     recurrence: "monthly",   estimatedMinutes: 2  }),
      makeTask({ id: "v10", name: "Exterior wash — or confirm last week is still clean",  order: 9,  priority: "optional",    modes: ["deep_clean"],    recurrence: "monthly",   estimatedMinutes: 5  }),
    ],
  },
  {
    id: "sop_home", name: "Home Health", category: "home_health", icon: "🏠", order: 3, active: true,
    description: "Catch small problems before they become expensive or dangerous. A calm walk-through keeps the home safe.",
    tasks: [
      makeTask({ id: "h1",  name: "AC / fan check — running correctly, thermostat set",   order: 0,  priority: "required",    modes: ALL_MODES,         estimatedMinutes: 2  }),
      makeTask({ id: "h2",  name: "Dog area temperature — safe for dogs left home alone", order: 1,  priority: "required",    modes: ALL_MODES,         estimatedMinutes: 2  }),
      makeTask({ id: "h3",  name: "Kitchen hygiene — no raw food left out, garbage okay", order: 2,  priority: "required",    modes: ALL_MODES,         estimatedMinutes: 3  }),
      makeTask({ id: "h4",  name: "Bathroom — no water pooling, toilet clean, ventilation",order: 3,  priority: "recommended", modes: ALL_BUT_EMERGENCY, estimatedMinutes: 3  }),
      makeTask({ id: "h5",  name: "Medicine / supplement organization — accessible, not expired", order: 4, priority: "recommended", modes: ALL_BUT_EMERGENCY, recurrence: "weekly", estimatedMinutes: 3 }),
      makeTask({ id: "h6",  name: "Outlets + cords — no trip hazards, nothing frayed",    order: 5,  priority: "optional",    modes: NORMAL_AND_UP,     recurrence: "weekly",  estimatedMinutes: 3  }),
      makeTask({ id: "h7",  name: "Fridge / under-sink — check for leaks or odors",       order: 6,  priority: "recommended", modes: NORMAL_AND_UP,     recurrence: "weekly",  estimatedMinutes: 3  }),
      makeTask({ id: "h8",  name: "Laundry — nothing sitting wet in washer",              order: 7,  priority: "recommended", modes: ALL_BUT_EMERGENCY, recurrence: "as_needed", estimatedMinutes: 2 }),
      makeTask({ id: "h9",  name: "Smoke detector / CO detector — check lights monthly",  order: 8,  priority: "required",    modes: NORMAL_AND_UP,     recurrence: "monthly", estimatedMinutes: 2  }),
      makeTask({ id: "h10", name: "Deep: check HVAC filter — replace if dusty",           order: 9,  priority: "optional",    modes: ["deep_clean"],    recurrence: "monthly", estimatedMinutes: 5  }),
    ],
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayStr() { return new Date().toISOString().slice(0, 10); }
function seedData(): HomeOpsData { return { sops: DEFAULT_SOPS, mode: "normal", completions: [] }; }

function getOrCreateToday(completions: DayCompletion[], today: string): DayCompletion {
  return completions.find(c => c.date === today) ?? { date: today, completedIds: [] };
}

function pruneCompletions(completions: DayCompletion[]): DayCompletion[] {
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 60);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  return completions.filter(c => c.date >= cutoffStr);
}

function getModeTasks(sop: Sop, mode: TaskMode): SopTask[] {
  return sop.tasks.filter(t => t.active && t.modes.includes(mode)).sort((a, b) => a.order - b.order);
}

function estimateMinutes(tasks: SopTask[]): number {
  return tasks.reduce((s, t) => s + t.estimatedMinutes, 0);
}

// ── Icons ─────────────────────────────────────────────────────────────────────

const PlusIcon    = () => <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M6.5 2v9M2 6.5h9" /></svg>;
const PencilIcon  = () => <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M9 2l2 2-7 7H2v-2L9 2z" strokeLinejoin="round" /></svg>;
const UpIcon      = () => <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M2 8l4-4 4 4" /></svg>;
const DownIcon    = () => <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M2 4l4 4 4-4" /></svg>;
const TrashIcon   = () => <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M2 3.5h9M5 3.5V2h3v1.5M4 3.5l.5 7h4l.5-7" strokeLinejoin="round" /></svg>;
const CheckIcon   = () => <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 6l3 3 5-5" /></svg>;

// ── Task check row (Today view) ───────────────────────────────────────────────

function TaskCheckRow({ task, done, onToggle }: { task: SopTask; done: boolean; onToggle: () => void }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div style={{ borderBottom: "1px solid var(--border)", padding: "0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "9px 12px", cursor: "pointer", opacity: done ? 0.45 : 1, transition: "opacity 0.15s" }}
        onClick={onToggle}>
        <div style={{
          width: "20px", height: "20px", borderRadius: "5px", flexShrink: 0,
          border: done ? "none" : "1.5px solid var(--border-strong)",
          background: done ? "var(--accent)" : "transparent",
          display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s"
        }}>
          {done && <CheckIcon />}
        </div>
        <span style={{ flex: 1, fontSize: "13.5px", color: "var(--text)", textDecoration: done ? "line-through" : "none" }}>{task.name}</span>
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          {task.priority === "required" && <span style={{ fontSize: "10px", color: "var(--red)", background: "var(--red-dim)", padding: "1px 5px", borderRadius: "3px" }}>Required</span>}
          {task.recurrence !== "daily" && <span style={{ fontSize: "10px", color: "var(--text-3)", background: "var(--surface-overlay)", padding: "1px 5px", borderRadius: "3px" }}>{RECURRENCE_LABELS[task.recurrence]}</span>}
          {task.estimatedMinutes > 0 && <span style={{ fontSize: "10.5px", color: "var(--text-3)" }}>{task.estimatedMinutes}m</span>}
          {task.notes && <button className="btn-icon" style={{ padding: "2px", fontSize: "11px" }} onClick={e => { e.stopPropagation(); setExpanded(p => !p); }}>💬</button>}
        </div>
      </div>
      {expanded && task.notes && (
        <div style={{ padding: "4px 12px 10px 42px", fontSize: "12px", color: "var(--text-3)", lineHeight: 1.5, fontStyle: "italic" }}>{task.notes}</div>
      )}
    </div>
  );
}

// ── SOP today section ─────────────────────────────────────────────────────────

function SopTodaySection({ sop, mode, completedIds, onToggle }: {
  sop: Sop; mode: TaskMode; completedIds: string[]; onToggle: (id: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const tasks = getModeTasks(sop, mode);
  if (!tasks.length) return null;
  const doneCount = tasks.filter(t => completedIds.includes(t.id)).length;
  const allDone = doneCount === tasks.length;
  const cm = CATEGORY_META[sop.category];
  const mins = estimateMinutes(tasks);

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden", borderColor: allDone ? "var(--green)" : "var(--border)", transition: "border-color 0.2s" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 14px", cursor: "pointer", background: allDone ? "var(--green-dim)" : "transparent" }}
        onClick={() => setCollapsed(p => !p)}>
        <span style={{ fontSize: "18px" }}>{sop.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--text)" }}>{sop.name}</span>
            {allDone && <span style={{ fontSize: "11px", color: "var(--green)" }}>✓ Complete</span>}
          </div>
          <div style={{ fontSize: "11.5px", color: "var(--text-3)", marginTop: "1px" }}>
            {doneCount}/{tasks.length} done · ~{mins}m
          </div>
        </div>
        {/* Progress arc */}
        <div style={{ position: "relative", width: "36px", height: "36px", flexShrink: 0 }}>
          <svg width="36" height="36" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="14" fill="none" stroke="var(--surface-overlay)" strokeWidth="3" />
            <circle cx="18" cy="18" r="14" fill="none" stroke={allDone ? "var(--green)" : cm.color}
              strokeWidth="3" strokeLinecap="round"
              strokeDasharray={`${tasks.length > 0 ? (doneCount / tasks.length) * 87.96 : 0} 87.96`}
              strokeDashoffset="21.99" style={{ transition: "stroke-dasharray 0.3s" }} />
          </svg>
          <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: 700, color: "var(--text-2)" }}>
            {tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 0}%
          </span>
        </div>
        <span style={{ fontSize: "11px", color: "var(--text-3)" }}>{collapsed ? "▶" : "▼"}</span>
      </div>
      {/* Tasks */}
      {!collapsed && (
        <div>
          {tasks.map(task => (
            <TaskCheckRow key={task.id} task={task} done={completedIds.includes(task.id)} onToggle={() => onToggle(task.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Task form (library editor) ────────────────────────────────────────────────

type TaskFormData = Omit<SopTask, "id" | "order">;

function blankTaskForm(): TaskFormData {
  return { name: "", notes: "", estimatedMinutes: 5, priority: "recommended", modes: NORMAL_AND_UP, recurrence: "daily", active: true };
}

function TaskForm({ initial, onSave, onCancel }: { initial?: TaskFormData; onSave: (d: TaskFormData) => void; onCancel: () => void }) {
  const [form, setForm] = useState<TaskFormData>(initial ?? blankTaskForm());
  const set = <K extends keyof TaskFormData>(k: K, v: TaskFormData[K]) => setForm(p => ({ ...p, [k]: v }));
  const toggleMode = (m: TaskMode) => set("modes", form.modes.includes(m) ? form.modes.filter(x => x !== m) : [...form.modes, m]);

  return (
    <div style={{ background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: "7px", padding: "14px", display: "flex", flexDirection: "column", gap: "10px" }}>
      <input className="input" placeholder="Task name *" value={form.name} onChange={e => set("name", e.target.value)} style={{ fontSize: "13px" }} />
      <textarea className="input" placeholder="Notes (optional) — e.g. 'use the blue spray', 'Nick can do this', 'skip on work mornings'" value={form.notes} onChange={e => set("notes", e.target.value)} style={{ minHeight: "70px", fontSize: "12.5px", resize: "vertical" }} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
        <div>
          <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "3px" }}>Priority</label>
          <select className="input" value={form.priority} onChange={e => set("priority", e.target.value as Priority)} style={{ fontSize: "12.5px" }}>
            <option value="required">Required</option>
            <option value="recommended">Recommended</option>
            <option value="optional">Optional</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "3px" }}>Recurrence</label>
          <select className="input" value={form.recurrence} onChange={e => set("recurrence", e.target.value as Recurrence)} style={{ fontSize: "12.5px" }}>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="as_needed">As needed</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "3px" }}>Est. minutes</label>
          <input className="input" type="number" min="1" value={form.estimatedMinutes} onChange={e => set("estimatedMinutes", parseInt(e.target.value) || 5)} style={{ fontSize: "12.5px" }} />
        </div>
      </div>
      {/* Mode toggles */}
      <div>
        <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "5px" }}>Show in modes</label>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {ALL_MODES.map(m => (
            <button key={m} onClick={() => toggleMode(m)}
              style={{ fontSize: "11.5px", padding: "4px 10px", borderRadius: "5px", cursor: "pointer", fontFamily: "inherit", border: "1px solid var(--border)", background: form.modes.includes(m) ? MODE_META[m].bg : "transparent", color: form.modes.includes(m) ? MODE_META[m].color : "var(--text-3)", transition: "all 0.12s" }}>
              {MODE_META[m].label}
            </button>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", gap: "6px" }}>
        <button className="btn btn-primary" style={{ fontSize: "12px", padding: "6px 14px" }} onClick={() => { if (!form.name.trim()) return; onSave(form); }}>Save Task</button>
        <button className="btn btn-ghost" style={{ fontSize: "12px" }} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

// ── SOP library card ──────────────────────────────────────────────────────────

function SopLibraryCard({ sop, onUpdate }: { sop: Sop; onUpdate: (updated: Sop) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [addingTask, setAddingTask] = useState(false);
  const [editingSop, setEditingSop] = useState(false);
  const [sopForm, setSopForm] = useState({ name: sop.name, icon: sop.icon, description: sop.description });

  const updateTask = (id: string, patch: Partial<SopTask>) => {
    onUpdate({ ...sop, tasks: sop.tasks.map(t => t.id === id ? { ...t, ...patch } : t) });
  };

  const moveTask = (id: string, dir: -1 | 1) => {
    const sorted = [...sop.tasks].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex(t => t.id === id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const reordered = sorted.map((t, i) => {
      if (i === idx)     return { ...t, order: sorted[swapIdx].order };
      if (i === swapIdx) return { ...t, order: sorted[idx].order };
      return t;
    });
    onUpdate({ ...sop, tasks: reordered });
  };

  const addTask = (data: TaskFormData) => {
    const maxOrder = sop.tasks.reduce((m, t) => Math.max(m, t.order), -1);
    onUpdate({ ...sop, tasks: [...sop.tasks, { ...data, id: crypto.randomUUID(), order: maxOrder + 1 }] });
    setAddingTask(false);
  };

  const saveTaskEdit = (id: string, data: TaskFormData) => {
    updateTask(id, data);
    setEditingTask(null);
  };

  const deleteTask = (id: string) => {
    if (!confirm("Delete this task?")) return;
    onUpdate({ ...sop, tasks: sop.tasks.filter(t => t.id !== id) });
  };

  const saveSopMeta = () => {
    onUpdate({ ...sop, ...sopForm });
    setEditingSop(false);
  };

  const sorted = [...sop.tasks].sort((a, b) => a.order - b.order);
  const cm = CATEGORY_META[sop.category];

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      {/* SOP header */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 14px", cursor: "pointer", borderBottom: expanded ? "1px solid var(--border)" : "none" }}
        onClick={() => setExpanded(p => !p)}>
        <span style={{ fontSize: "20px" }}>{sop.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text)" }}>{sop.name}</div>
          <div style={{ fontSize: "12px", color: "var(--text-3)" }}>{sop.tasks.filter(t => t.active).length} tasks · {cm.label}</div>
        </div>
        <button className="btn-icon" onClick={e => { e.stopPropagation(); setEditingSop(p => !p); }}><PencilIcon /></button>
        <span style={{ fontSize: "11px", color: "var(--text-3)" }}>{expanded ? "▲" : "▼"}</span>
      </div>

      {/* SOP meta edit */}
      {editingSop && (
        <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)", background: "var(--surface-raised)", display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "60px 1fr", gap: "8px" }}>
            <input className="input" placeholder="Icon" value={sopForm.icon} onChange={e => setSopForm(p => ({ ...p, icon: e.target.value }))} style={{ fontSize: "20px", textAlign: "center" }} />
            <input className="input" placeholder="SOP name" value={sopForm.name} onChange={e => setSopForm(p => ({ ...p, name: e.target.value }))} style={{ fontSize: "13px" }} />
          </div>
          <textarea className="input" placeholder="Description (optional)" value={sopForm.description} onChange={e => setSopForm(p => ({ ...p, description: e.target.value }))} style={{ minHeight: "60px", fontSize: "12.5px", resize: "vertical" }} />
          <div style={{ display: "flex", gap: "6px" }}>
            <button className="btn btn-primary" style={{ fontSize: "12px", padding: "6px 12px" }} onClick={saveSopMeta}>Save</button>
            <button className="btn btn-ghost" style={{ fontSize: "12px" }} onClick={() => setEditingSop(false)}>Cancel</button>
            <button className="btn btn-ghost" style={{ fontSize: "12px", marginLeft: "auto", color: "var(--text-3)" }} onClick={() => onUpdate({ ...sop, active: !sop.active })}>
              {sop.active ? "Archive SOP" : "Restore SOP"}
            </button>
          </div>
        </div>
      )}

      {/* Task list */}
      {expanded && (
        <div>
          {sorted.map((task, i) => (
            <div key={task.id}>
              {editingTask === task.id ? (
                <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)" }}>
                  <TaskForm initial={{ name: task.name, notes: task.notes, estimatedMinutes: task.estimatedMinutes, priority: task.priority, modes: task.modes, recurrence: task.recurrence, active: task.active }}
                    onSave={d => saveTaskEdit(task.id, d)} onCancel={() => setEditingTask(null)} />
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", borderBottom: "1px solid var(--border)", opacity: task.active ? 1 : 0.4 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
                    <button className="btn-icon" style={{ padding: "1px" }} onClick={() => moveTask(task.id, -1)} disabled={i === 0}><UpIcon /></button>
                    <button className="btn-icon" style={{ padding: "1px" }} onClick={() => moveTask(task.id, 1)} disabled={i === sorted.length - 1}><DownIcon /></button>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "13px", color: "var(--text)" }}>{task.name}</div>
                    <div style={{ display: "flex", gap: "6px", marginTop: "2px", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "10.5px", color: PRIORITY_META[task.priority].color }}>{PRIORITY_META[task.priority].label}</span>
                      <span style={{ fontSize: "10.5px", color: "var(--text-3)" }}>{RECURRENCE_LABELS[task.recurrence]}</span>
                      <span style={{ fontSize: "10.5px", color: "var(--text-3)" }}>{task.estimatedMinutes}m</span>
                      <span style={{ fontSize: "10.5px", color: "var(--text-3)" }}>{task.modes.map(m => MODE_META[m].label).join(", ")}</span>
                    </div>
                    {task.notes && <div style={{ fontSize: "11.5px", color: "var(--text-3)", marginTop: "2px", fontStyle: "italic" }}>{task.notes}</div>}
                  </div>
                  <button className="btn-icon" onClick={() => updateTask(task.id, { active: !task.active })} title={task.active ? "Deactivate" : "Activate"} style={{ fontSize: "13px" }}>{task.active ? "✓" : "○"}</button>
                  <button className="btn-icon" onClick={() => setEditingTask(task.id)}><PencilIcon /></button>
                  <button className="btn-icon" style={{ color: "var(--red)" }} onClick={() => deleteTask(task.id)}><TrashIcon /></button>
                </div>
              )}
            </div>
          ))}

          {/* Add task */}
          {addingTask ? (
            <div style={{ padding: "10px 12px", borderTop: "1px solid var(--border)" }}>
              <TaskForm onSave={addTask} onCancel={() => setAddingTask(false)} />
            </div>
          ) : (
            <button className="btn btn-ghost" style={{ width: "100%", justifyContent: "center", gap: "6px", fontSize: "13px", padding: "10px", borderTop: "1px solid var(--border)", borderRadius: 0 }} onClick={() => setAddingTask(true)}>
              <PlusIcon /> Add task
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function HomeOpsPage() {
  const rawRef = useRef<DashData>({});
  const [data, setData] = useState<HomeOpsData>(seedData());
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const statusTimer = useRef<ReturnType<typeof setTimeout>>();
  const [view, setView] = useState<"today" | "library" | "add_sop">("today");
  const [addSopForm, setAddSopForm] = useState({ name: "", icon: "📋", description: "", category: "custom" as SopCategory });

  const today = todayStr();

  // ── Persist ─────────────────────────────────────────────────────────────

  const save = useCallback((d: HomeOpsData) => {
    const newData = { ...rawRef.current, homeOps: d };
    rawRef.current = newData;
    setStatus("saving");
    fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data: newData }) })
      .then(r => r.ok ? setStatus("saved") : setStatus("error"))
      .catch(() => setStatus("error"))
      .finally(() => { clearTimeout(statusTimer.current); statusTimer.current = setTimeout(() => setStatus("idle"), 2200); });
  }, []);

  const update = useCallback((fn: (p: HomeOpsData) => HomeOpsData) => {
    setData(prev => { const next = fn(prev); save(next); return next; });
  }, [save]);

  // ── Load ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    fetch("/api/data").then(r => r.json()).then(({ data: d }) => {
      rawRef.current = d ?? {};
      const saved = d?.homeOps as HomeOpsData | undefined;
      if (saved) {
        // Merge saved SOPs over defaults — preserve edits but add new default SOPs
        const savedIds = new Set(saved.sops.map((s: Sop) => s.id));
        const newDefaults = DEFAULT_SOPS.filter(s => !savedIds.has(s.id));
        setData({ ...seedData(), ...saved, sops: [...saved.sops, ...newDefaults], completions: pruneCompletions(saved.completions ?? []) });
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  // ── Today completion logic ────────────────────────────────────────────────

  const todayCompletion = useMemo(() => getOrCreateToday(data.completions, today), [data.completions, today]);

  const toggleTask = useCallback((taskId: string) => {
    update(p => {
      const existing = p.completions.find(c => c.date === today);
      let completions: DayCompletion[];
      if (!existing) {
        completions = pruneCompletions([...p.completions, { date: today, completedIds: [taskId] }]);
      } else {
        const completedIds = existing.completedIds.includes(taskId)
          ? existing.completedIds.filter(id => id !== taskId)
          : [...existing.completedIds, taskId];
        completions = pruneCompletions(p.completions.map(c => c.date === today ? { ...c, completedIds } : c));
      }
      return { ...p, completions };
    });
  }, [update, today]);

  const setMode = (mode: TaskMode) => update(p => ({ ...p, mode }));

  const updateSop = (updated: Sop) => update(p => ({ ...p, sops: p.sops.map(s => s.id === updated.id ? updated : s) }));

  const addSop = () => {
    if (!addSopForm.name.trim()) return;
    const newSop: Sop = { ...addSopForm, id: crypto.randomUUID(), tasks: [], order: data.sops.length, active: true };
    update(p => ({ ...p, sops: [...p.sops, newSop] }));
    setAddSopForm({ name: "", icon: "📋", description: "", category: "custom" });
    setView("library");
  };

  // ── Today summary ─────────────────────────────────────────────────────────

  const todaySops = useMemo(() => {
    const activeByCategory = new Map<string, Sop[]>();
    for (const cat of TODAY_ORDER) {
      activeByCategory.set(cat, data.sops.filter(s => s.category === cat && s.active));
    }
    // Add custom SOPs at the end
    const customs = data.sops.filter(s => s.category === "custom" && s.active);
    activeByCategory.set("custom", customs);
    return activeByCategory;
  }, [data.sops]);

  const allTodayTasks = useMemo(() => {
    return data.sops.filter(s => s.active).flatMap(s => getModeTasks(s, data.mode));
  }, [data.sops, data.mode]);

  const totalDone = todayCompletion.completedIds.filter(id => allTodayTasks.some(t => t.id === id)).length;
  const totalTasks = allTodayTasks.length;
  const requiredTasks = allTodayTasks.filter(t => t.priority === "required");
  const requiredDone = requiredTasks.filter(t => todayCompletion.completedIds.includes(t.id)).length;

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) return <div className="page" style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-3)" }}>Loading…</div>;

  return (
    <div className="page">
      {/* Header */}
      <div style={{ marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "4px" }}>
          <h1 style={{ margin: 0, fontSize: "20px", fontWeight: 600, color: "var(--text)" }}>Home Operations</h1>
          <span style={{ fontSize: "11px", color: "var(--text-3)", background: "var(--surface-raised)", padding: "3px 8px", borderRadius: "5px" }}>
            {status === "saving" ? "Saving…" : status === "saved" ? "Saved ✓" : status === "error" ? "Error" : ""}
          </span>
        </div>
        <p style={{ margin: 0, fontSize: "13px", color: "var(--text-3)" }}>Run your home like a well-managed operation — calm, intentional, and realistic.</p>
      </div>

      {/* Mode selector */}
      <div style={{ marginBottom: "16px" }}>
        <p style={{ fontSize: "11px", color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 8px", fontWeight: 600 }}>Today&apos;s Mode</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" }}>
          {ALL_MODES.map(m => {
            const meta = MODE_META[m];
            const active = data.mode === m;
            return (
              <button key={m} onClick={() => setMode(m)}
                style={{ background: active ? meta.bg : "var(--surface-raised)", border: `1px solid ${active ? meta.color : "var(--border)"}`, borderRadius: "7px", padding: "10px 8px", cursor: "pointer", fontFamily: "inherit", textAlign: "left", transition: "all 0.12s" }}>
                <div style={{ fontSize: "13px", fontWeight: 600, color: active ? meta.color : "var(--text-2)" }}>{meta.label}</div>
                <div style={{ fontSize: "11px", color: "var(--text-3)", marginTop: "2px", lineHeight: 1.4 }}>{meta.description}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* View tabs */}
      <div style={{ display: "flex", gap: "4px", marginBottom: "16px" }}>
        {(["today", "library"] as const).map(v => (
          <button key={v} onClick={() => setView(v)}
            style={{ background: view === v ? "var(--accent-dim)" : "var(--surface-raised)", color: view === v ? "var(--accent-text)" : "var(--text-3)", border: `1px solid ${view === v ? "var(--accent)" : "var(--border)"}`, borderRadius: "6px", padding: "7px 16px", fontSize: "13px", cursor: "pointer", fontFamily: "inherit" }}>
            {v === "today" ? "Today's Home Shift" : "SOP Library"}
          </button>
        ))}
      </div>

      {/* TODAY VIEW */}
      {view === "today" && (
        <div>
          {/* Overall progress */}
          <div className="card" style={{ marginBottom: "16px", padding: "14px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <div>
                <span style={{ fontSize: "15px", fontWeight: 600, color: "var(--text)" }}>{totalDone} of {totalTasks} tasks done</span>
                <span style={{ fontSize: "12px", color: "var(--text-3)", marginLeft: "10px" }}>
                  {requiredDone}/{requiredTasks.length} required · {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                </span>
              </div>
              {totalTasks > 0 && totalDone === totalTasks && <span style={{ fontSize: "13px", color: "var(--green)", fontWeight: 600 }}>🎉 All done!</span>}
            </div>
            <div style={{ height: "6px", borderRadius: "99px", background: "var(--surface-overlay)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${totalTasks > 0 ? (totalDone / totalTasks) * 100 : 0}%`, background: totalDone === totalTasks ? "var(--green)" : "var(--accent)", borderRadius: "99px", transition: "width 0.3s" }} />
            </div>
          </div>

          {/* SOP sections in order */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {[...TODAY_ORDER, "custom" as SopCategory].flatMap(cat => (todaySops.get(cat) ?? []).map(sop => (
              <SopTodaySection key={sop.id} sop={sop} mode={data.mode} completedIds={todayCompletion.completedIds} onToggle={toggleTask} />
            )))}
          </div>

          {totalTasks === 0 && (
            <div className="card" style={{ textAlign: "center", padding: "40px 20px" }}>
              <p style={{ color: "var(--text-3)", margin: "0 0 8px" }}>No tasks visible in {MODE_META[data.mode].label} mode.</p>
              <p style={{ color: "var(--text-3)", fontSize: "12.5px", margin: 0 }}>Switch to Normal mode or add tasks in the SOP Library.</p>
            </div>
          )}
        </div>
      )}

      {/* LIBRARY VIEW */}
      {view === "library" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <p style={{ margin: 0, fontSize: "13px", color: "var(--text-3)" }}>Click any SOP to expand and edit its tasks. Everything is fully editable.</p>
            <button className="btn btn-secondary" style={{ fontSize: "12px", display: "flex", gap: "5px", alignItems: "center" }} onClick={() => setView("add_sop")}>
              <PlusIcon /> New SOP
            </button>
          </div>

          {/* Active SOPs */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
            {data.sops.filter(s => s.active).sort((a, b) => a.order - b.order).map(sop => (
              <SopLibraryCard key={sop.id} sop={sop} onUpdate={updateSop} />
            ))}
          </div>

          {/* Archived SOPs */}
          {data.sops.some(s => !s.active) && (
            <div>
              <p style={{ fontSize: "11px", color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600, marginBottom: "8px" }}>Archived SOPs</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {data.sops.filter(s => !s.active).map(sop => (
                  <SopLibraryCard key={sop.id} sop={sop} onUpdate={updateSop} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ADD SOP VIEW */}
      {view === "add_sop" && (
        <div className="card" style={{ maxWidth: "500px" }}>
          <p className="card-title">Create New SOP</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "60px 1fr", gap: "8px" }}>
              <input className="input" placeholder="📋" value={addSopForm.icon} onChange={e => setAddSopForm(p => ({ ...p, icon: e.target.value }))} style={{ fontSize: "20px", textAlign: "center" }} />
              <input className="input" placeholder="SOP name *" value={addSopForm.name} onChange={e => setAddSopForm(p => ({ ...p, name: e.target.value }))} style={{ fontSize: "13px" }} />
            </div>
            <div>
              <label style={{ fontSize: "11.5px", color: "var(--text-3)", display: "block", marginBottom: "4px" }}>Category</label>
              <select className="input" value={addSopForm.category} onChange={e => setAddSopForm(p => ({ ...p, category: e.target.value as SopCategory }))} style={{ fontSize: "13px" }}>
                {(Object.keys(CATEGORY_META) as SopCategory[]).map(c => <option key={c} value={c}>{CATEGORY_META[c].label}</option>)}
              </select>
            </div>
            <textarea className="input" placeholder="Description (optional)" value={addSopForm.description} onChange={e => setAddSopForm(p => ({ ...p, description: e.target.value }))} style={{ minHeight: "80px", fontSize: "13px", resize: "vertical" }} />
            <div style={{ display: "flex", gap: "8px" }}>
              <button className="btn btn-primary" onClick={addSop}>Create SOP</button>
              <button className="btn btn-secondary" onClick={() => setView("library")}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
