"use client";

import { useEffect, useState, useCallback, useRef } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

type FileAttachment = {
  id: string;
  name: string;
  url: string;
  type: string;       // MIME type
  uploadedAt: string;
};

type VetVisit = {
  id: string;
  date: string;
  reason: string;
  vet: string;
  cost: string;
  notes: string;
  files: FileAttachment[];
};

type Boarding = {
  id: string;
  facility: string;
  startDate: string;
  endDate: string;
  cost: string;
  notes: string;
  files: FileAttachment[];
};

type Medication = {
  id: string;
  name: string;
  dose: string;
  frequency: string;
  refillDate?: string;
};

type Dog = {
  id: string;
  name: string;
  breed: string;
  birthday: string;
  weight: string;
  color: string;
  microchipId: string;
  vetName: string;
  vetPhone: string;
  lastVetVisit: string;
  nextVetVisit: string;
  medications: Medication[];
  notes: string;
  food: string;
  vetVisits: VetVisit[];
  boardings: Boarding[];
};

type DogsData   = { dogs: Dog[] };
type DashData   = { dogs?: DogsData; [key: string]: unknown };
type SaveStatus = "idle" | "saving" | "saved" | "error";
type TabKey     = "profile" | "visits" | "boarding";

type ShareConfig = {
  basicInfo:  boolean;
  food:       boolean;
  vetContact: boolean;
  notes:      boolean;
  meds:       string[];     // medication IDs
  visits:     string[];     // vet visit IDs
  boardings:  string[];     // boarding IDs
};

function defaultConfig(dog: Dog): ShareConfig {
  return {
    basicInfo:  true,
    food:       true,
    vetContact: true,
    notes:      true,
    meds:      dog.medications.map(m => m.id),
    visits:    (dog.vetVisits  ?? []).map(v => v.id),
    boardings: (dog.boardings  ?? []).map(b => b.id),
  };
}

function buildShareUrl(dogId: string, cfg: ShareConfig): string {
  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(cfg))));
  return `${window.location.origin}/dogs/share/${dogId}?c=${encoded}`;
}

function toggleArr<T>(arr: T[], item: T): T[] {
  return arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item];
}

// ── Defaults ──────────────────────────────────────────────────────────────────

function makeDog(name: string, id: string): Dog {
  return {
    id, name, breed: "", birthday: "", weight: "", color: "",
    microchipId: "", vetName: "", vetPhone: "",
    lastVetVisit: "", nextVetVisit: "",
    medications: [], notes: "", food: "",
    vetVisits: [], boardings: [],
  };
}

const DEFAULT_DOGS: Dog[] = [makeDog("Zorro", "zorro"), makeDog("Cody", "cody")];

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayStr() { return new Date().toISOString().slice(0, 10); }

function calcAge(birthday: string): string {
  if (!birthday) return "";
  const birth = new Date(birthday + "T00:00:00");
  const today = new Date(todayStr() + "T00:00:00");
  let years  = today.getFullYear() - birth.getFullYear();
  let months = today.getMonth()    - birth.getMonth();
  if (months < 0) { years--; months += 12; }
  if (years <= 0 && months <= 0) return "< 1 month";
  if (years === 0) return `${months} mo`;
  if (months === 0) return `${years} yr`;
  return `${years} yr ${months} mo`;
}

function fmtDate(s: string): string {
  if (!s) return "";
  return new Date(s + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function daysUntil(dateStr: string): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr + "T00:00:00");
  const today  = new Date(todayStr() + "T00:00:00");
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function isImage(type: string) { return type.startsWith("image/"); }
function isPdf(type: string)   { return type === "application/pdf"; }

// ── Icons ─────────────────────────────────────────────────────────────────────

const XIcon = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M2 2l9 9M11 2l-9 9" strokeLinecap="round" />
  </svg>
);

const ShareIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4">
    <circle cx="11" cy="3"  r="1.5" />
    <circle cx="3"  cy="7"  r="1.5" />
    <circle cx="11" cy="11" r="1.5" />
    <path d="M4.5 7.7l5 2.6M9.5 3.7l-5 2.6" strokeLinecap="round" />
  </svg>
);

const UploadIcon = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.4">
    <path d="M6.5 8.5V2M4 4.5l2.5-2.5L9 4.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M2 10h9" strokeLinecap="round" />
    <path d="M2 10v1.5h9V10" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ── Field ─────────────────────────────────────────────────────────────────────

function Field({ label, value, type = "text", onChange, placeholder }: {
  label: string; value: string; type?: string;
  onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "7px 0", borderBottom: "1px solid var(--border)" }}>
      <span style={{ fontSize: "12px", color: "var(--text-3)", minWidth: "120px", fontWeight: 500 }}>{label}</span>
      <input className="input" type={type} value={value} placeholder={placeholder ?? "—"}
        onChange={e => onChange(e.target.value)}
        style={{ flex: 1, padding: "4px 8px", fontSize: "13.5px" }} />
    </div>
  );
}

// ── File upload + list ────────────────────────────────────────────────────────

