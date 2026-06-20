import { NextResponse } from "next/server";

const BASE = "https://api.ouraring.com/v2/usercollection";

async function ouraGet(path: string) {
  const token = process.env.OURA_TOKEN ?? process.env.Oura_Token;
  if (!token) throw new Error("OURA_TOKEN not configured");
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`Oura API returned ${res.status} for ${path}`);
  return res.json();
}

function todayStr() { return new Date().toISOString().slice(0, 10); }
function daysAgo(n: number) {
  const d = new Date(); d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export async function GET() {
  try {
    const start = daysAgo(30);
    const end   = todayStr();

    const [sleepRes, readinessRes, activityRes, sleepSessionRes] = await Promise.all([
      ouraGet(`/daily_sleep?start_date=${start}&end_date=${end}`),
      ouraGet(`/daily_readiness?start_date=${start}&end_date=${end}`),
      ouraGet(`/daily_activity?start_date=${start}&end_date=${end}`),
      ouraGet(`/sleep?start_date=${start}&end_date=${end}`),
    ]);

    // Build actual sleep duration map (seconds → hours) from sleep sessions
    const durByDay: Record<string, number> = {};
    for (const session of sleepSessionRes.data ?? []) {
      if (session.type === "long_sleep" && session.total_sleep_duration) {
        durByDay[session.day] = (durByDay[session.day] || 0) + session.total_sleep_duration;
      }
    }

    // Merge by date
    type OuraDay = {
      date: string;
      sleepScore: number | null;
      sleepDuration: number | null;  // hours
      sleepDeep: number | null;
      sleepRem: number | null;
      readinessScore: number | null;
      hrvAvg: number | null;
      restingHR: number | null;
      activityScore: number | null;
      steps: number | null;
      activeCalories: number | null;
    };

    const byDate: Record<string, OuraDay> = {};
    const ensure = (date: string) => {
      if (!byDate[date]) byDate[date] = { date, sleepScore: null, sleepDuration: null, sleepDeep: null, sleepRem: null, readinessScore: null, hrvAvg: null, restingHR: null, activityScore: null, steps: null, activeCalories: null };
      return byDate[date];
    };

    for (const s of sleepRes.data ?? []) {
      const d = ensure(s.day);
      d.sleepScore    = s.score ?? null;
      d.sleepDuration = durByDay[s.day] ? Math.round(durByDay[s.day] / 360) / 10 : null;
      d.sleepDeep     = s.contributors?.deep_sleep ?? null;
      d.sleepRem      = s.contributors?.rem_sleep ?? null;
    }
    for (const r of readinessRes.data ?? []) {
      const d = ensure(r.day);
      d.readinessScore = r.score ?? null;
      d.hrvAvg         = r.contributors?.hrv_balance ?? null;
      d.restingHR      = r.contributors?.resting_heart_rate ?? null;
    }
    for (const a of activityRes.data ?? []) {
      const d = ensure(a.day);
      d.activityScore  = a.score ?? null;
      d.steps          = a.steps ?? null;
      d.activeCalories = a.active_calories ?? null;
    }

    const days = Object.values(byDate).sort((a, b) => b.date.localeCompare(a.date));
    return NextResponse.json({ ok: true, days });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
