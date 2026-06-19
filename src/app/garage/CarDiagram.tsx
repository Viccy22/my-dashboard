"use client";

import { useState } from "react";
import { GUIDES, PART_LABELS, type CarPartId } from "./guides";

type HotSpot = {
  id: CarPartId;
  label: string;
  shape: "rect" | "ellipse";
  // rect props
  x?: number; y?: number; width?: number; height?: number; rx?: number;
  // ellipse props
  cx?: number; cy?: number; rx2?: number; ry?: number;
};

const HOT_SPOTS: HotSpot[] = [
  // Front bumper — front-most area
  { id: "frontBumper", label: "Front Bumper", shape: "rect", x: 18, y: 178, width: 72, height: 80, rx: 8 },
  // Headlights — front, just above bumper
  { id: "headlights", label: "Headlights", shape: "rect", x: 62, y: 162, width: 70, height: 42, rx: 6 },
  // Hood / engine bay
  { id: "engineBay", label: "Hood / Engine Bay", shape: "rect", x: 90, y: 115, width: 210, height: 120, rx: 4 },
  // Windshield (also cabin filter + wipers)
  { id: "windshield", label: "Windshield & Wipers", shape: "rect", x: 300, y: 78, width: 145, height: 80, rx: 4 },
  // Side mirror
  { id: "sideMirrors", label: "Side Mirrors", shape: "rect", x: 272, y: 120, width: 38, height: 28, rx: 4 },
  // Door handles — front and rear
  { id: "doorHandles", label: "Door Handles", shape: "rect", x: 355, y: 178, width: 260, height: 28, rx: 4 },
  // Front tire
  { id: "tires", label: "Tires & Fender Liners", shape: "ellipse", cx: 170, cy: 278, rx2: 46, ry: 46 },
  // Rear tire (same part)
  { id: "tires", label: "Tires & Fender Liners", shape: "ellipse", cx: 648, cy: 278, rx2: 46, ry: 46 },
];

