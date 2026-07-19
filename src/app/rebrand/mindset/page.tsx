"use client";

// ============================================================================
// /rebrand/mindset — §12. Mel Robbins tools mapped to real slots, Mia McGrath's
// 5 rebrand steps, the "never miss twice" rule shown prominently, and the
// editable Brand Core worksheet. The self-trust CHART lives on the Body page
// (next to where you enter the reviews) so it isn't duplicated here (Rule 1).
// ============================================================================

import { useRebrand } from "@/lib/rebrand/useRebrand";
import { InlineTextarea } from "@/components/rebrand/Editable";
import type { BrandCoreItem, ReferenceItem } from "@/lib/rebrand/types";

export default function MindsetPage() {
  const { data, mutate, status, loading } = useRebrand();
  if (loading) return <p className="empty" style={{ padding: "32px 0" }}>Loading…</p>;
  if (!data) return <p className="empty" style={{ padding: "32px 0" }}>Could not load.</p>;

  const editRef = (id: string, patch: Partial<ReferenceItem>) =>
    mutate({ ...data, referenceContent: data.referenceContent.map((r) => (r.id === id ? { ...r, ...patch } : r)) });
  const editBrand = (id: string, answer: string) =>
    mutate({ ...data, brandCore: data.brandCore.map((b) => (b.id === id ? { ...b, answer } : b)) });
  const refBy = (sub: string) => data.referenceContent.find((r) => r.section === "mindset" && r.subsection === sub);

  const neverMiss = refBy("never_miss_twice");
  const tools = ["five_second", "let_them"].map(refBy).filter(Boolean) as ReferenceItem[];
  const mia = refBy("mia_steps");
  const brand = [...data.brandCore].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div style={{ maxWidth: "760px" }}>
      {status !== "idle" && <div className={`toast${status === "error" ? " error" : ""}`}>{status === "saving" ? "Saving…" : status === "saved" ? "Saved" : "Could not save."}</div>}

      {/* Never miss twice — shown prominently */}
      {neverMiss && (
        <div className="card" style={{ marginBottom: "16px", borderColor: "var(--accent)", background: "var(--accent-dim)" }}>
          <p className="card-title" style={{ color: "var(--accent-text)" }}>{neverMiss.heading}</p>
          <p style={{ fontSize: "13.5px", color: "var(--text)", margin: 0, lineHeight: 1.55 }}>{neverMiss.body}</p>
        </div>
      )}

      {/* Mel Robbins tools */}
      <div className="card" style={{ marginBottom: "16px" }}>
        <p className="card-title">Tools, mapped to real slots</p>
        {tools.map((t) => (
          <div key={t.id} style={{ marginBottom: "14px" }}>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text)", marginBottom: "4px" }}>{t.heading}</div>
            <InlineTextarea value={t.body} onSave={(v) => editRef(t.id, { body: v })} />
          </div>
        ))}
        <div style={{ fontSize: "12px", color: "var(--text-3)", lineHeight: 1.5, paddingTop: "6px", borderTop: "1px solid var(--border)" }}>
          <strong style={{ color: "var(--text-2)" }}>No snooze</strong> lives in the 5:00 wake task, and the <strong style={{ color: "var(--text-2)" }}>High 5 Habit</strong> is the mirror high-five in your morning block — both check off in Today.
        </div>
      </div>

      {/* Mia McGrath steps */}
      {mia && (
        <div className="card" style={{ marginBottom: "16px" }}>
          <p className="card-title">{mia.heading}</p>
          <InlineTextarea value={mia.body} onSave={(v) => editRef(mia.id, { body: v })} />
        </div>
      )}

      {/* Brand Core worksheet */}
      <div className="card">
        <p className="card-title">Brand Core worksheet</p>
        {brand.map((b: BrandCoreItem) => (
          <div key={b.id} style={{ marginBottom: "16px" }}>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text)", marginBottom: "5px" }}>{b.prompt}</div>
            <InlineTextarea value={b.answer} onSave={(v) => editBrand(b.id, v)} placeholder="Tap to answer…" />
          </div>
        ))}
      </div>
    </div>
  );
}
