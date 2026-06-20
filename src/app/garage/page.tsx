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
  lastDate: string | null;
  lastMileage: number | null;
};

type ProjectStatus = "planned" | "in-progress" | "done";

type RepairProject = {
  id: string;
  name: string;
  status: ProjectStatus;
  notes: string;
  parts: string;
  estimatedCost: string;
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
  { name: "Oil Change",        intervalMiles: 5000,  intervalMonths: 6    },
  { name: "Tire Rotation",     intervalMiles: 7500,  intervalMonths: 6    },
  { name: "Engine Air Filter", intervalMiles: 20000, intervalMonths: 12   },
  { name: "Cabin Air Filter",  intervalMiles: 20000, intervalMonths: 12   },
  { name: "Brake Check",       intervalMiles: 12000, intervalMonths: 12   },
  { name: "Spark Plugs",       intervalMiles: 60000, intervalMonths: null },
  { name: "Battery",           intervalMiles: null,  intervalMonths: 48   },
  { name: "Coolant Flush",     intervalMiles: 30000, intervalMonths: 24   },
  { name: "Wiper Blades",      intervalMiles: null,  intervalMonths: 12   },
];

function seedServices(): ServiceRecord[] {
  return DEFAULT_SERVICES.map(s => ({ ...s, id: crypto.randomUUID(), lastDate: null, lastMileage: null }));
}

// ── Status calc ───────────────────────────────────────────────────────────────

type ServiceStatus = "good" | "due-soon" | "overdue" | "unknown";

function calcStatus(svc: ServiceRecord, currentMileage: number) {
  let mileDist: number | null = null;
  let dateDist: number | null = null;
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
    nextDate = due.toISOString().slice(0, 10);
    dateDist = Math.round((due.getTime() - Date.now()) / 86400000);
  }

  if (mileDist == null && dateDist == null) return { status: "unknown" as ServiceStatus, nextMiles, nextDate };

  const mileOverdue = mileDist != null && mileDist <= 0;
  const dateOverdue = dateDist != null && dateDist <= 0;
  const mileSoon    = mileDist != null && mileDist > 0 && mileDist <= 1000;
  const dateSoon    = dateDist != null && dateDist > 0 && dateDist <= 30;

  if (mileOverdue || dateOverdue) return { status: "overdue"  as ServiceStatus, nextMiles, nextDate };
  if (mileSoon    || dateSoon)    return { status: "due-soon" as ServiceStatus, nextMiles, nextDate };
  return { status: "good" as ServiceStatus, nextMiles, nextDate };
}

const STATUS_COLOR: Record<ServiceStatus, string> = {
  good:      "var(--green)",
  "due-soon":"var(--yellow)",
  overdue:   "var(--red)",
  unknown:   "var(--text-3)",
};
const STATUS_BG: Record<ServiceStatus, string> = {
  good:      "var(--green-dim)",
  "due-soon":"var(--yellow-dim)",
  overdue:   "var(--red-dim)",
  unknown:   "transparent",
};
const STATUS_LABEL: Record<ServiceStatus, string> = {
  good: "Good", "due-soon": "Due Soon", overdue: "Overdue", unknown: "No Data",
};

const PROJECT_COLOR: Record<ProjectStatus, string> = {
  planned:       "var(--text-2)",
  "in-progress": "var(--yellow)",
  done:          "var(--green)",
};
const PROJECT_BG: Record<ProjectStatus, string> = {
  planned:       "var(--surface-overlay)",
  "in-progress": "var(--yellow-dim)",
  done:          "var(--green-dim)",
};

function fmt(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

const XIcon = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M2 2l9 9M11 2l-9 9" strokeLinecap="round" />
  </svg>
);

// ── Component ─────────────────────────────────────────────────────────────────

