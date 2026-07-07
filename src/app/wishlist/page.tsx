"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

type WishCategory =
  | "clothing" | "shoes" | "bags" | "jewelry" | "beauty" | "fragrance"
  | "skincare" | "home_decor" | "books" | "tech" | "fitness" | "food" | "other";

type WishPriority = "want_badly" | "want" | "nice_to_have";
type WishStatus   = "want" | "purchased" | "passed";

type WishItem = {
  id: string;
  name: string;
  brand: string;
  category: WishCategory;
  priority: WishPriority;
  status: WishStatus;
  price: number;
  link: string;
  notes: string;
  color: string;
  size: string;
  addedAt: string;
  purchasedAt: string;
};

type WishlistData = { items: WishItem[] };
type DashData = { wishlist?: WishlistData; [key: string]: unknown };
type SaveStatus = "idle" | "saving" | "saved" | "error";

// ── Meta ──────────────────────────────────────────────────────────────────────

const CAT_META: Record<WishCategory, { label: string; emoji: string }> = {
  clothing:   { label: "Clothing",    emoji: "👗" },
  shoes:      { label: "Shoes",       emoji: "👟" },
  bags:       { label: "Bags",        emoji: "👜" },
  jewelry:    { label: "Jewelry",     emoji: "💍" },
  beauty:     { label: "Beauty",      emoji: "💄" },
  fragrance:  { label: "Fragrance",   emoji: "🌸" },
  skincare:   { label: "Skincare",    emoji: "✨" },
  home_decor: { label: "Home Decor",  emoji: "🕯️" },
  books:      { label: "Books",       emoji: "📚" },
  tech:       { label: "Tech",        emoji: "📱" },
  fitness:    { label: "Fitness",     emoji: "🏃" },
  food:       { label: "Food & Drink",emoji: "🍫" },
  other:      { label: "Other",       emoji: "🛍️" },
};

