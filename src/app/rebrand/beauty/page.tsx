"use client";

// ============================================================================
// /rebrand/beauty — §9. AM/PM routines (read from the routine task
// definitions, one source), weekly/monthly, nails, the polished checklist, and
// the honest Zendaya note. Links to the Roadmap for the paid layer.
// ============================================================================

import Link from "next/link";
import { useRebrand } from "@/lib/rebrand/useRebrand";
import { InlineTextarea } from "@/components/rebrand/Editable";
import type { ReferenceItem } from "@/lib/rebrand/types";

export default function BeautyPage() {
  const { data, mutate, status, loading } = useRebrand();
  if (loading) return <p className="empty" style={{ padding: "32px 0" }}>Loading…</p>;
  if (!data) return <p className="empty" style={{ padding: "32px 0" }}>Could not load.</p>;

  const editRef = (id: string, patch: Partial<ReferenceItem>) =>
    mutate({ ...data, referenceContent: data.referenceContent.map((r) => (r.id === id ? { ...r, ...patch } : r)) });
  const refBy = (section: string, subsection: string) => data.referenceContent.find((r) => r.section === section && r.subsection === subsection);
  const task = (id: string) => data.taskDefinitions.find((t) => t.id === id);

  const zendaya = refBy("beauty", "zendaya");
  const polished = refBy("beauty", "polished_checklist");
  const lotion = refBy("beauty", "lotion_fix");
  const amRoutine = task("rb-morning-skincare");
  const nightRoutine = task("rb-night-routine");
  const retinoid = task("rb-retinoid");
  const nails = task("rb-nails");
  const hair = task("rb-hair-wash");

  return (
    <div style={{ maxWidth: "760px" }}>
      {status !== "idle" && <div className={`toast${status === "error" ? " error" : ""}`}>{status === "saving" ? "Saving…" : status === "saved" ? "Saved" : "Could not save."}</div>}

      {/* Zendaya honesty */}
      {zendaya && (
        <div className="card" style={{ marginBottom: "16px", borderColor: "var(--border-strong)" }}>
          <p className="card-title">{zendaya.heading}</p>
          <InlineTextarea value={zendaya.body} onSave={(v) => editRef(zendaya.id, { body: v })} />
        </div>
      )}

      {/* Morning */}
      {amRoutine && (
        <div className="card" style={{ marginBottom: "16px" }}>
          <p className="card-title">Morning — 4 min</p>
          <p style={{ fontSize: "13px", color: "var(--text-2)", whiteSpace: "pre-line", lineHeight: 1.55, margin: 0 }}>{amRoutine.detail}</p>
        </div>
      )}

      {/* Night */}
      {nightRoutine && (
        <div className="card" style={{ marginBottom: "16px" }}>
          <p className="card-title">Night — 7 steps, 20:45</p>
          <p style={{ fontSize: "13px", color: "var(--text-2)", whiteSpace: "pre-line", lineHeight: 1.55, margin: 0 }}>{nightRoutine.detail}</p>
          {retinoid && (
            <p style={{ fontSize: "12px", color: "var(--text-3)", marginTop: "10px", paddingTop: "10px", borderTop: "1px solid var(--border)", whiteSpace: "pre-line", lineHeight: 1.5 }}>
              <strong style={{ color: "var(--text-2)" }}>Retinoid (step 4):</strong> {retinoid.detail}
            </p>
          )}
        </div>
      )}

      {/* Sticky-lotion fix */}
      {lotion && (
        <div className="card" style={{ marginBottom: "16px" }}>
          <p className="card-title">{lotion.heading}</p>
          <InlineTextarea value={lotion.body} onSave={(v) => editRef(lotion.id, { body: v })} />
        </div>
      )}

      {/* Weekly / monthly */}
      <div className="card" style={{ marginBottom: "16px" }}>
        <p className="card-title">Weekly / monthly</p>
        {hair && <RoutineLine title={hair.title} detail={hair.detail} />}
        {nails && <RoutineLine title={nails.title} detail={nails.detail} />}
        <RoutineLine title="Body exfoliation — Saturday" detail="Weekly." />
        <RoutineLine title="Brows shaped every 4–6 weeks" detail="Highest return per dollar that exists — under $25. Book before leaving." />
        <RoutineLine title="Hair trim every 10–12 weeks" detail="Booked before leaving. Silk pillowcase between." />
      </div>

      {/* Polished checklist */}
      {polished && (
        <div className="card" style={{ marginBottom: "16px" }}>
          <p className="card-title">{polished.heading}</p>
          <InlineTextarea value={polished.body} onSave={(v) => editRef(polished.id, { body: v })} />
        </div>
      )}

      <Link href="/rebrand/roadmap" className="btn btn-secondary" style={{ fontSize: "13px" }}>
        The paid layer (October onward) →
      </Link>
    </div>
  );
}

function RoutineLine({ title, detail }: { title: string; detail: string }) {
  return (
    <div style={{ padding: "8px 4px", borderBottom: "1px solid var(--border)" }}>
      <div style={{ fontSize: "13px", color: "var(--text)", fontWeight: 500 }}>{title}</div>
      {detail && <div style={{ fontSize: "11.5px", color: "var(--text-3)", marginTop: "2px", lineHeight: 1.4 }}>{detail}</div>}
    </div>
  );
}
