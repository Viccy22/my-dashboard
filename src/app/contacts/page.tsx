"use client";

import { useEffect, useState, useCallback, useRef } from "react";

type Tag = "friend" | "family" | "coworker" | "acquaintance" | "other";

type Contact = {
  id: string;
  name: string;
  birthday: string;   // "MM-DD" or "" if unknown
  birthYear: string;  // "YYYY" or "" if unknown
  phone: string;
  email: string;
  tags: Tag[];
  notes: string;
};

type ContactsData = { contacts: Contact[] };
type DashData     = { contacts?: ContactsData; [key: string]: unknown };
type SaveStatus   = "idle" | "saving" | "saved" | "error";
type View         = "all" | "birthdays";
type SortBy       = "name" | "birthday";

const TAG_LABEL: Record<Tag, string> = { friend: "Friend", family: "Family", coworker: "Coworker", acquaintance: "Acquaintance", other: "Other" };
const TAG_COLOR: Record<Tag, string> = { friend: "#7c6ff7", family: "#22c55e", coworker: "#3b82f6", acquaintance: "#f59e0b", other: "#6b7280" };
const ALL_TAGS: Tag[] = ["friend", "family", "coworker", "acquaintance", "other"];

function todayMMDD()  { return new Date().toISOString().slice(5, 10); } // "MM-DD"

function daysUntilBirthday(mmdd: string): number {
  if (!mmdd) return 9999;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const [m, d] = mmdd.split("-").map(Number);
  let next = new Date(today.getFullYear(), m - 1, d);
  if (next < today) next = new Date(today.getFullYear() + 1, m - 1, d);
  return Math.round((next.getTime() - today.getTime()) / 86400000);
}

function fmtBirthday(mmdd: string, birthYear: string): string {
  if (!mmdd) return "";
  const [m, d] = mmdd.split("-").map(Number);
  const dateStr = new Date(2000, m - 1, d).toLocaleDateString("en-US", { month: "long", day: "numeric" });
  if (birthYear) {
    const age = new Date().getFullYear() - parseInt(birthYear);
    return `${dateStr} (turns ${age})`;
  }
  return dateStr;
}

function getAge(mmdd: string, birthYear: string): number | null {
  if (!birthYear || !mmdd) return null;
  const today = new Date();
  const [m, d] = mmdd.split("-").map(Number);
  let age = today.getFullYear() - parseInt(birthYear);
  if (today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d)) age--;
  return age;
}

function blankContact(): Omit<Contact, "id"> {
  return { name: "", birthday: "", birthYear: "", phone: "", email: "", tags: [], notes: "" };
}

