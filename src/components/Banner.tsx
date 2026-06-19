export default function Banner() {
  return (
    <div
      role="img"
      aria-label="Illustrated night banner: Hogwarts-style castle on the left, Velaris mountains with city glow on the right"
      style={{
        width: "100%",
        height: "190px",
        flexShrink: 0,
        overflow: "hidden",
        borderBottom: "1px solid rgba(196,146,40,0.22)",
      }}
    >
      <svg
        viewBox="0 0 1600 190"
        width="100%"
        height="190"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: "block" }}
      >
        <defs>
          {/* Sky: rich deep violet — clearly visible, NOT black */}
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#12084e" />
            <stop offset="30%"  stopColor="#261478" />
            <stop offset="65%"  stopColor="#1c0f60" />
            <stop offset="100%" stopColor="#100840" />
          </linearGradient>

          {/* Moon face */}
          <radialGradient id="moonFace" cx="40%" cy="35%" r="62%">
            <stop offset="0%"   stopColor="#fdf6e0" />
            <stop offset="80%"  stopColor="#e0d090" />
            <stop offset="100%" stopColor="#c8b870" />
          </radialGradient>

          {/* Moon wide halo */}
          <radialGradient id="moonHalo" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#d4b84a" stopOpacity="0.20" />
            <stop offset="100%" stopColor="#d4b84a" stopOpacity="0" />
          </radialGradient>

          {/* Castle window glow */}
          <radialGradient id="win" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#ffb820" stopOpacity="1.0" />
            <stop offset="100%" stopColor="#ff8800" stopOpacity="0" />
          </radialGradient>

          {/* Velaris city-of-starlight glow */}
          <radialGradient id="cityGlow" cx="50%" cy="0%" r="80%">
            <stop offset="0%"   stopColor="#e8980c" stopOpacity="0.55" />
            <stop offset="60%"  stopColor="#c06010" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#c06010" stopOpacity="0" />
          </radialGradient>

          {/* Castle base torch warmth */}
          <radialGradient id="torchGlow" cx="50%" cy="0%" r="80%">
            <stop offset="0%"   stopColor="#c05010" stopOpacity="0.30" />
            <stop offset="100%" stopColor="#c05010" stopOpacity="0" />
          </radialGradient>

          {/* Star soft-glow filter */}
          <filter id="sg" x="-150%" y="-150%" width="400%" height="400%">
            <feGaussianBlur stdDeviation="0.6" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          {/* Bigger sparkle */}
          <filter id="sp" x="-200%" y="-200%" width="500%" height="500%">
            <feGaussianBlur stdDeviation="1.2" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>

          {/* Gold bottom line */}
          <linearGradient id="gr" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#c49228" stopOpacity="0"/>
            <stop offset="16%"  stopColor="#c49228" stopOpacity="0.80"/>
            <stop offset="84%"  stopColor="#c49228" stopOpacity="0.80"/>
            <stop offset="100%" stopColor="#c49228" stopOpacity="0"/>
          </linearGradient>
        </defs>

        {/* ── RICH VIOLET SKY ── */}
        <rect width="1600" height="190" fill="url(#sky)" />

        {/* Subtle mid-sky lighter band for depth */}
        <rect x="0" y="55" width="1600" height="30" fill="rgba(80,50,160,0.10)" />

        {/* ════════════════════════════════
            STARS — large quantity, all sizes
            ════════════════════════════════ */}

        {/* Hero sparkle stars (largest) */}
        <circle cx="672"  cy="12" r="2.2" fill="#ffffff" opacity="0.96" filter="url(#sp)"/>
        <circle cx="848"  cy="8"  r="2.4" fill="#ffffff" opacity="0.94" filter="url(#sp)"/>
        <circle cx="1028" cy="16" r="2.0" fill="#ffffff" opacity="0.92" filter="url(#sp)"/>
        <circle cx="480"  cy="20" r="1.8" fill="#ffffff" opacity="0.88" filter="url(#sp)"/>
        <circle cx="1200" cy="10" r="1.8" fill="#ffffff" opacity="0.88" filter="url(#sp)"/>
        <circle cx="1440" cy="18" r="2.0" fill="#ffffff" opacity="0.90" filter="url(#sp)"/>

        {/* Bright medium stars */}
        <circle cx="524"  cy="11" r="1.3" fill="#e8dfc0" opacity="0.90" filter="url(#sg)"/>
        <circle cx="568"  cy="28" r="1.1" fill="#e8dfc0" opacity="0.86" filter="url(#sg)"/>
        <circle cx="612"  cy="16" r="1.2" fill="#e8dfc0" opacity="0.88" filter="url(#sg)"/>
        <circle cx="650"  cy="36" r="1.0" fill="#e8dfc0" opacity="0.82" filter="url(#sg)"/>
        <circle cx="706"  cy="22" r="1.2" fill="#e8dfc0" opacity="0.86" filter="url(#sg)"/>
        <circle cx="750"  cy="10" r="1.1" fill="#e8dfc0" opacity="0.88" filter="url(#sg)"/>
        <circle cx="792"  cy="30" r="1.0" fill="#e8dfc0" opacity="0.82" filter="url(#sg)"/>
        <circle cx="832"  cy="18" r="1.2" fill="#e8dfc0" opacity="0.86" filter="url(#sg)"/>
        <circle cx="878"  cy="34" r="1.0" fill="#e8dfc0" opacity="0.80" filter="url(#sg)"/>
        <circle cx="920"  cy="14" r="1.1" fill="#e8dfc0" opacity="0.85" filter="url(#sg)"/>
        <circle cx="966"  cy="26" r="1.0" fill="#e8dfc0" opacity="0.82" filter="url(#sg)"/>
        <circle cx="1010" cy="38" r="1.1" fill="#e8dfc0" opacity="0.80" filter="url(#sg)"/>
        <circle cx="1058" cy="14" r="1.0" fill="#e8dfc0" opacity="0.84" filter="url(#sg)"/>
        <circle cx="1100" cy="28" r="1.1" fill="#e8dfc0" opacity="0.82" filter="url(#sg)"/>
        <circle cx="1148" cy="12" r="1.0" fill="#e8dfc0" opacity="0.85" filter="url(#sg)"/>
        <circle cx="1186" cy="32" r="1.1" fill="#e8dfc0" opacity="0.80" filter="url(#sg)"/>
        <circle cx="1234" cy="20" r="1.0" fill="#e8dfc0" opacity="0.82" filter="url(#sg)"/>
        <circle cx="1282" cy="36" r="1.1" fill="#e8dfc0" opacity="0.78" filter="url(#sg)"/>
        <circle cx="1322" cy="14" r="1.0" fill="#e8dfc0" opacity="0.82" filter="url(#sg)"/>
        <circle cx="1368" cy="28" r="1.1" fill="#e8dfc0" opacity="0.80" filter="url(#sg)"/>
        <circle cx="1408" cy="12" r="1.0" fill="#e8dfc0" opacity="0.84" filter="url(#sg)"/>
        <circle cx="1458" cy="30" r="1.1" fill="#e8dfc0" opacity="0.78" filter="url(#sg)"/>
        <circle cx="1502" cy="16" r="1.0" fill="#e8dfc0" opacity="0.82" filter="url(#sg)"/>
        <circle cx="1552" cy="26" r="1.1" fill="#e8dfc0" opacity="0.78" filter="url(#sg)"/>
        <circle cx="1592" cy="10" r="1.0" fill="#e8dfc0" opacity="0.80" filter="url(#sg)"/>
        {/* Above castle */}
        <circle cx="110"  cy="16" r="1.1" fill="#e8dfc0" opacity="0.70" filter="url(#sg)"/>
        <circle cx="168"  cy="8"  r="1.0" fill="#e8dfc0" opacity="0.66" filter="url(#sg)"/>
        <circle cx="224"  cy="22" r="1.1" fill="#e8dfc0" opacity="0.68" filter="url(#sg)"/>
        <circle cx="290"  cy="11" r="1.0" fill="#e8dfc0" opacity="0.65" filter="url(#sg)"/>
        <circle cx="350"  cy="26" r="1.0" fill="#e8dfc0" opacity="0.62" filter="url(#sg)"/>
        <circle cx="416"  cy="14" r="1.1" fill="#e8dfc0" opacity="0.64" filter="url(#sg)"/>

        {/* Small dim fill stars — everywhere */}
        <circle cx="505"  cy="46" r="0.6" fill="#e8dfc0" opacity="0.44"/>
        <circle cx="542"  cy="58" r="0.5" fill="#e8dfc0" opacity="0.36"/>
        <circle cx="586"  cy="44" r="0.6" fill="#e8dfc0" opacity="0.42"/>
        <circle cx="626"  cy="60" r="0.5" fill="#e8dfc0" opacity="0.36"/>
        <circle cx="668"  cy="50" r="0.6" fill="#e8dfc0" opacity="0.40"/>
        <circle cx="712"  cy="64" r="0.5" fill="#e8dfc0" opacity="0.34"/>
        <circle cx="756"  cy="50" r="0.6" fill="#e8dfc0" opacity="0.40"/>
        <circle cx="800"  cy="68" r="0.5" fill="#e8dfc0" opacity="0.34"/>
        <circle cx="840"  cy="54" r="0.6" fill="#e8dfc0" opacity="0.38"/>
        <circle cx="886"  cy="46" r="0.5" fill="#e8dfc0" opacity="0.36"/>
        <circle cx="928"  cy="60" r="0.6" fill="#e8dfc0" opacity="0.40"/>
        <circle cx="974"  cy="48" r="0.5" fill="#e8dfc0" opacity="0.38"/>
        <circle cx="1018" cy="62" r="0.6" fill="#e8dfc0" opacity="0.38"/>
        <circle cx="1062" cy="46" r="0.5" fill="#e8dfc0" opacity="0.36"/>
        <circle cx="1106" cy="58" r="0.6" fill="#e8dfc0" opacity="0.38"/>
        <circle cx="1152" cy="44" r="0.5" fill="#e8dfc0" opacity="0.36"/>
        <circle cx="1196" cy="58" r="0.6" fill="#e8dfc0" opacity="0.38"/>
        <circle cx="1242" cy="46" r="0.5" fill="#e8dfc0" opacity="0.34"/>
        <circle cx="1288" cy="58" r="0.6" fill="#e8dfc0" opacity="0.36"/>
        <circle cx="1332" cy="46" r="0.5" fill="#e8dfc0" opacity="0.34"/>
        <circle cx="1378" cy="58" r="0.6" fill="#e8dfc0" opacity="0.36"/>
        <circle cx="1422" cy="48" r="0.5" fill="#e8dfc0" opacity="0.34"/>
        <circle cx="1468" cy="58" r="0.6" fill="#e8dfc0" opacity="0.34"/>
        <circle cx="1514" cy="44" r="0.5" fill="#e8dfc0" opacity="0.34"/>
        <circle cx="1562" cy="56" r="0.6" fill="#e8dfc0" opacity="0.34"/>
        {/* Above castle dim */}
        <circle cx="90"   cy="34" r="0.6" fill="#e8dfc0" opacity="0.38"/>
        <circle cx="142"  cy="46" r="0.5" fill="#e8dfc0" opacity="0.32"/>
        <circle cx="196"  cy="36" r="0.6" fill="#e8dfc0" opacity="0.36"/>
        <circle cx="258"  cy="50" r="0.5" fill="#e8dfc0" opacity="0.32"/>
        <circle cx="320"  cy="38" r="0.6" fill="#e8dfc0" opacity="0.34"/>
        <circle cx="384"  cy="52" r="0.5" fill="#e8dfc0" opacity="0.32"/>
        <circle cx="448"  cy="40" r="0.6" fill="#e8dfc0" opacity="0.34"/>

        {/* ════════════════════════════
            CRESCENT MOON
            ════════════════════════════ */}
        <circle cx="800" cy="55" r="75"  fill="url(#moonHalo)"/>
        <circle cx="800" cy="55" r="45"  fill="url(#moonHalo)"/>
        <circle cx="800" cy="55" r="26"  fill="url(#moonFace)" opacity="0.95"/>
        {/* Crescent shadow cut */}
        <circle cx="815" cy="49" r="22"  fill="#1c0f60"/>

        {/* ════════════════════════════════════════
            HOGWARTS/HP CASTLE — LEFT
            Near-black (#07040d) against rich violet sky
            = maximum readable contrast
            ════════════════════════════════════════ */}

        {/* Warm torch glow at castle base */}
        <ellipse cx="230" cy="190" rx="290" ry="90" fill="url(#torchGlow)"/>

        {/* Tower 1 — far left, battlemented */}
        <path fill="#07040d" d="
          M 0 190
          L 0 48
          L 10 48  L 10 36  L 27 36  L 27 48
          L 38 48  L 38 36  L 55 36  L 55 48
          L 66 48  L 66 36  L 83 36  L 83 48
          L 90 48
          L 90 115
          L 110 115
          L 110 190
          Z
        "/>

        {/* Tower 2 — tallest, central, with SPIRE */}
        <path fill="#07040d" d="
          M 110 190
          L 110 65
          L 124 65  L 124 53  L 141 53  L 141 65
          L 154 65  L 154 53  L 171 53  L 171 65
          L 184 65  L 184 53  L 201 53  L 201 65
          L 216 65
          L 216 115
          L 234 115
          L 234 190
          Z
        "/>
        {/* Spire on Tower 2 */}
        <polygon points="110,65  163,8  216,65" fill="#07040d"/>
        {/* Subtle light on left spire face */}
        <polygon points="110,65  163,8  136,36" fill="rgba(200,160,80,0.07)"/>
        {/* Garnet pennant */}
        <polygon points="163,8  163,25  182,16" fill="#8a1f34" opacity="0.94"/>

        {/* Tower 3 — medium with small spire */}
        <path fill="#07040d" d="
          M 234 115
          L 234 77
          L 244 77  L 244 65  L 261 65  L 261 77
          L 274 77  L 274 65  L 291 65  L 291 77
          L 300 77
          L 300 118
          L 320 118
          L 320 190
          Z
        "/>
        <polygon points="234,77  267,42  300,77" fill="#07040d"/>

        {/* Tower 4 — shorter, battlemented */}
        <path fill="#07040d" d="
          M 320 118
          L 320 90
          L 330 90  L 330 78  L 346 78  L 346 90
          L 358 90  L 358 78  L 374 78  L 374 90
          L 382 90
          L 382 122
          L 424 134
          L 468 146
          L 504 158
          L 512 190
          Z
        "/>

        {/* WINDOWS — bright amber, clearly visible */}
        <rect x="29" y="64" width="24" height="32" rx="12" fill="#ffb820" opacity="0.88"/>
        <rect x="29" y="64" width="24" height="32" rx="12" fill="url(#win)"/>

        <rect x="122" y="80" width="20" height="28" rx="10" fill="#ffb820" opacity="0.82"/>
        <rect x="122" y="80" width="20" height="28" rx="10" fill="url(#win)"/>
        <rect x="166" y="82" width="20" height="26" rx="10" fill="#ffb820" opacity="0.85"/>
        <rect x="166" y="82" width="20" height="26" rx="10" fill="url(#win)"/>

        <rect x="244" y="90" width="18" height="24" rx="9"  fill="#ffb820" opacity="0.75"/>
        <rect x="244" y="90" width="18" height="24" rx="9"  fill="url(#win)"/>

        <rect x="332" y="100" width="16" height="20" rx="8" fill="#ffb820" opacity="0.68"/>

        {/* Gate arch glow */}
        <path d="M 90 115 Q 100 98 110 115" fill="rgba(255,180,30,0.20)"/>

        {/* ════════════════════════════════════════
            VELARIS — MOUNTAINS RIGHT
            Clear triangular peaks, bright snow,
            golden city-of-starlight glow at base
            ════════════════════════════════════════ */}

        {/* City of Starlight glow — warm gold, prominent */}
        <ellipse cx="1360" cy="190" rx="320" ry="95"  fill="url(#cityGlow)"/>
        <ellipse cx="1360" cy="190" rx="200" ry="60"  fill="rgba(230,148,18,0.28)"/>
        <ellipse cx="1360" cy="190" rx="110" ry="38"  fill="rgba(245,165,22,0.18)"/>

        {/* Mountain silhouette — near-black */}
        <path fill="#07040d" d="
          M 1148 190
          L 1248 96
          L 1292 124
          L 1340 52
          L 1378 82
          L 1422 22
          L 1464 62
          L 1514 36
          L 1558 68
          L 1600 38
          L 1600 190
          Z
        "/>

        {/* Snow caps — bright cream-white, high opacity */}
        <polygon points="1422,22  1396,62  1448,62"  fill="#f6f0de" opacity="0.92"/>
        <polygon points="1514,36  1490,66  1538,66"  fill="#f6f0de" opacity="0.84"/>
        <polygon points="1340,52  1316,82  1364,82"  fill="#f6f0de" opacity="0.78"/>
        <polygon points="1248,96  1226,122 1270,122" fill="#f6f0de" opacity="0.64"/>
        <polygon points="1600,38  1578,66  1600,66"  fill="#f6f0de" opacity="0.56"/>

        {/* Velaris city lights — clusters of warm dots */}
        <circle cx="1268" cy="174" r="2.0" fill="#ffc030" opacity="0.78"/>
        <circle cx="1290" cy="168" r="1.6" fill="#ffb020" opacity="0.72"/>
        <circle cx="1314" cy="163" r="1.8" fill="#ffc030" opacity="0.76"/>
        <circle cx="1336" cy="159" r="1.4" fill="#ffb020" opacity="0.68"/>
        <circle cx="1358" cy="156" r="1.8" fill="#ffc030" opacity="0.74"/>
        <circle cx="1380" cy="160" r="1.5" fill="#ffb020" opacity="0.70"/>
        <circle cx="1402" cy="164" r="1.8" fill="#ffc030" opacity="0.72"/>
        <circle cx="1422" cy="169" r="1.4" fill="#ffb020" opacity="0.66"/>
        <circle cx="1442" cy="173" r="1.6" fill="#ffc030" opacity="0.68"/>
        <circle cx="1280" cy="180" r="1.2" fill="#ffd040" opacity="0.60"/>
        <circle cx="1302" cy="176" r="1.4" fill="#ffd040" opacity="0.64"/>
        <circle cx="1324" cy="171" r="1.2" fill="#ffd040" opacity="0.60"/>
        <circle cx="1346" cy="167" r="1.4" fill="#ffd040" opacity="0.62"/>
        <circle cx="1368" cy="170" r="1.2" fill="#ffd040" opacity="0.60"/>
        <circle cx="1390" cy="174" r="1.4" fill="#ffd040" opacity="0.60"/>
        <circle cx="1412" cy="178" r="1.2" fill="#ffd040" opacity="0.58"/>

        {/* ════════════════
            CENTRE TEXT
            ════════════════ */}
        <text
          x="800" y="84"
          textAnchor="middle"
          fontSize="25"
          letterSpacing="10"
          fill="#eddfc0"
          opacity="0.92"
          style={{ fontFamily: "var(--font-cinzel,'Times New Roman',serif)", fontWeight: 700 }}
        >
          MY DASHBOARD
        </text>
        <text
          x="800" y="110"
          textAnchor="middle"
          fontSize="11"
          letterSpacing="5"
          fill="#c49228"
          opacity="0.75"
          style={{ fontFamily: "var(--font-cinzel,'Times New Roman',serif)" }}
        >
          ✦  arcane library  ✦
        </text>

        {/* Gold base line */}
        <line x1="0" y1="188.5" x2="1600" y2="188.5" stroke="url(#gr)" strokeWidth="0.8"/>
      </svg>
    </div>
  );
}
