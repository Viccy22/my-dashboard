"use client";

// ============================================================================
// /rebrand/body — §8. The single source of truth for weight. Weight log +
// projection curve, derived targets, movement programming (read from the task
// definitions, not re-listed), and the weekly review with its self-trust chart.
// ============================================================================

import { useState } from "react";
import { useRebrand } from "@/lib/rebrand/useRebrand";
import {
  bmr,
  fiberTargetForWeek,
  latestWeight,
  projectWeightCurve,
  projectedGoalDate,
  proteinTarget,
  STEPS_TARGET,
  tdee,
  todayStr,
  WATER_TARGET_OZ,
  weeklyLossAt,
} from "@/lib/rebrand/engine";
import type { WeeklyReview, WeightEntry } from "@/lib/rebrand/types";

function Toast({ status }: { status: string }) {
  if (status === "idle") return null;
  return <div className={`toast${status === "error" ? " error" : ""}`}>{status === "saving" ? "Saving…" : status === "saved" ? "Saved" : "Could not save."}</div>;
}

// ── Projection chart: actual weigh-ins over the honest decaying curve ────────
function ProjectionChart({ curve, log, goal }: { curve: { date: string; weight: number }[]; log: WeightEntry[]; goal: number }) {
  const w = 640, h = 220, padL = 34, padR = 12, padT = 12, padB = 22;
  const actual = [...log].sort((a, b) => a.loggedOn.localeCompare(b.loggedOn));
  const allDates = [...curve.map((c) => c.date), ...actual.map((a) => a.loggedOn)].sort();
  const t0 = new Date(allDates[0] + "T00:00:00").getTime();
  const t1 = new Date(allDates[allDates.length - 1] + "T00:00:00").getTime();
  const trange = t1 - t0 || 1;
  const weights = [...curve.map((c) => c.weight), ...actual.map((a) => a.weightLb), goal];
  const wmin = Math.min(...weights) - 2, wmax = Math.max(...weights) + 2;
  const wrange = wmax - wmin || 1;
  const x = (date: string) => padL + ((new Date(date + "T00:00:00").getTime() - t0) / trange) * (w - padL - padR);
  const y = (weight: number) => padT + (1 - (weight - wmin) / wrange) * (h - padT - padB);

  const curvePts = curve.map((c) => `${x(c.date)},${y(c.weight)}`).join(" ");
  const goalY = y(goal);

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ maxWidth: "100%" }}>
      {/* goal line */}
      <line x1={padL} y1={goalY} x2={w - padR} y2={goalY} stroke="var(--green)" strokeWidth="1" strokeDasharray="4 4" opacity="0.7" />
      <text x={padL} y={goalY - 4} fontSize="10" fill="var(--green)">Goal {goal}</text>
      {/* y ticks */}
      {[wmax, (wmax + wmin) / 2, wmin].map((val, i) => (
        <text key={i} x={4} y={y(val) + 3} fontSize="9" fill="var(--text-3)">{Math.round(val)}</text>
      ))}
      {/* projection curve */}
      <polyline points={curvePts} fill="none" stroke="var(--accent)" strokeWidth="1.6" opacity="0.55" />
      {/* actual weigh-ins */}
      {actual.length > 1 && (
        <polyline points={actual.map((a) => `${x(a.loggedOn)},${y(a.weightLb)}`).join(" ")} fill="none" stroke="var(--text)" strokeWidth="1.8" />
      )}
      {actual.map((a) => (
        <circle key={a.id} cx={x(a.loggedOn)} cy={y(a.weightLb)} r="2.5" fill="var(--text)" />
      ))}
    </svg>
  );
}

function TargetCell({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: "6px", padding: "10px 12px" }}>
      <div style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-3)", marginBottom: "3px" }}>{label}</div>
      <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--text)" }}>{value}</div>
      {sub && <div style={{ fontSize: "11px", color: "var(--text-3)", marginTop: "1px" }}>{sub}</div>}
    </div>
  );
}

