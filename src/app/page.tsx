"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { MaintenanceData, tasksForToday, isCompletedToday, toggleCompletion, SEED_TASKS } from "@/lib/maintenance";
import { RecurringItem, itemAppliesToDate } from "@/lib/finances";

type Priority = "high" | "medium" | "low";
type Todo     = { id: string; text: string; done: boolean; dueDate?: string; priority?: Priority };
type CalEvent = { id: string; title: string; date: string; time?: string };
type Dog      = { id: string; name: string; nextVetVisit?: string; medications?: { id: string; name: string; refillDate?: string }[] };
type ListItem = { id: string; text: string; done: boolean };
type Lists    = { shopping: ListItem[]; errands: ListItem[] };

type WeatherCurrent = { temp: number; feelsLike: number; humidity: number; wind: number; label: string; emoji: string };
type WeatherDay     = { date: string; high: number; low: number; emoji: string; rain: number };
type Weather        = { ok: boolean; current: WeatherCurrent; forecast: WeatherDay[]; location: string };

type AMRoutine = { faceWash: boolean; toner: boolean; moisturizer: boolean; spf: boolean; azelaicAcid: boolean };
type PMRoutine = { faceWash: boolean; toner: boolean; moisturizer: boolean; tretinoin: boolean };
type SkincareEntry = { id: string; date: string; am: AMRoutine; pm: PMRoutine };

type Contact    = { id: string; name: string; birthday: string; birthYear: string };
type MagicGame  = { id: string; date: string; opponent: string; homeAway: "home" | "away"; ourScore: number | null; theirScore: number | null };
type Festival   = { id: string; name: string; startDate: string; endDate: string; ticketStatus: string };
type Trip       = { id: string; destination: string; startDate: string; status: string };
type Assignment = { id: string; courseId: string; title: string; dueDate: string; done: boolean };
type Run        = { id: string; date: string; distance: number; duration: number };
type HolidayItem = { id: string; name: string; date: string };

type DashData = {
  todos?: Todo[]; events?: CalEvent[];
  maintenance?: MaintenanceData;
  finances?: { currentBalance: number | null; items?: RecurringItem[] };
  dogs?: { dogs: Dog[] };
  lists?: Lists;
  health?: { skincare?: SkincareEntry[] };
  magic?: { games: MagicGame[] };
  festivals?: { festivals: Festival[] };
  vacations?: { trips: Trip[] };
  school?: { assignments?: Assignment[] };
  running?: { runs?: Run[] };
  contacts?: { contacts?: Contact[] };
  holidays?: { holidays?: HolidayItem[] };
  [key: string]: unknown;
};
type SaveStatus = "idle" | "saving" | "saved" | "error";

function todayStr() { return new Date().toISOString().slice(0, 10); }
function getHour()  { return new Date().getHours(); }
function greeting() {
  const h = getHour();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}
