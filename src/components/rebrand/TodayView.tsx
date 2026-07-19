"use client";

// ============================================================================
// TodayView — the interactive daily checklist.
//
// This ONE component is the only thing that renders the task list. Both the
// home-page widget and /rebrand/today use it, so the list never lives in two
// places (spec Rule 1). It GENERATES its rows from task definitions via the
// engine — it never stores task text of its own.
// ============================================================================

import { useState } from "react";
import type { RebrandData, TodayTask } from "@/lib/rebrand/types";
import { TIME_BLOCK_LABELS, TIME_BLOCK_ORDER } from "@/lib/rebrand/types";
import { dayHeadline, getTasksForDate, setCompletion, todayStr } from "@/lib/rebrand/engine";

function ProgressRing({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? done / total : 0;
  const r = 15;
  const c = 2 * Math.PI * r;
  return (
    <div style={{ position: "relative", width: "38px", height: "38px", flexShrink: 0 }}>
      <svg width="38" height="38" viewBox="0 0 38 38">
        <circle cx="19" cy="19" r={r} fill="none" stroke="var(--surface-overlay)" strokeWidth="3.5" />
        <circle
          cx="19"
          cy="19"
          r={r}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          transform="rotate(-90 19 19)"
          style={{ transition: "stroke-dashoffset 0.3s" }}
        />
      </svg>
      <span
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "10px",
          fontWeight: 700,
          color: "var(--text-2)",
        }}
      >
        {done}/{total}
      </span>
    </div>
  );
}

function TaskRow({
  task,
  onToggle,
  onSkip,
  readOnly,
}: {
  task: TodayTask;
  onToggle: () => void;
  onSkip: () => void;
  readOnly: boolean;
}) {
  const [open, setOpen] = useState(false);
  const checked = task.done;

  return (
    <div
      style={{
        borderLeft: task.isNonNegotiable ? "2px solid var(--accent)" : "2px solid transparent",
        borderRadius: "5px",
        background: task.isNonNegotiable ? "var(--accent-dim)" : "transparent",
        marginBottom: "1px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "9px 10px", minHeight: "44px" }}>
        {/* Checkbox — big tap target, toggles instantly */}
        <button
          onClick={onToggle}
          disabled={readOnly}
          aria-label={checked ? "Mark not done" : "Mark done"}
          style={{
            width: "22px",
            height: "22px",
            minWidth: "22px",
            borderRadius: "6px",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: readOnly ? "default" : "pointer",
            background: checked ? "var(--green)" : task.skipped ? "var(--surface-overlay)" : "var(--surface-raised)",
            border: checked ? "none" : "1px solid var(--border-strong)",
            transition: "background 0.1s",
          }}
        >
          {checked && (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2">
              <path d="M2 6.5l2.5 2.5L10 3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
          {task.skipped && !checked && (
            <span style={{ fontSize: "12px", color: "var(--text-3)", lineHeight: 1 }}>–</span>
          )}
        </button>

        {/* Title — tap to expand detail */}
        <button
          onClick={() => setOpen((v) => !v)}
          style={{
            flex: 1,
            minWidth: 0,
            textAlign: "left",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
            display: "flex",
            flexDirection: "column",
            gap: "1px",
          }}
        >
          <span
            style={{
              fontSize: "13.5px",
              color: checked || task.skipped ? "var(--text-3)" : "var(--text)",
              textDecoration: checked ? "line-through" : "none",
              lineHeight: 1.35,
            }}
          >
            {task.title}
          </span>
          {task.isNonNegotiable && (
            <span style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.04em", color: "var(--accent-text)", textTransform: "uppercase" }}>
              Non-negotiable
            </span>
          )}
        </button>

        {/* Estimated minutes */}
        {task.estMinutes > 0 && (
          <span style={{ fontSize: "11.5px", color: "var(--text-3)", flexShrink: 0 }}>{task.estMinutes}m</span>
        )}
      </div>

      {/* Expanded detail + skip control */}
      {open && (
        <div style={{ padding: "0 10px 10px 42px" }}>
          {task.detail && (
            <p style={{ fontSize: "12.5px", color: "var(--text-2)", margin: "0 0 8px", whiteSpace: "pre-line", lineHeight: 1.5 }}>
              {task.detail}
            </p>
          )}
          {!readOnly && (
            <button
              onClick={onSkip}
              className="btn-ghost"
              style={{ fontSize: "11.5px", padding: "4px 8px" }}
            >
              {task.skipped ? "Un-skip" : "Not today (skip)"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function TodayView({
  data,
  onMutate,
  dateStr = todayStr(),
  readOnly = false,
}: {
  data: RebrandData;
  onMutate: (next: RebrandData) => void;
  dateStr?: string;
  readOnly?: boolean;
}) {
  const tasks = getTasksForDate(data.taskDefinitions, data.completions, dateStr);
  const nonNeg = tasks.filter((t) => t.isNonNegotiable);
  const rest = tasks.filter((t) => !t.isNonNegotiable);
  const doneCount = tasks.filter((t) => t.done).length;
  const headline = dayHeadline(tasks, dateStr);
  const dateLabel = new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });

  function toggle(t: TodayTask) {
    onMutate({ ...data, completions: setCompletion(data.completions, t.id, dateStr, t.done ? "none" : "done") });
  }
  function skip(t: TodayTask) {
    onMutate({ ...data, completions: setCompletion(data.completions, t.id, dateStr, t.skipped ? "none" : "skipped") });
  }

  if (tasks.length === 0) {
    return <p className="empty">Nothing scheduled for {dateLabel}. Enjoy the quiet.</p>;
  }

  return (
    <div>
      {/* Header: date, headline, progress ring */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "12px", color: "var(--text-3)" }}>{dateLabel}</div>
          <div style={{ fontSize: "15px", fontWeight: 600, color: "var(--text)" }}>{headline}</div>
        </div>
        <ProgressRing done={doneCount} total={tasks.length} />
      </div>

      {/* Non-negotiables, pinned */}
      {nonNeg.length > 0 && (
        <div style={{ marginBottom: "10px" }}>
          {nonNeg.map((t) => (
            <TaskRow key={t.id} task={t} onToggle={() => toggle(t)} onSkip={() => skip(t)} readOnly={readOnly} />
          ))}
        </div>
      )}

      {/* Everything else, grouped by time block */}
      {TIME_BLOCK_ORDER.map((block) => {
        const inBlock = rest.filter((t) => t.timeBlock === block);
        if (inBlock.length === 0) return null;
        return (
          <div key={block} style={{ marginBottom: "6px" }}>
            <div
              style={{
                fontSize: "10.5px",
                fontWeight: 600,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "var(--text-3)",
                padding: "8px 10px 4px",
                borderTop: "1px solid var(--border)",
                marginTop: "4px",
              }}
            >
              {TIME_BLOCK_LABELS[block]}
            </div>
            {inBlock.map((t) => (
              <TaskRow key={t.id} task={t} onToggle={() => toggle(t)} onSkip={() => skip(t)} readOnly={readOnly} />
            ))}
          </div>
        );
      })}
    </div>
  );
}
