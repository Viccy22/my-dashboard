export default function Banner() {
  return (
    <div
      role="img"
      aria-label="Night sky with castle silhouette on the left and snow-capped mountains on the right"
      style={{
        width: "100%",
        height: "170px",
        flexShrink: 0,
        overflow: "hidden",
        borderBottom: "1px solid rgba(196, 146, 40, 0.22)",
      }}
    >
      <svg
        viewBox="0 0 1600 170"
        width="100%"
        height="170"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: "block" }}
      >
        <defs>
          {/* Sky: clearly visible deep violet — silhouettes must be blacker than this */}
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#100c30" />
            <stop offset="40%"  stopColor="#1e1455" />
            <stop offset="75%"  stopColor="#160e40" />
            <stop offset="100%" stopColor="#0c0820" />
          </linearGradient>

          {/* Moon inner glow */}
          <radialGradient id="moonBody" cx="40%" cy="38%" r="60%">
            <stop offset="0%"   stopColor="#f0e8cc" />
            <stop offset="100%" stopColor="#c8bc88" />
          </radialGradient>

          {/* Moon halo — large soft bloom */}
          <radialGradient id="moonHalo" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#b8a870" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#b8a870" stopOpacity="0" />
          </radialGradient>

          {/* Candlelight window glow */}
          <radialGradient id="winGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#ffb020" stopOpacity="0.80" />
            <stop offset="100%" stopColor="#ffb020" stopOpacity="0" />
          </radialGradient>

          {/* Warm torch-glow haze behind castle */}
          <radialGradient id="castleGlow" cx="50%" cy="100%" r="60%">
            <stop offset="0%"   stopColor="#602010" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#602010" stopOpacity="0" />
          </radialGradient>

          {/* Magical horizon glow behind mountains */}
          <radialGradient id="mtGlow" cx="50%" cy="100%" r="65%">
            <stop offset="0%"   stopColor="#6020a0" stopOpacity="0.30" />
            <stop offset="100%" stopColor="#6020a0" stopOpacity="0" />
          </radialGradient>

          {/* Star soft glow filter */}
          <filter id="sg" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="0.5" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>

          {/* Gold bottom rule */}
          <linearGradient id="goldRule" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#c49228" stopOpacity="0" />
            <stop offset="18%"  stopColor="#c49228" stopOpacity="0.78" />
            <stop offset="82%"  stopColor="#c49228" stopOpacity="0.78" />
            <stop offset="100%" stopColor="#c49228" stopOpacity="0" />
          </linearGradient>

          {/* Vignette left/right */}
          <linearGradient id="vL" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#100c30" stopOpacity="0.88" />
            <stop offset="100%" stopColor="#100c30" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="vR" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#100c30" stopOpacity="0" />
            <stop offset="100%" stopColor="#100c30" stopOpacity="0.88" />
          </linearGradient>
        </defs>

        {/* ── Sky ── */}
        <rect width="1600" height="170" fill="url(#sky)" />

        {/* Atmospheric glow behind castle (warm) */}
        <ellipse cx="280" cy="170" rx="320" ry="110" fill="url(#castleGlow)" />

        {/* Atmospheric glow behind mountains (violet-magic) */}
        <ellipse cx="1380" cy="170" rx="380" ry="120" fill="url(#mtGlow)" />

        {/* ── Stars ── */}
        {/* Bright, glow-filtered */}
        <circle cx="490"  cy="16" r="1.4" fill="#e8dfc0" opacity="0.95" filter="url(#sg)" />
        <circle cx="582"  cy="10" r="1.2" fill="#e8dfc0" opacity="0.90" filter="url(#sg)" />
        <circle cx="668"  cy="14" r="1.3" fill="#e8dfc0" opacity="0.92" filter="url(#sg)" />
        <circle cx="795"  cy="8"  r="1.1" fill="#e8dfc0" opacity="0.88" filter="url(#sg)" />
        <circle cx="880"  cy="16" r="1.2" fill="#e8dfc0" opacity="0.90" filter="url(#sg)" />
        <circle cx="965"  cy="12" r="1.0" fill="#e8dfc0" opacity="0.85" filter="url(#sg)" />
        <circle cx="1052" cy="16" r="1.1" fill="#e8dfc0" opacity="0.88" filter="url(#sg)" />
        <circle cx="1456" cy="10" r="1.0" fill="#e8dfc0" opacity="0.82" filter="url(#sg)" />
        {/* Medium */}
        <circle cx="535"  cy="30" r="0.9" fill="#e8dfc0" opacity="0.78" />
        <circle cx="625"  cy="24" r="0.8" fill="#e8dfc0" opacity="0.72" />
        <circle cx="712"  cy="38" r="0.8" fill="#e8dfc0" opacity="0.70" />
        <circle cx="752"  cy="20" r="0.9" fill="#e8dfc0" opacity="0.76" />
        <circle cx="838"  cy="28" r="0.8" fill="#e8dfc0" opacity="0.70" />
        <circle cx="922"  cy="33" r="0.8" fill="#e8dfc0" opacity="0.72" />
        <circle cx="1008" cy="24" r="0.7" fill="#e8dfc0" opacity="0.65" />
        <circle cx="1098" cy="9"  r="0.8" fill="#e8dfc0" opacity="0.75" />
        <circle cx="1142" cy="28" r="0.9" fill="#e8dfc0" opacity="0.76" />
        <circle cx="1310" cy="12" r="0.8" fill="#e8dfc0" opacity="0.60" />
        <circle cx="1380" cy="22" r="0.7" fill="#e8dfc0" opacity="0.52" />
        {/* Dim fill stars */}
        <circle cx="510"  cy="46" r="0.5" fill="#e8dfc0" opacity="0.40" />
        <circle cx="556"  cy="54" r="0.4" fill="#e8dfc0" opacity="0.32" />
        <circle cx="600"  cy="42" r="0.5" fill="#e8dfc0" opacity="0.38" />
        <circle cx="648"  cy="50" r="0.4" fill="#e8dfc0" opacity="0.30" />
        <circle cx="696"  cy="60" r="0.5" fill="#e8dfc0" opacity="0.34" />
        <circle cx="738"  cy="46" r="0.4" fill="#e8dfc0" opacity="0.30" />
        <circle cx="780"  cy="62" r="0.5" fill="#e8dfc0" opacity="0.34" />
        <circle cx="858"  cy="50" r="0.5" fill="#e8dfc0" opacity="0.34" />
        <circle cx="904"  cy="58" r="0.4" fill="#e8dfc0" opacity="0.28" />
        <circle cx="950"  cy="42" r="0.5" fill="#e8dfc0" opacity="0.36" />
        <circle cx="996"  cy="54" r="0.4" fill="#e8dfc0" opacity="0.30" />
        <circle cx="1088" cy="48" r="0.4" fill="#e8dfc0" opacity="0.28" />
        <circle cx="1132" cy="40" r="0.5" fill="#e8dfc0" opacity="0.34" />
        {/* Stars above castle */}
        <circle cx="160"  cy="16" r="0.8" fill="#e8dfc0" opacity="0.52" />
        <circle cx="265"  cy="10" r="0.7" fill="#e8dfc0" opacity="0.46" />
        <circle cx="370"  cy="14" r="0.8" fill="#e8dfc0" opacity="0.44" />
        <circle cx="440"  cy="22" r="0.6" fill="#e8dfc0" opacity="0.38" />

        {/* ── Crescent moon ── */}
        <circle cx="820" cy="50" r="70"  fill="url(#moonHalo)" />
        <circle cx="820" cy="50" r="42"  fill="url(#moonHalo)" />
        <circle cx="820" cy="50" r="24"  fill="url(#moonBody)" opacity="0.94" />
        {/* Shadow circle — cutout makes the crescent */}
        <circle cx="835" cy="44" r="19.5" fill="#160e40" />

        {/* ══════════════════════════════════════════
            CASTLE SILHOUETTE
            Key: near-black (#06030e) against visible violet sky
            T1 = battlemented tower (far left)
            T2 = CENTRAL TOWER with tall SPIRE — main "castle" read
            T3 = medium tower with spire (right of centre)
            T4 = shorter battlemented tower (far right of castle)
            Walls at y≈108 connect towers; ground fades right
            ══════════════════════════════════════════ */}

        {/* Castle base walls + T1 + T4 battlements */}
        <path
          fill="#06030e"
          d="
            M 0 170
            L 0 52
            L 12 52  L 12 40  L 28 40  L 28 52
            L 40 52  L 40 40  L 56 40  L 56 52
            L 68 52  L 68 40  L 84 40  L 84 52
            L 90 52
            L 90 108
            L 112 108
            L 112 108
            L 218 108
            L 218 78
            L 228 78  L 228 66  L 244 66  L 244 78
            L 256 78  L 256 66  L 272 66  L 272 78
            L 284 78  L 284 66  L 300 66  L 300 78
            L 308 78
            L 308 108
            L 326 108
            L 326 90
            L 336 90  L 336 78  L 350 78  L 350 90
            L 362 90  L 362 78  L 376 78  L 376 90
            L 382 90
            L 382 112
            L 425 122
            L 472 136
            L 508 148
            L 516 170
            Z
          "
        />

        {/* T2 body — tallest tower with spire (x=112-218) */}
        <path
          fill="#06030e"
          d="
            M 112 108
            L 112 62
            L 124 62  L 124 50  L 140 50  L 140 62
            L 154 62  L 154 50  L 170 50  L 170 62
            L 184 62  L 184 50  L 200 50  L 200 62
            L 218 62
            L 218 108
            Z
          "
        />

        {/* T2 SPIRE — the hero element that screams "castle" */}
        <polygon points="112,62  165,6  218,62" fill="#06030e" />

        {/* T2 spire: faint highlight on left face for depth */}
        <polygon points="112,62  165,6  138,34" fill="rgba(180,140,80,0.07)" />

        {/* Garnet pennant at spire tip */}
        <polygon points="165,6  165,24  182,15" fill="#7a1b2c" opacity="0.90" />

        {/* T3 smaller spire (x=218-308) */}
        <polygon points="218,78  263,34  308,78" fill="#06030e" />

        {/* Castle windows — bright amber */}
        {/* T1 arched window */}
        <rect x="33"  y="64"  width="22" height="30" rx="11" fill="#ffb020" opacity="0.72" />
        <rect x="33"  y="64"  width="22" height="30" rx="11" fill="url(#winGlow)" />

        {/* T2 windows (left + right of centre) */}
        <rect x="126" y="74"  width="18" height="26" rx="9"  fill="#ffb020" opacity="0.65" />
        <rect x="126" y="74"  width="18" height="26" rx="9"  fill="url(#winGlow)" />
        <rect x="168" y="76"  width="18" height="24" rx="9"  fill="#ffb020" opacity="0.68" />
        <rect x="168" y="76"  width="18" height="24" rx="9"  fill="url(#winGlow)" />

        {/* T3 window */}
        <rect x="245" y="86"  width="16" height="20" rx="8"  fill="#ffb020" opacity="0.58" />

        {/* Gate arch between T1 and T2 */}
        <path d="M 90 108 Q 101 90 112 108" fill="#ffb020" opacity="0.12" />

        {/* ══════════════════════════════════════════
            MOUNTAIN SILHOUETTE
            Clear triangular peaks, bright snow caps
            ══════════════════════════════════════════ */}
        <path
          fill="#06030e"
          d="
            M 1165 170
            L 1248 98
            L 1288 122
            L 1338 56
            L 1376 84
            L 1422 28
            L 1464 66
            L 1512 40
            L 1556 72
            L 1600 44
            L 1600 170
            Z
          "
        />

        {/* Snow caps — bright white/cream, clearly visible */}
        <polygon points="1422,28  1396,64  1448,64"  fill="#f2ead4" opacity="0.82" />
        <polygon points="1512,40  1488,70  1536,70"  fill="#f2ead4" opacity="0.70" />
        <polygon points="1338,56  1314,84  1362,84"  fill="#f2ead4" opacity="0.65" />
        <polygon points="1248,98  1228,122 1268,122" fill="#f2ead4" opacity="0.52" />
        <polygon points="1600,44  1576,72  1600,72"  fill="#f2ead4" opacity="0.42" />

        {/* ── Centre text ── */}
        <text
          x="800" y="84"
          textAnchor="middle"
          fontSize="25"
          letterSpacing="10"
          fill="#eddfc0"
          opacity="0.86"
          style={{ fontFamily: "var(--font-cinzel, 'Times New Roman', serif)", fontWeight: 700 }}
        >
          MY DASHBOARD
        </text>
        <text
          x="800" y="106"
          textAnchor="middle"
          fontSize="11"
          letterSpacing="5"
          fill="#c49228"
          opacity="0.68"
          style={{ fontFamily: "var(--font-cinzel, 'Times New Roman', serif)" }}
        >
          ✦  arcane library  ✦
        </text>

        {/* Gold line at base of banner */}
        <line x1="0" y1="168.5" x2="1600" y2="168.5"
          stroke="url(#goldRule)" strokeWidth="0.8" />

        {/* Side vignettes */}
        <rect x="0"    y="0" width="150" height="170" fill="url(#vL)" />
        <rect x="1450" y="0" width="150" height="170" fill="url(#vR)" />
      </svg>
    </div>
  );
}