function FileList({ files, onDelete }: { files: FileAttachment[]; onDelete: (id: string) => void }) {
  if (files.length === 0) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "8px" }}>
      {files.map(f => (
        <div key={f.id} style={{
          display: "flex", alignItems: "center", gap: "6px",
          background: "var(--surface-overlay)", borderRadius: "6px", padding: "5px 8px",
          border: "1px solid var(--border)",
        }}>
          {isImage(f.type) ? (
            <a href={f.url} target="_blank" rel="noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={f.url} alt={f.name} style={{ width: "36px", height: "36px", objectFit: "cover", borderRadius: "4px", display: "block" }} />
            </a>
          ) : (
            <a href={f.url} target="_blank" rel="noreferrer" style={{ fontSize: "12px", color: "var(--accent-text)", textDecoration: "none" }}>
              {isPdf(f.type) ? "📄" : "📎"} {f.name}
            </a>
          )}
          <button className="btn-icon" onClick={() => onDelete(f.id)} style={{ opacity: 0.5 }}><XIcon /></button>
        </div>
      ))}
    </div>
  );
}

function FileUploadButton({ onUploaded }: { onUploaded: (file: FileAttachment) => void }) {
  const [uploading, setUploading] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await fetch(`/api/dogs/upload?filename=${encodeURIComponent(file.name)}`, {
        method: "POST",
        body: file,
        headers: { "content-type": file.type },
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      onUploaded({ id: crypto.randomUUID(), name: file.name, url: data.url, type: file.type, uploadedAt: todayStr() });
    } catch {
      alert("Upload failed. Please check your Vercel Blob setup and try again.");
    } finally {
      setUploading(false);
      if (ref.current) ref.current.value = "";
    }
  };

  return (
    <>
      <input ref={ref} type="file" accept="image/*,.pdf,.doc,.docx" onChange={handleFile} style={{ display: "none" }} />
      <button className="btn btn-secondary" style={{ fontSize: "11px", padding: "4px 10px", display: "flex", alignItems: "center", gap: "5px" }}
        onClick={() => ref.current?.click()} disabled={uploading}>
        <UploadIcon /> {uploading ? "Uploading…" : "Attach file"}
      </button>
    </>
  );
}

// ── Vet Visits tab ────────────────────────────────────────────────────────────

