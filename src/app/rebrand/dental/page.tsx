"use client";

// ============================================================================
// /rebrand/dental — §11. A countdown to the first visit, the prep checklist
// (the dental-prep task definitions, checkable), what to expect, and a link to
// the detailed clinical + financial record on the existing /dental page (which
// stays the source of truth for appointments, claims and treatment plans).
// ============================================================================

import Link from "next/link";
import { useRebrand } from "@/lib/rebrand/useRebrand";
import { InlineTextarea } from "@/components/rebrand/Editable";
import { setCompletion } from "@/lib/rebrand/engine";
import { DENTIST_DATE } from "@/lib/rebrand/seed";
import type { ReferenceItem } from "@/lib/rebrand/types";

export default function DentalPage() {
  const { data, mutate, status, loading } = useRebrand();
  if (loading) return <p className="empty" style={{ padding: "32px 0" }}>Loading…</p>;
  if (!data) return <p className="empty" style={{ padding: "32px 0" }}>Could not load.</p>;

  const editRef = (id: string, patch: Partial<ReferenceItem>) =>
    mutate({ ...data, referenceContent: data.referenceContent.map((r) => (r.id === id ? { ...r, ...patch } : r)) });
  const refBy = (sub: string) => data.referenceContent.find((r) => r.section === "dental" && r.subsection === sub);

  // Days until the first visit.
  const now = new Date();
  const target = new Date(DENTIST_DATE + "T00:00:00");
  const daysUntil = Math.ceil((target.getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / 86400000);

  // Prep tasks (the dated one-off dental tasks). Checkable here — toggles the
  // same completion store the Today view uses, on each task's own date.
  const prep = data.taskDefinitions
    .filter((t) => t.category === "dental" && t.recurrence === "once")
    .sort((a, b) => (a.onceDate ?? "").localeCompare(b.onceDate ?? ""));
  const isDone = (taskId: string, date: string) => data.completions.some((c) => c.taskId === taskId && c.date === date && !c.skipped);
  const togglePrep = (taskId: string, date: string, done: boolean) =>
    mutate({ ...data, completions: setCompletion(data.completions, taskId, date, done ? "none" : "done") });

  const goal = refBy("goal");
  const expect = refBy("expect");
  const ongoing = refBy("ongoing");

  return (
    <div style={{ maxWidth: "760px" }}>
      {status !== "idle" && <div className={`toast${status === "error" ? " error" : ""}`}>{status === "saving" ? "Saving…" : status === "saved" ? "Saved" : "Could not save."}</div>}

      {/* Countdown */}
      <div className="card" style={{ marginBottom: "16px", textAlign: "center" }}>
        <div style={{ fontSize: "44px", fontWeight: 800, color: "var(--accent-text)", lineHeight: 1 }}>{daysUntil > 0 ? daysUntil : daysUntil === 0 ? "Today" : "Past"}</div>
        <div style={{ fontSize: "12.5px", color: "var(--text-3)", marginTop: "6px" }}>
          {daysUntil > 0 ? `days until your first visit — ${target.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}` : ""}
        </div>
        {goal && <p style={{ fontSize: "13px", color: "var(--text-2)", margin: "12px auto 0", maxWidth: "460px", lineHeight: 1.5 }}>{goal.body}</p>}
      </div>

      {/* Prep checklist */}
      <div className="card" style={{ marginBottom: "16px" }}>
        <p className="card-title">The prep</p>
        {prep.map((t) => {
          const date = t.onceDate ?? "";
          const done = isDone(t.id, date);
          return (
            <div key={t.id} className="row" style={{ alignItems: "flex-start" }}>
              <input type="checkbox" className="checkbox" checked={done} onChange={() => togglePrep(t.id, date, done)} style={{ marginTop: "3px" }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "13.5px", color: done ? "var(--text-3)" : "var(--text)", textDecoration: done ? "line-through" : "none", fontWeight: 500 }}>{t.title}</div>
                <div style={{ fontSize: "11.5px", color: "var(--accent-text)", marginTop: "1px" }}>{date && new Date(date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
                {t.detail && <p style={{ fontSize: "12px", color: "var(--text-3)", margin: "4px 0 0", lineHeight: 1.5 }}>{t.detail}</p>}
              </div>
            </div>
          );
        })}
        <p style={{ fontSize: "11.5px", color: "var(--text-3)", margin: "10px 0 0" }}>
          Floss every night from now to 9 Aug — it&apos;s step 2 of the night routine and stays there permanently. Three weeks of flossing means gums bleed far less and the cleaning genuinely hurts less.
        </p>
      </div>

      {/* What to expect */}
      {expect && (
        <div className="card" style={{ marginBottom: "16px" }}>
          <p className="card-title">{expect.heading}</p>
          <InlineTextarea value={expect.body} onSave={(v) => editRef(expect.id, { body: v })} />
        </div>
      )}

      {/* Ongoing */}
      {ongoing && (
        <div className="card" style={{ marginBottom: "16px" }}>
          <p className="card-title">{ongoing.heading}</p>
          <InlineTextarea value={ongoing.body} onSave={(v) => editRef(ongoing.id, { body: v })} />
        </div>
      )}

      <Link href="/dental" className="btn btn-secondary" style={{ fontSize: "13px" }}>
        Detailed dental records (appointments, claims, treatment) →
      </Link>
    </div>
  );
}
