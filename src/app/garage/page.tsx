"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import CarDiagram from "./CarDiagram";
import { REFERENCE_INFO } from "./guides";

// ── Types ─────────────────────────────────────────────────────────────────────

type ServiceRecord = {
  id: string;
  name: string;
  intervalMiles: number | null;
  intervalMonths: number | null;
  lastDate: string | null;     // YYYY-MM-DD
  lastMileage: number | null;
};

type ProjectStatus = "planned" | "in-progress" | "done";

type RepairProject = {
  id: string;
  name: string;
  status: ProjectStatus;
  notes: string;
  parts: string;         // free-text list
  estimatedCost: string; // free-text, e.g. "$45"
};

type GarageData = {
  currentMileage: number;
  services: ServiceRecord[];
  projects: RepairProject[];
};

type DashboardData = { garage?: GarageData; [key: string]: unknown };
type SaveStatus    = "idle" | "saving" | "saved" | "error";

// ── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_SERVICES: Omit<ServiceRecord, "id" | "lastDate" | "lastMileage">[] = [
  { name: "Oil Change",          intervalMiles: 5000,  intervalMonths: 6  },
  { name: "Tire Rotation",       intervalMiles: 7500,  intervalMonths: 6  },
  { name: "Engine Air Filter",   intervalMiles: 20000, intervalMonths: 12 },
  { name: "Cabin Air Filter",    intervalMiles: 20000, intervalMonths: 12 },
  { name: "Brake Check",         intervalMiles: 12000, intervalMonths: 12 },
  { name: "Spark Plugs",         intervalMiles: 60000, intervalMonths: null },
  { name: "Battery",             intervalMiles: null,  intervalMonths: 48 },
  { name: "Coolant Flush",       intervalMiles: 30000, intervalMonths: 24 },
  { name: "Wiper Blades",        intervalMiles: null,  intervalMonths: 12 },
];

function seedServices(): ServiceRecord[] {
  return DEFAULT_SERVICES.map(s => ({
    ...s,
    id: crypto.randomUUID(),
    lastDate: null,
    lastMileage: null,
  }));
}

// ── Status calc ───────────────────────────────────────────────────────────────

type ServiceStatus = "good" | "due-soon" | "overdue" | "unknown";

function calcStatus(
  svc: ServiceRecord,
  currentMileage: number,
): { status: ServiceStatus; nextMiles: number | null; nextDate: string | null } {
  let mileDist: number | null = null;
  let dateDist: number | null = null; // days
  let nextMiles: number | null = null;
  let nextDate:  string | null = null;

  if (svc.intervalMiles && svc.lastMileage != null) {
    nextMiles = svc.lastMileage + svc.intervalMiles;
    mileDist  = nextMiles - currentMileage;
  }
  if (svc.intervalMonths && svc.lastDate) {
    const last = new Date(svc.lastDate + "T00:00:00");
    const due  = new Date(last);
    due.setMonth(due.getMonth() + svc.intervalMonths);
    nextDate  = due.toISOString().slice(0, 10);
    dateDist  = Math.round((due.getTime() - Date.now()) / 86400000);
  }

  if (mileDist == null && dateDist == null) return { status: "unknown", nextMiles, nextDate };

  const mileOverdue = mileDist != null && mileDist <= 0;
  const dateOverdue = dateDist != null && dateDist <= 0;
  const mileSoon    = mileDist != null && mileDist > 0 && mileDist <= 1000;
  const dateSoon    = dateDist != null && dateDist > 0 && dateDist <= 30;

  if (mileOverdue || dateOverdue) return { status: "overdue",  nextMiles, nextDate };
  if (mileSoon    || dateSoon)    return { status: "due-soon", nextMiles, nextDate };
  return { status: "good", nextMiles, nextDate };
}