export default function GaragePage() {
  const [rawData, setRawData] = useState<DashboardData>({});
  const [garage,  setGarage]  = useState<GarageData>({ currentMileage: 0, services: [], projects: [] });
  const [status,  setStatus]  = useState<SaveStatus>("idle");
  const [loading, setLoading] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [showAddService,   setShowAddService]    = useState(false);
  const [showAddProject,   setShowAddProject]    = useState(false);

  const [ns, setNs] = useState({ name:"", intervalMiles:"", intervalMonths:"", lastDate:"", lastMileage:"" });
  const [np, setNp] = useState({ name:"", status:"planned" as ProjectStatus, notes:"", parts:"", estimatedCost:"" });

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

  const save = useCallback(async (newGarage: GarageData) => {
    setStatus("saving");
    if (timer.current) clearTimeout(timer.current);
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
      timer.current = setTimeout(() => setStatus("idle"), 2000);
    }
  }, [rawData]);

  function updateGarage(next: GarageData) { setGarage(next); save(next); }

  const [mileEdit, setMileEdit]   = useState(false);
  const [mileInput, setMileInput] = useState("");

  function saveMileage() {
    const val = parseInt(mileInput.replace(/,/g, ""), 10);
    if (isNaN(val) || val < 0) return;
    updateGarage({ ...garage, currentMileage: val });
    setMileEdit(false);
  }

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
    updateGarage({ ...garage, services: [...garage.services, svc] });
    setNs({ name:"", intervalMiles:"", intervalMonths:"", lastDate:"", lastMileage:"" });
    setShowAddService(false);
  }

  function updateService(id: string, patch: Partial<ServiceRecord>) {
    updateGarage({ ...garage, services: garage.services.map(s => s.id === id ? { ...s, ...patch } : s) });
    setEditingServiceId(null);
  }

  function deleteService(id: string) {
    updateGarage({ ...garage, services: garage.services.filter(s => s.id !== id) });
  }

  function addProject() {
    if (!np.name.trim()) return;
    const proj: RepairProject = { id: crypto.randomUUID(), ...np, name: np.name.trim() };
    updateGarage({ ...garage, projects: [...garage.projects, proj] });
    setNp({ name:"", status:"planned", notes:"", parts:"", estimatedCost:"" });
    setShowAddProject(false);
  }

  function updateProject(id: string, patch: Partial<RepairProject>) {
    updateGarage({ ...garage, projects: garage.projects.map(p => p.id === id ? { ...p, ...patch } : p) });
    setEditingProjectId(null);
  }

  function deleteProject(id: string) {
    updateGarage({ ...garage, projects: garage.projects.filter(p => p.id !== id) });
  }

  if (loading) return <p className="empty" style={{ padding: "32px 0" }}>Loading…</p>;

  return (
    <div style={{ maxWidth: "900px" }}>
      {status !== "idle" && (
        <div className={`toast${status === "error" ? " error" : ""}`}>
          {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : "Could not save — check connection."}
        </div>
      )}

      {/* Vehicle reference */}
      <div className="card" style={{ marginBottom: "16px" }}>
        <p className="card-title">Vehicle Reference</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "10px" }}>
          {[
            { label: "Paint Color",      value: "Scarlet Red Pearl" },
            { label: "Engine Oil",       value: REFERENCE_INFO.engineOil },
            { label: "Spark Plugs (NGK)",value: REFERENCE_INFO.sparkPlugs[0].partNumber },
            { label: "Spark Plugs (OEM)",value: REFERENCE_INFO.sparkPlugs[1].partNumber },
            { label: "Fender Liner",     value: REFERENCE_INFO.fenderLiner.partNumber },
            { label: "Fender Clips",     value: REFERENCE_INFO.fenderClips.partNumber },
          ].map(item => (
            <div key={item.label} style={{
              background: "var(--surface-raised)",
              border: "1px solid var(--border)",
              borderRadius: "6px",
              padding: "10px 12px",
            }}>
              <div style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-3)", marginBottom: "4px" }}>
                {item.label}
              </div>
              <div style={{ fontSize: "13.5px", color: "var(--text)", fontWeight: 500 }}>
                {item.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mileage */}
      <div className="card" style={{ marginBottom: "16px" }}>
        <p className="card-title">Current Mileage</p>
        {mileEdit ? (
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <input
              className="input"
              type="number"
              defaultValue={garage.currentMileage}
              onChange={e => setMileInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") saveMileage(); }}
              style={{ width: "160px" }}
              autoFocus
            />
            <button className="btn btn-primary" onClick={saveMileage}>Save</button>
            <button className="btn btn-secondary" onClick={() => setMileEdit(false)}>Cancel</button>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
            <span style={{ fontSize: "26px", fontWeight: 600, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>
              {garage.currentMileage.toLocaleString()}
            </span>
            <span style={{ fontSize: "13px", color: "var(--text-3)" }}>miles</span>
            <button className="btn btn-secondary" onClick={() => { setMileInput(String(garage.currentMileage)); setMileEdit(true); }} style={{ fontSize: "12px", padding: "4px 12px" }}>Edit</button>
          </div>
        )}
      </div>

      {/* Routine service */}
      <div className="card" style={{ marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
          <p className="card-title" style={{ margin: 0 }}>Routine Service</p>
          <button className="btn btn-secondary" onClick={() => setShowAddService(v => !v)} style={{ fontSize: "12px", padding: "5px 12px" }}>
            {showAddService ? "Cancel" : "+ Add"}
          </button>
        </div>

        {showAddService && (
          <div style={{ background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: "6px", padding: "14px", marginBottom: "14px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "10px", marginBottom: "12px" }}>
              {[
                { label: "Service name *",    key: "name",           type: "text"   },
                { label: "Interval (miles)",  key: "intervalMiles",  type: "number" },
                { label: "Interval (months)", key: "intervalMonths", type: "number" },
                { label: "Last done date",    key: "lastDate",       type: "date"   },
                { label: "Last mileage",      key: "lastMileage",    type: "number" },
              ].map(f => (
                <div key={f.key}>
                  <FieldLabel>{f.label}</FieldLabel>
                  <input
                    className="input"
                    type={f.type}
                    value={(ns as Record<string,string>)[f.key]}
                    onChange={e => setNs(prev => ({ ...prev, [f.key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
            <button className="btn btn-primary" onClick={addService}>Add Service</button>
          </div>
        )}

        {garage.services.length === 0 ? (
          <p className="empty">No service items yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            {garage.services.map(svc => {
              const { status: st, nextMiles, nextDate } = calcStatus(svc, garage.currentMileage);
              if (editingServiceId === svc.id) {
                return <ServiceEditRow key={svc.id} svc={svc} onSave={patch => updateService(svc.id, patch)} onCancel={() => setEditingServiceId(null)} />;
              }
              return (
                <div key={svc.id} className="row" style={{ alignItems: "flex-start", padding: "9px 8px" }}>
                  <div style={{ flexShrink: 0, marginTop: "5px", width: "8px", height: "8px", borderRadius: "50%", background: STATUS_COLOR[st] }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "13.5px", color: "var(--text)", fontWeight: 500 }}>{svc.name}</div>
                    <div style={{ fontSize: "12px", color: "var(--text-3)", marginTop: "2px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
                      {svc.intervalMiles  && <span>Every {svc.intervalMiles.toLocaleString()} mi</span>}
                      {svc.intervalMonths && <span>Every {svc.intervalMonths} mo</span>}
                      {svc.lastDate && <span>Last: {fmt(svc.lastDate)}{svc.lastMileage ? ` @ ${svc.lastMileage.toLocaleString()} mi` : ""}</span>}
                      {nextMiles && <span>Next: {nextMiles.toLocaleString()} mi</span>}
                      {nextDate  && <span>Due: {fmt(nextDate)}</span>}
                    </div>
                  </div>
                  <span style={{
                    flexShrink: 0, fontSize: "11px", fontWeight: 600,
                    color: STATUS_COLOR[st], background: STATUS_BG[st],
                    borderRadius: "99px", padding: "2px 9px",
                  }}>
                    {STATUS_LABEL[st]}
                  </span>
                  <button className="btn btn-secondary" onClick={() => setEditingServiceId(svc.id)} style={{ flexShrink: 0, fontSize: "12px", padding: "3px 10px" }}>Edit</button>
                  <button className="btn-icon" onClick={() => deleteService(svc.id)}><XIcon /></button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Repair projects */}
      <div className="card" style={{ marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
          <p className="card-title" style={{ margin: 0 }}>Self-Repair Projects</p>
          <button className="btn btn-secondary" onClick={() => setShowAddProject(v => !v)} style={{ fontSize: "12px", padding: "5px 12px" }}>
            {showAddProject ? "Cancel" : "+ Add"}
          </button>
        </div>

        {showAddProject && (
          <div style={{ background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: "6px", padding: "14px", marginBottom: "14px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "10px", marginBottom: "12px" }}>
              <div style={{ gridColumn: "1/-1" }}>
                <FieldLabel>Project name *</FieldLabel>
                <input className="input" type="text" placeholder="e.g. Replace fender liner" value={np.name} onChange={e => setNp(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <FieldLabel>Status</FieldLabel>
                <select className="input" value={np.status} onChange={e => setNp(p => ({ ...p, status: e.target.value as ProjectStatus }))}>
                  <option value="planned">Planned</option>
                  <option value="in-progress">In Progress</option>
                  <option value="done">Done</option>
                </select>
              </div>
              <div>
                <FieldLabel>Estimated cost</FieldLabel>
                <input className="input" type="text" placeholder="e.g. $185" value={np.estimatedCost} onChange={e => setNp(p => ({ ...p, estimatedCost: e.target.value }))} />
              </div>
              <div style={{ gridColumn: "1/-1" }}>
                <FieldLabel>Parts needed</FieldLabel>
                <input className="input" type="text" placeholder="Part numbers, names…" value={np.parts} onChange={e => setNp(p => ({ ...p, parts: e.target.value }))} />
              </div>
              <div style={{ gridColumn: "1/-1" }}>
                <FieldLabel>Notes</FieldLabel>
                <input className="input" type="text" placeholder="Any notes…" value={np.notes} onChange={e => setNp(p => ({ ...p, notes: e.target.value }))} />
              </div>
            </div>
            <button className="btn btn-primary" onClick={addProject}>Add Project</button>
          </div>
        )}

        {garage.projects.length === 0 ? (
          <p className="empty">No repair projects yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {garage.projects.map(proj => {
              if (editingProjectId === proj.id) {
                return <ProjectEditRow key={proj.id} proj={proj} onSave={patch => updateProject(proj.id, patch)} onCancel={() => setEditingProjectId(null)} />;
              }
              return (
                <div key={proj.id} className="row" style={{ alignItems: "flex-start", padding: "10px 8px" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "4px" }}>
                      <span style={{ fontSize: "13.5px", color: "var(--text)", fontWeight: 500 }}>{proj.name}</span>
                      <span style={{
                        fontSize: "11px", fontWeight: 600,
                        color: PROJECT_COLOR[proj.status],
                        background: PROJECT_BG[proj.status],
                        borderRadius: "99px", padding: "2px 9px",
                      }}>
                        {proj.status === "in-progress" ? "In Progress" : proj.status.charAt(0).toUpperCase() + proj.status.slice(1)}
                      </span>
                      {proj.estimatedCost && <span style={{ fontSize: "13px", color: "var(--text-2)" }}>{proj.estimatedCost}</span>}
                    </div>
                    {proj.parts && <div style={{ fontSize: "12px", color: "var(--text-3)", marginBottom: "2px" }}>Parts: {proj.parts}</div>}
                    {proj.notes && <div style={{ fontSize: "13px", color: "var(--text-2)" }}>{proj.notes}</div>}
                  </div>
                  <button className="btn btn-secondary" onClick={() => setEditingProjectId(proj.id)} style={{ flexShrink: 0, fontSize: "12px", padding: "3px 10px" }}>Edit</button>
                  <button className="btn-icon" onClick={() => deleteProject(proj.id)}><XIcon /></button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <CarDiagram />
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-3)", marginBottom: "5px", letterSpacing: "0.04em" }}>
      {children}
    </div>
  );
}

function ServiceEditRow({ svc, onSave, onCancel }: {
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
    <div style={{ background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: "6px", padding: "12px", marginBottom: "2px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: "8px", marginBottom: "10px" }}>
        {([
          { label:"Name",           key:"name",           type:"text"   },
          { label:"Interval (mi)",  key:"intervalMiles",  type:"number" },
          { label:"Interval (mo)",  key:"intervalMonths", type:"number" },
          { label:"Last date",      key:"lastDate",       type:"date"   },
          { label:"Last mileage",   key:"lastMileage",    type:"number" },
        ] as const).map(f => (
          <div key={f.key}>
            <FieldLabel>{f.label}</FieldLabel>
            <input className="input" type={f.type} value={(v as Record<string,string>)[f.key]}
              onChange={e => setV(p => ({ ...p, [f.key]: e.target.value }))} />
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: "8px" }}>
        <button className="btn btn-primary" onClick={save}>Save</button>
        <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

function ProjectEditRow({ proj, onSave, onCancel }: {
  proj: RepairProject;
  onSave: (patch: Partial<RepairProject>) => void;
  onCancel: () => void;
}) {
  const [v, setV] = useState({ ...proj });
  return (
    <div style={{ background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: "6px", padding: "12px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: "10px", marginBottom: "10px" }}>
        <div style={{ gridColumn: "1/-1" }}>
          <FieldLabel>Name</FieldLabel>
          <input className="input" value={v.name} onChange={e => setV(p => ({ ...p, name: e.target.value }))} />
        </div>
        <div>
          <FieldLabel>Status</FieldLabel>
          <select className="input" value={v.status} onChange={e => setV(p => ({ ...p, status: e.target.value as ProjectStatus }))}>
            <option value="planned">Planned</option>
            <option value="in-progress">In Progress</option>
            <option value="done">Done</option>
          </select>
        </div>
        <div>
          <FieldLabel>Cost</FieldLabel>
          <input className="input" value={v.estimatedCost} onChange={e => setV(p => ({ ...p, estimatedCost: e.target.value }))} />
        </div>
        <div style={{ gridColumn: "1/-1" }}>
          <FieldLabel>Parts</FieldLabel>
          <input className="input" value={v.parts} onChange={e => setV(p => ({ ...p, parts: e.target.value }))} />
        </div>
        <div style={{ gridColumn: "1/-1" }}>
          <FieldLabel>Notes</FieldLabel>
          <input className="input" value={v.notes} onChange={e => setV(p => ({ ...p, notes: e.target.value }))} />
        </div>
      </div>
      <div style={{ display: "flex", gap: "8px" }}>
        <button className="btn btn-primary" onClick={() => onSave(v)}>Save</button>
        <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}
