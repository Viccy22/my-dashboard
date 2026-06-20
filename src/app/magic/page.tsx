"use client";

import { useEffect, useState, useCallback, useRef } from "react";

type GameResult = "W" | "L";

type Game = {
  id: string;
  date: string;
  opponent: string;
  homeAway: "home" | "away";
  ourScore: number | null;
  theirScore: number | null;
  notes: string;
};

type MagicData = { games: Game[] };
type DashData  = { magic?: MagicData; [key: string]: unknown };
type SaveStatus = "idle" | "saving" | "saved" | "error";

function todayStr() { return new Date().toISOString().slice(0, 10); }
function fmtDate(s: string) { return new Date(s + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }); }

function gameResult(g: Game): GameResult | null {
  if (g.ourScore === null || g.theirScore === null) return null;
  return g.ourScore >= g.theirScore ? "W" : "L";
}

function computeStreak(games: Game[]): { type: "W" | "L" | null; count: number } {
  const played = [...games].filter(g => g.ourScore !== null && g.theirScore !== null && g.date <= todayStr())
    .sort((a, b) => b.date.localeCompare(a.date));
  if (!played.length) return { type: null, count: 0 };
  const first = gameResult(played[0]);
  if (!first) return { type: null, count: 0 };
  let count = 0;
  for (const g of played) { if (gameResult(g) === first) count++; else break; }
  return { type: first, count };
}

function daysUntil(s: string) { return Math.round((new Date(s + "T00:00:00").getTime() - Date.now()) / 86400000); }

const XIcon = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M2 2l9 9M11 2l-9 9" strokeLinecap="round" />
  </svg>
);

