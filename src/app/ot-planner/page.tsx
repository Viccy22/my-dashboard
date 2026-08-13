"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  PAYCHECK, OT, MANDATORY_OT_HOURS,
  addDays, todayStr, fmt$, fmtDate,
  otNetForHours, projectPaychecks,
} from "@/lib/finances";

type SaveStatus = "idle" | "saving" | "saved" | "error";

type OTData = {
  loanFirstDeductionDate: string;
  hoursByPayDate: Record<string, number>;
};

type DashData = { ot?: OTData; [key: string]: unknown };

function defaultOTData(): OTData {
  return { loanFirstDeductionDate: PAYCHECK.loanFirstDeductionDate, hoursByPayDate: { ...MANDATORY_OT_HOURS } };
}

// Steady-state reference table (handoff §3.4): net is per-check at 2 weeks.
const REFERENCE_ROWS = [0, 5, 10, 15, 20, 25, 30, 40].map(hrsPerWeek => {
  const otNetPerCheck = otNetForHours(hrsPerWeek * OT.weeksPerPeriod);
  const netPerCheck = PAYCHECK.netPostLoan + otNetPerCheck;
  return { hrsPerWeek, otNetPerCheck, netPerCheck, monthly: netPerCheck * 2, extraPerYear: otNetPerCheck * 26 };
});