function ContactForm({
  initial, onSave, onCancel,
}: {
  initial: Omit<Contact, "id">;
  onSave: (c: Omit<Contact, "id">) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState(initial);
  const f = form;

  const toggleTag = (t: Tag) => setForm(x => ({ ...x, tags: x.tags.includes(t) ? x.tags.filter(tt => tt !== t) : [...x.tags, t] }));

  return (
    <div className="card" style={{ marginBottom: "16px" }}>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "10px" }}>
        <div style={{ flex: "2 1 160px" }}>
          <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "3px" }}>Name *</label>
          <input className="input" value={f.name} autoFocus onChange={e => setForm(x => ({ ...x, name: e.target.value }))} placeholder="Full name" />
        </div>
        <div style={{ flex: "1 1 120px" }}>
          <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "3px" }}>Birthday (MM-DD)</label>
          <input className="input" value={f.birthday} onChange={e => setForm(x => ({ ...x, birthday: e.target.value }))} placeholder="07-15" maxLength={5} />
        </div>
        <div style={{ flex: "1 1 100px" }}>
          <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "3px" }}>Birth year</label>
          <input className="input" value={f.birthYear} onChange={e => setForm(x => ({ ...x, birthYear: e.target.value }))} placeholder="1998" maxLength={4} />
        </div>
      </div>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "10px" }}>
        <div style={{ flex: "1 1 140px" }}>
          <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "3px" }}>Phone</label>
          <input className="input" value={f.phone} onChange={e => setForm(x => ({ ...x, phone: e.target.value }))} placeholder="(555) 000-0000" />
        </div>
        <div style={{ flex: "2 1 180px" }}>
          <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "3px" }}>Email</label>
          <input className="input" type="email" value={f.email} onChange={e => setForm(x => ({ ...x, email: e.target.value }))} placeholder="name@email.com" />
        </div>
      </div>
      <div style={{ marginBottom: "10px" }}>
        <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "6px" }}>Tags</label>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {ALL_TAGS.map(t => (
            <button key={t} onClick={() => toggleTag(t)}
              style={{ fontSize: "12px", padding: "3px 10px", borderRadius: "99px", border: "none", cursor: "pointer", background: f.tags.includes(t) ? TAG_COLOR[t] : "var(--surface-raised)", color: f.tags.includes(t) ? "white" : "var(--text-2)", fontWeight: f.tags.includes(t) ? 700 : 400, transition: "all 0.1s" }}>
              {TAG_LABEL[t]}
            </button>
          ))}
        </div>
      </div>
      <div style={{ marginBottom: "12px" }}>
        <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "3px" }}>Notes</label>
        <input className="input" value={f.notes} onChange={e => setForm(x => ({ ...x, notes: e.target.value }))} placeholder="How you know them, anything to remember…" />
      </div>
      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        <button className="btn btn-primary" onClick={() => {
          if (!f.name.trim()) return;
          if (f.birthday) {
            const parts = f.birthday.split("-").map(Number);
            if (f.birthday.length !== 5 || parts.length !== 2 || parts[0] < 1 || parts[0] > 12 || parts[1] < 1 || parts[1] > 31) {
              alert("Birthday must be in MM-DD format, e.g. 07-15");
              return;
            }
          }
          onSave(f);
        }}>Save</button>
        <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

