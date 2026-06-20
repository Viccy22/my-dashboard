"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

type FileAttachment = { id: string; name: string; url: string; type: string; uploadedAt: string };
type Medication     = { id: string; name: string; dose: string; frequency: string; refillDate?: string };
type VetVisit       = { id: string; date: string; reason: string; vet: string; cost: string; notes: string; files: FileAttachment[] };
type Boarding       = { id: string; facility: string; startDate: string; endDate: string; cost: string; notes: string; files: FileAttachment[] };
type Dog = {
  id: string; name: string; breed: string; birthday: string; weight: string;
  color: string; microchipId: string; vetName: string; vetPhone: string;
  lastVetVisit: string; nextVetVisit: string; food: string; notes: string;
  medications: Medication[]; vetVisits: VetVisit[]; boardings: Boarding[];
};

type ShareConfig = {
  basicInfo: boolean; food: boolean; vetContact: boolean; notes: boolean;
  meds: string[]; visits: string[]; boardings: string[];
};

function parseConfig(raw: string | null): ShareConfig | null {
  if (!raw) return null;
  try { return JSON.parse(decodeURIComponent(escape(atob(raw)))); }
  catch { return null; }
}

function calcAge(birthday: string): string {
  if (!birthday) return "";
  const birth = new Date(birthday + "T00:00:00");
  const today = new Date();
  let years  = today.getFullYear() - birth.getFullYear();
  let months = today.getMonth()    - birth.getMonth();
  if (months < 0) { years--; months += 12; }
  if (years <= 0 && months <= 0) return "< 1 month old";
  if (years === 0) return `${months} month${months !== 1 ? "s" : ""} old`;
  if (months === 0) return `${years} year${years !== 1 ? "s" : ""} old`;
  return `${years} yr ${months} mo old`;
}

