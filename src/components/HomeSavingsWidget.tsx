"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";

type SavingsTransaction = { id: string; date: string; description: string; amount: number };
type SavingsBucket = { id: string; name: string; targetAmount?: number; transactions: SavingsTransaction[] };
type SavingsData = { totalBalance: number | null; buckets: SavingsBucket[] };

function fmt$(n: number): string {
  return (n < 0 ? "-$" : "$") + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function todayStr() { return new Date().toISOString().slice(0, 10); }

export default function HomeSavingsWidget() {
  const [savings, setSavings] = useState<SavingsData>({ totalBalance: null, buckets: [] });
  const [loading, setLoading] = useState(true);
  const [addingTxn, setAddingTxn] = useState<string | null>(null);
  const [txnAmount, setTxnAmount] = useState("");
  const [txnDesc, setTxnDesc] = useState("");
  const [txnType, setTxnType] = useState<"add" | "take">("add");

  useEffect(() => {
    fetch("/api/data")
      .then(r => r.ok ? r.json() : null)
      .then(res => {
        if (res?.data?.finances?.savings) {
          setSavings(res.data.finances.savings);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const saveSavings = useCallback(async (sv: SavingsData) => {
    try {
      const res = await fetch("/api/data");
      const d = res.ok ? (await res.json()).data ?? {} : {};
      const updated = { ...d, finances: { ...(d.finances ?? {}), savings: sv } };
      await fetch("/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: updated }),
      });
      setSavings(sv);
    } catch (e) {
      console.error("Failed to save savings:", e);
    }
  }, []);

  const logTransaction = (bucketId: string) => {
    const amt = parseFloat(txnAmount);
    if (isNaN(amt) || amt <= 0) return;
    const sign = txnType === "add" ? 1 : -1;
    const txn: SavingsTransaction = {
      id: crypto.randomUUID(),
      date: todayStr(),
      description: txnDesc.trim() || (txnType === "add" ? "Deposit" : "Withdrawal"),
      amount: sign * amt,
    };
    const updated = {
      ...savings,
      buckets: savings.buckets.map(b =>
        b.id === bucketId ? { ...b, transactions: [...b.transactions, txn] } : b
      ),
    };
    saveSavings(updated);
    setTxnAmount("");
    setTxnDesc("");
    setAddingTxn(null);
  };

  if (loading) {
    return (
      <div className="card">
        <p className="card-title" style={{ margin: 0 }}>Savings Goals</p>
        <p className="empty">Loading…</p>
      </div>
    );
  }

  if (!savings.buckets.length) return null;

  return (
    <div className="card">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
        <p className="card-title" style={{ margin: 0 }}>Savings Goals</p>
        <Link href="/finances?tab=savings" style={{ fontSize: "12px", color: "var(--accent-text)", textDecoration: "none" }}>
          Full view →
        </Link>
      </div>

      {savings.buckets.map(bucket => {
        const total = bucket.transactions.reduce((a, t) => a + t.amount, 0);
        const pct = bucket.targetAmount ? Math.min(100, (total / bucket.targetAmount) * 100) : null;
        const isAdding = addingTxn === bucket.id;

        return (
          <div key={bucket.id} style={{ marginBottom: "12px", paddingBottom: "12px", borderBottom: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
              <span style={{ fontSize: "13px", fontWeight: 600 }}>{bucket.name}</span>
              <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--green)", fontVariantNumeric: "tabular-nums" }}>
                {fmt$(total)}
                {bucket.targetAmount && <span style={{ fontSize: "11px", color: "var(--text-3)", marginLeft: "4px" }}>/ {fmt$(bucket.targetAmount)}</span>}
              </span>
            </div>
            {pct !== null && (
              <div style={{ height: "4px", borderRadius: "99px", background: "var(--surface-raised)", marginBottom: "8px", overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: "99px", background: pct >= 100 ? "var(--green)" : "var(--accent)", width: `${pct}%`, transition: "width 0.3s" }} />
              </div>
            )}
            {isAdding ? (
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "flex-end" }}>
                <div style={{ display: "flex", borderRadius: "4px", overflow: "hidden", border: "1px solid var(--border)", flexShrink: 0 }}>
                  {(["add", "take"] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setTxnType(t)}
                      style={{
                        padding: "4px 10px",
                        fontFamily: "inherit",
                        fontSize: "11px",
                        fontWeight: 500,
                        cursor: "pointer",
                        border: "none",
                        background: txnType === t ? (t === "add" ? "var(--green-dim)" : "var(--red-dim)") : "var(--surface-raised)",
                        color: txnType === t ? (t === "add" ? "var(--green)" : "var(--red)") : "var(--text-3)",
                      }}
                    >
                      {t === "add" ? "+ Add" : "− Take"}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="$"
                  value={txnAmount}
                  onChange={e => setTxnAmount(e.target.value)}
                  style={{ width: "70px", fontSize: "12px", padding: "4px 6px", borderRadius: "4px", border: "1px solid var(--border)" }}
                />
                <input
                  type="text"
                  placeholder="desc"
                  value={txnDesc}
                  onChange={e => setTxnDesc(e.target.value)}
                  style={{ flex: "1 1 80px", fontSize: "12px", padding: "4px 6px", borderRadius: "4px", border: "1px solid var(--border)" }}
                />
                <button
                  className="btn btn-primary"
                  style={{ fontSize: "11px", padding: "4px 10px" }}
                  onClick={() => logTransaction(bucket.id)}
                >
                  Log
                </button>
                <button
                  className="btn btn-secondary"
                  style={{ fontSize: "11px", padding: "4px 10px" }}
                  onClick={() => { setAddingTxn(null); setTxnAmount(""); setTxnDesc(""); }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                className="btn btn-secondary"
                style={{ fontSize: "11px", padding: "3px 8px" }}
                onClick={() => setAddingTxn(bucket.id)}
              >
                + Log transaction
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
