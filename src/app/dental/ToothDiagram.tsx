"use client";

import { useMemo, useState } from "react";
import { ABSENT_TEETH, toothName, toothType, type Tooth, type ToothStatus } from "@/lib/dental";

// ── Hotspot layout ──────────────────────────────────────────────────────────
//
// Teeth are laid out in two rows (upper arch / lower arch) using the
// Universal Numbering System. The x position walks left-to-right in numeric
// order; the y position follows a gentle sine-wave "arch" curve so it reads
// as a mouth shape rather than a flat ruler of boxes.
//
// The lower row is numbered in REVERSE (32 down to 17) so that teeth on the
// same physical side of the mouth line up in the same column — tooth 1
// (upper-right wisdom tooth) sits above tooth 32 (lower-right wisdom tooth),
// matching how a real dental chart is drawn when facing the patient.

type Hotspot = { number: number; x: number; y: number; width: number; height: number };

const ROW_COUNT = 16;
const X_START = 40;
const X_STEP = 38;
const UPPER_BASE_Y = 60;
const LOWER_BASE_Y = 260;
const ARCH_AMPLITUDE = 30;

function archOffset(i: number) {
  return ARCH_AMPLITUDE * Math.sin((i / (ROW_COUNT - 1)) * Math.PI);
}

// Wider boxes for molars/premolars, narrower for incisors/canines — gives a
// loose sense of tooth shape without drawing full anatomy.
function sizeForTooth(n: number): { width: number; height: number } {
  const t = toothType(n);
  return t === "molar" || t === "premolar" ? { width: 26, height: 34 } : { width: 20, height: 30 };
}

function buildHotspots(): Hotspot[] {
  const spots: Hotspot[] = [];
  for (let i = 0; i < ROW_COUNT; i++) {
    const x = X_START + i * X_STEP;

    const upperTooth = i + 1; // 1..16
    const upperSize = sizeForTooth(upperTooth);
    spots.push({ number: upperTooth, x, y: UPPER_BASE_Y + archOffset(i), ...upperSize });

    const lowerTooth = 32 - i; // 32..17
    const lowerSize = sizeForTooth(lowerTooth);
    spots.push({ number: lowerTooth, x, y: LOWER_BASE_Y - archOffset(i), ...lowerSize });
  }
  return spots;
}

const HOTSPOTS: Hotspot[] = buildHotspots();

// ── Status colors ───────────────────────────────────────────────────────────

const STATUS_COLOR: Record<ToothStatus, string> = {
  healthy: "var(--green)",
  treated: "var(--accent)",
  needs_work: "var(--yellow)",
  watch: "var(--yellow)",
  absent: "var(--text-3)",
};
const STATUS_FILL: Record<ToothStatus, string> = {
  healthy: "rgba(74,222,128,0.10)",
  treated: "var(--accent-dim)",
  needs_work: "var(--yellow-dim)",
  watch: "transparent", // watch = outline only, no fill, to visually distinguish from needs_work
  absent: "var(--surface-raised)",
};
const STATUS_LABEL: Record<ToothStatus, string> = {
  healthy: "Healthy",
  treated: "Treated",
  needs_work: "Needs Work",
  watch: "Watching",
  absent: "Absent",
};

// ── Component ────────────────────────────────────────────────────────────────

export type ToothDiagramProps = {
  teeth: Tooth[];
  selectedTooth: number | null;
  onSelectTooth: (n: number | null) => void;
};

