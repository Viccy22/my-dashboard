// Shared maintenance types and helpers used by maintenance page, home, and todos

export type TaskPeriod = "morning" | "evening" | "weekly" | "monthly" | "quarterly" | "annual";

export type MainTask = {
  id: string;
  title: string;
  period: TaskPeriod;
  active: boolean;
  seasonal: boolean; // only show May 1 – Oct 1
};

export type DayCompletion = {
  date: string;        // YYYY-MM-DD
  completedIds: string[];
};

export type MaintenanceData = {
  tasks: MainTask[];
  completions: DayCompletion[];
};

export const PERIOD_LABELS: Record<TaskPeriod, string> = {
  morning:   "Morning (daily)",
  evening:   "Evening (daily)",
  weekly:    "Weekly — Sunday",
  monthly:   "Monthly — 1st",
  quarterly: "Quarterly",
  annual:    "Annual — Jan 1",
};

export function isSummerSeason(dateStr: string): boolean {
  const d = new Date(dateStr + "T00:00:00");
  const m = d.getMonth() + 1; // 1-12
  const day = d.getDate();
  if (m > 5 && m < 10) return true;
  if (m === 5 && day >= 1) return true;
  if (m === 10 && day === 1) return true;
  return false;
}

export function tasksForToday(tasks: MainTask[], today: string): MainTask[] {
  const d = new Date(today + "T00:00:00");
  const dow   = d.getDay();     // 0 = Sunday
  const dom   = d.getDate();
  const month = d.getMonth() + 1;
  const inSeason = isSummerSeason(today);
  return tasks.filter(t => {
    if (!t.active) return false;
    if (t.seasonal && !inSeason) return false;
    switch (t.period) {
      case "morning":
      case "evening":    return true;
      case "weekly":     return dow === 0;
      case "monthly":    return dom === 1;
      case "quarterly":  return dom === 1 && [1, 4, 7, 10].includes(month);
      case "annual":     return dom === 1 && month === 1;
    }
  });
}

export function isCompletedToday(completions: DayCompletion[], taskId: string, today: string): boolean {
  return completions.find(c => c.date === today)?.completedIds.includes(taskId) ?? false;
}

export function toggleCompletion(completions: DayCompletion[], taskId: string, today: string): DayCompletion[] {
  const existing = completions.find(c => c.date === today);
  if (!existing) return [...completions, { date: today, completedIds: [taskId] }];
  const already = existing.completedIds.includes(taskId);
  return completions.map(c =>
    c.date === today
      ? { ...c, completedIds: already ? c.completedIds.filter(id => id !== taskId) : [...c.completedIds, taskId] }
      : c
  );
}

// Seed tasks — pre-loaded for Victoria
function t(id: string, title: string, period: TaskPeriod, seasonal = false): MainTask {
  return { id, title, period, active: true, seasonal };
}

export const SEED_TASKS: MainTask[] = [
  // Morning
  t("m1",  "Put away dishes",                        "morning"),
  t("m2",  "Feed dogs",                              "morning"),
  t("m3",  "Close windows",                          "morning"),
  t("m4",  "Drain portable ACs",                     "morning", true),
  t("m5",  "Make bed",                               "morning"),
  t("m6",  "Make dog beds",                          "morning"),
  t("m7",  "Put dog protection blanket on bed & couch", "morning"),
  // Evening
  t("e1",  "Pick up trash",                          "evening"),
  t("e2",  "Straighten living room",                 "evening"),
  t("e3",  "Complete dishes",                        "evening"),
  t("e4",  "Drain portable ACs",                     "evening", true),
  t("e5",  "Sweep",                                  "evening"),
  t("e6",  "Vacuum",                                 "evening"),
  t("e7",  "Wipe down bathroom & kitchen counters",  "evening"),
  // Weekly
  t("w1",  "Dust furniture and shelves",             "weekly"),
  t("w2",  "Mop floors",                             "weekly"),
  t("w3",  "Change bed liners",                      "weekly"),
  t("w4",  "Clean mirrors",                          "weekly"),
  t("w5",  "Scrub toilet, sink, and shower",         "weekly"),
  t("w6",  "Drano in shower",                        "weekly"),
  t("w7",  "Wipe down microwave and appliances",     "weekly"),
  t("w8",  "Clean out fridge",                       "weekly"),
  // Monthly
  t("mo1", "Wipe down cabinets inside and out",      "monthly"),
  t("mo2", "Wash out trash cans",                    "monthly"),
  t("mo3", "Clean stove and oven",                   "monthly"),
  t("mo4", "Wipe light switches, doors, handles & frames", "monthly"),
  t("mo5", "Deep clean bathroom & kitchen cabinets", "monthly"),
  // Quarterly
  t("q1",  "Wash windows",                           "quarterly"),
  t("q2",  "Clean grout",                            "quarterly"),
  t("q3",  "Deep clean refrigerator",                "quarterly"),
  t("q4",  "Clean portable ACs",                     "quarterly", true),
  t("q5",  "Air out rooms",                          "quarterly"),
  t("q6",  "Wash curtains",                          "quarterly"),
  t("q7",  "Clean pillows and blankets",             "quarterly"),
  t("q8",  "Wash comforter",                         "quarterly"),
  t("q9",  "Sort through clothes — donate as needed","quarterly"),
  // Annual
  t("a1",  "Clean carpets",                          "annual"),
  t("a2",  "Dust refrigerator vent",                 "annual"),
  t("a3",  "Wash walls",                             "annual"),
  t("a4",  "Rinse screens",                          "annual"),
  t("a5",  "Wash window sills",                      "annual"),
  t("a6",  "Scrub blinds",                           "annual"),
  t("a7",  "Deep clean washing machine",             "annual"),
  t("a8",  "Clean balcony",                          "annual"),
  t("a9",  "Wash light fixtures",                    "annual"),
];
