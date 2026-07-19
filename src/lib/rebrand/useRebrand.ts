"use client";

// ============================================================================
// useRebrand — one shared hook for every Rebrand page.
//
// Loads the seeded rebrand data once, and exposes `mutate(next)` which updates
// the UI instantly (optimistic) and saves in the background. On failure it
// flips to an error toast — pages surface `status`. This keeps all the
// load/save/optimistic plumbing in ONE place instead of copy-pasted per page.
// ============================================================================

import { useCallback, useEffect, useRef, useState } from "react";
import type { RebrandData } from "./types";
import { loadRebrand, saveRebrand, type DashData } from "./queries";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

export function useRebrand() {
  const [data, setData] = useState<RebrandData | null>(null);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [loading, setLoading] = useState(true);
  const rawRef = useRef<DashData>({}); // full blob, so saves never drop other features
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let alive = true;
    loadRebrand()
      .then(({ rebrand, rawData }) => {
        if (!alive) return;
        rawRef.current = rawData;
        setData(rebrand);
      })
      .catch(() => alive && setStatus("error"))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  // Update UI immediately, persist in the background (spec §16 optimistic UI).
  const mutate = useCallback((next: RebrandData) => {
    setData(next);
    setStatus("saving");
    if (timer.current) clearTimeout(timer.current);
    saveRebrand(rawRef.current, next)
      .then((newRaw) => {
        rawRef.current = newRaw;
        setStatus("saved");
      })
      .catch(() => setStatus("error"))
      .finally(() => {
        timer.current = setTimeout(() => setStatus("idle"), 1500);
      });
  }, []);

  return { data, mutate, status, loading };
}