function fmtDate(s: string) {
  return new Date(s + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function fmtTime(t: string) {
  if (!t || !t.includes(":")) return t || "";
  const [h, m] = t.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return t;
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "pm" : "am"}`;
}
function daysBetween(a: string, b: string) {
  return Math.round((new Date(b + "T00:00:00").getTime() - new Date(a + "T00:00:00").getTime()) / 86400000);
}

// Skincare schedule helpers
function isTretTonight(entries: SkincareEntry[], today: string): boolean {
  const lastTret = [...entries].sort((a, b) => b.date.localeCompare(a.date)).find(e => e.pm.tretinoin)?.date ?? null;
  if (!lastTret) return true;
  const since = daysBetween(lastTret, today);
  return since >= 3;
}
function isAzelaicToday(entries: SkincareEntry[], today: string): boolean {
  const lastAzel = [...entries].sort((a, b) => b.date.localeCompare(a.date)).find(e => e.am.azelaicAcid)?.date ?? null;
  if (!lastAzel) return true;
  const since = daysBetween(lastAzel, today);
  // Never on same day as tret
  if (isTretTonight(entries, today) && since >= 2) return false;
  return since >= 2;
}

const XIcon = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M2 2l9 9M11 2l-9 9" strokeLinecap="round" />
  </svg>
);

function CheckItem({ label, done, onToggle, accent }: { label: string; done: boolean; onToggle: () => void; accent?: string }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: "8px", padding: "4px 0", cursor: "pointer", userSelect: "none" }}>
      <span style={{ width: "18px", height: "18px", borderRadius: "5px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: done ? (accent ?? "var(--green)") : "var(--surface-raised)", border: done ? "none" : "1px solid var(--border)", transition: "all 0.1s" }}
        onClick={e => { e.preventDefault(); onToggle(); }}>
        {done && <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="white" strokeWidth="1.8"><path d="M1.5 5l2.5 2.5L8.5 2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
      </span>
      <span style={{ fontSize: "13px", color: done ? "var(--text-3)" : "var(--text)", textDecoration: done ? "line-through" : "none", transition: "all 0.1s" }}>{label}</span>
    </label>
  );
}

export default function HomePage() {
  const [data,    setData]    = useState<DashData>({});
  const [todos,   setTodos]   = useState<Todo[]>([]);
  const [events,  setEvents]  = useState<CalEvent[]>([]);
  const [maint,   setMaint]   = useState<MaintenanceData>({ tasks: [], completions: [] });
  const [lists,   setLists]   = useState<Lists>({ shopping: [], errands: [] });
  const [skincare,setSkincare]= useState<SkincareEntry[]>([]);
  const [status,  setStatus]  = useState<SaveStatus>("idle");
  const [loading, setLoading] = useState(true);
  const [balance,   setBalance]   = useState<number | null>(null);
  const [dogs,      setDogs]      = useState<Dog[]>([]);
  const [billItems, setBillItems] = useState<RecurringItem[]>([]);
  const [nextMagic,    setNextMagic]    = useState<MagicGame | null>(null);
  const [nextFest,     setNextFest]     = useState<Festival | null>(null);
  const [nextTrip,     setNextTrip]     = useState<Trip | null>(null);
  const [dueAssignments, setDueAssignments] = useState<Assignment[]>([]);
  const [weekRuns,     setWeekRuns]     = useState<{ miles: number; count: number }>({ miles: 0, count: 0 });
  const [birthdaysToday, setBirthdaysToday] = useState<Contact[]>([]);
  const [upcomingHolidays, setUpcomingHolidays] = useState<(HolidayItem & { days: number })[]>([]);
  const [newTask,    setNewTask]    = useState("");
  const [newTitle,   setNewTitle]   = useState("");
  const [newDate,    setNewDate]    = useState("");
  const [newTime,    setNewTime]    = useState("");
  const [newShop,    setNewShop]    = useState("");
  const [newErrand,  setNewErrand]  = useState("");
  const [weather,    setWeather]    = useState<Weather | null>(null);
  const [oura,       setOura]       = useState<{ sleepScore: number | null; readinessScore: number | null; hrvAvg: number | null; activityScore: number | null; steps: number | null } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const today = todayStr();

  useEffect(() => {
    fetch("/api/data")
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(res => {
        const d: DashData = res.data ?? {};
        setData(d);
        setTodos(d.todos ?? []);
        setEvents(d.events ?? []);
        setBalance(d.finances?.currentBalance ?? null);
        setDogs(d.dogs?.dogs ?? []);
        setBillItems((d.finances?.items ?? []).filter((it: RecurringItem) => it.active && it.amount < 0));
        const todayVal = new Date().toISOString().slice(0, 10);
        const magicGames = (d.magic?.games ?? []).filter(g => g.date >= todayVal && g.ourScore === null).sort((a: MagicGame, b: MagicGame) => a.date.localeCompare(b.date));
        setNextMagic(magicGames[0] ?? null);
        const fests = (d.festivals?.festivals ?? []).filter((f: Festival) => f.startDate > todayVal && f.ticketStatus !== "skipped").sort((a: Festival, b: Festival) => a.startDate.localeCompare(b.startDate));
        setNextFest(fests[0] ?? null);
        const trips = (d.vacations?.trips ?? []).filter((t: Trip) => t.startDate > todayVal && t.status !== "completed").sort((a: Trip, b: Trip) => a.startDate.localeCompare(b.startDate));
        setNextTrip(trips[0] ?? null);
        // School assignments due in next 7 days
        const sevenDays = new Date(); sevenDays.setDate(sevenDays.getDate() + 7);
        const sevenStr = sevenDays.toISOString().slice(0, 10);
        const due = (d.school?.assignments ?? []).filter((a: Assignment) => !a.done && a.dueDate >= todayVal && a.dueDate <= sevenStr).sort((a: Assignment, b: Assignment) => a.dueDate.localeCompare(b.dueDate));
        setDueAssignments(due);
        // Running this week (Sun–Sat)
        const now = new Date(); const dow = now.getDay();
        const weekStart = new Date(now); weekStart.setDate(now.getDate() - dow); weekStart.setHours(0,0,0,0);
        const weekStartStr = weekStart.toISOString().slice(0, 10);
        const weekRunsData = (d.running?.runs ?? []).filter((r: Run) => r.date >= weekStartStr && r.date <= todayVal);
        setWeekRuns({ miles: weekRunsData.reduce((s: number, r: Run) => s + r.distance, 0), count: weekRunsData.length });
        const todayMMDD = todayVal.slice(5); // "MM-DD"
        setBirthdaysToday((d.contacts?.contacts ?? []).filter((c: Contact) => c.birthday === todayMMDD));
        // Upcoming holidays (next 60 days)
        const in60 = new Date(); in60.setDate(in60.getDate() + 60);
        const in60Str = in60.toISOString().slice(0, 10);
        const holidayList = (d.holidays?.holidays ?? [])
          .filter((h: HolidayItem) => h.date && h.date >= todayVal && h.date <= in60Str)
          .map((h: HolidayItem) => ({ ...h, days: Math.round((new Date(h.date + "T00:00:00").getTime() - new Date(todayVal + "T00:00:00").getTime()) / 86400000) }))
          .sort((a: HolidayItem & { days: number }, b: HolidayItem & { days: number }) => a.days - b.days);
        setUpcomingHolidays(holidayList);
        setLists(d.lists ?? { shopping: [], errands: [] });
        setSkincare(d.health?.skincare ?? []);
        const saved = d.maintenance;
        if (!saved?.tasks?.length || (saved.tasks[0] as unknown as { frequency?: string }).frequency) {
          setMaint({ tasks: SEED_TASKS, completions: [] });
        } else {
          setMaint(saved as MaintenanceData);
        }
      })
      .catch(() => setStatus("error"))
      .finally(() => setLoading(false));
    // Weather — separate fetch, non-blocking
    fetch("/api/weather").then(r => r.ok ? r.json() : null).then(w => { if (w?.ok) setWeather(w); }).catch(() => {});
    // Oura — separate fetch, non-blocking
    fetch("/api/oura").then(r => r.ok ? r.json() : null).then(o => {
      if (o?.ok && o.days?.length) { const latest = o.days[0]; setOura({ sleepScore: latest.sleepScore, readinessScore: latest.readinessScore, hrvAvg: latest.hrvAvg, activityScore: latest.activityScore, steps: latest.steps }); }
    }).catch(() => {});
  }, []);

  const save = useCallback(async (newData: DashData) => {
    setStatus("saving");
    if (timer.current) clearTimeout(timer.current);
    try {
      const res = await fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data: newData }) });
      if (!res.ok) throw new Error();
      setStatus("saved");
    } catch { setStatus("error"); }
    finally { timer.current = setTimeout(() => setStatus("idle"), 2000); }
  }, []);

  // Todos
  const addTask = () => {
    const text = newTask.trim(); if (!text) return;
    const updated = [...todos, { id: crypto.randomUUID(), text, done: false }];
    setTodos(updated); setNewTask(""); const d = { ...data, todos: updated }; setData(d); save(d);
  };
  const toggleTask = (id: string) => {
    const updated = todos.map(t => t.id === id ? { ...t, done: !t.done } : t);
    setTodos(updated); const d = { ...data, todos: updated }; setData(d); save(d);
  };
  const deleteTask = (id: string) => {
    const updated = todos.filter(t => t.id !== id);
    setTodos(updated); const d = { ...data, todos: updated }; setData(d); save(d);
  };

  // Events
  const addEvent = () => {
    if (!newTitle.trim() || !newDate) return;
    const ev: CalEvent = { id: crypto.randomUUID(), title: newTitle.trim(), date: newDate, time: newTime || undefined };
    const updated = [...events, ev].sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? "").localeCompare(b.time ?? ""));
    setEvents(updated); setNewTitle(""); setNewDate(""); setNewTime("");
    const d = { ...data, events: updated }; setData(d); save(d);
  };
  const deleteEvent = (id: string) => {
    const updated = events.filter(e => e.id !== id);
    setEvents(updated); const d = { ...data, events: updated }; setData(d); save(d);
  };

  // Maintenance completion
  const toggleMaint = (taskId: string) => {
    const updated = { ...maint, completions: toggleCompletion(maint.completions, taskId, today) };
    setMaint(updated); const d = { ...data, maintenance: updated }; setData(d); save(d);
  };

  // Skincare completion for today
  const toggleSkincare = (field: keyof AMRoutine | keyof PMRoutine, period: "am" | "pm") => {
    const existing = skincare.find(e => e.date === today);
    let entry: SkincareEntry;
    if (existing) {
      entry = period === "am"
        ? { ...existing, am: { ...existing.am, [field]: !existing.am[field as keyof AMRoutine] } }
        : { ...existing, pm: { ...existing.pm, [field]: !existing.pm[field as keyof PMRoutine] } };
    } else {
      const blankAM: AMRoutine = { faceWash: false, toner: false, moisturizer: false, spf: false, azelaicAcid: false };
      const blankPM: PMRoutine = { faceWash: false, toner: false, moisturizer: false, tretinoin: false };
      entry = { id: crypto.randomUUID(), date: today, am: { ...blankAM }, pm: { ...blankPM } };
      if (period === "am") entry.am = { ...entry.am, [field]: true };
      else entry.pm = { ...entry.pm, [field]: true };
    }
    const updated = skincare.some(e => e.date === today)
      ? skincare.map(e => e.date === today ? entry : e)
      : [...skincare, entry];
    setSkincare(updated);
    const d = { ...data, health: { ...((data.health ?? {}) as object), skincare: updated } } as DashData;
    setData(d); save(d);
  };

  // Shopping & errands
  const addListItem = (type: "shopping" | "errands", text: string) => {
    if (!text.trim()) return;
    const updated = { ...lists, [type]: [...lists[type], { id: crypto.randomUUID(), text: text.trim(), done: false }] };
    setLists(updated); const d = { ...data, lists: updated }; setData(d); save(d);
    if (type === "shopping") setNewShop(""); else setNewErrand("");
  };
  const toggleListItem = (type: "shopping" | "errands", id: string) => {
    const updated = { ...lists, [type]: lists[type].map(i => i.id === id ? { ...i, done: !i.done } : i) };
    setLists(updated); const d = { ...data, lists: updated }; setData(d); save(d);
  };
  const deleteListItem = (type: "shopping" | "errands", id: string) => {
    const updated = { ...lists, [type]: lists[type].filter(i => i.id !== id) };
    setLists(updated); const d = { ...data, lists: updated }; setData(d); save(d);
  };

  if (loading) return <p className="empty" style={{ padding: "32px 0" }}>Loading…</p>;

  const pending  = todos.filter(t => !t.done);
  const done     = todos.filter(t => t.done);
  const overdue  = todos.filter(t => !t.done && t.dueDate && t.dueDate < today);
  const dueToday = todos.filter(t => !t.done && t.dueDate === today);
  const upcoming = events.filter(e => e.date >= today);
  const past     = events.filter(e => e.date <  today);

  const todayMaint  = tasksForToday(maint.tasks, today);
  const maintDone   = todayMaint.filter(t => isCompletedToday(maint.completions, t.id, today)).length;
  const morningTasks = todayMaint.filter(t => t.period === "morning");
  const eveningTasks = todayMaint.filter(t => t.period === "evening");
  const otherTasks   = todayMaint.filter(t => t.period !== "morning" && t.period !== "evening");

  const todaySkincare = skincare.find(e => e.date === today);
  const tretTonight   = isTretTonight(skincare, today);
  const azelaicToday  = isAzelaicToday(skincare, today);

  // Bills due in next 7 days
  const billsNext7: { item: RecurringItem; date: string }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(); d.setDate(d.getDate() + i);
    const ds = d.toISOString().slice(0, 10);
    for (const it of billItems) { if (itemAppliesToDate(it, ds)) billsNext7.push({ item: it, date: ds }); }
  }
  billsNext7.sort((a, b) => a.date.localeCompare(b.date));

  return (
    <>
      {status !== "idle" && (
        <div className={`toast${status === "error" ? " error" : ""}`}>
          {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : "Could not save — check connection."}
        </div>
      )}

      <div className="greeting-row">
        <h1>{greeting()}, Victoria</h1>
        <p className="sub">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p>
      </div>

      <div className="dash-grid dash-main-aside">

        {/* ── Left column ── */}
        <div className="dash-grid" style={{ gap: "16px" }}>

          {/* Tasks */}
          <div className="card">
            <p className="card-title">Tasks {pending.length > 0 && <span style={{ marginLeft: "8px", background: "var(--accent-dim)", color: "var(--accent-text)", borderRadius: "99px", padding: "1px 7px", fontSize: "11px", fontWeight: 600, textTransform: "none", letterSpacing: 0 }}>{pending.length}</span>}</p>
            <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
              <input className="input" placeholder="Add a task…" value={newTask} onChange={e => setNewTask(e.target.value)} onKeyDown={e => e.key === "Enter" && addTask()} />
              <button className="btn btn-primary" onClick={addTask} style={{ padding: "8px 14px" }}>Add</button>
            </div>
            {pending.length === 0 && done.length === 0 && <p className="empty">No tasks yet.</p>}
            {pending.map(t => (
              <div key={t.id} className="row">
                <input type="checkbox" className="checkbox" checked={false} onChange={() => toggleTask(t.id)} />
                <span style={{ flex: 1, fontSize: "13.5px", color: "var(--text)" }}>{t.text}</span>
                <button className="btn-icon" onClick={() => deleteTask(t.id)}><XIcon /></button>
              </div>
            ))}
            {done.length > 0 && (
              <>
                <div className="divider" />
                <p style={{ fontSize: "11px", color: "var(--text-3)", marginBottom: "4px" }}>Completed</p>
                {done.map(t => (
                  <div key={t.id} className="row done">
                    <input type="checkbox" className="checkbox" checked={true} onChange={() => toggleTask(t.id)} />
                    <span style={{ flex: 1, fontSize: "13.5px", color: "var(--text)", textDecoration: "line-through" }}>{t.text}</span>
                    <button className="btn-icon" onClick={() => deleteTask(t.id)}><XIcon /></button>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Today's cleaning */}
          {todayMaint.length > 0 && (
            <div className="card">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                <p className="card-title" style={{ margin: 0 }}>Cleaning today</p>
                <span style={{ fontSize: "12px", color: "var(--text-3)" }}>{maintDone}/{todayMaint.length}</span>
              </div>
              <div style={{ height: "4px", borderRadius: "99px", background: "var(--surface-raised)", marginBottom: "12px", overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: "99px", background: "var(--green)", width: `${todayMaint.length ? (maintDone / todayMaint.length) * 100 : 0}%`, transition: "width 0.3s" }} />
              </div>
              {morningTasks.length > 0 && (
                <>
                  <p style={{ fontSize: "10.5px", fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 6px" }}>Morning</p>
                  {morningTasks.map(t => (
                    <CheckItem key={t.id} label={t.title} done={isCompletedToday(maint.completions, t.id, today)} onToggle={() => toggleMaint(t.id)} />
                  ))}
                </>
              )}
              {eveningTasks.length > 0 && (
                <>
                  <p style={{ fontSize: "10.5px", fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", margin: "10px 0 6px" }}>Evening</p>
                  {eveningTasks.map(t => (
                    <CheckItem key={t.id} label={t.title} done={isCompletedToday(maint.completions, t.id, today)} onToggle={() => toggleMaint(t.id)} />
                  ))}
                </>
              )}
              {otherTasks.length > 0 && (
                <>
                  <p style={{ fontSize: "10.5px", fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", margin: "10px 0 6px" }}>Also today</p>
                  {otherTasks.map(t => (
                    <CheckItem key={t.id} label={t.title} done={isCompletedToday(maint.completions, t.id, today)} onToggle={() => toggleMaint(t.id)} />
                  ))}
                </>
              )}
              <a href="/maintenance" style={{ fontSize: "12px", color: "var(--accent)", textDecoration: "none", display: "block", marginTop: "10px" }}>View all →</a>
            </div>
          )}

          {/* Skincare today */}
          <div className="card">
            <p className="card-title" style={{ marginBottom: "10px" }}>Skincare today</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <p style={{ fontSize: "10.5px", fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 6px" }}>Morning</p>
                <CheckItem label="Face wash"    done={todaySkincare?.am.faceWash    ?? false} onToggle={() => toggleSkincare("faceWash",    "am")} />
                <CheckItem label="Toner"        done={todaySkincare?.am.toner        ?? false} onToggle={() => toggleSkincare("toner",        "am")} />
                {azelaicToday && <CheckItem label="Azelaic acid" done={todaySkincare?.am.azelaicAcid ?? false} onToggle={() => toggleSkincare("azelaicAcid", "am")} accent="var(--accent)" />}
                <CheckItem label="Moisturizer"  done={todaySkincare?.am.moisturizer  ?? false} onToggle={() => toggleSkincare("moisturizer",  "am")} />
                <CheckItem label="SPF"          done={todaySkincare?.am.spf          ?? false} onToggle={() => toggleSkincare("spf",          "am")} />
              </div>
              <div>
                <p style={{ fontSize: "10.5px", fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 6px" }}>Evening</p>
                <CheckItem label="Face wash"   done={todaySkincare?.pm.faceWash   ?? false} onToggle={() => toggleSkincare("faceWash",   "pm")} />
                <CheckItem label="Toner"       done={todaySkincare?.pm.toner       ?? false} onToggle={() => toggleSkincare("toner",       "pm")} />
                {tretTonight && <CheckItem label="Tretinoin" done={todaySkincare?.pm.tretinoin ?? false} onToggle={() => toggleSkincare("tretinoin", "pm")} accent="var(--green)" />}
                <CheckItem label="Moisturizer" done={todaySkincare?.pm.moisturizer ?? false} onToggle={() => toggleSkincare("moisturizer", "pm")} />
              </div>
            </div>
            <a href="/health" style={{ fontSize: "12px", color: "var(--accent)", textDecoration: "none", display: "block", marginTop: "10px" }}>Full skincare log →</a>
          </div>

          {/* Events */}
          <div className="card">
            <p className="card-title">Upcoming Events</p>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "12px" }}>
              <input className="input" placeholder="Event title…" value={newTitle} onChange={e => setNewTitle(e.target.value)} onKeyDown={e => e.key === "Enter" && addEvent()} style={{ flex: "2 1 160px" }} />
              <input className="input" type="date" value={newDate} onChange={e => setNewDate(e.target.value)} style={{ flex: "1 1 140px" }} />
              <input className="input" type="time" value={newTime} onChange={e => setNewTime(e.target.value)} style={{ flex: "1 1 110px" }} />
              <button className="btn btn-primary" onClick={addEvent}>Add</button>
            </div>
            {upcoming.length === 0 ? (
              <p className="empty">No upcoming events.</p>
            ) : (
              upcoming.map(e => (
                <div key={e.id} className="event-row">
                  <span className="event-date">{fmtDate(e.date)}</span>
                  <div style={{ flex: 1 }}>
                    <div className="event-title">{e.title}</div>
                    {e.time && <div className="event-time">{fmtTime(e.time)}</div>}
                  </div>
                  <button className="btn-icon" onClick={() => deleteEvent(e.id)}><XIcon /></button>
                </div>
              ))
            )}
            {past.length > 0 && (
              <details style={{ marginTop: "12px" }}>
                <summary style={{ fontSize: "12px", color: "var(--text-3)", cursor: "pointer", userSelect: "none" }}>{past.length} past event{past.length !== 1 ? "s" : ""}</summary>
                <div style={{ marginTop: "8px", opacity: 0.4 }}>
                  {past.map(e => (
                    <div key={e.id} className="event-row">
                      <span className="event-date">{fmtDate(e.date)}</span>
                      <span className="event-title" style={{ textDecoration: "line-through" }}>{e.title}</span>
                      <button className="btn-icon" onClick={() => deleteEvent(e.id)}><XIcon /></button>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        </div>

        {/* ── Right column ── */}
        <div className="dash-grid" style={{ gap: "16px", alignContent: "start" }}>

          {/* Weather */}
          {weather && (
            <div className="card">
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div>
                  <p className="card-title" style={{ margin: "0 0 4px" }}>{weather.location}</p>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                    <span style={{ fontSize: "36px", lineHeight: 1 }}>{weather.current.emoji}</span>
                    <span style={{ fontSize: "32px", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{weather.current.temp}°</span>
                    <span style={{ fontSize: "13px", color: "var(--text-3)" }}>feels {weather.current.feelsLike}°</span>
                  </div>
                  <p style={{ fontSize: "12.5px", color: "var(--text-2)", margin: "3px 0 0" }}>{weather.current.label} · {weather.current.humidity}% humidity · {weather.current.wind} mph</p>
                </div>
              </div>
              <div style={{ display: "flex", gap: "6px", marginTop: "12px" }}>
                {weather.forecast.slice(0, 5).map((day, i) => {
                  const d = new Date(day.date + "T00:00:00");
                  const label = i === 0 ? "Today" : d.toLocaleDateString("en-US", { weekday: "short" });
                  return (
                    <div key={day.date} style={{ flex: 1, textAlign: "center", background: "var(--surface-raised)", borderRadius: "8px", padding: "8px 4px" }}>
                      <p style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-3)", margin: "0 0 4px" }}>{label}</p>
                      <p style={{ fontSize: "18px", margin: "0 0 4px" }}>{day.emoji}</p>
                      <p style={{ fontSize: "12px", fontWeight: 600, margin: 0 }}>{day.high}°</p>
                      <p style={{ fontSize: "11px", color: "var(--text-3)", margin: 0 }}>{day.low}°</p>
                      {day.rain > 20 && <p style={{ fontSize: "10px", color: "var(--accent-text)", margin: "2px 0 0" }}>{day.rain}%</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Oura */}
          {oura && (
            <a href="/health" style={{ textDecoration: "none" }}>
              <div className="card" style={{ cursor: "pointer" }}>
                <p className="card-title" style={{ marginBottom: "10px" }}>Last night · Oura</p>
                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                  {oura.sleepScore !== null && (
                    <div style={{ flex: 1, textAlign: "center", background: oura.sleepScore >= 85 ? "var(--green-dim)" : oura.sleepScore >= 70 ? "var(--yellow-dim)" : "var(--red-dim)", borderRadius: "8px", padding: "8px 6px" }}>
                      <p style={{ margin: 0, fontSize: "22px", fontWeight: 800, color: oura.sleepScore >= 85 ? "var(--green)" : oura.sleepScore >= 70 ? "var(--yellow)" : "var(--red)", fontVariantNumeric: "tabular-nums" }}>{oura.sleepScore}</p>
                      <p style={{ margin: 0, fontSize: "10px", color: "var(--text-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Sleep</p>
                    </div>
                  )}
                  {oura.readinessScore !== null && (
                    <div style={{ flex: 1, textAlign: "center", background: oura.readinessScore >= 85 ? "var(--green-dim)" : oura.readinessScore >= 70 ? "var(--yellow-dim)" : "var(--red-dim)", borderRadius: "8px", padding: "8px 6px" }}>
                      <p style={{ margin: 0, fontSize: "22px", fontWeight: 800, color: oura.readinessScore >= 85 ? "var(--green)" : oura.readinessScore >= 70 ? "var(--yellow)" : "var(--red)", fontVariantNumeric: "tabular-nums" }}>{oura.readinessScore}</p>
                      <p style={{ margin: 0, fontSize: "10px", color: "var(--text-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Readiness</p>
                    </div>
                  )}
                  {oura.activityScore !== null && (
                    <div style={{ flex: 1, textAlign: "center", background: "var(--surface-raised)", borderRadius: "8px", padding: "8px 6px" }}>
                      <p style={{ margin: 0, fontSize: "22px", fontWeight: 800, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>{oura.activityScore}</p>
                      <p style={{ margin: 0, fontSize: "10px", color: "var(--text-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Activity</p>
                    </div>
                  )}
                  {oura.hrvAvg !== null && (
                    <div style={{ flex: 1, textAlign: "center", background: "var(--surface-raised)", borderRadius: "8px", padding: "8px 6px" }}>
                      <p style={{ margin: 0, fontSize: "22px", fontWeight: 800, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>{oura.hrvAvg}</p>
                      <p style={{ margin: 0, fontSize: "10px", color: "var(--text-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>HRV</p>
                    </div>
                  )}
                </div>
                {oura.steps !== null && (
                  <p style={{ margin: "8px 0 0", fontSize: "12px", color: "var(--text-3)" }}>{oura.steps.toLocaleString()} steps yesterday</p>
                )}
              </div>
            </a>
          )}

          {/* Overview */}
          <div className="card">
            <p className="card-title">Overview</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {overdue.length > 0 && <StatBadge label="Overdue tasks" value={overdue.length} color="red" />}
              {dueToday.length > 0 && <StatBadge label="Due today" value={dueToday.length} color="yellow" />}
              <StatRow label="Tasks pending"   value={pending.length} />
              <StatRow label="Tasks done"      value={done.length} dim />
              <StatRow label="Upcoming events" value={upcoming.length} />
              {todayMaint.length > 0 && <StatRow label="Cleaning tasks today" value={todayMaint.length - maintDone} />}
            </div>
          </div>

          {/* School assignments due soon */}
          {dueAssignments.length > 0 && (
            <div className="card">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                <p className="card-title" style={{ margin: 0 }}>Assignments due</p>
                <a href="/school" style={{ fontSize: "12px", color: "var(--accent)", textDecoration: "none" }}>All →</a>
              </div>
              {dueAssignments.map(a => {
                const isToday2 = a.dueDate === today;
                const diff = Math.round((new Date(a.dueDate + "T00:00:00").getTime() - new Date(today + "T00:00:00").getTime()) / 86400000);
                const label = isToday2 ? "Today" : diff === 1 ? "Tomorrow" : `In ${diff}d`;
                return (
                  <div key={a.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid var(--border)" }}>
                    <span style={{ fontSize: "13px", flex: 1, marginRight: "8px" }}>{a.title}</span>
                    <span style={{ fontSize: "11.5px", fontWeight: 700, color: isToday2 ? "var(--red)" : diff <= 2 ? "var(--yellow)" : "var(--text-3)", flexShrink: 0 }}>{label}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Running this week */}
          {weekRuns.count > 0 && (
            <a href="/running" style={{ textDecoration: "none" }}>
              <div className="card" style={{ cursor: "pointer" }}>
                <p className="card-title" style={{ marginBottom: "8px" }}>Running this week</p>
                <div style={{ display: "flex", gap: "20px" }}>
                  <div>
                    <p style={{ margin: 0, fontSize: "22px", fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{weekRuns.miles.toFixed(1)}</p>
                    <p style={{ margin: 0, fontSize: "11px", color: "var(--text-3)" }}>miles</p>
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: "22px", fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{weekRuns.count}</p>
                    <p style={{ margin: 0, fontSize: "11px", color: "var(--text-3)" }}>run{weekRuns.count !== 1 ? "s" : ""}</p>
                  </div>
                </div>
              </div>
            </a>
          )}

          {/* Finances */}
          <a href="/finances" style={{ textDecoration: "none" }}>
            <div className="card" style={{ cursor: "pointer" }}>
              <p className="card-title">Finances</p>
              {balance == null ? (
                <p className="empty" style={{ margin: 0 }}>Set your balance to start.</p>
              ) : (
                <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                  <span style={{ fontSize: "26px", fontWeight: 700, fontVariantNumeric: "tabular-nums", color: balance < 300 ? "var(--red)" : balance < 600 ? "var(--yellow)" : "var(--text)" }}>
                    {(balance < 0 ? "-$" : "$") + Math.abs(balance).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span style={{ fontSize: "12px", color: "var(--text-3)" }}>checking</span>
                </div>
              )}
            </div>
          </a>

          {/* Bills this week */}
          {billsNext7.length > 0 && (
            <div className="card">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                <p className="card-title" style={{ margin: 0 }}>Bills this week</p>
                <a href="/finances" style={{ fontSize: "12px", color: "var(--accent)", textDecoration: "none" }}>All →</a>
              </div>
              {billsNext7.map(({ item, date }, i) => {
                const isToday2 = date === today;
                const d = new Date(date + "T00:00:00");
                const dayLabel = isToday2 ? "Today" : d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
                return (
                  <div key={`${item.id}-${date}-${i}`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid var(--border)" }}>
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: 500 }}>{item.name}</div>
                      <div style={{ fontSize: "11.5px", color: isToday2 ? "var(--red)" : "var(--text-3)", fontWeight: isToday2 ? 700 : 400 }}>{dayLabel}</div>
                    </div>
                    <span style={{ fontSize: "13px", fontWeight: 700, color: isToday2 ? "var(--red)" : "var(--text-2)", fontVariantNumeric: "tabular-nums" }}>
                      {Math.abs(item.amount).toLocaleString("en-US", { style: "currency", currency: "USD" })}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Birthdays today */}
          {birthdaysToday.length > 0 && (
            <div className="card" style={{ background: "linear-gradient(135deg, #f59e0b18, #ec489918)", border: "1px solid #f59e0b44" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "26px" }}>🎂</span>
                <div>
                  <p className="card-title" style={{ margin: 0, color: "#f59e0b" }}>
                    {birthdaysToday.length === 1 ? "Birthday today!" : "Birthdays today!"}
                  </p>
                  <p style={{ margin: "3px 0 0", fontSize: "13px", color: "var(--text)" }}>
                    {birthdaysToday.map(c => {
                      const age = c.birthYear ? new Date().getFullYear() - parseInt(c.birthYear) : null;
                      return age ? `${c.name} turns ${age}` : c.name;
                    }).join(" · ")}
                  </p>
                </div>
              </div>
              <a href="/contacts" style={{ display: "block", marginTop: "8px", fontSize: "12px", color: "var(--accent)", textDecoration: "none" }}>View contacts →</a>
            </div>
          )}

          {/* Coming up */}
          {(nextMagic || nextFest || nextTrip) && (
            <div className="card">
              <p className="card-title" style={{ marginBottom: "10px" }}>Coming up</p>
              {nextMagic && (() => {
                const days = Math.round((new Date(nextMagic.date + "T00:00:00").getTime() - Date.now()) / 86400000);
                return (
                  <a href="/magic" style={{ textDecoration: "none", color: "inherit" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                      <div>
                        <div style={{ fontSize: "13px", fontWeight: 600 }}>🏀 {nextMagic.homeAway === "home" ? "vs" : "@"} {nextMagic.opponent}</div>
                        <div style={{ fontSize: "11.5px", color: "var(--text-3)" }}>{new Date(nextMagic.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</div>
                      </div>
                      <span style={{ fontSize: "12px", fontWeight: 700, color: days <= 3 ? "var(--accent-text)" : "var(--text-3)" }}>{days === 0 ? "Today" : `${days}d`}</span>
                    </div>
                  </a>
                );
              })()}
              {nextFest && (() => {
                const days = Math.round((new Date(nextFest.startDate + "T00:00:00").getTime() - Date.now()) / 86400000);
                return (
                  <a href="/festivals" style={{ textDecoration: "none", color: "inherit" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderBottom: nextTrip ? "1px solid var(--border)" : "none" }}>
                      <div>
                        <div style={{ fontSize: "13px", fontWeight: 600 }}>🎪 {nextFest.name}</div>
                        <div style={{ fontSize: "11.5px", color: "var(--text-3)" }}>{new Date(nextFest.startDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
                      </div>
                      <span style={{ fontSize: "12px", fontWeight: 700, color: days <= 30 ? "var(--accent-text)" : "var(--text-3)" }}>{days}d</span>
                    </div>
                  </a>
                );
              })()}
              {nextTrip && (() => {
                const days = Math.round((new Date(nextTrip.startDate + "T00:00:00").getTime() - Date.now()) / 86400000);
                return (
                  <a href="/vacations" style={{ textDecoration: "none", color: "inherit" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0" }}>
                      <div>
                        <div style={{ fontSize: "13px", fontWeight: 600 }}>✈️ {nextTrip.destination}</div>
                        <div style={{ fontSize: "11.5px", color: "var(--text-3)" }}>{new Date(nextTrip.startDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
                      </div>
                      <span style={{ fontSize: "12px", fontWeight: 700, color: days <= 30 ? "var(--accent-text)" : "var(--text-3)" }}>{days}d</span>
                    </div>
                  </a>
                );
              })()}
            </div>
          )}

          {/* Upcoming Holidays */}
          {upcomingHolidays.length > 0 && (
            <div className="card">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                <p className="card-title" style={{ margin: 0 }}>Upcoming Holidays</p>
                <a href="/holidays" style={{ fontSize: "12px", color: "var(--accent)", textDecoration: "none" }}>All →</a>
              </div>
              {upcomingHolidays.slice(0, 5).map(h => (
                <div key={h.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid var(--border)" }}>
                  <span style={{ fontSize: "13px", flex: 1 }}>{h.name}</span>
                  <span style={{ fontSize: "11.5px", fontWeight: 700, color: h.days === 0 ? "var(--accent-text)" : h.days <= 7 ? "var(--yellow)" : "var(--text-3)", flexShrink: 0 }}>
                    {h.days === 0 ? "Today!" : h.days === 1 ? "Tomorrow" : `${h.days}d`}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Dogs */}
          {dogs.length > 0 && (
            <a href="/dogs" style={{ textDecoration: "none" }}>
              <div className="card" style={{ cursor: "pointer" }}>
                <p className="card-title">Dogs</p>
                {dogs.map(dog => {
                  const apptDays = dog.nextVetVisit ? Math.round((new Date(dog.nextVetVisit + "T00:00:00").getTime() - Date.now()) / 86400000) : null;
                  const refillSoon = (dog.medications ?? []).some(m => { if (!m.refillDate) return false; return Math.round((new Date(m.refillDate + "T00:00:00").getTime() - Date.now()) / 86400000) <= 14; });
                  return (
                    <div key={dog.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 0" }}>
                      <span style={{ fontSize: "13.5px", color: "var(--text)", fontWeight: 500 }}>{dog.name}</span>
                      <div style={{ display: "flex", gap: "6px" }}>
                        {apptDays !== null && apptDays <= 14 && <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 7px", borderRadius: "99px", background: apptDays < 0 ? "var(--red-dim)" : "var(--yellow-dim)", color: apptDays < 0 ? "var(--red)" : "var(--yellow)" }}>{apptDays < 0 ? "Vet overdue" : `Vet in ${apptDays}d`}</span>}
                        {refillSoon && <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 7px", borderRadius: "99px", background: "var(--yellow-dim)", color: "var(--yellow)" }}>Refill soon</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </a>
          )}

          {/* Shopping list */}
          <div className="card">
            <p className="card-title">Shopping List</p>
            <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
              <input className="input" placeholder="Add item…" value={newShop} onChange={e => setNewShop(e.target.value)} onKeyDown={e => e.key === "Enter" && addListItem("shopping", newShop)} />
              <button className="btn btn-primary" style={{ padding: "8px 12px" }} onClick={() => addListItem("shopping", newShop)}>Add</button>
            </div>
            {lists.shopping.length === 0 && <p className="empty">Nothing on the list.</p>}
            {lists.shopping.map(item => (
              <div key={item.id} className="row" style={{ opacity: item.done ? 0.5 : 1 }}>
                <input type="checkbox" className="checkbox" checked={item.done} onChange={() => toggleListItem("shopping", item.id)} />
                <span style={{ flex: 1, fontSize: "13.5px", color: "var(--text)", textDecoration: item.done ? "line-through" : "none" }}>{item.text}</span>
                <button className="btn-icon" onClick={() => deleteListItem("shopping", item.id)}><XIcon /></button>
              </div>
            ))}
          </div>

          {/* Errands */}
          <div className="card">
            <p className="card-title">Errands</p>
            <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
              <input className="input" placeholder="Add errand…" value={newErrand} onChange={e => setNewErrand(e.target.value)} onKeyDown={e => e.key === "Enter" && addListItem("errands", newErrand)} />
              <button className="btn btn-primary" style={{ padding: "8px 12px" }} onClick={() => addListItem("errands", newErrand)}>Add</button>
            </div>
            {lists.errands.length === 0 && <p className="empty">No errands pending.</p>}
            {lists.errands.map(item => (
              <div key={item.id} className="row" style={{ opacity: item.done ? 0.5 : 1 }}>
                <input type="checkbox" className="checkbox" checked={item.done} onChange={() => toggleListItem("errands", item.id)} />
                <span style={{ flex: 1, fontSize: "13.5px", color: "var(--text)", textDecoration: item.done ? "line-through" : "none" }}>{item.text}</span>
                <button className="btn-icon" onClick={() => deleteListItem("errands", item.id)}><XIcon /></button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function StatRow({ label, value, dim }: { label: string; value: number; dim?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: "13px", color: dim ? "var(--text-3)" : "var(--text-2)" }}>{label}</span>
      <span style={{ fontSize: "13px", fontWeight: 600, color: dim ? "var(--text-3)" : "var(--text)", fontVariantNumeric: "tabular-nums" }}>{value}</span>
    </div>
  );
}
function StatBadge({ label, value, color }: { label: string; value: number; color: "red" | "yellow" }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: `var(--${color}-dim)`, borderRadius: "6px", padding: "6px 10px" }}>
      <span style={{ fontSize: "13px", color: `var(--${color})`, fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: "13px", fontWeight: 700, color: `var(--${color})` }}>{value}</span>
    </div>
  );
}
