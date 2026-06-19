// Photos via Unsplash (free license)
// Castle: Alnwick Castle (Hogwarts filming location) — Swati Kedia
// Mountains: Zermatt + Matterhorn under the Milky Way (real-world Velaris) — Cheng Lin

const CASTLE_IMG =
  "https://images.unsplash.com/photo-1651046895371-0036c0790795?w=960&h=340&fit=crop&q=88&auto=format";

const VELARIS_IMG =
  "https://images.unsplash.com/photo-1750375502807-2c73a829f182?w=960&h=340&fit=crop&q=88&auto=format";

export default function Banner() {
  return (
    <div
      aria-label="Banner: Alnwick Castle (Hogwarts) on the left, Zermatt mountains at night (Velaris) on the right"
      role="img"
      style={{
        width: "100%",
        height: "170px",
        flexShrink: 0,
        position: "relative",
        overflow: "hidden",
        background: "#0b0817",
        borderBottom: "1px solid rgba(196, 146, 40, 0.22)",
      }}
    >
      {/* ── Left: Alnwick Castle (Harry Potter) ── */}
      <div style={{
        position: "absolute",
        inset: 0,
        left: 0,
        width: "46%",
        backgroundImage: `
          linear-gradient(to right, rgba(11,8,23,0.30) 0%, rgba(11,8,23,0.70) 100%),
          url('${CASTLE_IMG}')
        `,
        backgroundSize: "cover",
        backgroundPosition: "center 28%",
        // Daytime photo → push it to night: darken + desaturate + slight cool shift
        filter: "brightness(0.40) contrast(1.20) saturate(0.55) hue-rotate(195deg)",
      }} />

      {/* ── Right: Zermatt / Matterhorn (Velaris) ── */}
      <div style={{
        position: "absolute",
        inset: 0,
        left: "54%",
        backgroundImage: `
          linear-gradient(to left, rgba(11,8,23,0.25) 0%, rgba(11,8,23,0.65) 100%),
          url('${VELARIS_IMG}')
        `,
        backgroundSize: "cover",
        backgroundPosition: "center 35%",
        // Night photo already dark; just lift contrast + saturation a touch
        filter: "brightness(0.70) contrast(1.10) saturate(1.15)",
      }} />

      {/* ── Dark centre seam: both photos fade into the title area ── */}
      <div style={{
        position: "absolute",
        inset: 0,
        background: `linear-gradient(to right,
          rgba(11,8,23,0.0)  0%,
          rgba(11,8,23,0.0)  28%,
          rgba(11,8,23,0.82) 42%,
          rgba(11,8,23,0.92) 50%,
          rgba(11,8,23,0.82) 58%,
          rgba(11,8,23,0.0)  72%,
          rgba(11,8,23,0.0)  100%
        )`,
      }} />

      {/* ── Top vignette: blends both photos into the dark top edge ── */}
      <div style={{
        position: "absolute",
        inset: 0,
        background: "linear-gradient(to bottom, rgba(11,8,23,0.55) 0%, transparent 40%)",
      }} />

      {/* ── SVG overlay: extra stars + title text + gold rule ── */}
      <svg
        viewBox="0 0 1600 170"
        width="100%"
        height="170"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
        style={{ position: "absolute", inset: 0, display: "block" }}
      >
        <defs>
          <filter id="sg" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="0.55" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <linearGradient id="gr" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#c49228" stopOpacity="0" />
            <stop offset="18%"  stopColor="#c49228" stopOpacity="0.75" />
            <stop offset="82%"  stopColor="#c49228" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#c49228" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Stars in the centre-sky gap (where photos fade) */}
        {/* Bright with glow */}
        <circle cx="680"  cy="14" r="1.3" fill="#e8dfc0" opacity="0.92" filter="url(#sg)" />
        <circle cx="730"  cy="28" r="1.0" fill="#e8dfc0" opacity="0.85" filter="url(#sg)" />
        <circle cx="780"  cy="9"  r="1.2" fill="#e8dfc0" opacity="0.90" filter="url(#sg)" />
        <circle cx="830"  cy="22" r="1.0" fill="#e8dfc0" opacity="0.88" filter="url(#sg)" />
        <circle cx="880"  cy="12" r="1.3" fill="#e8dfc0" opacity="0.92" filter="url(#sg)" />
        <circle cx="920"  cy="32" r="0.9" fill="#e8dfc0" opacity="0.80" filter="url(#sg)" />
        {/* Medium */}
        <circle cx="700"  cy="40" r="0.8" fill="#e8dfc0" opacity="0.72" />
        <circle cx="748"  cy="50" r="0.7" fill="#e8dfc0" opacity="0.65" />
        <circle cx="798"  cy="36" r="0.8" fill="#e8dfc0" opacity="0.70" />
        <circle cx="848"  cy="48" r="0.7" fill="#e8dfc0" opacity="0.65" />
        <circle cx="896"  cy="38" r="0.8" fill="#e8dfc0" opacity="0.70" />
        {/* Dim fill */}
        <circle cx="665"  cy="56" r="0.5" fill="#e8dfc0" opacity="0.40" />
        <circle cx="712"  cy="62" r="0.4" fill="#e8dfc0" opacity="0.32" />
        <circle cx="758"  cy="54" r="0.5" fill="#e8dfc0" opacity="0.38" />
        <circle cx="808"  cy="58" r="0.4" fill="#e8dfc0" opacity="0.32" />
        <circle cx="858"  cy="52" r="0.5" fill="#e8dfc0" opacity="0.36" />
        <circle cx="906"  cy="60" r="0.4" fill="#e8dfc0" opacity="0.30" />
        <circle cx="952"  cy="44" r="0.5" fill="#e8dfc0" opacity="0.34" />

        {/* Extra stars scattered over the castle photo area */}
        <circle cx="120"  cy="18" r="0.9" fill="#e8dfc0" opacity="0.58" filter="url(#sg)" />
        <circle cx="200"  cy="10" r="0.8" fill="#e8dfc0" opacity="0.52" />
        <circle cx="280"  cy="22" r="0.7" fill="#e8dfc0" opacity="0.46" />
        <circle cx="360"  cy="12" r="0.9" fill="#e8dfc0" opacity="0.54" filter="url(#sg)" />
        <circle cx="440"  cy="28" r="0.7" fill="#e8dfc0" opacity="0.44" />
        <circle cx="520"  cy="16" r="0.8" fill="#e8dfc0" opacity="0.50" />
        <circle cx="580"  cy="38" r="0.6" fill="#e8dfc0" opacity="0.40" />
        <circle cx="150"  cy="44" r="0.5" fill="#e8dfc0" opacity="0.34" />
        <circle cx="310"  cy="52" r="0.4" fill="#e8dfc0" opacity="0.28" />
        <circle cx="490"  cy="46" r="0.5" fill="#e8dfc0" opacity="0.32" />

        {/* Extra stars over the Velaris/mountain photo area */}
        <circle cx="1050" cy="14" r="1.0" fill="#e8dfc0" opacity="0.70" filter="url(#sg)" />
        <circle cx="1120" cy="26" r="0.9" fill="#e8dfc0" opacity="0.65" />
        <circle cx="1180" cy="10" r="1.1" fill="#e8dfc0" opacity="0.72" filter="url(#sg)" />
        <circle cx="1240" cy="20" r="0.8" fill="#e8dfc0" opacity="0.62" />
        <circle cx="1300" cy="8"  r="1.0" fill="#e8dfc0" opacity="0.68" filter="url(#sg)" />
        <circle cx="1360" cy="30" r="0.8" fill="#e8dfc0" opacity="0.60" />
        <circle cx="1420" cy="16" r="0.9" fill="#e8dfc0" opacity="0.65" />
        <circle cx="1480" cy="24" r="0.8" fill="#e8dfc0" opacity="0.58" />
        <circle cx="1540" cy="12" r="1.0" fill="#e8dfc0" opacity="0.65" filter="url(#sg)" />
        <circle cx="1080" cy="42" r="0.5" fill="#e8dfc0" opacity="0.38" />
        <circle cx="1140" cy="50" r="0.4" fill="#e8dfc0" opacity="0.30" />
        <circle cx="1200" cy="38" r="0.5" fill="#e8dfc0" opacity="0.36" />
        <circle cx="1260" cy="48" r="0.4" fill="#e8dfc0" opacity="0.28" />
        <circle cx="1320" cy="34" r="0.5" fill="#e8dfc0" opacity="0.34" />
        <circle cx="1390" cy="44" r="0.4" fill="#e8dfc0" opacity="0.30" />
        <circle cx="1450" cy="36" r="0.5" fill="#e8dfc0" opacity="0.34" />
        <circle cx="1510" cy="46" r="0.4" fill="#e8dfc0" opacity="0.28" />

        {/* Title */}
        <text
          x="800" y="84"
          textAnchor="middle"
          fontSize="25"
          letterSpacing="10"
          fill="#eddfc0"
          opacity="0.90"
          style={{ fontFamily: "var(--font-cinzel, 'Times New Roman', serif)", fontWeight: 700 }}
        >
          MY DASHBOARD
        </text>
        <text
          x="800" y="108"
          textAnchor="middle"
          fontSize="11"
          letterSpacing="5"
          fill="#c49228"
          opacity="0.72"
          style={{ fontFamily: "var(--font-cinzel, 'Times New Roman', serif)" }}
        >
          ✦  arcane library  ✦
        </text>

        {/* Gold base rule */}
        <line x1="0" y1="168.5" x2="1600" y2="168.5" stroke="url(#gr)" strokeWidth="0.8" />
      </svg>
    </div>
  );
}