const blankReview = (): Omit<WeeklyReview, "id"> => ({
  weekEnding: todayStr(),
  weightLb: null,
  pilatesSessions: 0,
  armSessions: 0,
  steps10kDays: 0,
  proteinDays: 0,
  nightRoutineDays: 0,
  bathroomDone: false,
  selfTrust: 5,
  oneSentence: "",
});

export default function BodyPage() {
  const { data, mutate, status, loading } = useRebrand();
  const [wDate, setWDate] = useState(todayStr());
  const [wVal, setWVal] = useState("");
  const [showReview, setShowReview] = useState(false);
  const [review, setReview] = useState<Omit<WeeklyReview, "id">>(blankReview());

  if (loading) return <p className="empty" style={{ padding: "32px 0" }}>Loading…</p>;
  if (!data) return <p className="empty" style={{ padding: "32px 0" }}>Could not load.</p>;

  const s = data.settings;
  const latest = latestWeight(data.weightLog);
  const currentWeight = latest?.weightLb ?? s.startWeightLb;
  const curBmr = bmr(currentWeight, s.heightIn, s.age);
  const curTdee = tdee(curBmr, s.activityMultiplier);
  const curve = projectWeightCurve(s);
  const goalDate = projectedGoalDate(s);
  const nowLoss = weeklyLossAt(s, currentWeight);

  const addWeight = () => {
    const val = parseFloat(wVal);
    if (isNaN(val)) return;
    // One entry per day — replace if the date already exists.
    const rest = data.weightLog.filter((e) => e.loggedOn !== wDate);
    const entry: WeightEntry = { id: crypto.randomUUID(), loggedOn: wDate, weightLb: val };
    mutate({ ...data, weightLog: [...rest, entry] });
    setWVal("");
  };
  const delWeight = (id: string) => mutate({ ...data, weightLog: data.weightLog.filter((e) => e.id !== id) });

  const saveReview = () => {
    const rest = data.weeklyReviews.filter((r) => r.weekEnding !== review.weekEnding);
    mutate({ ...data, weeklyReviews: [...rest, { ...review, id: crypto.randomUUID() }] });
    setShowReview(false);
    setReview(blankReview());
  };

  const reviews = [...data.weeklyReviews].sort((a, b) => a.weekEnding.localeCompare(b.weekEnding));
  const recentWeights = [...data.weightLog].sort((a, b) => b.loggedOn.localeCompare(a.loggedOn)).slice(0, 8);

  return (
    <div style={{ maxWidth: "760px" }}>
      <Toast status={status} />

      {/* Projection */}
      <div className="card" style={{ marginBottom: "16px" }}>
        <p className="card-title">Weight — actual vs. the honest projection</p>
        <ProjectionChart curve={curve} log={data.weightLog} goal={s.goalWeightLb} />
        <p style={{ fontSize: "12px", color: "var(--text-3)", margin: "10px 0 0", lineHeight: 1.5 }}>
          At these settings you lose about <strong style={{ color: "var(--text-2)" }}>{nowLoss.toFixed(1)} lb/week</strong> now, decaying toward ~0.6 lb/week near goal — the curve flattens honestly as you get lighter and the deficit shrinks. Projected to hit {s.goalWeightLb} lb around <strong style={{ color: "var(--text-2)" }}>{goalDate ? new Date(goalDate + "T00:00:00").toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "—"}</strong>. The lever that shortens this is the <strong style={{ color: "var(--text-2)" }}>adherence factor ({s.adherenceFactor})</strong>, not a lower calorie number.
        </p>
      </div>

      {/* Weight log */}
      <div className="card" style={{ marginBottom: "16px" }}>
        <p className="card-title">Weight log</p>
        <div style={{ display: "flex", gap: "8px", marginBottom: "12px", flexWrap: "wrap" }}>
          <input className="input" type="date" value={wDate} onChange={(e) => setWDate(e.target.value)} style={{ maxWidth: "170px" }} />
          <input className="input" type="number" inputMode="decimal" placeholder="lb" value={wVal} onChange={(e) => setWVal(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addWeight()} style={{ maxWidth: "110px" }} />
          <button className="btn btn-primary" onClick={addWeight}>Log</button>
        </div>
        {recentWeights.length === 0 ? (
          <p className="empty">No weigh-ins yet. Log one to start the curve.</p>
        ) : (
          recentWeights.map((e) => (
            <div key={e.id} className="row">
              <span style={{ flex: 1, fontSize: "13.5px", color: "var(--text)" }}>{new Date(e.loggedOn + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</span>
              <span style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--text)" }}>{e.weightLb} lb</span>
              <button className="btn-icon" onClick={() => delWeight(e.id)} aria-label="Delete">✕</button>
            </div>
          ))
        )}
      </div>

      {/* Derived targets */}
      <div className="card" style={{ marginBottom: "16px" }}>
        <p className="card-title">Daily targets — derived from your inputs</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "10px" }}>
          <TargetCell label="Protein" value={`${proteinTarget(s)} g`} sub="1g / lb goal" />
          <TargetCell label="Water" value={`${WATER_TARGET_OZ} oz`} sub="rises with fiber" />
          <TargetCell label="Steps" value={STEPS_TARGET.toLocaleString()} sub="by 15:30 daily" />
          <TargetCell label="Calories" value={`${s.dailyCalorieTarget}`} sub="target intake" />
          <TargetCell label="BMR" value={`${Math.round(curBmr)}`} sub={`at ${currentWeight} lb`} />
          <TargetCell label="TDEE" value={`${Math.round(curTdee)}`} sub={`×${s.activityMultiplier}`} />
        </div>
        <div style={{ marginTop: "12px", fontSize: "12px", color: "var(--text-3)", lineHeight: 1.5 }}>
          <strong style={{ color: "var(--text-2)" }}>Fiber ramps over 6 weeks</strong> so it doesn&apos;t backfire: 18 g (wks 1–2) → 24 g (wks 3–4) → 28 g (wks 5–6) → {fiberTargetForWeek(99)} g (wk 7+). Water must rise with it.
        </div>
      </div>

      {/* Movement — read from the movement task definitions (one source) */}
      <div className="card" style={{ marginBottom: "16px" }}>
        <p className="card-title">Movement programming</p>
        {data.taskDefinitions
          .filter((t) => t.category === "body" && t.estMinutes > 0)
          .map((t) => (
            <div key={t.id} style={{ padding: "7px 4px", borderBottom: "1px solid var(--border)" }}>
              <div style={{ fontSize: "13px", color: "var(--text)", fontWeight: 500 }}>{t.title} <span style={{ color: "var(--text-3)", fontWeight: 400 }}>· {t.estMinutes}m</span></div>
              {t.detail && <div style={{ fontSize: "11.5px", color: "var(--text-3)", marginTop: "2px", lineHeight: 1.4 }}>{t.detail}</div>}
            </div>
          ))}
        <p style={{ fontSize: "11.5px", color: "var(--text-3)", margin: "10px 0 0" }}>Rest on Sunday is programming, not failure. Equipment: mat, 2–3 lb weights, light band, small ball or firm pillow.</p>
      </div>

      {/* Weekly review + self-trust */}
      <div className="card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
          <p className="card-title" style={{ margin: 0 }}>Weekly review</p>
          <button className="btn btn-secondary" onClick={() => setShowReview((v) => !v)} style={{ fontSize: "12px" }}>{showReview ? "Cancel" : "+ New review"}</button>
        </div>

        <p style={{ fontSize: "12px", color: "var(--text-3)", margin: "0 0 12px", lineHeight: 1.5 }}>
          Self-trust is the load-bearing metric. Not &quot;was it a good week&quot; — of the promises you made yourself this week, what fraction did you keep. Everything else is downstream.
        </p>

        {/* Self-trust chart */}
        {reviews.length > 0 && (
          <div style={{ display: "flex", alignItems: "flex-end", gap: "4px", height: "60px", marginBottom: "14px" }}>
            {reviews.map((r) => (
              <div key={r.id} title={`${r.weekEnding}: ${r.selfTrust}/10`} style={{ flex: 1, background: "var(--accent)", opacity: 0.35 + (r.selfTrust / 10) * 0.65, height: `${(r.selfTrust / 10) * 100}%`, borderRadius: "2px 2px 0 0", minWidth: "6px" }} />
            ))}
          </div>
        )}

        {showReview && (
          <div style={{ background: "var(--surface-raised)", borderRadius: "8px", padding: "14px", marginBottom: "14px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "10px" }}>
              <Field label="Week ending"><input className="input" type="date" value={review.weekEnding} onChange={(e) => setReview({ ...review, weekEnding: e.target.value })} /></Field>
              <Field label="Weight (lb)"><input className="input" type="number" value={review.weightLb ?? ""} onChange={(e) => setReview({ ...review, weightLb: e.target.value ? parseFloat(e.target.value) : null })} /></Field>
              <Field label="Pilates /5"><input className="input" type="number" min={0} max={5} value={review.pilatesSessions} onChange={(e) => setReview({ ...review, pilatesSessions: +e.target.value })} /></Field>
              <Field label="Arms /5"><input className="input" type="number" min={0} max={5} value={review.armSessions} onChange={(e) => setReview({ ...review, armSessions: +e.target.value })} /></Field>
              <Field label="10k days /5"><input className="input" type="number" min={0} max={5} value={review.steps10kDays} onChange={(e) => setReview({ ...review, steps10kDays: +e.target.value })} /></Field>
              <Field label="Protein days /7"><input className="input" type="number" min={0} max={7} value={review.proteinDays} onChange={(e) => setReview({ ...review, proteinDays: +e.target.value })} /></Field>
              <Field label="Night routine /7"><input className="input" type="number" min={0} max={7} value={review.nightRoutineDays} onChange={(e) => setReview({ ...review, nightRoutineDays: +e.target.value })} /></Field>
              <Field label="Self-trust /10"><input className="input" type="number" min={0} max={10} value={review.selfTrust} onChange={(e) => setReview({ ...review, selfTrust: +e.target.value })} /></Field>
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", margin: "12px 0", fontSize: "13px", color: "var(--text-2)" }}>
              <input type="checkbox" className="checkbox" checked={review.bathroomDone} onChange={(e) => setReview({ ...review, bathroomDone: e.target.checked })} /> Bathroom reset done this week
            </label>
            <Field label="One honest sentence"><textarea className="input" value={review.oneSentence} onChange={(e) => setReview({ ...review, oneSentence: e.target.value })} /></Field>
            <button className="btn btn-primary" onClick={saveReview} style={{ marginTop: "12px" }}>Save review</button>
          </div>
        )}

        {reviews.length === 0 && !showReview ? (
          <p className="empty">No reviews yet. The log is the only evidence the plan is working when nothing feels like it is.</p>
        ) : (
          [...reviews].reverse().map((r) => (
            <div key={r.id} style={{ padding: "10px 4px", borderBottom: "1px solid var(--border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text)" }}>Week ending {r.weekEnding}</span>
                <span style={{ fontSize: "12px", color: "var(--accent-text)", fontWeight: 600 }}>Self-trust {r.selfTrust}/10</span>
              </div>
              <div style={{ fontSize: "11.5px", color: "var(--text-3)", marginTop: "3px" }}>
                {r.weightLb ? `${r.weightLb} lb · ` : ""}Pilates {r.pilatesSessions}/5 · arms {r.armSessions}/5 · 10k {r.steps10kDays}/5 · protein {r.proteinDays}/7 · night {r.nightRoutineDays}/7{r.bathroomDone ? " · bathroom ✓" : ""}
              </div>
              {r.oneSentence && <p style={{ fontSize: "12.5px", color: "var(--text-2)", margin: "5px 0 0", fontStyle: "italic" }}>&ldquo;{r.oneSentence}&rdquo;</p>}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-3)", marginBottom: "4px", letterSpacing: "0.03em" }}>{label}</div>
      {children}
    </div>
  );
}
