"use client";

import { useState } from "react";
import { GUIDES, PART_LABELS, type CarPartId } from "./guides";

type HotSpot = {
  id: CarPartId;
  label: string;
  shape: "rect" | "ellipse";
  x?: number; y?: number; width?: number; height?: number; rx?: number;
  cx?: number; cy?: number; rx2?: number; ry?: number;
};

const HOT_SPOTS: HotSpot[] = [
  { id: "frontBumper", label: "Front Bumper",        shape: "rect",    x: 18,  y: 178, width: 72,  height: 80, rx: 8 },
  { id: "headlights",  label: "Headlights",           shape: "rect",    x: 62,  y: 162, width: 70,  height: 42, rx: 6 },
  { id: "engineBay",   label: "Hood / Engine Bay",    shape: "rect",    x: 90,  y: 115, width: 210, height: 120, rx: 4 },
  { id: "windshield",  label: "Windshield & Wipers",  shape: "rect",    x: 300, y: 78,  width: 145, height: 80, rx: 4 },
  { id: "sideMirrors", label: "Side Mirrors",         shape: "rect",    x: 272, y: 120, width: 38,  height: 28, rx: 4 },
  { id: "doorHandles", label: "Door Handles",         shape: "rect",    x: 355, y: 178, width: 260, height: 28, rx: 4 },
  { id: "tires",       label: "Tires & Fender Liners",shape: "ellipse", cx: 170, cy: 278, rx2: 46, ry: 46 },
  { id: "tires",       label: "Tires & Fender Liners",shape: "ellipse", cx: 648, cy: 278, rx2: 46, ry: 46 },
];