export default function OTPlannerPage() {
  const [data, setData] = useState<OTData>(defaultOTData());
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const rawRef = useRef<DashData>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [bulkHours, setBulkHours] = useState("");
  const [targetDollars, setTargetDollars] = useState("");
  const [horizonDays, setHorizonDays] = useState(365);

  // ── Load ──
  useEffect(() => {
    fetch("/api/data")
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(res => {
        const d: DashData = res.data ?? {};
        rawRef.current = d;
        if (d.ot) {
          setData({
            loanFirstDeductionDate: d.ot.loanFirstDeductionDate || PAYCHECK.loanFirstDeductionDate,
            hoursByPayDate: d.ot.hoursByPayDate ?? { ...MANDATORY_OT_HOURS },
          });
        }
      })
      .catch(() => setStatus("error"))
      .finally(() => setLoading(false));
  }, []);

  const save = useCallback(async (next: OTData) => {
    setStatus("saving");
    if (timer.current) clearTimeout(timer.current);
    const newData = { ...rawRef.current, ot: next };
    rawRef.current = newData;
    try {
      const res = await fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data: newData }) });
      if (!res.ok) throw new Error();
      setStatus("saved");
    } catch { setStatus("error"); }
    finally { timer.current = setTimeout(() => setStatus("idle"), 2000); }
  }, []);

  const update = (next: OTData) => { setData(next); save(next); };

  const setHours = (date: string, hours: number) => {
    const h = { ...data.hoursByPayDate };
    if (hours > 0) h[date] = hours; else delete h[date];
    update({ ...data, hoursByPayDate: h });
  };

  const today = todayStr();
  const rows = useMemo(
    () => projectPaychecks(today, addDays(today, horizonDays), data.loanFirstDeductionDate, data.hoursByPayDate),
    [today, horizonDays, data],
  );

  // Totals over the visible horizon
  const totalBase = rows.reduce((s, r) => s + r.baseNet, 0);
  const totalOT = rows.reduce((s, r) => s + r.otNet, 0);
  const totalWithOT = totalBase + totalOT;
  const otCheckCount = rows.filter(r => r.otHours > 0).length;

  // "How much OT to make $X extra" helper
  const targetNum = parseFloat(targetDollars);
  const hoursNeeded = !isNaN(targetNum) && targetNum > 0 ? targetNum / OT.otHourlyNet : null;

  if (loading) return <p className="empty" style={{ padding: "32px 0" }}>Loading…</p>;

  return (
    <div style={{ maxWidth: "900px" }}>
      {status !== "idle" && (
        <div className={`toast${status === "error" ? " error" : ""}`}>
          {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : "Could not save — check connection."}
        </div>
      )}

      <div style={{ marginBottom: "16px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 700, margin: "0 0 4px" }}>Overtime Planner</h1>
        <p style={{ fontSize: "13px", color: "var(--text-3)", margin: 0 }}>
          Overtime is upside, not a plan. Base pay is what&apos;s counted everywhere else — this shows what extra hours would add on top.
        </p>
      </div>

      {/* ── Settings ── */}
      <div className="card" style={{ marginBottom: "16px" }}>
        <p className="card-title" style={{ marginBottom: "12px" }}>Assumptions</p>
        <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", alignItems: "flex-end" }}>
          <div>
            <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "4px" }}>401(k) loan deduction starts (check date)</label>
            <input type="date" className="input" value={data.loanFirstDeductionDate}
              onChange={e => update({ ...data, loanFirstDeductionDate: e.target.value })} style={{ width: "170px" }} />
          </div>
          <div style={{ fontSize: "12.5px", color: "var(--text-2)", lineHeight: 1.6 }}>
            <div>Base pay: <strong style={{ color: "var(--green)" }}>{fmt$(PAYCHECK.netPreLoan)}</strong> before loan → <strong style={{ color: "var(--yellow)" }}>{fmt$(PAYCHECK.netPostLoan)}</strong> after</div>
            <div>OT rate: <strong>{fmt$(OT.otHourlyGross)}/hr</strong> gross · <strong>~{fmt$(OT.otHourlyNet)}/hr</strong> net (1.5×, conservative flat-rate estimate)</div>
          </div>
        </div>
      </div>

      {/* ── Summary over horizon ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px", marginBottom: "16px" }}>
        <div className="card">
          <p style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 6px" }}>Base pay ({rows.length} checks)</p>
          <p style={{ fontSize: "22px", fontWeight: 700, margin: 0, fontVariantNumeric: "tabular-nums" }}>{fmt$(totalBase)}</p>
        </div>
        <div className="card">
          <p style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 6px" }}>Overtime added</p>
          <p style={{ fontSize: "22px", fontWeight: 700, margin: 0, color: "var(--accent-text)", fontVariantNumeric: "tabular-nums" }}>{fmt$(totalOT)}</p>
          <p style={{ fontSize: "11px", color: "var(--text-3)", margin: "2px 0 0" }}>{otCheckCount} check{otCheckCount === 1 ? "" : "s"} with OT</p>
        </div>
        <div className="card">
          <p style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 6px" }}>Total take-home</p>
          <p style={{ fontSize: "22px", fontWeight: 700, margin: 0, color: "var(--green)", fontVariantNumeric: "tabular-nums" }}>{fmt$(totalWithOT)}</p>
        </div>
      </div>

      {/* ── OT → dollars helper ── */}
      <div className="card" style={{ marginBottom: "16px" }}>
        <p className="card-title" style={{ marginBottom: "10px" }}>How much overtime to reach a target?</p>
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: "13px", color: "var(--text-3)" }}>I need an extra</span>
          <div style={{ display: "flex", alignItems: "center", background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: "6px", padding: "0 10px" }}>
            <span style={{ color: "var(--text-3)", fontSize: "14px" }}>$</span>
            <input type="number" min="0" step="10" value={targetDollars} onChange={e => setTargetDollars(e.target.value)} placeholder="500"
              style={{ background: "none", border: "none", outline: "none", color: "var(--text)", fontSize: "14px", width: "90px", padding: "8px 4px", fontFamily: "inherit" }} />
          </div>
          {hoursNeeded != null && (
            <span style={{ fontSize: "13.5px", color: "var(--text-2)" }}>
              → work <strong style={{ color: "var(--accent-text)" }}>{hoursNeeded.toFixed(1)} OT hours</strong> (≈ {(hoursNeeded / 5).toFixed(1)} of your 5-hour Saturdays)
            </span>
          )}
        </div>
      </div>

      {/* ── Per-paycheck projection ── */}
      <div className="card" style={{ marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
          <div>
            <p className="card-title" style={{ margin: 0 }}>Paycheck-by-paycheck</p>
            <p style={{ fontSize: "11.5px", color: "var(--text-3)", marginTop: "3px" }}>Enter OT hours worked on each check. Mandatory Saturdays are pre-filled.</p>
          </div>
          <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
            <input type="number" min="0" max="80" step="1" value={bulkHours} onChange={e => setBulkHours(e.target.value)} placeholder="hrs"
              className="input" style={{ width: "70px" }} />
            <button className="btn btn-secondary" style={{ fontSize: "12px", padding: "6px 12px" }}
              onClick={() => {
                const h = parseFloat(bulkHours);
                if (isNaN(h)) return;
                const map: Record<string, number> = {};
                if (h > 0) for (const r of rows) map[r.date] = h;
                update({ ...data, hoursByPayDate: map });
              }}>Set all upcoming</button>
            <button className="btn btn-secondary" style={{ fontSize: "12px", padding: "6px 12px", color: "var(--red)" }}
              onClick={() => update({ ...data, hoursByPayDate: {} })}>Clear</button>
            <button className="btn btn-secondary" style={{ fontSize: "12px", padding: "6px 12px" }}
              onClick={() => update({ ...data, hoursByPayDate: { ...MANDATORY_OT_HOURS } })}>Reset to mandatory</button>
          </div>
        </div>

        <div className="mobile-scroll-x">
        <div style={{ minWidth: "520px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "130px 90px 110px 90px 110px", gap: "0 8px", padding: "5px 8px", borderBottom: "1px solid var(--border)", marginBottom: "2px" }}>
            {["Pay date", "Phase", "Base", "OT hrs", "Total check"].map(h => (
              <span key={h} style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</span>
            ))}
          </div>
          <div style={{ maxHeight: "460px", overflowY: "auto" }}>
            {rows.map(r => (
              <div key={r.date} style={{ display: "grid", gridTemplateColumns: "130px 90px 110px 90px 110px", gap: "0 8px", padding: "6px 8px", borderRadius: "4px", alignItems: "center",
                background: r.otHours > 0 ? "rgba(129,140,248,0.06)" : "transparent" }}>
                <span style={{ fontSize: "12.5px", color: "var(--text)" }}>{fmtDate(r.date)}</span>
                <span style={{ fontSize: "10.5px", fontWeight: 600, color: r.isPostLoan ? "var(--yellow)" : "var(--green)" }}>
                  {r.isPostLoan ? "post-loan" : "pre-loan"}
                </span>
                <span style={{ fontSize: "13px", fontVariantNumeric: "tabular-nums", color: "var(--text-2)" }}>{fmt$(r.baseNet)}</span>
                <input type="number" min="0" max="80" step="1" value={r.otHours || ""} placeholder="0"
                  onChange={e => setHours(r.date, parseFloat(e.target.value) || 0)}
                  style={{ width: "64px", background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: "5px", color: "var(--text)", fontSize: "13px", padding: "4px 6px", fontFamily: "inherit", outline: "none" }} />
                <span style={{ fontSize: "13px", fontVariantNumeric: "tabular-nums", fontWeight: 600, color: r.otHours > 0 ? "var(--accent-text)" : "var(--text)" }}>
                  {fmt$(r.totalNet)}
                  {r.otHours > 0 && <span style={{ fontSize: "10.5px", color: "var(--text-3)", marginLeft: "4px" }}>+{fmt$(r.otNet)}</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
        </div>

        <div style={{ display: "flex", gap: "6px", marginTop: "10px" }}>
          {[90, 180, 365, 540].map(d => (
            <button key={d} onClick={() => setHorizonDays(d)} style={{
              padding: "4px 10px", borderRadius: "5px", fontFamily: "inherit", fontSize: "12px", fontWeight: 500, cursor: "pointer",
              border: "1px solid var(--border)", background: horizonDays === d ? "var(--accent-dim)" : "transparent",
              color: horizonDays === d ? "var(--accent-text)" : "var(--text-3)",
            }}>{d === 365 ? "1yr" : d === 540 ? "18mo" : `${d}d`}</button>
          ))}
        </div>
      </div>

      {/* ── Reference scenarios ── */}
      <div className="card">
        <p className="card-title" style={{ marginBottom: "4px" }}>Steady-state reference (post-loan)</p>
        <p style={{ fontSize: "11.5px", color: "var(--text-3)", marginBottom: "12px" }}>
          If you worked a consistent number of OT hours <em>every week</em> — for comparison. 2026 stays in the 22% bracket even at max OT, so no diminishing returns this year.
        </p>
        <div className="mobile-scroll-x">
        <div style={{ minWidth: "480px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "90px 120px 120px 120px", gap: "0 8px", padding: "5px 8px", borderBottom: "1px solid var(--border)", marginBottom: "2px" }}>
            {["OT hrs/wk", "Net/check", "Monthly", "Extra/yr"].map(h => (
              <span key={h} style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</span>
            ))}
          </div>
          {REFERENCE_ROWS.map(r => (
            <div key={r.hrsPerWeek} style={{ display: "grid", gridTemplateColumns: "90px 120px 120px 120px", gap: "0 8px", padding: "6px 8px", borderRadius: "4px",
              background: r.hrsPerWeek === 0 ? "transparent" : "rgba(129,140,248,0.03)" }}>
              <span style={{ fontSize: "13px", fontWeight: 600, color: r.hrsPerWeek === 0 ? "var(--text-3)" : "var(--text)" }}>{r.hrsPerWeek}</span>
              <span style={{ fontSize: "13px", fontVariantNumeric: "tabular-nums", color: "var(--text-2)" }}>{fmt$(r.netPerCheck)}</span>
              <span style={{ fontSize: "13px", fontVariantNumeric: "tabular-nums", color: "var(--text-2)" }}>{fmt$(r.monthly)}</span>
              <span style={{ fontSize: "13px", fontVariantNumeric: "tabular-nums", fontWeight: 600, color: r.hrsPerWeek === 0 ? "var(--text-3)" : "var(--green)" }}>{fmt$(r.extraPerYear)}</span>
            </div>
          ))}
        </div>
        </div>
      </div>
    </div>
  );
}
