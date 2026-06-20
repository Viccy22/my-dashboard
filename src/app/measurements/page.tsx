"use client";

import { useEffect, useState, useCallback, useRef } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

type Measurement = {
  id: string;
  label: string;
  value: string;
  notes?: string;
};

type Room = {
  id: string;
  name: string;
  measurements: Measurement[];
};

type HomeMeasData = { rooms: Room[] };
type DashData     = { measurements?: HomeMeasData; [key: string]: unknown };
type SaveStatus   = "idle" | "saving" | "saved" | "error";

// ── Seed data ─────────────────────────────────────────────────────────────────

function m(label: string, value: string, notes?: string): Omit<Measurement, "id"> {
  return { label, value, notes };
}

const SEED_ROOMS: { name: string; measurements: Omit<Measurement, "id">[] }[] = [
  {
    name: "Balcony",
    measurements: [
      m("Door window pane height",     "74 in"),
      m("Door window pane width",      "33 in"),
      m("Floor to dry wall (door)",    "79.75 in"),
      m("Dry wall to dry wall width",  "72 in"),
    ],
  },
  {
    name: "Office",
    measurements: [
      m("Think Vision Monitors",  "21.25 × 12.75 in"),
      m("Desk",                   "72 × 71 in"),
      m("Computer wall width",    "122 in"),
      m("Left of door",           "67 in"),
      m("Right of door",          "27.5 in"),
      m("Left of closet",         "6 in"),
      m("Right of closet",        "77 in"),
      m("Left of window",         "30.25 in"),
      m("Right of window",        "35 in"),
      m("Window width",           "69.6 in"),
      m("Under window ledge",     "24 in"),
      m("Door height",            "39 in"),
    ],
  },
  {
    name: "Electrical",
    measurements: [
      m("Office",          "5 outlets · 2 switches"),
      m("Bathroom hall",   "1 outlet"),
      m("Bathroom",        "1 outlet · 2 switches"),
      m("Spare room",      "3 outlets · 2 switches"),
      m("Living room",     "7 outlets · 6 switches"),
      m("Bedroom",         "6 outlets · 3 switches"),
      m("Kitchen",         "8 outlets · 2 switches"),
      m("Laundry room",    "1 outlet · 1 switch"),
      m("Master bath",     "1 outlet · 2 switches"),
      m("Walk-in closet",  "0"),
      m("Hallways",        "3 switches"),
      m("Porch",           "1 outlet"),
    ],
  },
];

function seedRooms(): Room[] {
  return SEED_ROOMS.map((r, ri) => ({
    id: `seed-${ri}`,
    name: r.name,
    measurements: r.measurements.map((mm, mi) => ({ ...mm, id: `seed-${ri}-${mi}` })),
  }));
}

// ── Icons ─────────────────────────────────────────────────────────────────────

const XIcon = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M2 2l9 9M11 2l-9 9" strokeLinecap="round" />
  </svg>
);
const PencilIcon = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.4">
    <path d="M9 2l2 2-7 7H2v-2L9 2z" strokeLinejoin="round" />
  </svg>
);
const CheckIcon = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M2 7l3.5 3.5L11 3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ── Room card ─────────────────────────────────────────────────────────────────