export default function ContactsPage() {
  const [rawData,   setRawData]   = useState<DashData>({});
  const [contacts,  setContacts]  = useState<Contact[]>([]);
  const [status,    setStatus]    = useState<SaveStatus>("idle");
  const [loading,   setLoading]   = useState(true);
  const [view,      setView]      = useState<View>("all");
  const [sortBy,    setSortBy]    = useState<SortBy>("name");
  const [adding,    setAdding]    = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search,    setSearch]    = useState("");
  const [filterTag, setFilterTag] = useState<Tag | "">("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const today = todayMMDD();

  useEffect(() => {
    fetch("/api/data")
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(res => {
        const d: DashData = res.data ?? {};
        setRawData(d);
        setContacts(d.contacts?.contacts ?? []);
      })
      .catch(() => setStatus("error"))
      .finally(() => setLoading(false));
  }, []);

  const persist = useCallback((updated: Contact[]) => {
    setStatus("saving");
    if (timer.current) clearTimeout(timer.current);
    const newData = { ...rawData, contacts: { contacts: updated } };
    setRawData(newData);
    fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data: newData }) })
      .then(r => { if (!r.ok) throw new Error(); setStatus("saved"); })
      .catch(() => setStatus("error"))
      .finally(() => { timer.current = setTimeout(() => setStatus("idle"), 2000); });
  }, [rawData]);

  const addContact = (form: Omit<Contact, "id">) => {
    const c: Contact = { ...form, id: crypto.randomUUID() };
    const upd = [...contacts, c].sort((a, b) => a.name.localeCompare(b.name));
    setContacts(upd); persist(upd); setAdding(false);
  };

  const updateContact = (id: string, form: Omit<Contact, "id">) => {
    const upd = contacts.map(c => c.id === id ? { ...form, id } : c).sort((a, b) => a.name.localeCompare(b.name));
    setContacts(upd); persist(upd); setEditingId(null);
  };

  const deleteContact = (id: string) => {
    const upd = contacts.filter(c => c.id !== id);
    setContacts(upd); persist(upd); setEditingId(null);
  };

  if (loading) return <p className="empty" style={{ padding: "32px 0" }}>Loading…</p>;

  const todayBirthdays = contacts.filter(c => c.birthday === today);
  const upcomingBirthdays = contacts
    .filter(c => c.birthday && c.birthday !== today)
    .map(c => ({ ...c, daysUntil: daysUntilBirthday(c.birthday) }))
    .filter(c => c.daysUntil <= 30)
    .sort((a, b) => a.daysUntil - b.daysUntil);

  let displayContacts = [...contacts];
  if (search.trim()) displayContacts = displayContacts.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.notes.toLowerCase().includes(search.toLowerCase()));
  if (filterTag)     displayContacts = displayContacts.filter(c => c.tags.includes(filterTag));
  if (sortBy === "birthday") {
    displayContacts = displayContacts.filter(c => c.birthday).sort((a, b) => daysUntilBirthday(a.birthday) - daysUntilBirthday(b.birthday));
    const noBday = contacts.filter(c => !c.birthday && (!search || c.name.toLowerCase().includes(search.toLowerCase())));
    displayContacts = [...displayContacts, ...noBday];
  }

  return (
    <div style={{ maxWidth: "720px" }}>
      {status !== "idle" && (
        <div className={`toast${status === "error" ? " error" : ""}`}>
          {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : "Error saving."}
        </div>
      )}

      {/* Today's birthdays banner */}
      {todayBirthdays.length > 0 && (
        <div style={{ background: "linear-gradient(135deg, #f59e0b22, #ec489922)", border: "1px solid #f59e0b44", borderRadius: "12px", padding: "14px 18px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "28px" }}>🎂</span>
          <div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: "15px" }}>
              {todayBirthdays.map(c => c.name).join(" & ")} {todayBirthdays.length === 1 ? "has" : "have"} a birthday today!
            </p>
            <p style={{ margin: "2px 0 0", fontSize: "12.5px", color: "var(--text-2)" }}>
              {todayBirthdays.map(c => {
                const age = getAge(c.birthday, c.birthYear);
                return age ? `${c.name} turns ${age}` : c.name;
              }).join(" · ")}
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
        <div style={{ display: "flex", border: "1px solid var(--border)", borderRadius: "8px", overflow: "hidden" }}>
          {(["all", "birthdays"] as View[]).map(v => (
            <button key={v} onClick={() => setView(v)}
              style={{ padding: "5px 16px", fontSize: "12.5px", fontWeight: 600, border: "none", cursor: "pointer", background: view === v ? "var(--accent)" : "transparent", color: view === v ? "white" : "var(--text-2)", transition: "all 0.1s" }}>
              {v === "all" ? `All (${contacts.length})` : "Birthdays 🎂"}
            </button>
          ))}
        </div>
        <button className="btn btn-primary" style={{ fontSize: "12.5px", padding: "5px 14px" }} onClick={() => { setAdding(true); setEditingId(null); }}>+ Add contact</button>
      </div>

      {adding && <ContactForm initial={blankContact()} onSave={addContact} onCancel={() => setAdding(false)} />}

      {/* ── ALL CONTACTS VIEW ── */}
      {view === "all" && (
        <>
          {/* Search + filter */}
          <div style={{ display: "flex", gap: "8px", marginBottom: "14px", flexWrap: "wrap" }}>
            <input className="input" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search contacts…" style={{ flex: "1 1 180px", minWidth: 0 }} />
            <select className="input" value={filterTag} onChange={e => setFilterTag(e.target.value as Tag | "")}
              style={{ flex: "0 0 auto" }}>
              <option value="">All tags</option>
              {ALL_TAGS.map(t => <option key={t} value={t}>{TAG_LABEL[t]}</option>)}
            </select>
            <select className="input" value={sortBy} onChange={e => setSortBy(e.target.value as SortBy)}
              style={{ flex: "0 0 auto" }}>
              <option value="name">Sort: Name</option>
              <option value="birthday">Sort: Upcoming birthday</option>
            </select>
          </div>

          {displayContacts.length === 0 ? (
            <p className="empty">{contacts.length === 0 ? "No contacts yet. Add one above." : "No matches."}</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {displayContacts.map(contact => {
                const isEditing = editingId === contact.id;
                const days = contact.birthday ? daysUntilBirthday(contact.birthday) : null;
                const isBdayToday = contact.birthday === today;
                const age = getAge(contact.birthday, contact.birthYear);
                if (isEditing) {
                  return (
                    <div key={contact.id}>
                      <ContactForm
                        initial={{ name: contact.name, birthday: contact.birthday, birthYear: contact.birthYear, phone: contact.phone, email: contact.email, tags: contact.tags, notes: contact.notes }}
                        onSave={form => updateContact(contact.id, form)}
                        onCancel={() => setEditingId(null)}
                      />
                      <button className="btn btn-secondary" style={{ fontSize: "12px", color: "var(--red)", marginTop: "-8px", marginBottom: "8px" }} onClick={() => deleteContact(contact.id)}>Delete contact</button>
                    </div>
                  );
                }
                return (
                  <div key={contact.id} className="card" style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                      {/* Avatar */}
                      <div style={{ width: "38px", height: "38px", borderRadius: "50%", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "15px", fontWeight: 700, color: "white" }}>
                        {contact.name.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                          <span style={{ fontSize: "14.5px", fontWeight: 600 }}>{contact.name}</span>
                          {isBdayToday && <span style={{ fontSize: "13px" }}>🎂</span>}
                          {contact.tags.map(t => (
                            <span key={t} style={{ fontSize: "10.5px", fontWeight: 700, padding: "2px 7px", borderRadius: "99px", background: TAG_COLOR[t] + "22", color: TAG_COLOR[t] }}>
                              {TAG_LABEL[t]}
                            </span>
                          ))}
                        </div>
                        <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", marginTop: "4px" }}>
                          {contact.birthday && (
                            <span style={{ fontSize: "12px", color: isBdayToday ? "#f59e0b" : days !== null && days <= 7 ? "var(--accent-text)" : "var(--text-3)" }}>
                              🎂 {fmtBirthday(contact.birthday, contact.birthYear)}{age !== null ? ` · age ${age}` : ""}
                              {!isBdayToday && days !== null && days <= 30 && <span style={{ marginLeft: "6px", fontWeight: 700 }}>({days === 0 ? "today!" : `${days}d`})</span>}
                            </span>
                          )}
                          {contact.phone && <span style={{ fontSize: "12px", color: "var(--text-3)" }}>📱 {contact.phone}</span>}
                          {contact.email && <span style={{ fontSize: "12px", color: "var(--text-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>✉️ {contact.email}</span>}
                        </div>
                        {contact.notes && <p style={{ fontSize: "12px", color: "var(--text-3)", margin: "4px 0 0", fontStyle: "italic" }}>{contact.notes}</p>}
                      </div>
                      <button className="btn-icon" onClick={() => setEditingId(contact.id)} style={{ flexShrink: 0 }}>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4">
                          <path d="M2 10.5l1.5-1.5 7-7 1.5 1.5-7 7-1.5 1.5H2v-1.5z" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── BIRTHDAYS VIEW ── */}
      {view === "birthdays" && (
        <div>
          {/* Today */}
          {todayBirthdays.length > 0 && (
            <div style={{ marginBottom: "20px" }}>
              <p style={{ fontSize: "11px", fontWeight: 700, color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>🎂 Today</p>
              {todayBirthdays.map(c => {
                const age = getAge(c.birthday, c.birthYear);
                return (
                  <div key={c.id} className="card" style={{ marginBottom: "8px", border: "1px solid #f59e0b44", background: "#f59e0b0a" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ fontSize: "24px" }}>🎂</span>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: "14.5px" }}>{c.name}</p>
                        <p style={{ margin: "2px 0 0", fontSize: "12px", color: "var(--text-2)" }}>
                          {age ? `Turns ${age} today` : "Birthday today!"}
                          {c.phone && ` · 📱 ${c.phone}`}
                        </p>
                      </div>
                      <div style={{ display: "flex", gap: "4px" }}>
                        <button className="btn btn-secondary" style={{ fontSize: "11px", padding: "2px 8px" }} onClick={() => { setView("all"); setEditingId(c.id); }}>Edit</button>
                        <button className="btn btn-secondary" style={{ fontSize: "11px", padding: "2px 8px", color: "var(--red)" }} onClick={() => { if (confirm(`Delete ${c.name}?`)) deleteContact(c.id); }}>Delete</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Upcoming 30 days */}
          {upcomingBirthdays.length > 0 && (
            <div style={{ marginBottom: "20px" }}>
              <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>Next 30 days</p>
              {upcomingBirthdays.map(c => {
                const age = getAge(c.birthday, c.birthYear);
                return (
                  <div key={c.id} className="card" style={{ marginBottom: "8px", padding: "10px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div style={{ width: "34px", height: "34px", borderRadius: "50%", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: 700, color: "white", flexShrink: 0 }}>
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: "13.5px" }}>{c.name}</p>
                        <p style={{ margin: "2px 0 0", fontSize: "11.5px", color: "var(--text-3)" }}>
                          {fmtBirthday(c.birthday, c.birthYear)}{age !== null ? ` · turns ${age}` : ""}
                        </p>
                      </div>
                      <span style={{ fontSize: "12.5px", fontWeight: 700, color: c.daysUntil <= 7 ? "var(--accent-text)" : "var(--text-3)", flexShrink: 0, marginRight: "8px" }}>
                        {c.daysUntil === 1 ? "Tomorrow" : `${c.daysUntil}d`}
                      </span>
                      <div style={{ display: "flex", gap: "4px" }}>
                        <button className="btn btn-secondary" style={{ fontSize: "11px", padding: "2px 8px" }} onClick={() => { setView("all"); setEditingId(c.id); }}>Edit</button>
                        <button className="btn btn-secondary" style={{ fontSize: "11px", padding: "2px 8px", color: "var(--red)" }} onClick={() => { if (confirm(`Delete ${c.name}?`)) deleteContact(c.id); }}>Delete</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* All contacts with birthdays */}
          {(() => {
            const rest = contacts.filter(c => c.birthday && c.birthday !== today && (daysUntilBirthday(c.birthday) > 30))
              .sort((a, b) => daysUntilBirthday(a.birthday) - daysUntilBirthday(b.birthday));
            const noBday = contacts.filter(c => !c.birthday).sort((a, b) => a.name.localeCompare(b.name));
            if (!rest.length && !noBday.length) return null;
            return (
              <div>
                <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>Coming up</p>
                {rest.map(c => {
                  const age = getAge(c.birthday, c.birthYear);
                  const days = daysUntilBirthday(c.birthday);
                  return (
                    <div key={c.id} className="card" style={{ marginBottom: "6px", padding: "8px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{ flex: 1 }}>
                          <span style={{ fontSize: "13.5px", fontWeight: 600 }}>{c.name}</span>
                          <span style={{ fontSize: "12px", color: "var(--text-3)", marginLeft: "10px" }}>
                            {fmtBirthday(c.birthday, c.birthYear)}{age !== null ? ` · turns ${age}` : ""}
                          </span>
                        </div>
                        <span style={{ fontSize: "12px", color: "var(--text-3)", flexShrink: 0, marginRight: "8px" }}>{days}d</span>
                        <button className="btn btn-secondary" style={{ fontSize: "11px", padding: "2px 8px" }} onClick={() => { setView("all"); setEditingId(c.id); }}>Edit</button>
                        <button className="btn btn-secondary" style={{ fontSize: "11px", padding: "2px 8px", color: "var(--red)" }} onClick={() => { if (confirm(`Delete ${c.name}?`)) deleteContact(c.id); }}>Delete</button>
                      </div>
                    </div>
                  );
                })}
                {noBday.length > 0 && (
                  <>
                    <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", margin: "16px 0 8px" }}>No birthday saved</p>
                    {noBday.map(c => (
                      <div key={c.id} className="card" style={{ marginBottom: "6px", padding: "8px 14px" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <span style={{ fontSize: "13.5px", fontWeight: 600 }}>{c.name}</span>
                          <button className="btn btn-secondary" style={{ fontSize: "11px", padding: "2px 8px" }} onClick={() => { setView("all"); setEditingId(c.id); }}>Add birthday</button>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            );
          })()}

          {contacts.length === 0 && <p className="empty">No contacts yet. Go to All contacts to add some.</p>}
        </div>
      )}
    </div>
  );
}