export default function ToothDiagram({ teeth, selectedTooth, onSelectTooth }: ToothDiagramProps) {
  const [hovered, setHovered] = useState<number | null>(null);

  const statusByTooth = useMemo(() => {
    const map = new Map<number, ToothStatus>();
    for (const t of teeth) map.set(t.number, t.status);
    return map;
  }, [teeth]);

  const hoveredSpot = hovered != null ? HOTSPOTS.find((s) => s.number === hovered) : null;
  const hoveredStatus = hovered != null ? statusByTooth.get(hovered) : null;

  return (
    <div>
      <svg viewBox="0 0 700 320" width="100%" style={{ maxWidth: "700px", display: "block", margin: "0 auto" }}>
        {/* Midline guide, purely visual */}
        <line x1="350" y1="20" x2="350" y2="300" stroke="var(--border)" strokeWidth="1" strokeDasharray="2 4" />

        {HOTSPOTS.map((spot) => {
          const absent = ABSENT_TEETH.includes(spot.number);
          const status = statusByTooth.get(spot.number) ?? "healthy";
          const isSelected = selectedTooth === spot.number;
          const isHovered = hovered === spot.number;

          const rx = spot.x - spot.width / 2;
          const ry = spot.y - spot.height / 2;

          const fill = absent ? STATUS_FILL.absent : STATUS_FILL[status];
          const stroke = absent
            ? "var(--text-3)"
            : isSelected
            ? "var(--accent)"
            : isHovered
            ? STATUS_COLOR[status]
            : status === "watch"
            ? "var(--yellow)"
            : STATUS_COLOR[status];
          const strokeWidth = isSelected ? 2.5 : status === "watch" && !absent ? 1.2 : 1.5;
          const strokeDasharray = status === "watch" && !absent ? "3 2" : undefined;

          return (
            <g
              key={spot.number}
              opacity={absent ? 0.35 : 1}
              style={{ cursor: absent ? "default" : "pointer" }}
              onMouseEnter={() => !absent && setHovered(spot.number)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => !absent && onSelectTooth(selectedTooth === spot.number ? null : spot.number)}
            >
              <rect
                x={rx}
                y={ry}
                width={spot.width}
                height={spot.height}
                rx={4}
                fill={fill}
                stroke={stroke}
                strokeWidth={strokeWidth}
                strokeDasharray={strokeDasharray}
              />
              <text
                x={spot.x}
                y={spot.y + spot.height / 2 + 11}
                textAnchor="middle"
                fontSize="9"
                fill={absent ? "var(--text-3)" : "var(--text-2)"}
              >
                {spot.number}
              </text>
            </g>
          );
        })}

        {/* Hover tooltip — custom SVG box, matches CarDiagram's pattern */}
        {hoveredSpot && (
          <g>
            <rect
              x={hoveredSpot.x - 75}
              y={hoveredSpot.y - hoveredSpot.height / 2 - 40}
              width={150}
              height={34}
              rx={4}
              fill="rgba(19,19,22,0.94)"
              stroke="rgba(129,140,248,0.30)"
              strokeWidth="0.8"
            />
            <text
              x={hoveredSpot.x}
              y={hoveredSpot.y - hoveredSpot.height / 2 - 26}
              textAnchor="middle"
              fontSize="11"
              fill="#a5b0fa"
            >
              #{hoveredSpot.number} — {toothName(hoveredSpot.number)}
            </text>
            <text
              x={hoveredSpot.x}
              y={hoveredSpot.y - hoveredSpot.height / 2 - 12}
              textAnchor="middle"
              fontSize="10"
              fill="var(--text-3)"
            >
              {hoveredStatus ? STATUS_LABEL[hoveredStatus] : ""}
            </text>
          </g>
        )}
      </svg>

      <p style={{ textAlign: "center", fontSize: "11px", color: "var(--text-3)", margin: "4px 0 10px" }}>
        Universal Numbering System — patient&apos;s right appears on screen-left, as when facing the patient.
      </p>

      {/* Legend */}
      <div style={{ display: "flex", justifyContent: "center", gap: "16px", flexWrap: "wrap" }}>
        {(["healthy", "treated", "needs_work", "watch", "absent"] as ToothStatus[]).map((s) => (
          <div key={s} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "3px",
                background: s === "watch" ? "transparent" : STATUS_FILL[s],
                border: `1.5px solid ${STATUS_COLOR[s]}`,
                display: "inline-block",
              }}
            />
            <span style={{ fontSize: "11.5px", color: "var(--text-3)" }}>{STATUS_LABEL[s]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