const PRI_META: Record<WishPriority, { label: string; color: string }> = {
  want_badly:   { label: "Really Want",    color: "var(--red)"    },
  want:         { label: "Want",           color: "var(--yellow)" },
  nice_to_have: { label: "Nice to Have",  color: "var(--text-3)" },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayStr() { return new Date().toISOString().slice(0, 10); }
function fmt$(n: number) { return n > 0 ? "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0 }) : ""; }

function blankItem(): Omit<WishItem, "id" | "addedAt"> {
  return { name: "", brand: "", category: "clothing", priority: "want", status: "want", price: 0, link: "", notes: "", color: "", size: "", purchasedAt: "" };
}

// ── Icons ─────────────────────────────────────────────────────────────────────

const PlusIcon  = () => <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M6.5 2v9M2 6.5h9" /></svg>;
const XIcon     = () => <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M2 2l9 9M11 2l-9 9" /></svg>;
const TrashIcon = () => <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M2 3.5h9M5 3.5V2h3v1.5M4 3.5l.5 7h4l.5-7" strokeLinejoin="round" /></svg>;
const CheckIcon = () => <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 7l3 3 6-6" /></svg>;
const LinkIcon  = () => <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M4.5 2H2v7h7V6.5" /><path d="M6 1h4v4" /><path d="M4.5 6.5L9.5 1.5" /></svg>;

// ── Item form (modal) ─────────────────────────────────────────────────────────

function ItemForm({ item, onSave, onClose }: {
  item: Partial<WishItem>;
  onSave: (data: Omit<WishItem, "id" | "addedAt">) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Omit<WishItem, "id" | "addedAt">>({ ...blankItem(), ...item });
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm(p => ({ ...p, [k]: v }));
  const inp = { className: "input", style: { fontSize: "13px" } };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "flex-end" }}>
      <div style={{ flex: 1, background: "rgba(0,0,0,0.55)", position: "absolute", inset: 0 }} onClick={onClose} />
      <div style={{ position: "relative", width: "100%", maxWidth: "480px", margin: "0 auto", background: "var(--surface)", borderRadius: "12px 12px 0 0", borderTop: "1px solid var(--border)", padding: "20px", display: "flex", flexDirection: "column", gap: "12px", maxHeight: "88vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0, fontSize: "15px", fontWeight: 600 }}>{item.id ? "Edit" : "Add to Wishlist"}</h2>
          <button className="btn-icon" onClick={onClose}><XIcon /></button>
        </div>

        <div>
          <label style={{ fontSize: "11.5px", color: "var(--text-3)", display: "block", marginBottom: "4px" }}>Item *</label>
          <input {...inp} placeholder="e.g. Floral Midi Dress" value={form.name} onChange={e => set("name", e.target.value)} autoFocus />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <div>
            <label style={{ fontSize: "11.5px", color: "var(--text-3)", display: "block", marginBottom: "4px" }}>Brand</label>
            <input {...inp} placeholder="e.g. Zara, Chanel" value={form.brand} onChange={e => set("brand", e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: "11.5px", color: "var(--text-3)", display: "block", marginBottom: "4px" }}>Price</label>
            <div style={{ display: "flex", alignItems: "center", background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: "6px", padding: "0 10px" }}>
              <span style={{ color: "var(--text-3)", marginRight: "4px", fontSize: "13px" }}>$</span>
              <input type="number" step="0.01" min="0" placeholder="0" style={{ background: "none", border: "none", outline: "none", color: "var(--text)", fontFamily: "inherit", fontSize: "13px", padding: "8px 0", width: "100%" }} value={form.price || ""} onChange={e => set("price", parseFloat(e.target.value) || 0)} />
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <div>
            <label style={{ fontSize: "11.5px", color: "var(--text-3)", display: "block", marginBottom: "4px" }}>Category</label>
            <select {...inp} value={form.category} onChange={e => set("category", e.target.value as WishCategory)}>
              {(Object.keys(CAT_META) as WishCategory[]).map(c => <option key={c} value={c}>{CAT_META[c].emoji} {CAT_META[c].label}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: "11.5px", color: "var(--text-3)", display: "block", marginBottom: "4px" }}>How bad do you want it?</label>
            <select {...inp} value={form.priority} onChange={e => set("priority", e.target.value as WishPriority)}>
              {(Object.keys(PRI_META) as WishPriority[]).map(p => <option key={p} value={p}>{PRI_META[p].label}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <div>
            <label style={{ fontSize: "11.5px", color: "var(--text-3)", display: "block", marginBottom: "4px" }}>Color / Shade</label>
            <input {...inp} placeholder="e.g. Dusty Rose" value={form.color} onChange={e => set("color", e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: "11.5px", color: "var(--text-3)", display: "block", marginBottom: "4px" }}>Size / Shade #</label>
            <input {...inp} placeholder="e.g. M, 8.5, 420" value={form.size} onChange={e => set("size", e.target.value)} />
          </div>
        </div>

        <div>
          <label style={{ fontSize: "11.5px", color: "var(--text-3)", display: "block", marginBottom: "4px" }}>Link</label>
          <input {...inp} placeholder="Paste product URL" value={form.link} onChange={e => set("link", e.target.value)} />
        </div>

        <div>
          <label style={{ fontSize: "11.5px", color: "var(--text-3)", display: "block", marginBottom: "4px" }}>Notes</label>
          <textarea className="input" placeholder="Why you want it, where you saw it, gift idea, wait for sale…" value={form.notes} onChange={e => set("notes", e.target.value)} style={{ minHeight: "70px", fontSize: "13px", resize: "vertical" }} />
        </div>

        <div style={{ display: "flex", gap: "8px", paddingTop: "4px" }}>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => { if (!form.name.trim()) return; onSave(form); }}>
            {item.id ? "Save" : "Add to List"}
          </button>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Item card ─────────────────────────────────────────────────────────────────

function WishCard({ item, onEdit, onBought, onPass, onDelete }: {
  item: WishItem;
  onEdit: () => void;
  onBought: () => void;
  onPass: () => void;
  onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pm = PRI_META[item.priority];
  const cm = CAT_META[item.category];
  const isPurchased = item.status === "purchased";
  const isPassed    = item.status === "passed";

  return (
    <div className="card" style={{ opacity: isPassed ? 0.45 : 1, position: "relative", overflow: "visible" }}>
      {isPurchased && (
        <div style={{ position: "absolute", top: "10px", right: "10px", background: "var(--green-dim)", color: "var(--green)", borderRadius: "5px", fontSize: "11px", padding: "2px 8px", fontWeight: 600 }}>Got it ✓</div>
      )}

      <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
        {/* Category dot */}
        <div style={{ fontSize: "20px", lineHeight: 1, paddingTop: "2px", flexShrink: 0 }}>{cm.emoji}</div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", marginBottom: "2px" }}>
            <span style={{ fontSize: "14px", fontWeight: 600, color: isPurchased ? "var(--text-3)" : "var(--text)", textDecoration: isPurchased ? "line-through" : "none", flex: 1 }}>{item.name}</span>
          </div>

          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center", marginBottom: "6px" }}>
            {item.brand && <span style={{ fontSize: "12px", color: "var(--text-3)" }}>{item.brand}</span>}
            {item.brand && <span style={{ fontSize: "12px", color: "var(--border-strong)" }}>·</span>}
            <span style={{ fontSize: "12px", color: "var(--text-3)" }}>{cm.label}</span>
            {!isPurchased && !isPassed && (
              <><span style={{ fontSize: "12px", color: "var(--border-strong)" }}>·</span>
              <span style={{ fontSize: "11.5px", color: pm.color, fontWeight: 600 }}>{pm.label}</span></>
            )}
            {item.color && <><span style={{ fontSize: "12px", color: "var(--border-strong)" }}>·</span><span style={{ fontSize: "12px", color: "var(--text-3)" }}>{item.color}</span></>}
            {item.size  && <><span style={{ fontSize: "12px", color: "var(--border-strong)" }}>·</span><span style={{ fontSize: "12px", color: "var(--text-3)" }}>Size {item.size}</span></>}
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
            {item.price > 0 && <span style={{ fontSize: "15px", fontWeight: 700, color: isPurchased ? "var(--text-3)" : "var(--text)" }}>{fmt$(item.price)}</span>}
            {item.link && (
              <a href={item.link} target="_blank" rel="noopener noreferrer" style={{ fontSize: "12px", color: "var(--accent-text)", display: "flex", alignItems: "center", gap: "3px", textDecoration: "none" }}>
                <LinkIcon /> View
              </a>
            )}
            {item.purchasedAt && <span style={{ fontSize: "11.5px", color: "var(--green)" }}>Bought {item.purchasedAt}</span>}
          </div>

          {item.notes && <p style={{ margin: "6px 0 0", fontSize: "12.5px", color: "var(--text-3)", lineHeight: 1.5 }}>{item.notes}</p>}
        </div>

        {/* Actions */}
        {!isPurchased && !isPassed && (
          <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
            <button className="btn-icon" title="Mark as bought" onClick={onBought} style={{ color: "var(--green)" }}><CheckIcon /></button>
            <div style={{ position: "relative" }}>
              <button className="btn-icon" onClick={() => setMenuOpen(p => !p)} style={{ fontSize: "15px", lineHeight: 1 }}>⋯</button>
              {menuOpen && (
                <div style={{ position: "absolute", right: 0, top: "28px", background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: "7px", padding: "4px", minWidth: "130px", zIndex: 10, boxShadow: "0 4px 16px rgba(0,0,0,0.4)" }}
                  onMouseLeave={() => setMenuOpen(false)}>
                  <button className="btn-ghost" style={{ width: "100%", justifyContent: "flex-start", fontSize: "13px", padding: "6px 10px" }} onClick={() => { setMenuOpen(false); onEdit(); }}>Edit</button>
                  <button className="btn-ghost" style={{ width: "100%", justifyContent: "flex-start", fontSize: "13px", padding: "6px 10px" }} onClick={() => { setMenuOpen(false); onPass(); }}>Not anymore</button>
                  <div style={{ height: "1px", background: "var(--border)", margin: "4px 0" }} />
                  <button className="btn-ghost" style={{ width: "100%", justifyContent: "flex-start", fontSize: "13px", padding: "6px 10px", color: "var(--red)" }} onClick={() => { setMenuOpen(false); if (confirm("Delete?")) onDelete(); }}><TrashIcon /> Delete</button>
                </div>
              )}
            </div>
          </div>
        )}
        {(isPurchased || isPassed) && (
          <button className="btn-icon" style={{ color: "var(--text-3)" }} onClick={() => { if (confirm("Delete?")) onDelete(); }}><TrashIcon /></button>
        )}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

type TabFilter = "all" | "want_badly" | "by_category" | "purchased";

export default function WishlistPage() {
  const rawRef = useRef<DashData>({});
  const [items, setItems] = useState<WishItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const statusTimer = useRef<ReturnType<typeof setTimeout>>();

  const [tab, setTab] = useState<TabFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<WishCategory | "">("");
  const [formItem, setFormItem] = useState<Partial<WishItem> | null>(null);

  // ── Persist ────────────────────────────────────────────────────────────

  const save = useCallback((next: WishItem[]) => {
    const newData = { ...rawRef.current, wishlist: { items: next } };
    rawRef.current = newData;
    setSaveStatus("saving");
    fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data: newData }) })
      .then(r => r.ok ? setSaveStatus("saved") : setSaveStatus("error"))
      .catch(() => setSaveStatus("error"))
      .finally(() => { clearTimeout(statusTimer.current); statusTimer.current = setTimeout(() => setSaveStatus("idle"), 2000); });
  }, []);

  // ── Load ───────────────────────────────────────────────────────────────

  useEffect(() => {
    fetch("/api/data").then(r => r.json()).then(({ data: d }) => {
      rawRef.current = d ?? {};
      const saved = d?.wishlist as WishlistData | undefined;
      if (saved?.items) setItems(saved.items);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  // ── CRUD ───────────────────────────────────────────────────────────────

  const addItem = (form: Omit<WishItem, "id" | "addedAt">) => {
    const next = [...items, { ...form, id: crypto.randomUUID(), addedAt: todayStr() }];
    setItems(next); save(next); setFormItem(null);
  };

  const editItem = (id: string, form: Omit<WishItem, "id" | "addedAt">) => {
    const next = items.map(i => i.id === id ? { ...i, ...form } : i);
    setItems(next); save(next); setFormItem(null);
  };

  const markBought = (id: string) => {
    const next = items.map(i => i.id === id ? { ...i, status: "purchased" as WishStatus, purchasedAt: todayStr() } : i);
    setItems(next); save(next);
  };

  const markPassed = (id: string) => {
    const next = items.map(i => i.id === id ? { ...i, status: "passed" as WishStatus } : i);
    setItems(next); save(next);
  };

  const deleteItem = (id: string) => {
    const next = items.filter(i => i.id !== id);
    setItems(next); save(next);
  };

  // ── Filtered view ──────────────────────────────────────────────────────

  const visible = useMemo(() => {
    let list = [...items];

    if (tab === "all")        list = list.filter(i => i.status === "want");
    if (tab === "want_badly") list = list.filter(i => i.status === "want" && i.priority === "want_badly");
    if (tab === "by_category")list = list.filter(i => i.status === "want" && (!categoryFilter || i.category === categoryFilter));
    if (tab === "purchased")  list = list.filter(i => i.status === "purchased" || i.status === "passed");

    // Sort: really want first, then by addedAt desc
    const priOrder: Record<WishPriority, number> = { want_badly: 0, want: 1, nice_to_have: 2 };
    return list.sort((a, b) => {
      if (tab === "purchased") return (b.purchasedAt ?? "").localeCompare(a.purchasedAt ?? "");
      return priOrder[a.priority] - priOrder[b.priority] || b.addedAt.localeCompare(a.addedAt);
    });
  }, [items, tab, categoryFilter]);

  // Stats
  const activeItems = items.filter(i => i.status === "want");
  const totalWant   = activeItems.reduce((s, i) => s + i.price, 0);
  const boughtCount = items.filter(i => i.status === "purchased").length;

  if (loading) return <div className="page" style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-3)" }}>Loading…</div>;

  return (
    <div className="page">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h1 style={{ margin: 0, fontSize: "20px", fontWeight: 600 }}>Wishlist</h1>
            <span style={{ fontSize: "11px", color: "var(--text-3)" }}>
              {saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? "Saved ✓" : saveStatus === "error" ? "Error" : ""}
            </span>
          </div>
          <p style={{ margin: "2px 0 0", fontSize: "13px", color: "var(--text-3)" }}>Things you want — clothes, perfume, beauty, and everything else.</p>
        </div>
        <button className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: "5px" }} onClick={() => setFormItem({})}>
          <PlusIcon /> Add
        </button>
      </div>

      {/* Quick stats */}
      {activeItems.length > 0 && (
        <div style={{ display: "flex", gap: "16px", marginBottom: "18px", flexWrap: "wrap" }}>
          <div style={{ background: "var(--surface-raised)", borderRadius: "7px", padding: "10px 16px" }}>
            <p style={{ margin: "0 0 2px", fontSize: "11px", color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Wishlist</p>
            <p style={{ margin: 0, fontSize: "18px", fontWeight: 700 }}>{activeItems.length} item{activeItems.length !== 1 ? "s" : ""}</p>
          </div>
          {totalWant > 0 && (
            <div style={{ background: "var(--surface-raised)", borderRadius: "7px", padding: "10px 16px" }}>
              <p style={{ margin: "0 0 2px", fontSize: "11px", color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Total Value</p>
              <p style={{ margin: 0, fontSize: "18px", fontWeight: 700 }}>{fmt$(totalWant)}</p>
            </div>
          )}
          {boughtCount > 0 && (
            <div style={{ background: "var(--green-dim)", borderRadius: "7px", padding: "10px 16px" }}>
              <p style={{ margin: "0 0 2px", fontSize: "11px", color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Got</p>
              <p style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "var(--green)" }}>{boughtCount}</p>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: "4px", marginBottom: "14px", flexWrap: "wrap", alignItems: "center" }}>
        {([
          { key: "all",         label: "All" },
          { key: "want_badly",  label: "Really Want" },
          { key: "by_category", label: "By Category" },
          { key: "purchased",   label: "Got / Passed" },
        ] as { key: TabFilter; label: string }[]).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ background: tab === t.key ? "var(--accent-dim)" : "var(--surface-raised)", color: tab === t.key ? "var(--accent-text)" : "var(--text-3)", border: `1px solid ${tab === t.key ? "var(--accent)" : "var(--border)"}`, borderRadius: "6px", padding: "6px 13px", fontSize: "12.5px", cursor: "pointer", fontFamily: "inherit" }}>
            {t.label}
          </button>
        ))}
        {tab === "by_category" && (
          <select className="input" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value as WishCategory | "")} style={{ fontSize: "12.5px", width: "auto", marginLeft: "4px" }}>
            <option value="">All categories</option>
            {(Object.keys(CAT_META) as WishCategory[]).map(c => <option key={c} value={c}>{CAT_META[c].emoji} {CAT_META[c].label}</option>)}
          </select>
        )}
      </div>

      {/* List */}
      {visible.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "40px 20px" }}>
          <p style={{ color: "var(--text-3)", margin: "0 0 12px", fontSize: "13.5px" }}>
            {tab === "purchased" ? "Nothing bought or passed yet." : "Your wishlist is empty."}
          </p>
          {tab !== "purchased" && <button className="btn btn-primary" onClick={() => setFormItem({})}>Add your first item</button>}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {visible.map(item => (
            <WishCard
              key={item.id} item={item}
              onEdit={() => setFormItem(item)}
              onBought={() => markBought(item.id)}
              onPass={() => markPassed(item.id)}
              onDelete={() => deleteItem(item.id)}
            />
          ))}
        </div>
      )}

      {/* Form */}
      {formItem !== null && (
        <ItemForm
          item={formItem}
          onClose={() => setFormItem(null)}
          onSave={form => formItem.id ? editItem(formItem.id, form) : addItem(form)}
        />
      )}
    </div>
  );
}
