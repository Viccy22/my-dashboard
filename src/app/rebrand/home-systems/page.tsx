"use client";

// ============================================================================
// /rebrand/home-systems — §6 (cleaning) + §7 (laundry & dog).
//
// The daily anchors and zone rotation are the SAME task definitions the Today
// view generates from — edited here, read there (spec Rule 1). The bathroom
// protocol, hand-wash steps, supplies and inventory are reference copy, edited
// inline here.
// ============================================================================

import { useRebrand } from "@/lib/rebrand/useRebrand";
import { InlineTextarea } from "@/components/rebrand/Editable";
import type { ReferenceItem, TaskDefinition } from "@/lib/rebrand/types";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function Toast({ status }: { status: string }) {
  if (status === "idle") return null;
  return (
    <div className={`toast${status === "error" ? " error" : ""}`}>
      {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : "Could not save — check connection."}
    </div>
  );
}

// A task row you can toggle active and whose minutes read at a glance. Title is
// editable inline (tap it).
function TaskLine({ t, onEdit, onToggle }: { t: TaskDefinition; onEdit: (patch: Partial<TaskDefinition>) => void; onToggle: () => void }) {
  return (
    <div className="row" style={{ alignItems: "flex-start", opacity: t.active ? 1 : 0.45 }}>
      <input type="checkbox" className="checkbox" checked={t.active} onChange={onToggle} style={{ marginTop: "3px" }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <InlineTextarea value={t.title} onSave={(v) => onEdit({ title: v })} />
        {t.detail && <p style={{ fontSize: "11.5px", color: "var(--text-3)", margin: "3px 0 0", whiteSpace: "pre-line", lineHeight: 1.4 }}>{t.detail}</p>}
      </div>
      {t.estMinutes > 0 && <span style={{ fontSize: "11.5px", color: "var(--text-3)", flexShrink: 0, marginTop: "3px" }}>{t.estMinutes}m</span>}
    </div>
  );
}

export default function HomeSystemsPage() {
  const { data, mutate, status, loading } = useRebrand();
  if (loading) return <p className="empty" style={{ padding: "32px 0" }}>Loading…</p>;
  if (!data) return <p className="empty" style={{ padding: "32px 0" }}>Could not load.</p>;

  const editTask = (id: string, patch: Partial<TaskDefinition>) =>
    mutate({ ...data, taskDefinitions: data.taskDefinitions.map((t) => (t.id === id ? { ...t, ...patch } : t)) });
  const editRef = (id: string, patch: Partial<ReferenceItem>) =>
    mutate({ ...data, referenceContent: data.referenceContent.map((r) => (r.id === id ? { ...r, ...patch } : r)) });

  const refsBy = (section: string) => data.referenceContent.filter((r) => r.section === section).sort((a, b) => a.sortOrder - b.sortOrder);

  // Daily anchors: home/dog tasks that recur every day (spec §6 table).
  const anchors = data.taskDefinitions.filter(
    (t) => (t.recurrence === "daily") && ["home", "dog"].includes(t.category)
  );

  // Zone rotation: the one zone task per weekday.
  const zoneByDay: Record<number, TaskDefinition | undefined> = {};
  for (const t of data.taskDefinitions) {
    if (t.zone && t.isNonNegotiable && t.recurrence === "specific_days") {
      for (const d of t.daysOfWeek) zoneByDay[d] = t;
    }
  }
  const fridayBlock = data.taskDefinitions.filter((t) => t.recurrence === "specific_days" && t.daysOfWeek.length === 1 && t.daysOfWeek[0] === 5 && ["laundry", "dog", "home"].includes(t.category));
  const laundryTasks = data.taskDefinitions.filter((t) => t.category === "laundry" && !(t.daysOfWeek.length === 1 && t.daysOfWeek[0] === 5));

  return (
    <div style={{ maxWidth: "760px" }}>
      <Toast status={status} />
      <p style={{ fontSize: "13px", color: "var(--text-3)", margin: "0 0 18px" }}>
        The kitchen and living room already run without a system. This is for the bathroom, bedroom and dog area — the ones that get forgotten. Built around the disgust, not around willpower.
      </p>

      {/* Zone rotation */}
      <div className="card" style={{ marginBottom: "16px" }}>
        <p className="card-title">Zone rotation — one per day, 15-minute timer</p>
        {[1, 2, 3, 4, 5, 6, 0].map((d) => {
          const t = zoneByDay[d];
          const label = d === 5 ? "Laundry + dog (replaces the zone task)" : d === 0 ? "None — deliberate. One day with no chore." : t?.title ?? "—";
          return (
            <div key={d} style={{ display: "flex", gap: "12px", padding: "7px 4px", borderBottom: d !== 0 ? "1px solid var(--border)" : "none" }}>
              <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--accent-text)", width: "34px", flexShrink: 0 }}>{DAY_NAMES[d]}</span>
              <span style={{ fontSize: "13px", color: d === 0 ? "var(--text-3)" : "var(--text)" }}>{label}</span>
            </div>
          );
        })}
      </div>

      {/* Daily anchors */}
      <div className="card" style={{ marginBottom: "16px" }}>
        <p className="card-title">Daily anchors — every day</p>
        {anchors.map((t) => (
          <TaskLine key={t.id} t={t} onEdit={(p) => editTask(t.id, p)} onToggle={() => editTask(t.id, { active: !t.active })} />
        ))}
      </div>

      {/* Bathroom protocol */}
      <div className="card" style={{ marginBottom: "16px" }}>
        <p className="card-title">The bathroom protocol</p>
        {refsBy("bathroom_protocol").map((r) => (
          <div key={r.id} style={{ marginBottom: "14px" }}>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text)", marginBottom: "4px" }}>{r.heading}</div>
            <InlineTextarea value={r.body} onSave={(v) => editRef(r.id, { body: v })} />
          </div>
        ))}
      </div>

      {/* Friday reset block */}
      <div className="card" style={{ marginBottom: "16px" }}>
        <p className="card-title">Friday — the reset day</p>
        {fridayBlock.map((t) => (
          <TaskLine key={t.id} t={t} onEdit={(p) => editTask(t.id, p)} onToggle={() => editTask(t.id, { active: !t.active })} />
        ))}
      </div>

      {/* Laundry & dog */}
      <div className="card" style={{ marginBottom: "16px" }}>
        <p className="card-title">Laundry & dog — the no-washer system</p>
        {laundryTasks.map((t) => (
          <TaskLine key={t.id} t={t} onEdit={(p) => editTask(t.id, p)} onToggle={() => editTask(t.id, { active: !t.active })} />
        ))}
        <div style={{ marginTop: "12px" }}>
          {refsBy("laundry").map((r) => (
            <div key={r.id} style={{ marginBottom: "14px" }}>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text)", marginBottom: "4px" }}>{r.heading}</div>
              <InlineTextarea value={r.body} onSave={(v) => editRef(r.id, { body: v })} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
