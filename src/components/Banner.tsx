export default function Banner() {
  return (
    <div
      role="img"
      aria-label="Decorative banner: castle silhouette at left, moonlit mountains at right, starry night sky"
      style={{
        width: "100%",
        height: "155px",
        flexShrink: 0,
        overflow: "hidden",
        position: "relative",
        borderBottom: "1px solid rgba(196, 146, 40, 0.22)",
      }}
    >
      <svg
        viewBox="0 0 1600 155"
        width="100%"
        height="155"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: "block" }}
      >
        <defs>
          {/* Sky */}
          <linearGradient id="bSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#060310" />
            <stop offset="45%"  stopColor="#0d071e" />
            <stop offset="100%" stopColor="#180e2c" />
          </linearGradient>

          {/* Moon glow layers */}
          <radialGradient id="bMoonHalo" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#eddfc0" stopOpacity="0.10" />
            <stop offset="100%" stopColor="#eddfc0" stopOpacity="0" />
          </radialGradient>

          {/* Candle window glow */}
          <radialGradient id="bWin" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#f0b030" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#f0b030" stopOpacity="0" />
          </radialGradient>

          {/* Soft star blur */}
          <filter id="bStarGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="0.5" />
          </filter>

          {/* Gold footer line */}
          <linearGradient id="bGoldLine" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#c49228" stopOpacity="0" />
            <stop offset="20%"  stopColor="#c49228" stopOpacity="0.75" />
            <stop offset="80%"  stopColor="#c49228" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#c49228" stopOpacity="0" />
          </linearGradient>

          {/* Side vignettes to blend banner into dark sidebar/content */}
          <linearGradient id="bVigL" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#060310" stopOpacity="0.80" />
            <stop offset="100%" stopColor="#060310" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="bVigR" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#060310" stopOpacity="0" />
            <stop offset="100%" stopColor="#060310" stopOpacity="0.80" />
          </linearGradient>
        </defs>

        {/* ── Sky background ── */}
        <rect width="1600" height="155" fill="url(#bSky)" />

        {/* ── Atmospheric aubergine glow centre-left (moonlight haze) ── */}
        <ellipse cx="820" cy="40" rx="260" ry="80"
          fill="rgba(55,22,90,0.18)" />

        {/* ═══════════════════════════════
            STARS
            ═══════════════════════════════ */}
        {/* Bright */}
        <circle cx="488"  cy="14" r="1.1" fill="#eddfc0" opacity="0.92" filter="url(#bStarGlow)" />
        <circle cx="538"  cy="27" r="0.9" fill="#eddfc0" opacity="0.80" />
        <circle cx="582"  cy="9"  r="1.0" fill="#eddfc0" opacity="0.88" filter="url(#bStarGlow)" />
        <circle cx="628"  cy="21" r="0.8" fill="#eddfc0" opacity="0.72" />
        <circle cx="671"  cy="11" r="1.2" fill="#eddfc0" opacity="0.90" filter="url(#bStarGlow)" />
        <circle cx="718"  cy="34" r="0.7" fill="#eddfc0" opacity="0.68" />
        <circle cx="756"  cy="18" r="0.9" fill="#eddfc0" opacity="0.78" />
        <circle cx="793"  cy="7"  r="1.0" fill="#eddfc0" opacity="0.85" filter="url(#bStarGlow)" />
        <circle cx="876"  cy="13" r="1.1" fill="#eddfc0" opacity="0.90" filter="url(#bStarGlow)" />
        <circle cx="922"  cy="30" r="0.8" fill="#eddfc0" opacity="0.72" />
        <circle cx="962"  cy="10" r="0.9" fill="#eddfc0" opacity="0.82" />
        <circle cx="1008" cy="22" r="0.7" fill="#eddfc0" opacity="0.65" />
        <circle cx="1050" cy="14" r="1.0" fill="#eddfc0" opacity="0.85" filter="url(#bStarGlow)" />
        <circle cx="1094" cy="8"  r="0.8" fill="#eddfc0" opacity="0.75" />
        <circle cx="1138" cy="26" r="0.9" fill="#eddfc0" opacity="0.78" />
        {/* Dim — mid-sky */}
        <circle cx="510"  cy="42" r="0.5" fill="#eddfc0" opacity="0.42" />
        <circle cx="556"  cy="50" r="0.4" fill="#eddfc0" opacity="0.34" />
        <circle cx="602"  cy="38" r="0.5" fill="#eddfc0" opacity="0.40" />
        <circle cx="648"  cy="48" r="0.4" fill="#eddfc0" opacity="0.32" />
        <circle cx="694"  cy="55" r="0.5" fill="#eddfc0" opacity="0.38" />
        <circle cx="732"  cy="44" r="0.4" fill="#eddfc0" opacity="0.33" />
        <circle cx="772"  cy="56" r="0.5" fill="#eddfc0" opacity="0.38" />
        <circle cx="852"  cy="46" r="0.5" fill="#eddfc0" opacity="0.38" />
        <circle cx="900"  cy="54" r="0.4" fill="#eddfc0" opacity="0.32" />
        <circle cx="948"  cy="38" r="0.5" fill="#eddfc0" opacity="0.40" />
        <circle cx="994"  cy="50" r="0.4" fill="#eddfc0" opacity="0.34" />
        <circle cx="1038" cy="58" r="0.5" fill="#eddfc0" opacity="0.36" />
        <circle cx="1082" cy="44" r="0.4" fill="#eddfc0" opacity="0.32" />
        <circle cx="1126" cy="36" r="0.5" fill="#eddfc0" opacity="0.38" />
        {/* A few stars in/near castle sky */}
        <circle cx="96"   cy="10" r="0.6" fill="#eddfc0" opacity="0.44" />
        <circle cx="196"  cy="4"  r="0.7" fill="#eddfc0" opacity="0.52" />
        <circle cx="328"  cy="7"  r="0.6" fill="#eddfc0" opacity="0.40" />
        {/* Near mountains */}
        <circle cx="1310" cy="10" r="0.7" fill="#eddfc0" opacity="0.55" />
        <circle cx="1378" cy="20" r="0.6" fill="#eddfc0" opacity="0.45" />
        <circle cx="1455" cy="8"  r="0.8" fill="#eddfc0" opacity="0.60" filter="url(#bStarGlow)" />

        {/* ═══════════════════════════════
            CRESCENT MOON
            ═══════════════════════════════ */}
        {/* Soft halo behind moon */}
        <circle cx="820" cy="42" r="46" fill="url(#bMoonHalo)" />
        <circle cx="820" cy="42" r="28" fill="url(#bMoonHalo)" />
        {/* Moon disc */}
        <circle cx="820" cy="42" r="19" fill="#e8dcba" opacity="0.86" />
        {/* Cutout to form crescent */}
        <circle cx="831" cy="37" r="15.5" fill="#070418" />

        {/* ═══════════════════════════════
            CASTLE SILHOUETTE (left)
            Towers: T1(far left, tall) · T2(central, tallest) · T3(medium) · T4(shorter)
            Battlements on each, walls connecting, ground slope fading right
            ═══════════════════════════════ */}
        <path
          fill="#0e0820"
          d="
            M 0 155
            L 0 34
            L 8  34  L 8  24  L 22 24  L 22 34
            L 30 34  L 30 24  L 44 24  L 44 34
            L 52 34  L 52 24  L 66 24  L 66 34
            L 72 34
            L 72 92
            L 96 92
            L 96 16
            L 106 16  L 106 6   L 120 6   L 120 16
            L 130 16  L 130 6   L 144 6   L 144 16
            L 154 16  L 154 6   L 168 6   L 168 16
            L 178 16  L 178 6   L 192 6   L 192 16
            L 200 16
            L 200 90
            L 224 90
            L 224 36
            L 232 36  L 232 26  L 246 26  L 246 36
            L 254 36  L 254 26  L 268 26  L 268 36
            L 276 36  L 276 26  L 290 26  L 290 36
            L 296 36
            L 296 90
            L 318 90
            L 318 56
            L 326 56  L 326 46  L 340 46  L 340 56
            L 348 56  L 348 46  L 362 46  L 362 56
            L 368 56
            L 368 94
            L 408 104
            L 452 116
            L 488 134
            L 498 155
            Z
          "
        />

        {/* Castle windows — amber candlelight */}
        {/* T1 window */}
        <rect x="26"  y="54" width="18" height="24" rx="9"  fill="#d08c18" opacity="0.52" />
        <rect x="26"  y="54" width="18" height="24" rx="9"  fill="url(#bWin)" />
        {/* T2 left window */}
        <rect x="110" y="38" width="16" height="22" rx="8"  fill="#d08c18" opacity="0.44" />
        <rect x="110" y="38" width="16" height="22" rx="8"  fill="url(#bWin)" />
        {/* T2 right window */}
        <rect x="148" y="40" width="16" height="20" rx="8"  fill="#d08c18" opacity="0.48" />
        <rect x="148" y="40" width="16" height="20" rx="8"  fill="url(#bWin)" />
        {/* T3 window */}
        <rect x="238" y="54" width="14" height="20" rx="7"  fill="#d08c18" opacity="0.38" />
        {/* Gate arch between T1 and T2 */}
        <path d="M 72 92 Q 84 76 96 92"
          fill="none" stroke="#d08c18" strokeWidth="0.6" opacity="0.18" />

        {/* ═══════════════════════════════
            MOUNTAIN SILHOUETTE (right)
            ═══════════════════════════════ */}
        <path
          fill="#0c0a1c"
          d="
            M 1600 155
            L 1600 78
            L 1568 50
            L 1536 76
            L 1502 40
            L 1466 68
            L 1424 24
            L 1386 56
            L 1352 36
            L 1316 60
            L 1282 44
            L 1250 74
            L 1224 92
            L 1200 108
            L 1184 128
            L 1172 155
            Z
          "
        />

        {/* Snow/starlight caps on peaks */}
        <polygon points="1424,24  1408,46  1440,46" fill="#eddfc0" opacity="0.15" />
        <polygon points="1502,40  1488,58  1516,58" fill="#eddfc0" opacity="0.11" />
        <polygon points="1352,36  1338,54  1366,54" fill="#eddfc0" opacity="0.10" />
        <polygon points="1568,50  1554,68  1582,68" fill="#eddfc0" opacity="0.08" />

        {/* ═══════════════════════════════
            CENTRE TEXT
            ═══════════════════════════════ */}
        <text
          x="800" y="78"
          textAnchor="middle"
          fontSize="26"
          letterSpacing="9"
          fill="#eddfc0"
          opacity="0.84"
          style={{ fontFamily: "var(--font-cinzel, 'Times New Roman', serif)", fontWeight: 700 }}
        >
          MY DASHBOARD
        </text>
        <text
          x="800" y="102"
          textAnchor="middle"
          fontSize="11"
          letterSpacing="5"
          fill="#c49228"
          opacity="0.65"
          style={{ fontFamily: "var(--font-cinzel, 'Times New Roman', serif)" }}
        >
          ✦  arcane library  ✦
        </text>

        {/* ── Gold separator at bottom of banner ── */}
        <line x1="0" y1="153.5" x2="1600" y2="153.5"
          stroke="url(#bGoldLine)" strokeWidth="0.75" />

        {/* ── Side vignettes ── */}
        <rect x="0"    y="0" width="180" height="155" fill="url(#bVigL)" />
        <rect x="1420" y="0" width="180" height="155" fill="url(#bVigR)" />
      </svg>
    </div>
  );
}