export default function CarDiagram() {
  const [active, setActive] = useState<CarPartId | null>(null);
  const [hovered, setHovered] = useState<CarPartId | null>(null);

  const guides = active ? GUIDES[active] : [];

  return (
    <div style={{ position: "relative" }}>
      <div className="magic-card" style={{ padding: "24px 20px 20px", overflow: "hidden" }}>
        <div className="section-title" style={{ marginBottom: "14px" }}>
          <span>✦</span> 2019 Hyundai Elantra — Interactive Diagram
        </div>
        <p style={{
          fontFamily: "var(--font-crimson)", fontSize: "14px",
          color: "var(--parchment-dim)", fontStyle: "italic", marginBottom: "18px",
        }}>
          Click any part to see its service guide.
        </p>

        <div style={{ position: "relative", width: "100%", maxWidth: "800px", margin: "0 auto" }}>
          <svg
            viewBox="0 0 800 320"
            width="100%"
            xmlns="http://www.w3.org/2000/svg"
            style={{ display: "block", overflow: "visible" }}
          >
            <defs>
              <linearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#1e1550" />
                <stop offset="100%" stopColor="#120e38" />
              </linearGradient>
              <linearGradient id="windowGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#1a2860" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#0e1840" stopOpacity="0.95" />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="b"/>
                <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>

            {/* Ground shadow */}
            <ellipse cx="400" cy="310" rx="340" ry="14" fill="rgba(0,0,0,0.35)" />

            {/* ── Car body ── */}
            <path
              d="
                M 38 248
                Q 22 248 20 230
                Q 20 210 40 198
                L 78 188
                L 252 134
                L 302 108
                Q 325 88 360 80
                L 560 78
                Q 595 78 622 98
                L 664 132
                L 748 174
                Q 765 190 766 218
                Q 767 242 752 250
                L 38 250
                Z
              "
              fill="url(#bodyGrad)"
              stroke="#c49228"
              strokeWidth="1.4"
            />

            {/* Underbody / sill detail */}
            <path
              d="M 102 250 L 114 265 L 218 265 L 228 250"
              fill="none" stroke="rgba(196,146,40,0.25)" strokeWidth="1"
            />
            <path
              d="M 572 250 L 584 265 L 688 265 L 700 250"
              fill="none" stroke="rgba(196,146,40,0.25)" strokeWidth="1"
            />

            {/* ── Windshield ── */}
            <path
              d="M 304 110 L 362 80 L 448 79 L 448 110 Z"
              fill="url(#windowGrad)"
              stroke="rgba(196,146,40,0.55)"
              strokeWidth="1"
            />
            {/* Windshield reflection */}
            <line x1="325" y1="107" x2="372" y2="81" stroke="rgba(255,255,255,0.12)" strokeWidth="6" strokeLinecap="round" />

            {/* ── Front door window ── */}
            <path
              d="M 458 110 L 458 79 L 555 78 L 555 110 Z"
              fill="url(#windowGrad)"
              stroke="rgba(196,146,40,0.45)"
              strokeWidth="1"
            />

            {/* ── Rear door window ── */}
            <path
              d="M 565 110 L 565 78 L 620 79 Q 640 88 662 110 Z"
              fill="url(#windowGrad)"
              stroke="rgba(196,146,40,0.45)"
              strokeWidth="1"
            />

            {/* ── Hood crease lines ── */}
            <line x1="102" y1="192" x2="300" y2="118" stroke="rgba(196,146,40,0.22)" strokeWidth="1" />
            <line x1="116" y1="188" x2="300" y2="115" stroke="rgba(196,146,40,0.12)" strokeWidth="0.8" />

            {/* ── B-pillar (between doors) ── */}
            <rect x="452" y="79" width="9" height="172" fill="#12093c" />
            <line x1="456" y1="79" x2="456" y2="251" stroke="rgba(196,146,40,0.30)" strokeWidth="0.8" />

            {/* ── Door line (beltline crease) ── */}
            <line x1="310" y1="145" x2="665" y2="145" stroke="rgba(196,146,40,0.28)" strokeWidth="1" />

            {/* ── Door handle areas (decorative) ── */}
            <rect x="368" y="184" width="56" height="10" rx="5" fill="rgba(196,146,40,0.18)" stroke="rgba(196,146,40,0.45)" strokeWidth="0.8" />
            <rect x="530" y="184" width="56" height="10" rx="5" fill="rgba(196,146,40,0.18)" stroke="rgba(196,146,40,0.45)" strokeWidth="0.8" />

            {/* ── Side mirror ── */}
            <path d="M 280 128 L 282 118 L 308 118 L 308 132 L 282 135 Z" fill="#1a1248" stroke="rgba(196,146,40,0.5)" strokeWidth="1" />

            {/* ── Front grille ── */}
            <path d="M 26 214 L 28 204 L 72 200 L 72 214 Z" fill="rgba(0,0,0,0.4)" stroke="rgba(196,146,40,0.35)" strokeWidth="0.8" />
            {[208, 213, 218].map(y => (
              <line key={y} x1="30" y1={y} x2="70" y2={y} stroke="rgba(196,146,40,0.25)" strokeWidth="0.6" />
            ))}

            {/* ── Headlights ── */}
            <path d="M 65 168 L 128 162 L 130 186 L 65 192 Z" fill="rgba(220,210,140,0.22)" stroke="rgba(196,146,40,0.60)" strokeWidth="1" />
            <line x1="68" y1="174" x2="126" y2="168" stroke="rgba(255,240,180,0.35)" strokeWidth="1.5" />
            <line x1="68" y1="180" x2="126" y2="174" stroke="rgba(255,240,180,0.18)" strokeWidth="1" />

            {/* ── Rear tail-lights ── */}
            <path d="M 752 182 L 766 192 L 765 224 L 750 228 Z" fill="rgba(160,30,30,0.40)" stroke="rgba(196,146,40,0.40)" strokeWidth="1" />

            {/* ── Front tire ── */}
            <circle cx="170" cy="278" r="44" fill="#0a0820" stroke="#c49228" strokeWidth="1.2" />
            <circle cx="170" cy="278" r="32" fill="none" stroke="rgba(196,146,40,0.35)" strokeWidth="1" />
            <circle cx="170" cy="278" r="14" fill="#151038" stroke="rgba(196,146,40,0.50)" strokeWidth="1" />
            {[0, 60, 120, 180, 240, 300].map(deg => {
              const r = (deg * Math.PI) / 180;
              return (
                <line key={deg}
                  x1={170 + 15 * Math.cos(r)} y1={278 + 15 * Math.sin(r)}
                  x2={170 + 30 * Math.cos(r)} y2={278 + 30 * Math.sin(r)}
                  stroke="rgba(196,146,40,0.45)" strokeWidth="1.5"
                />
              );
            })}

            {/* ── Rear tire ── */}
            <circle cx="648" cy="278" r="44" fill="#0a0820" stroke="#c49228" strokeWidth="1.2" />
            <circle cx="648" cy="278" r="32" fill="none" stroke="rgba(196,146,40,0.35)" strokeWidth="1" />
            <circle cx="648" cy="278" r="14" fill="#151038" stroke="rgba(196,146,40,0.50)" strokeWidth="1" />
            {[0, 60, 120, 180, 240, 300].map(deg => {
              const r = (deg * Math.PI) / 180;
              return (
                <line key={deg}
                  x1={648 + 15 * Math.cos(r)} y1={278 + 15 * Math.sin(r)}
                  x2={648 + 30 * Math.cos(r)} y2={278 + 30 * Math.sin(r)}
                  stroke="rgba(196,146,40,0.45)" strokeWidth="1.5"
                />
              );
            })}

            {/* ── Clickable hotspots (transparent, on top) ── */}
            {HOT_SPOTS.map((spot, i) => {
              const isHov = hovered === spot.id;
              const isAct = active  === spot.id;
              const fill  = isAct  ? "rgba(196,146,40,0.22)"
                          : isHov  ? "rgba(196,146,40,0.15)"
                          : "rgba(196,146,40,0)";
              const stroke = (isHov || isAct) ? "rgba(196,146,40,0.70)" : "rgba(196,146,40,0)";

              const shared = {
                fill,
                stroke,
                strokeWidth: 1.5,
                strokeDasharray: "4 3",
                style: { cursor: "pointer", transition: "fill 0.18s, stroke 0.18s" } as React.CSSProperties,
                onMouseEnter: () => setHovered(spot.id),
                onMouseLeave: () => setHovered(null),
                onClick: () => setActive(active === spot.id ? null : spot.id),
              };

              if (spot.shape === "ellipse") {
                return <ellipse key={i} cx={spot.cx} cy={spot.cy} rx={spot.rx2} ry={spot.ry} {...shared} />;
              }
              return <rect key={i} x={spot.x} y={spot.y} width={spot.width} height={spot.height} rx={spot.rx} {...shared} />;
            })}

            {/* Hover tooltip label */}
            {hovered && (() => {
              const spot = HOT_SPOTS.find(s => s.id === hovered)!;
              const lx = spot.cx ?? (spot.x! + spot.width! / 2);
              const ly = (spot.cy ?? spot.y!) - 12;
              return (
                <g>
                  <rect x={lx - 70} y={ly - 18} width={140} height={22} rx={4} fill="rgba(11,8,23,0.88)" />
                  <text x={lx} y={ly - 2} textAnchor="middle" fontSize="11"
                    fill="#c49228" style={{ fontFamily: "var(--font-cinzel,'serif')", letterSpacing: "0.05em" }}>
                    {spot.label}
                  </text>
                </g>
              );
            })()}
          </svg>
        </div>

        {/* Part legend chips */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "18px", justifyContent: "center" }}>
          {(Object.keys(PART_LABELS) as CarPartId[]).map(id => (
            <button
              key={id}
              onClick={() => setActive(active === id ? null : id)}
              style={{
                fontFamily: "var(--font-cinzel)",
                fontSize: "10px",
                letterSpacing: "0.08em",
                padding: "5px 12px",
                borderRadius: "3px",
                border: `1px solid ${active === id ? "rgba(196,146,40,0.70)" : "rgba(196,146,40,0.28)"}`,
                background: active === id ? "rgba(196,146,40,0.14)" : "transparent",
                color: active === id ? "var(--gold)" : "var(--parchment-dim)",
                cursor: "pointer",
                transition: "all 0.18s",
              }}
            >
              {PART_LABELS[id]}
            </button>
          ))}
        </div>
      </div>

      {/* ── Guide panel ── */}
      {active && (
        <div className="magic-card" style={{ marginTop: "16px" }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "16px" }}>
            <div className="section-title" style={{ margin: 0 }}>
              <span>⚜</span> {PART_LABELS[active]}
            </div>
            <button
              onClick={() => setActive(null)}
              style={{
                background: "none", border: "none", color: "var(--parchment-dim)",
                fontSize: "18px", cursor: "pointer", padding: "0 4px", lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>

          <div style={{
            background: "rgba(196,146,40,0.06)",
            border: "1px solid rgba(196,146,40,0.22)",
            borderRadius: "4px",
            padding: "10px 14px",
            marginBottom: "20px",
            fontFamily: "var(--font-crimson)",
            fontSize: "13px",
            color: "var(--parchment-dim)",
            fontStyle: "italic",
          }}>
            ⚠ Always confirm torque specs against your owner&apos;s manual before doing the work.
          </div>

          {guides.map((guide, gi) => (
            <div key={guide.id} style={{ marginBottom: gi < guides.length - 1 ? "28px" : 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px", flexWrap: "wrap" }}>
                <span style={{
                  fontFamily: "var(--font-cinzel)",
                  fontSize: "14px",
                  color: "var(--parchment)",
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                }}>
                  {guide.title}
                </span>
                {!guide.verified && (
                  <span style={{
                    fontFamily: "var(--font-crimson)",
                    fontSize: "11px",
                    color: "#b87820",
                    background: "rgba(184,120,32,0.14)",
                    border: "1px solid rgba(184,120,32,0.35)",
                    borderRadius: "3px",
                    padding: "2px 8px",
                    fontStyle: "italic",
                  }}>
                    researched — verify before doing
                  </span>
                )}
              </div>

              {guide.note && (
                <p style={{
                  fontFamily: "var(--font-crimson)", fontSize: "14px",
                  color: "var(--parchment-dim)", fontStyle: "italic",
                  marginBottom: "12px", lineHeight: 1.5,
                }}>
                  {guide.note}
                </p>
              )}

              {guide.tools.length > 0 && (
                <div style={{ marginBottom: "12px" }}>
                  <span style={{
                    fontFamily: "var(--font-cinzel)", fontSize: "10px",
                    color: "var(--gold)", letterSpacing: "0.14em",
                    textTransform: "uppercase", opacity: 0.80,
                  }}>
                    Tools
                  </span>
                  <p style={{ fontFamily: "var(--font-crimson)", fontSize: "14px", color: "var(--parchment)", marginTop: "4px" }}>
                    {guide.tools.join(" · ")}
                  </p>
                </div>
              )}

              {guide.parts.length > 0 && (
                <div style={{ marginBottom: "14px" }}>
                  <span style={{
                    fontFamily: "var(--font-cinzel)", fontSize: "10px",
                    color: "var(--gold)", letterSpacing: "0.14em",
                    textTransform: "uppercase", opacity: 0.80,
                  }}>
                    Parts
                  </span>
                  {guide.parts.map((p, pi) => (
                    <div key={pi} style={{
                      fontFamily: "var(--font-crimson)", fontSize: "14px",
                      color: "var(--parchment)", marginTop: "4px", lineHeight: 1.5,
                    }}>
                      {p.name}
                      {p.partNumber && (
                        <span style={{ color: "var(--gold)", opacity: 0.85 }}> — {p.partNumber}</span>
                      )}
                      {p.cost && (
                        <span style={{ color: "var(--parchment-dim)", fontStyle: "italic" }}> {p.cost}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <span style={{
                fontFamily: "var(--font-cinzel)", fontSize: "10px",
                color: "var(--gold)", letterSpacing: "0.14em",
                textTransform: "uppercase", opacity: 0.80,
              }}>
                Steps
              </span>
              <ol style={{ margin: "8px 0 0 18px", padding: 0 }}>
                {guide.steps.map((step, si) => (
                  <li key={si} style={{
                    fontFamily: "var(--font-crimson)", fontSize: "15px",
                    color: "var(--parchment)", lineHeight: 1.65,
                    marginBottom: "5px",
                  }}>
                    {step}
                  </li>
                ))}
              </ol>

              {gi < guides.length - 1 && <hr className="gold-rule" style={{ marginTop: "24px" }} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