function fmtDate(s: string): string {
  if (!s) return "—";
  return new Date(s + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function isImage(type: string) { return type.startsWith("image/"); }

export default function DogSharePage() {
  const params       = useParams();
  const searchParams = useSearchParams();
  const dogId        = params.dogId as string;

  const [dog,     setDog]     = useState<Dog | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied,  setCopied]  = useState(false);

  const cfg = parseConfig(searchParams.get("c"));

  // helper — if no config, show everything
  const show = (key: keyof Omit<ShareConfig, "meds" | "visits" | "boardings">) =>
    cfg ? cfg[key] : true;

  useEffect(() => {
    fetch("/api/data")
      .then(r => r.json())
      .then(res => {
        const dogs: Dog[] = res.data?.dogs?.dogs ?? [];
        setDog(dogs.find(d => d.id === dogId) ?? null);
      })
      .catch(() => setDog(null))
      .finally(() => setLoading(false));
  }, [dogId]);

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2500);
    });
  };

  if (loading) return <div style={{ fontFamily: "system-ui,sans-serif", padding: "60px", textAlign: "center", color: "#888" }}>Loading…</div>;
  if (!dog)    return <div style={{ fontFamily: "system-ui,sans-serif", padding: "60px", textAlign: "center", color: "#888" }}>Dog not found.</div>;

  const age = calcAge(dog.birthday);

  const visibleMeds     = cfg ? dog.medications.filter(m => cfg.meds.includes(m.id))         : dog.medications;
  const visibleVisits   = cfg ? (dog.vetVisits  ?? []).filter(v => cfg.visits.includes(v.id)) : (dog.vetVisits ?? []);
  const visibleBoarding = cfg ? (dog.boardings  ?? []).filter(b => cfg.boardings.includes(b.id)) : (dog.boardings ?? []);

  const s = {
    page:      { fontFamily: "'Segoe UI',system-ui,sans-serif", maxWidth: "680px", margin: "0 auto", padding: "40px 32px", color: "#1a1a1a", background: "#fff", minHeight: "100vh" } as React.CSSProperties,
    header:    { display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "28px", paddingBottom: "20px", borderBottom: "2px solid #e5e5e5" } as React.CSSProperties,
    name:      { fontSize: "32px", fontWeight: 700, margin: 0, color: "#111" } as React.CSSProperties,
    sub:       { fontSize: "15px", color: "#666", marginTop: "4px", margin: "4px 0 0" } as React.CSSProperties,
    section:   { marginBottom: "28px" } as React.CSSProperties,
    sectionHd: { fontSize: "11px", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "#888", marginBottom: "10px", paddingBottom: "6px", borderBottom: "1px solid #eee" },
    grid:      { display: "grid", gridTemplateColumns: "160px 1fr", gap: "6px 16px" } as React.CSSProperties,
    label:     { fontSize: "13px", color: "#888", fontWeight: 500 } as React.CSSProperties,
    value:     { fontSize: "13px", color: "#1a1a1a" } as React.CSSProperties,
    card:      { border: "1px solid #e5e5e5", borderRadius: "8px", padding: "12px 14px", marginBottom: "8px" } as React.CSSProperties,
    medCard:   { background: "#f8f8f8", borderRadius: "8px", padding: "10px 14px", marginBottom: "8px" } as React.CSSProperties,
  };

  return (
    <>
      <style>{`
        @media print { .no-print { display: none !important; } body { background: white !important; } }
        @media screen { body { background: #f5f5f5; } }
      `}</style>

      <div style={s.page}>
        {/* Action bar */}
        <div className="no-print" style={{ display: "flex", gap: "10px", marginBottom: "24px" }}>
          <button onClick={() => window.print()} style={{ padding: "8px 18px", background: "#111", color: "#fff", border: "none", borderRadius: "7px", fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            Print / Save as PDF
          </button>
          <button onClick={copyLink} style={{ padding: "8px 18px", background: copied ? "#16a34a" : "#f0f0f0", color: copied ? "#fff" : "#333", border: "none", borderRadius: "7px", fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}>
            {copied ? "✓ Copied!" : "Copy link"}
          </button>
        </div>

        {/* Header */}
        <div style={s.header}>
          <div>
            <h1 style={s.name}>{dog.name}</h1>
            <p style={s.sub}>
              {dog.breed && <span>{dog.breed}</span>}
              {dog.breed && age && <span> · </span>}
              {age && <span>{age}</span>}
              {dog.weight && <span> · {dog.weight}</span>}
            </p>
          </div>
          <div style={{ textAlign: "right", fontSize: "12px", color: "#999" }}>
            <div>Dog profile</div>
            <div>{new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</div>
          </div>
        </div>

        {/* Basic info */}
        {show("basicInfo") && (dog.color || dog.birthday || dog.weight || dog.microchipId) && (
          <div style={s.section}>
            <div style={s.sectionHd}>Basic Information</div>
            <div style={s.grid}>
              {dog.color       && <><span style={s.label}>Color / Markings</span><span style={s.value}>{dog.color}</span></>}
              {dog.birthday    && <><span style={s.label}>Birthday</span><span style={s.value}>{fmtDate(dog.birthday)}</span></>}
              {dog.weight      && <><span style={s.label}>Weight</span><span style={s.value}>{dog.weight}</span></>}
              {dog.microchipId && <><span style={s.label}>Microchip ID</span><span style={s.value}>{dog.microchipId}</span></>}
            </div>
          </div>
        )}

        {/* Food */}
        {show("food") && dog.food && (
          <div style={s.section}>
            <div style={s.sectionHd}>Food / Diet</div>
            <p style={{ fontSize: "13.5px", color: "#333", margin: 0 }}>{dog.food}</p>
          </div>
        )}

        {/* Vet contact */}
        {show("vetContact") && (dog.vetName || dog.vetPhone || dog.nextVetVisit) && (
          <div style={s.section}>
            <div style={s.sectionHd}>Veterinarian</div>
            <div style={s.grid}>
              {dog.vetName      && <><span style={s.label}>Clinic</span><span style={s.value}>{dog.vetName}</span></>}
              {dog.vetPhone     && <><span style={s.label}>Phone</span><span style={s.value}>{dog.vetPhone}</span></>}
              {dog.lastVetVisit && <><span style={s.label}>Last visit</span><span style={s.value}>{fmtDate(dog.lastVetVisit)}</span></>}
              {dog.nextVetVisit && <><span style={s.label}>Next appt</span><span style={s.value}>{fmtDate(dog.nextVetVisit)}</span></>}
            </div>
          </div>
        )}

        {/* Medications */}
        {visibleMeds.length > 0 && (
          <div style={s.section}>
            <div style={s.sectionHd}>Current Medications</div>
            {visibleMeds.map(med => (
              <div key={med.id} style={s.medCard}>
                <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "4px" }}>{med.name}</div>
                <div style={{ fontSize: "13px", color: "#555" }}>
                  {med.dose}{med.dose && med.frequency && " · "}{med.frequency}
                </div>
                {med.refillDate && <div style={{ fontSize: "12px", color: "#888", marginTop: "3px" }}>Refill by {fmtDate(med.refillDate)}</div>}
              </div>
            ))}
          </div>
        )}

        {/* Notes */}
        {show("notes") && dog.notes && (
          <div style={s.section}>
            <div style={s.sectionHd}>Notes & Special Instructions</div>
            <p style={{ fontSize: "13.5px", lineHeight: "1.7", color: "#333", whiteSpace: "pre-wrap", margin: 0 }}>{dog.notes}</p>
          </div>
        )}

        {/* Vet visits */}
        {visibleVisits.length > 0 && (
          <div style={s.section}>
            <div style={s.sectionHd}>Vet Visit History</div>
            {[...visibleVisits].sort((a,b) => b.date.localeCompare(a.date)).map(v => (
              <div key={v.id} style={s.card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "4px" }}>
                  <span style={{ fontSize: "14px", fontWeight: 600 }}>{v.reason || "Vet visit"}</span>
                  <span style={{ fontSize: "12px", color: "#888" }}>{fmtDate(v.date)}</span>
                </div>
                {v.vet && <div style={{ fontSize: "12px", color: "#888", marginBottom: "4px" }}>{v.vet}{v.cost ? ` · ${v.cost}` : ""}</div>}
                {v.notes && <p style={{ fontSize: "13px", color: "#444", margin: 0, lineHeight: 1.6, marginTop: "4px" }}>{v.notes}</p>}
                {v.files?.filter(f => isImage(f.type)).length > 0 && (
                  <div style={{ display: "flex", gap: "8px", marginTop: "8px", flexWrap: "wrap" }}>
                    {v.files.filter(f => isImage(f.type)).map(f => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={f.id} src={f.url} alt={f.name} style={{ width: "72px", height: "72px", objectFit: "cover", borderRadius: "6px", border: "1px solid #e5e5e5" }} />
                    ))}
                  </div>
                )}
                {v.files?.filter(f => !isImage(f.type)).map(f => (
                  <a key={f.id} href={f.url} target="_blank" rel="noreferrer"
                    style={{ display: "inline-block", marginTop: "6px", fontSize: "12px", color: "#4f46e5", textDecoration: "none" }}>
                    📄 {f.name}
                  </a>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Boarding */}
        {visibleBoarding.length > 0 && (
          <div style={s.section}>
            <div style={s.sectionHd}>Boarding History</div>
            {[...visibleBoarding].sort((a,b) => b.startDate.localeCompare(a.startDate)).map(b => (
              <div key={b.id} style={s.card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "4px" }}>
                  <span style={{ fontSize: "14px", fontWeight: 600 }}>{b.facility}</span>
                  <span style={{ fontSize: "12px", color: "#888" }}>{fmtDate(b.startDate)}{b.endDate ? ` – ${fmtDate(b.endDate)}` : ""}</span>
                </div>
                {b.cost  && <div style={{ fontSize: "12px", color: "#888", marginBottom: "4px" }}>{b.cost}</div>}
                {b.notes && <p style={{ fontSize: "13px", color: "#444", margin: 0, lineHeight: 1.6 }}>{b.notes}</p>}
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: "40px", paddingTop: "16px", borderTop: "1px solid #e5e5e5", fontSize: "11px", color: "#bbb", textAlign: "center" }}>
          Shared from Victoria&apos;s personal dashboard
        </div>
      </div>
    </>
  );
}