const STATUS_COLOR: Record<ServiceStatus, string> = {
  good:    "#2a7a3a",
  "due-soon": "#8a6010",
  overdue: "#7a1b2c",
  unknown: "#4a4060",
};
const STATUS_LABEL: Record<ServiceStatus, string> = {
  good: "Good", "due-soon": "Due Soon", overdue: "Overdue", unknown: "No Data",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function GaragePage() {
  const [rawData, setRawData] = useState<DashboardData>({});
  const [garage,  setGarage]  = useState<GarageData>({ currentMileage: 0, services: [], projects: [] });
  const [status,  setStatus]  = useState<SaveStatus>("idle");
  const [loading, setLoading] = useState(true);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // editing states
  const [editingServiceId,  setEditingServiceId]  = useState<string | null>(null);
  const [editingProjectId,  setEditingProjectId]  = useState<string | null>(null);
  const [showAddService,    setShowAddService]     = useState(false);
  const [showAddProject,    setShowAddProject]     = useState(false);

  // new-service form
  const [ns, setNs] = useState({ name:"", intervalMiles:"", intervalMonths:"", lastDate:"", lastMileage:"" });
  // new-project form
  const [np, setNp] = useState({ name:"", status:"planned" as ProjectStatus, notes:"", parts:"", estimatedCost:"" });

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/data")
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(res => {
        const d: DashboardData = res.data ?? {};
        setRawData(d);
        const g = d.garage ?? { currentMileage: 0, services: seedServices(), projects: [] };
        if (!g.services || g.services.length === 0) g.services = seedServices();
        setGarage(g);
      })
      .catch(() => setStatus("error"))
      .finally(() => setLoading(false));
  }, []);

  // ── Save ──────────────────────────────────────────────────────────────────
  const save = useCallback(async (newGarage: GarageData) => {
    setStatus("saving");
    if (toastTimer.current) clearTimeout(toastTimer.current);
    try {
      const newData = { ...rawData, garage: newGarage };
      const res = await fetch("/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: newData }),
      });
      if (!res.ok) throw new Error();
      setRawData(newData);
      setStatus("saved");
    } catch {
      setStatus("error");
    } finally {
      toastTimer.current = setTimeout(() => setStatus("idle"), 2200);
    }
  }, [rawData]);

  function updateGarage(next: GarageData) { setGarage(next); save(next); }

  // ── Mileage ───────────────────────────────────────────────────────────────
  const [mileEdit, setMileEdit] = useState(false);
  const [mileInput, setMileInput] = useState("");

  function saveMileage() {
    const val = parseInt(mileInput.replace(/,/g, ""), 10);
    if (isNaN(val) || val < 0) return;
    const next = { ...garage, currentMileage: val };
    updateGarage(next);
    setMileEdit(false);
  }

  // ── Services ──────────────────────────────────────────────────────────────
  function addService() {
    if (!ns.name.trim()) return;
    const svc: ServiceRecord = {
      id: crypto.randomUUID(),
      name: ns.name.trim(),
      intervalMiles:  ns.intervalMiles  ? parseInt(ns.intervalMiles,  10) : null,
      intervalMonths: ns.intervalMonths ? parseInt(ns.intervalMonths, 10) : null,
      lastDate:    ns.lastDate    || null,
      lastMileage: ns.lastMileage ? parseInt(ns.lastMileage, 10) : null,
    };
    const next = { ...garage, services: [...garage.services, svc] };
    updateGarage(next);
    setNs({ name:"", intervalMiles:"", intervalMonths:"", lastDate:"", lastMileage:"" });
    setShowAddService(false);
  }

  function updateService(id: string, patch: Partial<ServiceRecord>) {
    const next = { ...garage, services: garage.services.map(s => s.id === id ? { ...s, ...patch } : s) };
    updateGarage(next);
    setEditingServiceId(null);
  }

  function deleteService(id: string) {
    const next = { ...garage, services: garage.services.filter(s => s.id !== id) };
    updateGarage(next);
  }

  // ── Projects ──────────────────────────────────────────────────────────────
  function addProject() {
    if (!np.name.trim()) return;
    const proj: RepairProject = {
      id: crypto.randomUUID(),
      name: np.name.trim(),
      status: np.status,
      notes: np.notes,
      parts: np.parts,
      estimatedCost: np.estimatedCost,
    };
    const next = { ...garage, projects: [...garage.projects, proj] };
    updateGarage(next);
    setNp({ name:"", status:"planned", notes:"", parts:"", estimatedCost:"" });
    setShowAddProject(false);
  }

  function updateProject(id: string, patch: Partial<RepairProject>) {
    const next = { ...garage, projects: garage.projects.map(p => p.id === id ? { ...p, ...patch } : p) };
    updateGarage(next);
    setEditingProjectId(null);
  }

  function deleteProject(id: string) {
    const next = { ...garage, projects: garage.projects.filter(p => p.id !== id) };
    updateGarage(next);
  }

  if (loading) return <p className="empty-state">Summoning garage records…</p>;

  const STATUS_BADGE_BG: Record<ProjectStatus, string> = {
    planned:     "rgba(122,27,44,0.22)",
    "in-progress": "rgba(138,96,16,0.28)",
    done:        "rgba(42,122,58,0.22)",
  };
  const STATUS_BADGE_COLOR: Record<ProjectStatus, string> = {
    planned:     "#c06080",
    "in-progress": "#c49228",
    done:        "#5ab870",
  };

  return (
    <div style={{ maxWidth: "900px" }}>

      {status !== "idle" && (
        <div className={`save-toast${status === "error" ? " error" : ""}`}>
          {status === "saving" ? "Saving…" : status === "saved" ? "Saved  ✦" : "Could not save — check your connection."}
        </div>
      )}

      {/* ── Reference card ── */}
      <div className="magic-card" style={{ marginBottom: "28px" }}>
        <div className="section-title"><span>✦</span> Vehicle Reference</div>
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: "12px", marginTop: "10px",
        }}>
          {[
            { label: "Paint Color", value: "Scarlet Red Pearl" },
            { label: "Engine Oil", value: REFERENCE_INFO.engineOil },
            { label: "Spark Plugs (NGK)", value: REFERENCE_INFO.sparkPlugs[0].partNumber },
            { label: "Spark Plugs (OEM)", value: REFERENCE_INFO.sparkPlugs[1].partNumber },
            { label: "Fender Liner", value: REFERENCE_INFO.fenderLiner.partNumber },
            { label: "Fender Clips", value: REFERENCE_INFO.fenderClips.partNumber },
          ].map(item => (
            <div key={item.label} style={{
              background: "rgba(196,146,40,0.06)", border: "1px solid rgba(196,146,40,0.18)",
              borderRadius: "4px", padding: "10px 14px",
            }}>
              <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "9px", letterSpacing: "0.16em", color: "var(--gold)", opacity: 0.75, textTransform: "uppercase", marginBottom: "4px" }}>
                {item.label}
              </div>
              <div style={{ fontFamily: "var(--font-crimson)", fontSize: "15px", color: "var(--parchment)", fontWeight: 600 }}>
                {item.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Current mileage ── */}
      <div className="magic-card" style={{ marginBottom: "28px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
          <div>
            <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "9px", letterSpacing: "0.16em", color: "var(--gold)", opacity: 0.75, textTransform: "uppercase", marginBottom: "4px" }}>
              Current Mileage
            </div>
            {mileEdit ? (
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <input
                  className="magic-input"
                  type="number"
                  defaultValue={garage.currentMileage}
                  onChange={e => setMileInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") saveMileage(); }}
                  style={{ width: "140px" }}
                  autoFocus
                />
                <button className="btn-seal" onClick={saveMileage}>Save</button>
                <button className="btn-ghost" onClick={() => setMileEdit(false)}>Cancel</button>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "baseline", gap: "12px" }}>
                <span style={{ fontFamily: "var(--font-crimson)", fontSize: "28px", color: "var(--parchment)", fontWeight: 600 }}>
                  {garage.currentMileage.toLocaleString()}
                </span>
                <span style={{ fontFamily: "var(--font-crimson)", fontSize: "14px", color: "var(--parchment-dim)", fontStyle: "italic" }}>miles</span>
                <button className="btn-ghost" onClick={() => { setMileInput(String(garage.currentMileage)); setMileEdit(true); }} style={{ fontSize: "12px", padding: "3px 10px" }}>Edit</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          SECTION 1 — ROUTINE SERVICE TRACKER
          ═══════════════════════════════════════════ */}
      <div className="magic-card" style={{ marginBottom: "28px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px", marginBottom: "4px" }}>
          <div className="section-title" style={{ margin: 0 }}><span>⚙</span> Routine Service</div>
          <button className="btn-seal" onClick={() => setShowAddService(v => !v)} style={{ fontSize: "12px", padding: "6px 16px" }}>
            {showAddService ? "Cancel" : "+ Add Item"}
          </button>
        </div>

        {showAddService && (
          <div style={{
            background: "rgba(196,146,40,0.05)", border: "1px solid rgba(196,146,40,0.20)",
            borderRadius: "4px", padding: "16px", marginTop: "14px", marginBottom: "8px",
          }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "10px", marginBottom: "12px" }}>
              {[
                { label: "Service name *", key: "name",           type: "text",   placeholder: "e.g. Transmission Fluid" },
                { label: "Interval (miles)",  key: "intervalMiles",  type: "number", placeholder: "e.g. 30000" },
                { label: "Interval (months)", key: "intervalMonths", type: "number", placeholder: "e.g. 24" },
                { label: "Last done date",    key: "lastDate",       type: "date",   placeholder: "" },
                { label: "Last done mileage", key: "lastMileage",    type: "number", placeholder: "e.g. 48000" },
              ].map(f => (
                <div key={f.key}>
                  <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "9px", letterSpacing: "0.14em", color: "var(--gold)", opacity: 0.70, textTransform: "uppercase", marginBottom: "4px" }}>{f.label}</div>
                  <input
                    className="magic-input"
                    type={f.type}
                    placeholder={f.placeholder}
                    value={(ns as Record<string,string>)[f.key]}
                    onChange={e => setNs(prev => ({ ...prev, [f.key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
            <button className="btn-seal" onClick={addService}>Add Service</button>
          </div>
        )}

        <hr className="gold-rule" style={{ marginTop: "14px" }} />

        {garage.services.length === 0 ? (
          <p className="empty-state">No service items yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            {garage.services.map(svc => {
              const { status: st, nextMiles, nextDate } = calcStatus(svc, garage.currentMileage);
              const isEditing = editingServiceId === svc.id;

              if (isEditing) {
                return (
                  <ServiceEditRow key={svc.id} svc={svc} onSave={patch => updateService(svc.id, patch)} onCancel={() => setEditingServiceId(null)} />
                );
              }

              return (
                <div key={svc.id} className="item-row" style={{ alignItems: "flex-start", padding: "10px 8px", gap: "10px" }}>
                  <div style={{
                    flexShrink: 0, marginTop: "3px",
                    width: "10px", height: "10px", borderRadius: "50%",
                    background: STATUS_COLOR[st],
                    boxShadow: `0 0 6px ${STATUS_COLOR[st]}`,
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "var(--font-crimson)", fontSize: "16px", color: "var(--parchment)", fontWeight: 600 }}>
                      {svc.name}
                    </div>
                    <div style={{ fontFamily: "var(--font-crimson)", fontSize: "13px", color: "var(--parchment-dim)", fontStyle: "italic", marginTop: "2px", display: "flex", gap: "12px", flexWrap: "wrap" }}>
                      {svc.intervalMiles && <span>Every {svc.intervalMiles.toLocaleString()} mi</span>}
                      {svc.intervalMonths && <span>Every {svc.intervalMonths} mo</span>}
                      {svc.lastDate && <span>Last: {fmt(svc.lastDate)}{svc.lastMileage ? ` @ ${svc.lastMileage.toLocaleString()} mi` : ""}</span>}
                      {nextMiles && <span>Next: {nextMiles.toLocaleString()} mi</span>}
                      {nextDate && <span>Due: {fmt(nextDate)}</span>}
                    </div>
                  </div>
                  <span style={{
                    flexShrink: 0, fontFamily: "var(--font-cinzel)", fontSize: "9px",
                    letterSpacing: "0.10em", textTransform: "uppercase",
                    color: STATUS_COLOR[st], background: `${STATUS_COLOR[st]}22`,
                    border: `1px solid ${STATUS_COLOR[st]}55`,
                    borderRadius: "3px", padding: "3px 8px",
                  }}>
                    {STATUS_LABEL[st]}
                  </span>
                  <button className="btn-ghost" onClick={() => setEditingServiceId(svc.id)} style={{ flexShrink: 0, fontSize: "12px", padding: "3px 10px" }}>Edit</button>
                  <button className="del-btn" onClick={() => deleteService(svc.id)}>×</button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════
          SECTION 2 — SELF-REPAIR PROJECTS
          ═══════════════════════════════════════════ */}
      <div className="magic-card" style={{ marginBottom: "28px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px", marginBottom: "4px" }}>
          <div className="section-title" style={{ margin: 0 }}><span>🔧</span> Self-Repair Projects</div>
          <button className="btn-seal" onClick={() => setShowAddProject(v => !v)} style={{ fontSize: "12px", padding: "6px 16px" }}>
            {showAddProject ? "Cancel" : "+ Add Project"}
          </button>
        </div>

        {showAddProject && (
          <div style={{
            background: "rgba(196,146,40,0.05)", border: "1px solid rgba(196,146,40,0.20)",
            borderRadius: "4px", padding: "16px", marginTop: "14px", marginBottom: "8px",
          }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "10px", marginBottom: "12px" }}>
              <div style={{ gridColumn: "1/-1" }}>
                <FieldLabel>Project name *</FieldLabel>
                <input className="magic-input" type="text" placeholder="e.g. Replace fender liner" value={np.name} onChange={e => setNp(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <FieldLabel>Status</FieldLabel>
                <select className="magic-input" value={np.status} onChange={e => setNp(p => ({ ...p, status: e.target.value as ProjectStatus }))}>
                  <option value="planned">Planned</option>
                  <option value="in-progress">In Progress</option>
                  <option value="done">Done</option>
                </select>
              </div>
              <div>
                <FieldLabel>Estimated cost</FieldLabel>
                <input className="magic-input" type="text" placeholder="e.g. $185" value={np.estimatedCost} onChange={e => setNp(p => ({ ...p, estimatedCost: e.target.value }))} />
              </div>
              <div style={{ gridColumn: "1/-1" }}>
                <FieldLabel>Parts needed</FieldLabel>
                <input className="magic-input" type="text" placeholder="e.g. OEM 86811-F2800, push clips 86595-2TS00" value={np.parts} onChange={e => setNp(p => ({ ...p, parts: e.target.value }))} />
              </div>
              <div style={{ gridColumn: "1/-1" }}>
                <FieldLabel>Notes</FieldLabel>
                <input className="magic-input" type="text" placeholder="Any notes…" value={np.notes} onChange={e => setNp(p => ({ ...p, notes: e.target.value }))} />
              </div>
            </div>
            <button className="btn-seal" onClick={addProject}>Add Project</button>
          </div>
        )}

        <hr className="gold-rule" style={{ marginTop: "14px" }} />

        {garage.projects.length === 0 ? (
          <p className="empty-state">No repair projects yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {garage.projects.map(proj => {
              const isEditing = editingProjectId === proj.id;

              if (isEditing) {
                return <ProjectEditRow key={proj.id} proj={proj} onSave={patch => updateProject(proj.id, patch)} onCancel={() => setEditingProjectId(null)} />;
              }

              return (
                <div key={proj.id} className="item-row" style={{ alignItems: "flex-start", padding: "12px 8px", gap: "10px" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "4px" }}>
                      <span style={{ fontFamily: "var(--font-crimson)", fontSize: "17px", color: "var(--parchment)", fontWeight: 600 }}>
                        {proj.name}
                      </span>
                      <span style={{
                        fontFamily: "var(--font-cinzel)", fontSize: "9px",
                        letterSpacing: "0.10em", textTransform: "uppercase",
                        color: STATUS_BADGE_COLOR[proj.status],
                        background: STATUS_BADGE_BG[proj.status],
                        border: `1px solid ${STATUS_BADGE_COLOR[proj.status]}55`,
                        borderRadius: "3px", padding: "3px 8px",
                      }}>
                        {proj.status === "in-progress" ? "In Progress" : proj.status.charAt(0).toUpperCase() + proj.status.slice(1)}
                      </span>
                      {proj.estimatedCost && (
                        <span style={{ fontFamily: "var(--font-crimson)", fontSize: "14px", color: "var(--gold)", fontStyle: "italic" }}>
                          {proj.estimatedCost}
                        </span>
                      )}
                    </div>
                    {proj.parts && (
                      <div style={{ fontFamily: "var(--font-crimson)", fontSize: "13px", color: "var(--parchment-dim)", fontStyle: "italic", marginBottom: "2px" }}>
                        Parts: {proj.parts}
                      </div>
                    )}
                    {proj.notes && (
                      <div style={{ fontFamily: "var(--font-crimson)", fontSize: "14px", color: "var(--parchment-dim)", lineHeight: 1.5 }}>
                        {proj.notes}
                      </div>
                    )}
                  </div>
                  <button className="btn-ghost" onClick={() => setEditingProjectId(proj.id)} style={{ flexShrink: 0, fontSize: "12px", padding: "3px 10px" }}>Edit</button>
                  <button className="del-btn" onClick={() => deleteProject(proj.id)}>×</button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════
          SECTION 3 — CAR DIAGRAM
          ═══════════════════════════════════════════ */}
      <CarDiagram />

    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "9px", letterSpacing: "0.14em", color: "var(--gold)", opacity: 0.70, textTransform: "uppercase", marginBottom: "4px" }}>
      {children}
    </div>
  );
}

function ServiceEditRow({
  svc, onSave, onCancel,
}: {
  svc: ServiceRecord;
  onSave: (patch: Partial<ServiceRecord>) => void;
  onCancel: () => void;
}) {
  const [v, setV] = useState({
    name:           svc.name,
    intervalMiles:  svc.intervalMiles  != null ? String(svc.intervalMiles)  : "",
    intervalMonths: svc.intervalMonths != null ? String(svc.intervalMonths) : "",
    lastDate:    svc.lastDate    ?? "",
    lastMileage: svc.lastMileage != null ? String(svc.lastMileage) : "",
  });
  function save() {
    onSave({
      name:           v.name.trim() || svc.name,
      intervalMiles:  v.intervalMiles  ? parseInt(v.intervalMiles,  10) : null,
      intervalMonths: v.intervalMonths ? parseInt(v.intervalMonths, 10) : null,
      lastDate:    v.lastDate    || null,
      lastMileage: v.lastMileage ? parseInt(v.lastMileage, 10) : null,
    });
  }
  return (
    <div style={{ background: "rgba(196,146,40,0.05)", border: "1px solid rgba(196,146,40,0.20)", borderRadius: "4px", padding: "14px", marginBottom: "2px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: "8px", marginBottom: "12px" }}>
        {([
          { label:"Name",           key:"name",           type:"text"   },
          { label:"Interval (mi)",  key:"intervalMiles",  type:"number" },
          { label:"Interval (mo)",  key:"intervalMonths", type:"number" },
          { label:"Last date",      key:"lastDate",       type:"date"   },
          { label:"Last mileage",   key:"lastMileage",    type:"number" },
        ] as const).map(f => (
          <div key={f.key}>
            <FieldLabel>{f.label}</FieldLabel>
            <input className="magic-input" type={f.type} value={(v as Record<string,string>)[f.key]}
              onChange={e => setV(p => ({ ...p, [f.key]: e.target.value }))} />
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: "8px" }}>
        <button className="btn-seal" onClick={save}>Save</button>
        <button className="btn-ghost" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

function ProjectEditRow({
  proj, onSave, onCancel,
}: {
  proj: RepairProject;
  onSave: (patch: Partial<RepairProject>) => void;
  onCancel: () => void;
}) {
  const [v, setV] = useState({ ...proj });
  return (
    <div style={{ background: "rgba(196,146,40,0.05)", border: "1px solid rgba(196,146,40,0.20)", borderRadius: "4px", padding: "14px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: "10px", marginBottom: "12px" }}>
        <div style={{ gridColumn: "1/-1" }}>
          <FieldLabel>Name</FieldLabel>
          <input className="magic-input" value={v.name} onChange={e => setV(p => ({ ...p, name: e.target.value }))} />
        </div>
        <div>
          <FieldLabel>Status</FieldLabel>
          <select className="magic-input" value={v.status} onChange={e => setV(p => ({ ...p, status: e.target.value as ProjectStatus }))}>
            <option value="planned">Planned</option>
            <option value="in-progress">In Progress</option>
            <option value="done">Done</option>
          </select>
        </div>
        <div>
          <FieldLabel>Cost</FieldLabel>
          <input className="magic-input" value={v.estimatedCost} onChange={e => setV(p => ({ ...p, estimatedCost: e.target.value }))} />
        </div>
        <div style={{ gridColumn: "1/-1" }}>
          <FieldLabel>Parts</FieldLabel>
          <input className="magic-input" value={v.parts} onChange={e => setV(p => ({ ...p, parts: e.target.value }))} />
        </div>
        <div style={{ gridColumn: "1/-1" }}>
          <FieldLabel>Notes</FieldLabel>
          <input className="magic-input" value={v.notes} onChange={e => setV(p => ({ ...p, notes: e.target.value }))} />
        </div>
      </div>
      <div style={{ display: "flex", gap: "8px" }}>
        <button className="btn-seal" onClick={() => onSave(v)}>Save</button>
        <button className="btn-ghost" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}