export default function CarDiagram() {
  const [active,  setActive]  = useState<CarPartId | null>(null);
  const [hovered, setHovered] = useState<CarPartId | null>(null);

  const guides = active ? GUIDES[active] : [];

  return (
    <div>
      <div className="card" style={{ padding: "20px", overflow: "hidden" }}>
        <p className="card-title">2019 Hyundai Elantra — Interactive Diagram</p>
        <p style={{ fontSize: "12.5px", color: "var(--text-3)", marginBottom: "16px", marginTop: "-8px" }}>
          Click any part to see its service guide.
        </p>

        <div style={{ position: "relative", width: "100%", maxWidth: "800px", margin: "0 auto" }}>
          <svg viewBox="0 0 800 320" width="100%" xmlns="http://www.w3.org/2000/svg" style={{ display: "block", overflow: "visible" }}>
            <defs>
              <linearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#1e1e24" />
                <stop offset="100%" stopColor="#111115" />
              </linearGradient>
              <linearGradient id="windowGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#1a1a2e" stopOpacity="0.90" />
                <stop offset="100%" stopColor="#0e0e1a" stopOpacity="0.95" />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="b"/>
                <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>

            {/* Ground shadow */}
            <ellipse cx="400" cy="310" rx="340" ry="14" fill="rgba(0,0,0,0.5)" />

            {/* Car body */}
            <path
              d="M 38 248 Q 22 248 20 230 Q 20 210 40 198 L 78 188 L 252 134 L 302 108 Q 325 88 360 80 L 560 78 Q 595 78 622 98 L 664 132 L 748 174 Q 765 190 766 218 Q 767 242 752 250 L 38 250 Z"
              fill="url(#bodyGrad)"
              stroke="rgba(129,140,248,0.35)"
              strokeWidth="1.2"
            />

            {/* Underbody sill */}
            <path d="M 102 250 L 114 265 L 218 265 L 228 250" fill="none" stroke="rgba(129,140,248,0.18)" strokeWidth="1" />
            <path d="M 572 250 L 584 265 L 688 265 L 700 250" fill="none" stroke="rgba(129,140,248,0.18)" strokeWidth="1" />

            {/* Windshield */}
            <path d="M 304 110 L 362 80 L 448 79 L 448 110 Z" fill="url(#windowGrad)" stroke="rgba(129,140,248,0.40)" strokeWidth="1" />
            <line x1="325" y1="107" x2="372" y2="81" stroke="rgba(255,255,255,0.08)" strokeWidth="6" strokeLinecap="round" />

            {/* Front door window */}
            <path d="M 458 110 L 458 79 L 555 78 L 555 110 Z" fill="url(#windowGrad)" stroke="rgba(129,140,248,0.32)" strokeWidth="1" />

            {/* Rear door window */}
            <path d="M 565 110 L 565 78 L 620 79 Q 640 88 662 110 Z" fill="url(#windowGrad)" stroke="rgba(129,140,248,0.32)" strokeWidth="1" />

            {/* Hood crease lines */}
            <line x1="102" y1="192" x2="300" y2="118" stroke="rgba(129,140,248,0.15)" strokeWidth="1" />
            <line x1="116" y1="188" x2="300" y2="115" stroke="rgba(129,140,248,0.08)" strokeWidth="0.8" />

            {/* B-pillar */}
            <rect x="452" y="79" width="9" height="172" fill="#0f0f13" />
            <line x1="456" y1="79" x2="456" y2="251" stroke="rgba(129,140,248,0.22)" strokeWidth="0.8" />

            {/* Door beltline */}
            <line x1="310" y1="145" x2="665" y2="145" stroke="rgba(129,140,248,0.20)" strokeWidth="1" />

            {/* Door handles */}
            <rect x="368" y="184" width="56" height="10" rx="5" fill="rgba(129,140,248,0.10)" stroke="rgba(129,140,248,0.35)" strokeWidth="0.8" />
            <rect x="530" y="184" width="56" height="10" rx="5" fill="rgba(129,140,248,0.10)" stroke="rgba(129,140,248,0.35)" strokeWidth="0.8" />

            {/* Side mirror */}
            <path d="M 280 128 L 282 118 L 308 118 L 308 132 L 282 135 Z" fill="#16161c" stroke="rgba(129,140,248,0.38)" strokeWidth="1" />

            {/* Front grille */}
            <path d="M 26 214 L 28 204 L 72 200 L 72 214 Z" fill="rgba(0,0,0,0.5)" stroke="rgba(129,140,248,0.25)" strokeWidth="0.8" />
            {[208, 213, 218].map(y => (
              <line key={y} x1="30" y1={y} x2="70" y2={y} stroke="rgba(129,140,248,0.18)" strokeWidth="0.6" />
            ))}

            {/* Headlights */}
            <path d="M 65 168 L 128 162 L 130 186 L 65 192 Z" fill="rgba(200,210,255,0.12)" stroke="rgba(129,140,248,0.55)" strokeWidth="1" />
            <line x1="68" y1="174" x2="126" y2="168" stroke="rgba(200,210,255,0.25)" strokeWidth="1.5" />

            {/* Tail lights */}
            <path d="M 752 182 L 766 192 L 765 224 L 750 228 Z" fill="rgba(248,113,113,0.28)" stroke="rgba(129,140,248,0.30)" strokeWidth="1" />

            {/* Front tire */}
            <circle cx="170" cy="278" r="44" fill="#0a0a0d" stroke="rgba(129,140,248,0.45)" strokeWidth="1.2" />
            <circle cx="170" cy="278" r="32" fill="none" stroke="rgba(129,140,248,0.20)" strokeWidth="1" />
            <circle cx="170" cy="278" r="14" fill="#14141a" stroke="rgba(129,140,248,0.35)" strokeWidth="1" />
            {[0, 60, 120, 180, 240, 300].map(deg => {
              const rad = (deg * Math.PI) / 180;
              return <line key={deg} x1={170 + 15 * Math.cos(rad)} y1={278 + 15 * Math.sin(rad)} x2={170 + 30 * Math.cos(rad)} y2={278 + 30 * Math.sin(rad)} stroke="rgba(129,140,248,0.35)" strokeWidth="1.5" />;
            })}

            {/* Rear tire */}
            <circle cx="648" cy="278" r="44" fill="#0a0a0d" stroke="rgba(129,140,248,0.45)" strokeWidth="1.2" />
            <circle cx="648" cy="278" r="32" fill="none" stroke="rgba(129,140,248,0.20)" strokeWidth="1" />
            <circle cx="648" cy="278" r="14" fill="#14141a" stroke="rgba(129,140,248,0.35)" strokeWidth="1" />
            {[0, 60, 120, 180, 240, 300].map(deg => {
              const rad = (deg * Math.PI) / 180;
              return <line key={deg} x1={648 + 15 * Math.cos(rad)} y1={278 + 15 * Math.sin(rad)} x2={648 + 30 * Math.cos(rad)} y2={278 + 30 * Math.sin(rad)} stroke="rgba(129,140,248,0.35)" strokeWidth="1.5" />;
            })}

            {/* Clickable hotspots */}
            {HOT_SPOTS.map((spot, i) => {
              const isHov = hovered === spot.id;
              const isAct = active  === spot.id;
              const fill   = isAct ? "rgba(129,140,248,0.20)" : isHov ? "rgba(129,140,248,0.12)" : "rgba(129,140,248,0)";
              const stroke = (isHov || isAct) ? "rgba(129,140,248,0.65)" : "rgba(129,140,248,0)";
              const shared = {
                fill, stroke, strokeWidth: 1.5, strokeDasharray: "4 3",
                style: { cursor: "pointer", transition: "fill 0.15s, stroke 0.15s" } as React.CSSProperties,
                onMouseEnter: () => setHovered(spot.id),
                onMouseLeave: () => setHovered(null),
                onClick: () => setActive(active === spot.id ? null : spot.id),
              };
              if (spot.shape === "ellipse") {
                return <ellipse key={i} cx={spot.cx} cy={spot.cy} rx={spot.rx2} ry={spot.ry} {...shared} />;
              }
              return <rect key={i} x={spot.x} y={spot.y} width={spot.width} height={spot.height} rx={spot.rx} {...shared} />;
            })}

            {/* Hover tooltip */}
            {hovered && (() => {
              const spot = HOT_SPOTS.find(s => s.id === hovered)!;
              const lx = spot.cx ?? (spot.x! + spot.width! / 2);
              const ly = (spot.cy ?? spot.y!) - 12;
              return (
                <g>
                  <rect x={lx - 70} y={ly - 18} width={140} height={22} rx={4} fill="rgba(19,19,22,0.92)" stroke="rgba(129,140,248,0.30)" strokeWidth="0.8" />
                  <text x={lx} y={ly - 2} textAnchor="middle" fontSize="11" fill="#a5b0fa" style={{ fontFamily: "Inter,sans-serif" }}>
                    {spot.label}
                  </text>
                </g>
              );
            })()}
          </svg>
        </div>

        {/* Legend chips */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "16px", justifyContent: "center" }}>
          {(Object.keys(PART_LABELS) as CarPartId[]).map(id => (
            <button
              key={id}
              onClick={() => setActive(active === id ? null : id)}
              style={{
                fontSize: "11px",
                padding: "4px 12px",
                borderRadius: "99px",
                border: `1px solid ${active === id ? "rgba(129,140,248,0.60)" : "var(--border)"}`,
                background: active === id ? "var(--accent-dim)" : "transparent",
                color: active === id ? "var(--accent-text)" : "var(--text-3)",
                cursor: "pointer",
                transition: "all 0.12s",
                fontFamily: "inherit",
                fontWeight: 500,
              }}
            >
              {PART_LABELS[id]}
            </button>
          ))}
        </div>
      </div>

      {/* Guide panel */}
      {active && (
        <div className="card" style={{ marginTop: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
            <p className="card-title" style={{ margin: 0 }}>{PART_LABELS[active]}</p>
            <button className="btn-icon" onClick={() => setActive(null)}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M2 2l10 10M12 2l-10 10" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div style={{ background: "var(--yellow-dim)", border: "1px solid rgba(251,191,36,0.20)", borderRadius: "6px", padding: "10px 14px", marginBottom: "18px", fontSize: "12.5px", color: "var(--text-2)" }}>
            Always confirm torque specs against your owner&apos;s manual before doing the work.
          </div>

          {guides.map((guide, gi) => (
            <div key={guide.id} style={{ marginBottom: gi < guides.length - 1 ? "24px" : 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--text)" }}>{guide.title}</span>
                {!guide.verified && (
                  <span style={{ fontSize: "11px", color: "var(--yellow)", background: "var(--yellow-dim)", borderRadius: "99px", padding: "2px 8px" }}>
                    researched — verify before doing
                  </span>
                )}
              </div>

              {guide.note && <p style={{ fontSize: "13px", color: "var(--text-2)", marginBottom: "12px", lineHeight: 1.55 }}>{guide.note}</p>}

              {guide.tools.length > 0 && (
                <div style={{ marginBottom: "12px" }}>
                  <div style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--text-3)", marginBottom: "4px" }}>Tools</div>
                  <p style={{ fontSize: "13px", color: "var(--text-2)" }}>{guide.tools.join(" · ")}</p>
                </div>
              )}

              {guide.parts.length > 0 && (
                <div style={{ marginBottom: "14px" }}>
                  <div style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--text-3)", marginBottom: "4px" }}>Parts</div>
                  {guide.parts.map((p, pi) => (
                    <div key={pi} style={{ fontSize: "13px", color: "var(--text-2)", marginTop: "3px" }}>
                      {p.name}
                      {p.partNumber && <span style={{ color: "var(--accent-text)" }}> — {p.partNumber}</span>}
                      {p.cost && <span style={{ color: "var(--text-3)" }}> {p.cost}</span>}
                    </div>
                  ))}
                </div>
              )}

              <div style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--text-3)", marginBottom: "6px" }}>Steps</div>
              <ol style={{ margin: "0 0 0 18px", padding: 0 }}>
                {guide.steps.map((step, si) => (
                  <li key={si} style={{ fontSize: "13.5px", color: "var(--text-2)", lineHeight: 1.65, marginBottom: "4px" }}>{step}</li>
                ))}
              </ol>

              {gi < guides.length - 1 && <div className="divider" style={{ marginTop: "20px" }} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