export default function MagicPage() {
  const [rawData, setRawData] = useState<DashData>({});
  const [games,   setGames]   = useState<Game[]>([]);
  const [status,  setStatus]  = useState<SaveStatus>("idle");
  const [loading, setLoading] = useState(true);
  const [addingGame, setAddingGame] = useState(false);
  const [scoreEditId, setScoreEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Game, "id">>({ date: todayStr(), opponent: "", homeAway: "home", ourScore: null, theirScore: null, notes: "" });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/api/data")
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(res => {
        const d: DashData = res.data ?? {};
        setRawData(d);
        setGames(d.magic?.games ?? []);
      })
      .catch(() => setStatus("error"))
      .finally(() => setLoading(false));
  }, []);

  const save = useCallback(async (updated: Game[]) => {
    setStatus("saving");
    if (timer.current) clearTimeout(timer.current);
    const newData = { ...rawData, magic: { games: updated } };
    setRawData(newData);
    try {
      const res = await fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data: newData }) });
      if (!res.ok) throw new Error();
      setStatus("saved");
    } catch { setStatus("error"); }
    finally { timer.current = setTimeout(() => setStatus("idle"), 2000); }
  }, [rawData]);

  const addGame = () => {
    if (!form.opponent.trim() || !form.date) return;
    const updated = [...games, { ...form, id: crypto.randomUUID() }].sort((a, b) => a.date.localeCompare(b.date));
    setGames(updated); setAddingGame(false); save(updated);
    setForm({ date: todayStr(), opponent: "", homeAway: "home", ourScore: null, theirScore: null, notes: "" });
  };

  const updateGame = (id: string, patch: Partial<Game>) => {
    const updated = games.map(g => g.id === id ? { ...g, ...patch } : g);
    setGames(updated); save(updated);
  };

  const deleteGame = (id: string) => {
    const updated = games.filter(g => g.id !== id); setGames(updated); save(updated);
  };

  if (loading) return <p className="empty" style={{ padding: "32px 0" }}>Loading…</p>;

  const today = todayStr();
  const played  = games.filter(g => g.date <= today && g.ourScore !== null && g.theirScore !== null).sort((a, b) => b.date.localeCompare(a.date));
  const upcoming = games.filter(g => g.date > today || g.ourScore === null).sort((a, b) => a.date.localeCompare(b.date));
  const wins   = played.filter(g => (g.ourScore ?? 0) >= (g.theirScore ?? 0)).length;
  const losses = played.length - wins;
  const winPct = played.length ? Math.round((wins / played.length) * 100) : 0;
  const streak = computeStreak(games);

  const MAGIC_BLUE = "#0077C0";
  const MAGIC_DARK = "#0055A4";

  return (
    <div style={{ maxWidth: "760px" }}>
      {status !== "idle" && <div className={`toast${status === "error" ? " error" : ""}`}>{status === "saving" ? "Saving…" : status === "saved" ? "Saved" : "Error saving."}</div>}

      {/* Header banner */}
      <div style={{ borderRadius: "10px", background: `linear-gradient(135deg, ${MAGIC_DARK}, ${MAGIC_BLUE})`, padding: "16px 20px", marginBottom: "16px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "22px" }}>🏀</span>
            <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "white", letterSpacing: "-0.01em" }}>Orlando Magic</h2>
          </div>
          {played.length > 0 && <p style={{ margin: "4px 0 0", fontSize: "13px", color: "rgba(255,255,255,0.75)" }}>2024–25 Season</p>}
        </div>
        {played.length > 0 && (
          <div style={{ display: "flex", gap: "20px" }}>
            <div style={{ textAlign: "center" }}>
              <p style={{ margin: 0, fontSize: "28px", fontWeight: 800, color: "white", lineHeight: 1 }}>{wins}–{losses}</p>
              <p style={{ margin: "2px 0 0", fontSize: "10px", color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Record</p>
            </div>
            <div style={{ textAlign: "center" }}>
              <p style={{ margin: 0, fontSize: "28px", fontWeight: 800, color: "white", lineHeight: 1 }}>{winPct}%</p>
              <p style={{ margin: "2px 0 0", fontSize: "10px", color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Win %</p>
            </div>
            {streak.count > 0 && (
              <div style={{ textAlign: "center" }}>
                <p style={{ margin: 0, fontSize: "28px", fontWeight: 800, color: streak.type === "W" ? "#90EE90" : "#FFB3B3", lineHeight: 1 }}>{streak.type}{streak.count}</p>
                <p style={{ margin: "2px 0 0", fontSize: "10px", color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Streak</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "14px" }}>
        <button className="btn btn-primary" onClick={() => setAddingGame(x => !x)}>{addingGame ? "Cancel" : "+ Add game"}</button>
      </div>

      {/* Add game form */}
      {addingGame && (
        <div className="card" style={{ marginBottom: "14px" }}>
          <p className="card-title" style={{ marginBottom: "10px" }}>Add game</p>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "10px" }}>
            <div style={{ flex: "1 1 130px" }}>
              <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "3px" }}>Date</label>
              <input className="input" type="date" value={form.date} onChange={e => setForm(x => ({ ...x, date: e.target.value }))} />
            </div>
            <div style={{ flex: "2 1 160px" }}>
              <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "3px" }}>Opponent</label>
              <input className="input" placeholder="e.g. Boston Celtics" value={form.opponent} autoFocus onChange={e => setForm(x => ({ ...x, opponent: e.target.value }))} />
            </div>
            <div style={{ flex: "1 1 120px" }}>
              <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "3px" }}>Home / Away</label>
              <select className="input" value={form.homeAway} onChange={e => setForm(x => ({ ...x, homeAway: e.target.value as "home" | "away" }))}>
                <option value="home">Home</option>
                <option value="away">Away</option>
              </select>
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "10px" }}>
            <div style={{ flex: "1 1 90px" }}>
              <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "3px" }}>Magic score</label>
              <input className="input" type="number" min="0" placeholder="—" value={form.ourScore ?? ""} onChange={e => setForm(x => ({ ...x, ourScore: e.target.value ? parseInt(e.target.value) : null }))} />
            </div>
            <div style={{ flex: "1 1 90px" }}>
              <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "3px" }}>Their score</label>
              <input className="input" type="number" min="0" placeholder="—" value={form.theirScore ?? ""} onChange={e => setForm(x => ({ ...x, theirScore: e.target.value ? parseInt(e.target.value) : null }))} />
            </div>
            <div style={{ flex: "2 1 180px" }}>
              <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "3px" }}>Notes</label>
              <input className="input" placeholder="Playoff game, great seats…" value={form.notes} onChange={e => setForm(x => ({ ...x, notes: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button className="btn btn-primary" onClick={addGame}>Add game</button>
            <button className="btn btn-secondary" onClick={() => setAddingGame(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Upcoming games */}
      {upcoming.length > 0 && (
        <div className="card" style={{ marginBottom: "16px" }}>
          <p className="card-title" style={{ marginBottom: "10px" }}>Upcoming</p>
          {upcoming.map((g, i) => {
            const days = daysUntil(g.date);
            const isEnteringScore = scoreEditId === g.id;
            return (
              <div key={g.id} style={{ padding: "10px 0", borderTop: i > 0 ? "1px solid var(--border)" : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}
                  onMouseEnter={e => e.currentTarget.querySelectorAll<HTMLElement>(".g-del").forEach(el => el.style.opacity = "1")}
                  onMouseLeave={e => e.currentTarget.querySelectorAll<HTMLElement>(".g-del").forEach(el => el.style.opacity = "0")}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "14px", fontWeight: 600 }}>
                        {g.homeAway === "home" ? "vs" : "@"} {g.opponent}
                      </span>
                      <span style={{ fontSize: "11px", padding: "2px 7px", borderRadius: "99px", fontWeight: 600,
                        background: g.homeAway === "home" ? "var(--accent-dim)" : "var(--surface-raised)",
                        color: g.homeAway === "home" ? "var(--accent-text)" : "var(--text-3)" }}>
                        {g.homeAway === "home" ? "Home" : "Away"}
                      </span>
                    </div>
                    <p style={{ margin: "2px 0 0", fontSize: "12px", color: "var(--text-3)" }}>
                      {fmtDate(g.date)}
                      {g.notes && ` · ${g.notes}`}
                    </p>
                  </div>
                  <div style={{ textAlign: "center", minWidth: "48px" }}>
                    <p style={{ margin: 0, fontSize: days === 0 ? "13px" : "20px", fontWeight: 800, color: days <= 3 ? MAGIC_BLUE : "var(--text)", fontVariantNumeric: "tabular-nums" }}>
                      {days === 0 ? "TODAY" : days === 1 ? "1" : days}
                    </p>
                    {days > 1 && <p style={{ margin: 0, fontSize: "9px", color: "var(--text-3)", textTransform: "uppercase", fontWeight: 600 }}>days</p>}
                  </div>
                  <button className="btn btn-secondary" style={{ fontSize: "12px", padding: "4px 10px" }}
                    onClick={() => setScoreEditId(scoreEditId === g.id ? null : g.id)}>
                    {isEnteringScore ? "Cancel" : "Add score"}
                  </button>
                  <button className="btn-icon g-del" style={{ opacity: 0 }} onClick={() => deleteGame(g.id)}><XIcon /></button>
                </div>
                {isEnteringScore && (
                  <div style={{ display: "flex", gap: "8px", marginTop: "8px", alignItems: "flex-end" }}>
                    <div>
                      <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "2px" }}>Magic</label>
                      <input className="input" type="number" min="0" style={{ width: "80px" }} placeholder="Score"
                        defaultValue={g.ourScore ?? ""}
                        onChange={e => updateGame(g.id, { ourScore: e.target.value ? parseInt(e.target.value) : null })} />
                    </div>
                    <div>
                      <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "2px" }}>Opponent</label>
                      <input className="input" type="number" min="0" style={{ width: "80px" }} placeholder="Score"
                        defaultValue={g.theirScore ?? ""}
                        onChange={e => updateGame(g.id, { theirScore: e.target.value ? parseInt(e.target.value) : null })} />
                    </div>
                    <button className="btn btn-primary" style={{ fontSize: "12px" }} onClick={() => setScoreEditId(null)}>Save</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Game log */}
      {played.length > 0 && (
        <div className="card">
          <p className="card-title" style={{ marginBottom: "10px" }}>Game log</p>
          {played.map((g, i) => {
            const result = gameResult(g);
            const won = result === "W";
            return (
              <div key={g.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 0", borderTop: i > 0 ? "1px solid var(--border)" : "none" }}
                onMouseEnter={e => e.currentTarget.querySelectorAll<HTMLElement>(".g-del2").forEach(el => el.style.opacity = "1")}
                onMouseLeave={e => e.currentTarget.querySelectorAll<HTMLElement>(".g-del2").forEach(el => el.style.opacity = "0")}>
                <div style={{ width: "28px", height: "28px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  background: won ? "var(--green-dim)" : "var(--red-dim)", fontWeight: 800, fontSize: "13px",
                  color: won ? "var(--green)" : "var(--red)" }}>
                  {result}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--text)" }}>
                    {g.homeAway === "home" ? "vs" : "@"} {g.opponent}
                  </div>
                  <div style={{ fontSize: "11.5px", color: "var(--text-3)" }}>
                    {fmtDate(g.date)}
                    {g.notes && ` · ${g.notes}`}
                  </div>
                </div>
                <div style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                  <span style={{ fontSize: "16px", fontWeight: 800, color: won ? "var(--green)" : "var(--red)" }}>
                    {g.ourScore}–{g.theirScore}
                  </span>
                </div>
                <button className="btn-icon g-del2" style={{ opacity: 0 }} onClick={() => deleteGame(g.id)}><XIcon /></button>
              </div>
            );
          })}
        </div>
      )}

      {games.length === 0 && (
        <div className="card"><p className="empty">No games yet. Add your first one above!</p></div>
      )}
    </div>
  );
}
