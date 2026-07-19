"use client";

// Small inline editors shared across Rebrand pages (reference copy, brand-core
// answers, settings). Click to edit, save on blur or Cmd/Ctrl+Enter, Esc to
// cancel. Keeps the "read" state clean and scannable until you actually edit.

import { useEffect, useRef, useState } from "react";

export function InlineTextarea({
  value,
  onSave,
  placeholder,
}: {
  value: string;
  onSave: (v: string) => void;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing && ref.current) {
      ref.current.focus();
      ref.current.style.height = "auto";
      ref.current.style.height = ref.current.scrollHeight + "px";
    }
  }, [editing]);

  if (!editing) {
    return (
      <p
        onClick={() => {
          setDraft(value);
          setEditing(true);
        }}
        style={{
          fontSize: "13px",
          color: value ? "var(--text-2)" : "var(--text-3)",
          margin: 0,
          whiteSpace: "pre-line",
          lineHeight: 1.55,
          cursor: "text",
        }}
      >
        {value || placeholder || "Tap to add…"}
      </p>
    );
  }

  const commit = () => {
    onSave(draft.trim());
    setEditing(false);
  };

  return (
    <textarea
      ref={ref}
      className="input"
      value={draft}
      onChange={(e) => {
        setDraft(e.target.value);
        e.target.style.height = "auto";
        e.target.style.height = e.target.scrollHeight + "px";
      }}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) commit();
        if (e.key === "Escape") setEditing(false);
      }}
      style={{ lineHeight: 1.55 }}
    />
  );
}

export function InlineText({
  value,
  onSave,
  suffix,
  type = "text",
}: {
  value: string;
  onSave: (v: string) => void;
  suffix?: string;
  type?: "text" | "number";
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && ref.current) ref.current.focus();
  }, [editing]);

  if (!editing) {
    return (
      <span onClick={() => { setDraft(value); setEditing(true); }} style={{ cursor: "text", color: "var(--text)", borderBottom: "1px dashed var(--border-strong)" }}>
        {value || "—"}
        {suffix ? ` ${suffix}` : ""}
      </span>
    );
  }

  const commit = () => {
    onSave(draft.trim());
    setEditing(false);
  };

  return (
    <input
      ref={ref}
      className="input"
      type={type}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") setEditing(false);
      }}
      style={{ maxWidth: "140px", display: "inline-block" }}
    />
  );
}