function VetVisitsTab({ visits, onChange }: {
  visits: VetVisit[];
  onChange: (updated: VetVisit[]) => void;
}) {
  const [adding, setAdding]       = useState(false);
  const [expandId, setExpandId]   = useState<string | null>(null);
  const [draft, setDraft]         = useState<Partial<VetVisit>>({ date: todayStr() });

  const addVisit = () => {
    if (!draft.date) return;
    const v: VetVisit = {
      id: crypto.randomUUID(),
      date: draft.date ?? todayStr(),
      reason: draft.reason ?? "",
      vet: draft.vet ?? "",
      cost: draft.cost ?? "",
      notes: draft.notes ?? "",
      files: [],
    };
    onChange([v, ...visits]);
    setDraft({ date: todayStr() }); setAdding(false);
  };

  const updateVisit = (id: string, patch: Partial<VetVisit>) => {
    onChange(visits.map(v => v.id === id ? { ...v, ...patch } : v));
  };

  const deleteVisit = (id: string) => onChange(visits.filter(v => v.id !== id));

  const addFile = (visitId: string, file: FileAttachment) => {
    const v = visits.find(v => v.id === visitId);
    if (!v) return;
    updateVisit(visitId, { files: [...v.files, file] });
  };

  const deleteFile = (visitId: string, fileId: string) => {
    const v = visits.find(v => v.id === visitId);
    if (!v) return;
    updateVisit(visitId, { files: v.files.filter(f => f.id !== fileId) });
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "12px" }}>
        <button className="btn btn-secondary" style={{ fontSize: "11px", padding: "4px 12px" }}
          onClick={() => setAdding(v => !v)}>
          {adding ? "Cancel" : "+ Add visit"}
        </button>
      </div>

      {adding && (
        <div style={{ background: "var(--surface-raised)", borderRadius: "8px", padding: "14px", marginBottom: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 140px" }}>
              <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "4px" }}>Date</label>
              <input className="input" type="date" value={draft.date ?? ""} onChange={e => setDraft(d => ({ ...d, date: e.target.value }))} />
            </div>
            <div style={{ flex: "2 1 200px" }}>
              <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "4px" }}>Reason for visit</label>
              <input className="input" placeholder="e.g. Annual checkup" value={draft.reason ?? ""} onChange={e => setDraft(d => ({ ...d, reason: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <div style={{ flex: "2 1 180px" }}>
              <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "4px" }}>Vet / Clinic</label>
              <input className="input" placeholder="Clinic name" value={draft.vet ?? ""} onChange={e => setDraft(d => ({ ...d, vet: e.target.value }))} />
            </div>
            <div style={{ flex: "1 1 100px" }}>
              <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "4px" }}>Cost</label>
              <input className="input" placeholder="$0.00" value={draft.cost ?? ""} onChange={e => setDraft(d => ({ ...d, cost: e.target.value }))} />
            </div>
          </div>
          <div>
            <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "4px" }}>Notes</label>
            <textarea className="input" placeholder="Diagnosis, treatments, follow-up instructions…" rows={3}
              value={draft.notes ?? ""} onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))}
              style={{ resize: "vertical", lineHeight: 1.6 }} />
          </div>
          <button className="btn btn-primary" onClick={addVisit}>Save Visit</button>
        </div>
      )}

      {visits.length === 0 && !adding && (
        <p className="empty">No vet visits recorded yet.</p>
      )}

      {[...visits].sort((a, b) => b.date.localeCompare(a.date)).map(v => {
        const expanded = expandId === v.id;
        return (
          <div key={v.id} style={{ borderRadius: "8px", border: "1px solid var(--border)", marginBottom: "8px", overflow: "hidden" }}>
            {/* Visit header — always visible */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", cursor: "pointer", background: "var(--surface-raised)" }}
              onClick={() => setExpandId(expanded ? null : v.id)}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--text)" }}>{v.reason || "Vet visit"}</div>
                <div style={{ fontSize: "12px", color: "var(--text-3)", marginTop: "2px" }}>
                  {fmtDate(v.date)}{v.vet ? ` · ${v.vet}` : ""}{v.cost ? ` · ${v.cost}` : ""}
                  {v.files.length > 0 && <span style={{ marginLeft: "8px" }}>📎 {v.files.length}</span>}
                </div>
              </div>
              <span style={{ fontSize: "11px", color: "var(--text-3)" }}>{expanded ? "▲" : "▼"}</span>
            </div>

            {/* Visit detail — expanded */}
            {expanded && (
              <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <div style={{ flex: "1 1 120px" }}>
                    <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "3px" }}>Date</label>
                    <input className="input" type="date" value={v.date} onChange={e => updateVisit(v.id, { date: e.target.value })} />
                  </div>
                  <div style={{ flex: "2 1 180px" }}>
                    <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "3px" }}>Reason</label>
                    <input className="input" value={v.reason} onChange={e => updateVisit(v.id, { reason: e.target.value })} />
                  </div>
                  <div style={{ flex: "2 1 160px" }}>
                    <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "3px" }}>Vet / Clinic</label>
                    <input className="input" value={v.vet} onChange={e => updateVisit(v.id, { vet: e.target.value })} />
                  </div>
                  <div style={{ flex: "1 1 90px" }}>
                    <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "3px" }}>Cost</label>
                    <input className="input" value={v.cost} onChange={e => updateVisit(v.id, { cost: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "3px" }}>Notes</label>
                  <textarea className="input" rows={3} value={v.notes} onChange={e => updateVisit(v.id, { notes: e.target.value })}
                    style={{ resize: "vertical", lineHeight: 1.6 }} />
                </div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                  <FileUploadButton onUploaded={file => addFile(v.id, file)} />
                  <button className="btn btn-secondary" style={{ fontSize: "11px", padding: "4px 10px", color: "var(--red)" }}
                    onClick={() => deleteVisit(v.id)}>Delete visit</button>
                </div>
                <FileList files={v.files} onDelete={fileId => deleteFile(v.id, fileId)} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Boarding tab ──────────────────────────────────────────────────────────────

function BoardingTab({ boardings, onChange }: {
  boardings: Boarding[];
  onChange: (updated: Boarding[]) => void;
}) {
  const [adding, setAdding]     = useState(false);
  const [expandId, setExpandId] = useState<string | null>(null);
  const [draft, setDraft]       = useState<Partial<Boarding>>({ startDate: todayStr() });

  const addBoarding = () => {
    if (!draft.startDate || !draft.facility) return;
    const b: Boarding = {
      id: crypto.randomUUID(),
      facility: draft.facility ?? "",
      startDate: draft.startDate ?? todayStr(),
      endDate: draft.endDate ?? "",
      cost: draft.cost ?? "",
      notes: draft.notes ?? "",
      files: [],
    };
    onChange([b, ...boardings]);
    setDraft({ startDate: todayStr() }); setAdding(false);
  };

  const updateBoarding = (id: string, patch: Partial<Boarding>) => {
    onChange(boardings.map(b => b.id === id ? { ...b, ...patch } : b));
  };

  const deleteBoarding = (id: string) => onChange(boardings.filter(b => b.id !== id));

  const addFile = (boardingId: string, file: FileAttachment) => {
    const b = boardings.find(b => b.id === boardingId);
    if (!b) return;
    updateBoarding(boardingId, { files: [...b.files, file] });
  };

  const deleteFile = (boardingId: string, fileId: string) => {
    const b = boardings.find(b => b.id === boardingId);
    if (!b) return;
    updateBoarding(boardingId, { files: b.files.filter(f => f.id !== fileId) });
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "12px" }}>
        <button className="btn btn-secondary" style={{ fontSize: "11px", padding: "4px 12px" }}
          onClick={() => setAdding(v => !v)}>
          {adding ? "Cancel" : "+ Add boarding"}
        </button>
      </div>

      {adding && (
        <div style={{ background: "var(--surface-raised)", borderRadius: "8px", padding: "14px", marginBottom: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
          <div>
            <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "4px" }}>Facility / Sitter name</label>
            <input className="input" placeholder="e.g. Happy Paws Boarding" value={draft.facility ?? ""} onChange={e => setDraft(d => ({ ...d, facility: e.target.value }))} />
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 140px" }}>
              <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "4px" }}>Drop-off</label>
              <input className="input" type="date" value={draft.startDate ?? ""} onChange={e => setDraft(d => ({ ...d, startDate: e.target.value }))} />
            </div>
            <div style={{ flex: "1 1 140px" }}>
              <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "4px" }}>Pick-up</label>
              <input className="input" type="date" value={draft.endDate ?? ""} onChange={e => setDraft(d => ({ ...d, endDate: e.target.value }))} />
            </div>
            <div style={{ flex: "1 1 100px" }}>
              <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "4px" }}>Cost</label>
              <input className="input" placeholder="$0.00" value={draft.cost ?? ""} onChange={e => setDraft(d => ({ ...d, cost: e.target.value }))} />
            </div>
          </div>
          <div>
            <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "4px" }}>Notes</label>
            <textarea className="input" placeholder="Special instructions, feeding schedule, emergency contacts…" rows={3}
              value={draft.notes ?? ""} onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))}
              style={{ resize: "vertical", lineHeight: 1.6 }} />
          </div>
          <button className="btn btn-primary" onClick={addBoarding}>Save Boarding</button>
        </div>
      )}

      {boardings.length === 0 && !adding && (
        <p className="empty">No boardings recorded yet.</p>
      )}

      {[...boardings].sort((a, b) => b.startDate.localeCompare(a.startDate)).map(b => {
        const expanded = expandId === b.id;
        const nights   = b.startDate && b.endDate
          ? Math.round((new Date(b.endDate + "T00:00:00").getTime() - new Date(b.startDate + "T00:00:00").getTime()) / 86400000)
          : null;
        return (
          <div key={b.id} style={{ borderRadius: "8px", border: "1px solid var(--border)", marginBottom: "8px", overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", cursor: "pointer", background: "var(--surface-raised)" }}
              onClick={() => setExpandId(expanded ? null : b.id)}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--text)" }}>{b.facility}</div>
                <div style={{ fontSize: "12px", color: "var(--text-3)", marginTop: "2px" }}>
                  {fmtDate(b.startDate)}{b.endDate ? ` → ${fmtDate(b.endDate)}` : ""}
                  {nights !== null ? ` (${nights} night${nights !== 1 ? "s" : ""})` : ""}
                  {b.cost ? ` · ${b.cost}` : ""}
                  {b.files.length > 0 && <span style={{ marginLeft: "8px" }}>📎 {b.files.length}</span>}
                </div>
              </div>
              <span style={{ fontSize: "11px", color: "var(--text-3)" }}>{expanded ? "▲" : "▼"}</span>
            </div>

            {expanded && (
              <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
                <div>
                  <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "3px" }}>Facility / Sitter</label>
                  <input className="input" value={b.facility} onChange={e => updateBoarding(b.id, { facility: e.target.value })} />
                </div>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <div style={{ flex: "1 1 130px" }}>
                    <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "3px" }}>Drop-off</label>
                    <input className="input" type="date" value={b.startDate} onChange={e => updateBoarding(b.id, { startDate: e.target.value })} />
                  </div>
                  <div style={{ flex: "1 1 130px" }}>
                    <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "3px" }}>Pick-up</label>
                    <input className="input" type="date" value={b.endDate} onChange={e => updateBoarding(b.id, { endDate: e.target.value })} />
                  </div>
                  <div style={{ flex: "1 1 90px" }}>
                    <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "3px" }}>Cost</label>
                    <input className="input" value={b.cost} onChange={e => updateBoarding(b.id, { cost: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "3px" }}>Notes</label>
                  <textarea className="input" rows={3} value={b.notes} onChange={e => updateBoarding(b.id, { notes: e.target.value })}
                    style={{ resize: "vertical", lineHeight: 1.6 }} />
                </div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                  <FileUploadButton onUploaded={file => addFile(b.id, file)} />
                  <button className="btn btn-secondary" style={{ fontSize: "11px", padding: "4px 10px", color: "var(--red)" }}
                    onClick={() => deleteBoarding(b.id)}>Delete boarding</button>
                </div>
                <FileList files={b.files} onDelete={fileId => deleteFile(b.id, fileId)} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Share modal ───────────────────────────────────────────────────────────────

function ShareModal({ dog, onClose }: { dog: Dog; onClose: () => void }) {
  const [cfg, setCfg]     = useState<ShareConfig>(() => defaultConfig(dog));
  const [copied, setCopied] = useState(false);
  const [opened, setOpened] = useState(false);

  const url = typeof window !== "undefined" ? buildShareUrl(dog.id, cfg) : "";

  const copyLink = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2500);
    });
  };

  const openPage = () => {
    window.open(url, "_blank");
    setOpened(true); setTimeout(() => setOpened(false), 2500);
  };

  const allMedIds      = dog.medications.map(m => m.id);
  const allVisitIds    = (dog.vetVisits  ?? []).map(v => v.id);
  const allBoardingIds = (dog.boardings  ?? []).map(b => b.id);

  const allOn = cfg.basicInfo && cfg.food && cfg.vetContact && cfg.notes &&
    allMedIds.every(id => cfg.meds.includes(id)) &&
    allVisitIds.every(id => cfg.visits.includes(id)) &&
    allBoardingIds.every(id => cfg.boardings.includes(id));

  const selectAll = () => setCfg({
    basicInfo: true, food: true, vetContact: true, notes: true,
    meds: allMedIds, visits: allVisitIds, boardings: allBoardingIds,
  });
  const deselectAll = () => setCfg({
    basicInfo: false, food: false, vetContact: false, notes: false,
    meds: [], visits: [], boardings: [],
  });

  const Section = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) => (
    <label style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 0", cursor: "pointer", borderBottom: "1px solid var(--border)" }}>
      <input type="checkbox" checked={checked} onChange={onChange} style={{ width: "15px", height: "15px", accentColor: "var(--accent)", cursor: "pointer", flexShrink: 0 }} />
      <span style={{ fontSize: "13.5px", color: checked ? "var(--text)" : "var(--text-3)", fontWeight: 500 }}>{label}</span>
    </label>
  );

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      {/* Backdrop */}
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(3px)" }} onClick={onClose} />

      {/* Modal */}
      <div style={{
        position: "relative", background: "var(--surface)", borderRadius: "12px",
        border: "1px solid var(--border)", width: "100%", maxWidth: "480px",
        maxHeight: "85vh", display: "flex", flexDirection: "column", overflow: "hidden",
        boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
      }}>
        {/* Header */}
        <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: "15px", color: "var(--text)" }}>Customize share — {dog.name}</p>
            <p style={{ margin: "3px 0 0", fontSize: "12px", color: "var(--text-3)" }}>Choose exactly what the recipient can see</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button onClick={allOn ? deselectAll : selectAll} style={{ fontSize: "11px", color: "var(--accent-text)", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>
              {allOn ? "Deselect all" : "Select all"}
            </button>
            <button className="btn-icon" onClick={onClose} style={{ fontSize: "16px" }}>✕</button>
          </div>
        </div>

        {/* Scrollable content */}
        <div style={{ overflowY: "auto", padding: "0 20px 20px", flex: 1 }}>

          {/* Basic sections */}
          <div style={{ marginTop: "14px" }}>
            <p style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0" }}>Profile</p>
            <Section label="Basic info (breed, birthday, weight, color, microchip)" checked={cfg.basicInfo}  onChange={() => setCfg(c => ({ ...c, basicInfo:  !c.basicInfo  }))} />
            <Section label="Food / diet"                                             checked={cfg.food}       onChange={() => setCfg(c => ({ ...c, food:       !c.food       }))} />
            <Section label="Vet contact info"                                        checked={cfg.vetContact} onChange={() => setCfg(c => ({ ...c, vetContact: !c.vetContact }))} />
            <Section label="Notes & special instructions"                            checked={cfg.notes}      onChange={() => setCfg(c => ({ ...c, notes:      !c.notes      }))} />
          </div>

          {/* Medications */}
          <div style={{ marginTop: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2px" }}>
              <p style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>
                Medications ({cfg.meds.length}/{dog.medications.length} selected)
              </p>
              {dog.medications.length > 1 && (
                <button onClick={() => setCfg(c => ({ ...c, meds: c.meds.length === allMedIds.length ? [] : allMedIds }))}
                  style={{ fontSize: "10px", color: "var(--accent-text)", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
                  {cfg.meds.length === allMedIds.length ? "None" : "All"}
                </button>
              )}
            </div>
            {dog.medications.length === 0
              ? <p style={{ fontSize: "12px", color: "var(--text-3)", padding: "6px 0" }}>No medications added.</p>
              : dog.medications.map(med => (
                <label key={med.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "7px 0", cursor: "pointer", borderBottom: "1px solid var(--border)" }}>
                  <input type="checkbox" checked={cfg.meds.includes(med.id)}
                    onChange={() => setCfg(c => ({ ...c, meds: toggleArr(c.meds, med.id) }))}
                    style={{ width: "15px", height: "15px", accentColor: "var(--accent)", cursor: "pointer", flexShrink: 0 }} />
                  <div>
                    <span style={{ fontSize: "13px", color: cfg.meds.includes(med.id) ? "var(--text)" : "var(--text-3)", fontWeight: 500 }}>{med.name}</span>
                    {(med.dose || med.frequency) && (
                      <span style={{ fontSize: "11.5px", color: "var(--text-3)", marginLeft: "8px" }}>{med.dose}{med.dose && med.frequency && " · "}{med.frequency}</span>
                    )}
                  </div>
                </label>
              ))
            }
          </div>

          {/* Vet visits */}
          <div style={{ marginTop: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2px" }}>
              <p style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>
                Vet Visits ({cfg.visits.length}/{allVisitIds.length} selected)
              </p>
              {allVisitIds.length > 1 && (
                <button onClick={() => setCfg(c => ({ ...c, visits: c.visits.length === allVisitIds.length ? [] : allVisitIds }))}
                  style={{ fontSize: "10px", color: "var(--accent-text)", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
                  {cfg.visits.length === allVisitIds.length ? "None" : "All"}
                </button>
              )}
            </div>
            {allVisitIds.length === 0
              ? <p style={{ fontSize: "12px", color: "var(--text-3)", padding: "6px 0" }}>No vet visits recorded.</p>
              : [...(dog.vetVisits ?? [])].sort((a,b) => b.date.localeCompare(a.date)).map(v => (
                <label key={v.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "7px 0", cursor: "pointer", borderBottom: "1px solid var(--border)" }}>
                  <input type="checkbox" checked={cfg.visits.includes(v.id)}
                    onChange={() => setCfg(c => ({ ...c, visits: toggleArr(c.visits, v.id) }))}
                    style={{ width: "15px", height: "15px", accentColor: "var(--accent)", cursor: "pointer", flexShrink: 0 }} />
                  <div>
                    <span style={{ fontSize: "13px", color: cfg.visits.includes(v.id) ? "var(--text)" : "var(--text-3)", fontWeight: 500 }}>{v.reason || "Vet visit"}</span>
                    <span style={{ fontSize: "11.5px", color: "var(--text-3)", marginLeft: "8px" }}>{fmtDate(v.date)}{v.vet ? ` · ${v.vet}` : ""}</span>
                  </div>
                </label>
              ))
            }
          </div>

          {/* Boardings */}
          <div style={{ marginTop: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2px" }}>
              <p style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>
                Boarding ({cfg.boardings.length}/{allBoardingIds.length} selected)
              </p>
              {allBoardingIds.length > 1 && (
                <button onClick={() => setCfg(c => ({ ...c, boardings: c.boardings.length === allBoardingIds.length ? [] : allBoardingIds }))}
                  style={{ fontSize: "10px", color: "var(--accent-text)", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
                  {cfg.boardings.length === allBoardingIds.length ? "None" : "All"}
                </button>
              )}
            </div>
            {allBoardingIds.length === 0
              ? <p style={{ fontSize: "12px", color: "var(--text-3)", padding: "6px 0" }}>No boarding records.</p>
              : [...(dog.boardings ?? [])].sort((a,b) => b.startDate.localeCompare(a.startDate)).map(b => (
                <label key={b.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "7px 0", cursor: "pointer", borderBottom: "1px solid var(--border)" }}>
                  <input type="checkbox" checked={cfg.boardings.includes(b.id)}
                    onChange={() => setCfg(c => ({ ...c, boardings: toggleArr(c.boardings, b.id) }))}
                    style={{ width: "15px", height: "15px", accentColor: "var(--accent)", cursor: "pointer", flexShrink: 0 }} />
                  <div>
                    <span style={{ fontSize: "13px", color: cfg.boardings.includes(b.id) ? "var(--text)" : "var(--text-3)", fontWeight: 500 }}>{b.facility}</span>
                    <span style={{ fontSize: "11.5px", color: "var(--text-3)", marginLeft: "8px" }}>{fmtDate(b.startDate)}{b.endDate ? ` → ${fmtDate(b.endDate)}` : ""}</span>
                  </div>
                </label>
              ))
            }
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 20px", borderTop: "1px solid var(--border)", display: "flex", gap: "10px", flexShrink: 0 }}>
          <button className="btn btn-primary" onClick={copyLink} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
            <ShareIcon /> {copied ? "✓ Link copied!" : "Copy link"}
          </button>
          <button className="btn btn-secondary" onClick={openPage} style={{ flex: 1 }}>
            {opened ? "Opened ↗" : "Preview ↗"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Dog card ──────────────────────────────────────────────────────────────────

function DogCard({ dog, onChange }: { dog: Dog; onChange: (updated: Dog) => void }) {
  const [tab, setTab]             = useState<TabKey>("profile");
  const [addingMed, setAddingMed] = useState(false);
  const [newMed, setNewMed]       = useState<Partial<Medication>>({});
  const [shareOpen, setShareOpen] = useState(false);

  const upd = (patch: Partial<Dog>) => onChange({ ...dog, ...patch });

  const age      = calcAge(dog.birthday);
  const nextAppt = daysUntil(dog.nextVetVisit);

  const addMed = () => {
    if (!newMed.name?.trim()) return;
    const med: Medication = {
      id: crypto.randomUUID(),
      name: newMed.name.trim(),
      dose: newMed.dose ?? "",
      frequency: newMed.frequency ?? "",
      refillDate: newMed.refillDate,
    };
    upd({ medications: [...dog.medications, med] });
    setNewMed({}); setAddingMed(false);
  };

  const deleteMed = (id: string) => upd({ medications: dog.medications.filter(m => m.id !== id) });

  return (
    <div className="card" style={{ flex: "1 1 420px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "14px", marginBottom: "16px" }}>
        <div style={{
          width: "50px", height: "50px", borderRadius: "50%", flexShrink: 0,
          background: "var(--accent-dim)", border: "2px solid var(--accent)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="24" height="24" viewBox="0 0 26 26" fill="none" stroke="var(--accent)" strokeWidth="1.5">
            <ellipse cx="9" cy="7" rx="2.5" ry="3.5" /><ellipse cx="17" cy="7" rx="2.5" ry="3.5" />
            <ellipse cx="5" cy="14" rx="2.5" ry="3.5" /><ellipse cx="21" cy="14" rx="2.5" ry="3.5" />
            <path d="M13 12c-4 0-7.5 2.5-7.5 6.5 0 2.5 2.5 4 7.5 4s7.5-1.5 7.5-4C20.5 14.5 17 12 13 12z" strokeLinejoin="round" />
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: "20px", fontWeight: 700, color: "var(--text)", margin: 0 }}>{dog.name}</h2>
          <p style={{ fontSize: "13px", color: "var(--text-3)", margin: "2px 0 0" }}>
            {age && `${age} old`}{dog.breed ? (age ? ` · ${dog.breed}` : dog.breed) : ""}
          </p>
        </div>
        <button className="btn btn-secondary" style={{ fontSize: "12px", padding: "5px 12px", display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}
          onClick={() => setShareOpen(true)}>
          <ShareIcon /> Share
        </button>
      </div>

      {shareOpen && <ShareModal dog={dog} onClose={() => setShareOpen(false)} />}

      {/* Vet appt badge */}
      {nextAppt !== null && (
        <div style={{
          marginBottom: "14px", fontSize: "12px", fontWeight: 600, padding: "6px 12px", borderRadius: "7px",
          background: nextAppt < 0 ? "var(--red-dim)" : nextAppt <= 14 ? "var(--yellow-dim)" : "var(--accent-dim)",
          color: nextAppt < 0 ? "var(--red)" : nextAppt <= 14 ? "var(--yellow)" : "var(--accent-text)",
        }}>
          {nextAppt < 0 ? `⚠ Vet appointment was ${Math.abs(nextAppt)} days ago` : nextAppt === 0 ? "🐾 Vet appointment today!" : `📅 Vet appointment in ${nextAppt} days — ${fmtDate(dog.nextVetVisit)}`}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--border)", marginBottom: "14px", gap: "0" }}>
        {([["profile","Profile"],["visits","Vet Visits"],["boarding","Boarding"]] as [TabKey,string][]).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{
            padding: "7px 14px", fontFamily: "inherit", fontSize: "13px", fontWeight: 500,
            background: "none", border: "none", cursor: "pointer",
            borderBottom: tab === key ? "2px solid var(--accent)" : "2px solid transparent",
            color: tab === key ? "var(--accent-text)" : "var(--text-3)",
            marginBottom: "-1px", transition: "color 0.1s",
          }}>
            {label}
            {key === "visits" && dog.vetVisits.length > 0 && (
              <span style={{ marginLeft: "5px", fontSize: "10px", background: "var(--accent-dim)", color: "var(--accent-text)", borderRadius: "99px", padding: "1px 5px" }}>{dog.vetVisits.length}</span>
            )}
            {key === "boarding" && dog.boardings.length > 0 && (
              <span style={{ marginLeft: "5px", fontSize: "10px", background: "var(--accent-dim)", color: "var(--accent-text)", borderRadius: "99px", padding: "1px 5px" }}>{dog.boardings.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Profile tab ── */}
      {tab === "profile" && (
        <>
          <p className="card-title" style={{ marginBottom: "4px" }}>Profile</p>
          <Field label="Breed"           value={dog.breed}       onChange={v => upd({ breed: v })}       placeholder="e.g. German Shepherd" />
          <Field label="Birthday"        value={dog.birthday}    onChange={v => upd({ birthday: v })}    type="date" />
          <Field label="Weight"          value={dog.weight}      onChange={v => upd({ weight: v })}      placeholder="e.g. 65 lbs" />
          <Field label="Color/Markings"  value={dog.color}       onChange={v => upd({ color: v })}       placeholder="e.g. Black & tan" />
          <Field label="Microchip ID"    value={dog.microchipId} onChange={v => upd({ microchipId: v })} placeholder="optional" />
          <Field label="Food"            value={dog.food}        onChange={v => upd({ food: v })}        placeholder="e.g. Royal Canin Digestive" />

          <p className="card-title" style={{ marginTop: "18px", marginBottom: "4px" }}>Vet Info</p>
          <Field label="Vet / Clinic"  value={dog.vetName}      onChange={v => upd({ vetName: v })}      placeholder="Clinic name" />
          <Field label="Phone"         value={dog.vetPhone}     onChange={v => upd({ vetPhone: v })}     placeholder="(407) 000-0000" />
          <Field label="Last visit"    value={dog.lastVetVisit} onChange={v => upd({ lastVetVisit: v })} type="date" />
          <Field label="Next appt"     value={dog.nextVetVisit} onChange={v => upd({ nextVetVisit: v })} type="date" />

          <div style={{ marginTop: "18px", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
            <p className="card-title" style={{ margin: 0 }}>Medications</p>
            <button className="btn btn-secondary" style={{ fontSize: "11px", padding: "3px 10px" }}
              onClick={() => setAddingMed(v => !v)}>{addingMed ? "Cancel" : "+ Add"}</button>
          </div>

          {addingMed && (
            <div style={{ background: "var(--surface-raised)", borderRadius: "8px", padding: "12px", marginBottom: "8px", display: "flex", flexDirection: "column", gap: "8px" }}>
              <input className="input" placeholder="Medication name…" value={newMed.name ?? ""} onChange={e => setNewMed(m => ({ ...m, name: e.target.value }))} />
              <div style={{ display: "flex", gap: "8px" }}>
                <input className="input" placeholder="Dose" value={newMed.dose ?? ""} onChange={e => setNewMed(m => ({ ...m, dose: e.target.value }))} style={{ flex: 1 }} />
                <input className="input" placeholder="How often" value={newMed.frequency ?? ""} onChange={e => setNewMed(m => ({ ...m, frequency: e.target.value }))} style={{ flex: 1 }} />
              </div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <label style={{ fontSize: "12px", color: "var(--text-3)", whiteSpace: "nowrap" }}>Refill by:</label>
                <input className="input" type="date" value={newMed.refillDate ?? ""} onChange={e => setNewMed(m => ({ ...m, refillDate: e.target.value }))} />
              </div>
              <button className="btn btn-primary" onClick={addMed}>Add Medication</button>
            </div>
          )}

          {dog.medications.length === 0 && !addingMed && <p className="empty">No medications.</p>}
          {dog.medications.map(med => {
            const refillDays = daysUntil(med.refillDate ?? "");
            return (
              <div key={med.id} style={{ background: "var(--surface-raised)", borderRadius: "7px", padding: "10px 12px", marginBottom: "6px", display: "flex", alignItems: "flex-start", gap: "8px" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--text)" }}>{med.name}</div>
                  <div style={{ fontSize: "12px", color: "var(--text-3)", marginTop: "2px" }}>
                    {med.dose}{med.dose && med.frequency && " · "}{med.frequency}
                  </div>
                  {med.refillDate && (
                    <div style={{ fontSize: "11.5px", marginTop: "4px", color: refillDays !== null && refillDays <= 7 ? "var(--yellow)" : "var(--text-3)" }}>
                      Refill by {fmtDate(med.refillDate)}
                      {refillDays !== null && refillDays <= 14 && <span style={{ marginLeft: "6px", fontWeight: 600 }}>{refillDays < 0 ? `(${Math.abs(refillDays)}d overdue)` : `(${refillDays}d)`}</span>}
                    </div>
                  )}
                </div>
                <button className="btn-icon" onClick={() => deleteMed(med.id)}><XIcon /></button>
              </div>
            );
          })}

          <p className="card-title" style={{ marginTop: "18px", marginBottom: "6px" }}>Notes</p>
          <textarea value={dog.notes} onChange={e => upd({ notes: e.target.value })}
            placeholder="Allergies, behaviors, special needs, vet history…" rows={4}
            style={{ width: "100%", boxSizing: "border-box", background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: "7px", color: "var(--text)", fontSize: "13.5px", padding: "10px 12px", fontFamily: "inherit", resize: "vertical", outline: "none", lineHeight: 1.6 }} />
        </>
      )}

      {/* ── Vet Visits tab ── */}
      {tab === "visits" && (
        <VetVisitsTab
          visits={dog.vetVisits}
          onChange={v => upd({ vetVisits: v })}
        />
      )}

      {/* ── Boarding tab ── */}
      {tab === "boarding" && (
        <BoardingTab
          boardings={dog.boardings}
          onChange={b => upd({ boardings: b })}
        />
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function DogsPage() {
  const [rawData,  setRawData]  = useState<DashData>({});
  const [dogs,     setDogs]     = useState<Dog[]>(DEFAULT_DOGS);
  const [status,   setStatus]   = useState<SaveStatus>("idle");
  const [loading,  setLoading]  = useState(true);
  const timer     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/api/data")
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(res => {
        const d: DashData = res.data ?? {};
        setRawData(d);
        const saved = d.dogs?.dogs;
        if (saved && saved.length > 0) {
          // Ensure new fields exist on older saved data
          setDogs(saved.map(dog => ({
            ...makeDog(dog.name, dog.id),
            ...dog,
            vetVisits: dog.vetVisits ?? [],
            boardings: dog.boardings ?? [],
          })));
        }
      })
      .catch(() => setStatus("error"))
      .finally(() => setLoading(false));
  }, []);

  const save = useCallback(async (updated: Dog[]) => {
    setStatus("saving");
    if (timer.current) clearTimeout(timer.current);
    const newData = { ...rawData, dogs: { dogs: updated } };
    setRawData(newData);
    try {
      const res = await fetch("/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: newData }),
      });
      if (!res.ok) throw new Error();
      setStatus("saved");
    } catch {
      setStatus("error");
    } finally {
      timer.current = setTimeout(() => setStatus("idle"), 2000);
    }
  }, [rawData]);

  const handleChange = (updated: Dog) => {
    const newDogs = dogs.map(d => d.id === updated.id ? updated : d);
    setDogs(newDogs);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => save(newDogs), 600);
  };

  if (loading) return <p className="empty" style={{ padding: "32px 0" }}>Loading…</p>;

  return (
    <div>
      {status !== "idle" && (
        <div className={`toast${status === "error" ? " error" : ""}`}>
          {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : "Could not save — check connection."}
        </div>
      )}
      <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "flex-start" }}>
        {dogs.map(dog => <DogCard key={dog.id} dog={dog} onChange={handleChange} />)}
      </div>
    </div>
  );
}