function RoomCard({
  room,
  onUpdate,
  onDelete,
}: {
  room: Room;
  onUpdate: (r: Room) => void;
  onDelete: () => void;
}) {
  const [editingName, setEditingName]   = useState(false);
  const [nameVal,     setNameVal]       = useState(room.name);
  const [editingMId,  setEditingMId]    = useState<string | null>(null);
  const [editLabel,   setEditLabel]     = useState("");
  const [editValue,   setEditValue]     = useState("");
  const [editNotes,   setEditNotes]     = useState("");
  const [addLabel,    setAddLabel]      = useState("");
  const [addValue,    setAddValue]      = useState("");
  const [addNotes,    setAddNotes]      = useState("");
  const [adding,      setAdding]        = useState(false);

  const upd = (patch: Partial<Room>) => onUpdate({ ...room, ...patch });

  const saveName = () => {
    if (nameVal.trim()) upd({ name: nameVal.trim() });
    setEditingName(false);
  };

  const startEdit = (mm: Measurement) => {
    setEditingMId(mm.id);
    setEditLabel(mm.label);
    setEditValue(mm.value);
    setEditNotes(mm.notes ?? "");
  };

  const saveEdit = () => {
    if (!editLabel.trim()) return;
    upd({ measurements: room.measurements.map(mm =>
      mm.id === editingMId
        ? { ...mm, label: editLabel.trim(), value: editValue.trim(), notes: editNotes.trim() || undefined }
        : mm
    )});
    setEditingMId(null);
  };

  const deleteMeasurement = (id: string) => {
    upd({ measurements: room.measurements.filter(mm => mm.id !== id) });
  };

  const addMeasurement = () => {
    if (!addLabel.trim()) return;
    const mm: Measurement = {
      id: crypto.randomUUID(),
      label: addLabel.trim(),
      value: addValue.trim(),
      notes: addNotes.trim() || undefined,
    };
    upd({ measurements: [...room.measurements, mm] });
    setAddLabel(""); setAddValue(""); setAddNotes(""); setAdding(false);
  };

  return (
    <div className="card">
      {/* Room header */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
        {editingName ? (
          <>
            <input className="input" value={nameVal} onChange={e => setNameVal(e.target.value)}
              onKeyDown={e => e.key === "Enter" && saveName()}
              autoFocus style={{ flex: 1, fontWeight: 600, fontSize: "15px" }} />
            <button className="btn-icon" onClick={saveName} style={{ color: "var(--green)" }}><CheckIcon /></button>
            <button className="btn-icon" onClick={() => { setEditingName(false); setNameVal(room.name); }}><XIcon /></button>
          </>
        ) : (
          <>
            <h3 style={{ margin: 0, flex: 1, fontSize: "15px", fontWeight: 700, color: "var(--text)" }}>{room.name}</h3>
            <button className="btn-icon" onClick={() => setEditingName(true)} title="Rename room"><PencilIcon /></button>
            <button className="btn-icon" onClick={onDelete} title="Delete room" style={{ color: "var(--red)", opacity: 0.5 }}
              onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
              onMouseLeave={e => (e.currentTarget.style.opacity = "0.5")}>
              <XIcon />
            </button>
          </>
        )}
      </div>

      {/* Measurements list */}
      {room.measurements.length === 0 && !adding && (
        <p className="empty" style={{ marginBottom: "10px" }}>No measurements yet.</p>
      )}

      {room.measurements.map(mm => (
        <div key={mm.id}>
          {editingMId === mm.id ? (
            <div style={{ background: "var(--surface-raised)", borderRadius: "7px", padding: "10px", marginBottom: "6px", display: "flex", flexDirection: "column", gap: "6px" }}>
              <div style={{ display: "flex", gap: "8px" }}>
                <input className="input" placeholder="Label" value={editLabel} onChange={e => setEditLabel(e.target.value)} style={{ flex: 2 }} />
                <input className="input" placeholder="Value" value={editValue} onChange={e => setEditValue(e.target.value)} style={{ flex: 1 }} />
              </div>
              <input className="input" placeholder="Notes (optional)" value={editNotes} onChange={e => setEditNotes(e.target.value)}
                onKeyDown={e => e.key === "Enter" && saveEdit()} />
              <div style={{ display: "flex", gap: "8px" }}>
                <button className="btn btn-primary" style={{ fontSize: "12px", padding: "4px 12px" }} onClick={saveEdit}>Save</button>
                <button className="btn btn-secondary" style={{ fontSize: "12px", padding: "4px 10px" }} onClick={() => setEditingMId(null)}>Cancel</button>
              </div>
            </div>
          ) : (
            <div className="row" style={{ padding: "7px 6px" }}
              onMouseEnter={e => e.currentTarget.querySelectorAll<HTMLElement>(".row-action").forEach(el => el.style.opacity = "1")}
              onMouseLeave={e => e.currentTarget.querySelectorAll<HTMLElement>(".row-action").forEach(el => el.style.opacity = "0")}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: "13.5px", color: "var(--text-2)" }}>{mm.label}</span>
                {mm.notes && <span style={{ fontSize: "11.5px", color: "var(--text-3)", marginLeft: "8px" }}>{mm.notes}</span>}
              </div>
              <span style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--text)", fontVariantNumeric: "tabular-nums", marginRight: "8px" }}>{mm.value}</span>
              <button className="btn-icon row-action" style={{ opacity: 0, transition: "opacity 0.1s" }} onClick={() => startEdit(mm)}><PencilIcon /></button>
              <button className="btn-icon row-action" style={{ opacity: 0, transition: "opacity 0.1s" }} onClick={() => deleteMeasurement(mm.id)}><XIcon /></button>
            </div>
          )}
        </div>
      ))}

      {/* Add measurement form */}
      {adding ? (
        <div style={{ background: "var(--surface-raised)", borderRadius: "7px", padding: "10px", marginTop: "8px", display: "flex", flexDirection: "column", gap: "6px" }}>
          <div style={{ display: "flex", gap: "8px" }}>
            <input className="input" placeholder='e.g. "Window width"' value={addLabel} onChange={e => setAddLabel(e.target.value)} style={{ flex: 2 }} autoFocus />
            <input className="input" placeholder='e.g. "48 in"' value={addValue} onChange={e => setAddValue(e.target.value)} style={{ flex: 1 }} />
          </div>
          <input className="input" placeholder="Notes (optional)" value={addNotes} onChange={e => setAddNotes(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addMeasurement()} />
          <div style={{ display: "flex", gap: "8px" }}>
            <button className="btn btn-primary" style={{ fontSize: "12px", padding: "4px 12px" }} onClick={addMeasurement}>Add</button>
            <button className="btn btn-secondary" style={{ fontSize: "12px", padding: "4px 10px" }} onClick={() => { setAdding(false); setAddLabel(""); setAddValue(""); setAddNotes(""); }}>Cancel</button>
          </div>
        </div>
      ) : (
        <button className="btn btn-secondary" style={{ marginTop: "8px", fontSize: "12px", padding: "4px 12px", width: "100%" }}
          onClick={() => setAdding(true)}>
          + Add measurement
        </button>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function MeasurementsPage() {
  const [rooms,   setRooms]   = useState<Room[]>([]);
  const [status,  setStatus]  = useState<SaveStatus>("idle");
  const [loading, setLoading] = useState(true);
  const [newRoom, setNewRoom] = useState("");
  const [addingRoom, setAddingRoom] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rawDataRef = useRef<DashData>({});

  useEffect(() => {
    fetch("/api/data")
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(res => {
        const d: DashData = res.data ?? {};
        rawDataRef.current = d;
        const saved = d.measurements?.rooms;
        setRooms(saved && saved.length > 0 ? saved : seedRooms());
      })
      .catch(() => setStatus("error"))
      .finally(() => setLoading(false));
  }, []);

  const save = useCallback(async (updated: Room[]) => {
    setStatus("saving");
    if (timer.current) clearTimeout(timer.current);
    const newData = { ...rawDataRef.current, measurements: { rooms: updated } };
    rawDataRef.current = newData;
    try {
      const res = await fetch("/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: newData }),
      });
      if (!res.ok) throw new Error();
      setStatus("saved");
    } catch { setStatus("error"); }
    finally { timer.current = setTimeout(() => setStatus("idle"), 2000); }
  }, []);

  const updateRoom = (updated: Room) => {
    const next = rooms.map(r => r.id === updated.id ? updated : r);
    setRooms(next);
    save(next);
  };

  const deleteRoom = (id: string) => {
    const next = rooms.filter(r => r.id !== id);
    setRooms(next);
    save(next);
  };

  const addRoom = () => {
    if (!newRoom.trim()) return;
    const room: Room = { id: crypto.randomUUID(), name: newRoom.trim(), measurements: [] };
    const next = [...rooms, room];
    setRooms(next);
    setNewRoom(""); setAddingRoom(false);
    save(next);
  };

  if (loading) return <p className="empty" style={{ padding: "32px 0" }}>Loading…</p>;

  return (
    <div>
      {status !== "idle" && (
        <div className={`toast${status === "error" ? " error" : ""}`}>
          {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : "Could not save — check connection."}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "16px", gap: "8px", alignItems: "center" }}>
        {addingRoom ? (
          <>
            <input className="input" placeholder="Room name…" value={newRoom} autoFocus
              onChange={e => setNewRoom(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addRoom()}
              style={{ width: "200px" }} />
            <button className="btn btn-primary" onClick={addRoom}>Add</button>
            <button className="btn btn-secondary" onClick={() => { setAddingRoom(false); setNewRoom(""); }}>Cancel</button>
          </>
        ) : (
          <button className="btn btn-primary" onClick={() => setAddingRoom(true)}>+ Add room</button>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "16px", alignItems: "start" }}>
        {rooms.map(room => (
          <RoomCard
            key={room.id}
            room={room}
            onUpdate={updateRoom}
            onDelete={() => deleteRoom(room.id)}
          />
        ))}
      </div>
    </div>
  );
}
