// Candle data: [centerX, bodyBottomY, bodyHeight]
const CANDLES: [number, number, number][] = [
  [82,   170, 30],
  [210,  155, 26],
  [352,  165, 30],
  [478,  152, 28],
  [606,  163, 32],
  [1010, 154, 28],
  [1142, 162, 30],
  [1278, 150, 26],
  [1408, 160, 32],
  [1522, 148, 28],
];

export default function Banner() {
  return (
    <div
      role="img"
      aria-label="Magical starry night sky with floating candles and drifting clouds"
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
          {/* Rich deep-violet sky */}
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#0e0640" />
            <stop offset="28%"  stopColor="#200e6e" />
            <stop offset="60%"  stopColor="#180b58" />
            <stop offset="100%" stopColor="#0c0630" />
          </linearGradient>

          {/* Moon */}
          <radialGradient id="moonFace" cx="40%" cy="35%" r="62%">
            <stop offset="0%"   stopColor="#fdf6e0" />
            <stop offset="80%"  stopColor="#e8d890" />
            <stop offset="100%" stopColor="#c8b870" />
          </radialGradient>
          <radialGradient id="moonHalo" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#d4b840" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#d4b840" stopOpacity="0" />
          </radialGradient>

          {/* Candle flame: bright at base, fades to tip */}
          <radialGradient id="flame" cx="50%" cy="82%" r="68%">
            <stop offset="0%"   stopColor="#fff8d0" />
            <stop offset="35%"  stopColor="#ffd030" />
            <stop offset="75%"  stopColor="#ff7010" stopOpacity="0.65" />
            <stop offset="100%" stopColor="#ff4010" stopOpacity="0" />
          </radialGradient>

          {/* Candle warm light pool */}
          <radialGradient id="cglow" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#ffaa18" stopOpacity="0.48" />
            <stop offset="100%" stopColor="#ffaa18" stopOpacity="0" />
          </radialGradient>

          {/* Flame bloom filter */}
          <filter id="fg" x="-120%" y="-120%" width="340%" height="340%">
            <feGaussianBlur stdDeviation="2.5" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>

          {/* Cloud blur — soft */}
          <filter id="cf" x="-50%" y="-120%" width="200%" height="340%">
            <feGaussianBlur stdDeviation="10" />
          </filter>
          {/* Cloud blur — wide */}
          <filter id="cfw" x="-60%" y="-150%" width="220%" height="400%">
            <feGaussianBlur stdDeviation="16" />
          </filter>

          {/* Star glow */}
          <filter id="sg" x="-150%" y="-150%" width="400%" height="400%">
            <feGaussianBlur stdDeviation="0.55" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          {/* Sparkle — large bright stars */}
          <filter id="sp" x="-200%" y="-200%" width="500%" height="500%">
            <feGaussianBlur stdDeviation="1.3" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>

          {/* Gold bottom rule */}
          <linearGradient id="gr" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#c49228" stopOpacity="0" />
            <stop offset="16%"  stopColor="#c49228" stopOpacity="0.82" />
            <stop offset="84%"  stopColor="#c49228" stopOpacity="0.82" />
            <stop offset="100%" stopColor="#c49228" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Sky */}
        <rect width="1600" height="190" fill="url(#sky)" />

        {/* ════════════════════════════
            STARS — abundant and bright
            ════════════════════════════ */}

        {/* Hero sparkle stars */}
        <circle cx="138"  cy="14" r="2.2" fill="#fff" opacity="0.96" filter="url(#sp)" />
        <circle cx="402"  cy="9"  r="2.0" fill="#fff" opacity="0.92" filter="url(#sp)" />
        <circle cx="660"  cy="18" r="2.3" fill="#fff" opacity="0.95" filter="url(#sp)" />
        <circle cx="940"  cy="10" r="2.1" fill="#fff" opacity="0.93" filter="url(#sp)" />
        <circle cx="1210" cy="16" r="2.2" fill="#fff" opacity="0.94" filter="url(#sp)" />
        <circle cx="1480" cy="8"  r="2.0" fill="#fff" opacity="0.92" filter="url(#sp)" />

        {/* Bright medium stars */}
        {([
          [60,22],[175,11],[260,28],[318,13],[462,24],[530,10],[592,30],[648,12],
          [702,26],[758,10],[812,34],[868,14],[924,28],[980,8],[1038,24],[1092,12],
          [1148,30],[1198,10],[1252,26],[1306,14],[1358,32],[1412,10],[1462,24],
          [1524,12],[1578,28],[1594,14],
        ] as [number,number][]).map(([cx, cy], i) => (
          <circle key={`ms${i}`} cx={cx} cy={cy} r={1.1} fill="#e8dfc0" opacity={0.82} filter="url(#sg)" />
        ))}

        {/* Dim fill stars */}
        {([
          [42,44],[98,58],[154,48],[208,62],[266,46],[332,60],[390,44],[448,62],
          [506,48],[564,58],[622,44],[680,62],[738,46],[796,60],[854,44],[912,62],
          [970,48],[1028,62],[1086,46],[1144,60],[1202,44],[1258,62],[1316,46],
          [1374,60],[1430,44],[1488,62],[1546,46],[1590,56],
          [70,72],[136,80],[200,70],[280,78],[355,68],[430,76],[510,72],[588,78],
          [665,66],[742,76],[818,70],[896,78],[972,66],[1050,76],[1126,70],
          [1204,78],[1280,66],[1358,76],[1436,70],[1510,78],[1580,68],
        ] as [number,number][]).map(([cx, cy], i) => (
          <circle key={`ds${i}`} cx={cx} cy={cy} r={0.5} fill="#e8dfc0" opacity={0.34} />
        ))}

        {/* ══════════════
            CRESCENT MOON
            ══════════════ */}
        <circle cx="800" cy="52" r="80" fill="url(#moonHalo)" />
        <circle cx="800" cy="52" r="50" fill="url(#moonHalo)" />
        <circle cx="800" cy="52" r="28" fill="url(#moonFace)" opacity="0.96" />
        <circle cx="818" cy="45" r="24" fill="#180b58" />

        {/* ════════════════════════════════════
            CLOUDS — wispy, layered, violet-tint
            ════════════════════════════════════ */}

        {/* Cloud 1 — left */}
        <g opacity="0.22" filter="url(#cfw)">
          <ellipse cx="200" cy="128" rx="110" ry="32" fill="#b8aee0" />
        </g>
        <g opacity="0.20" filter="url(#cf)">
          <ellipse cx="185" cy="122" rx="75"  ry="22" fill="#ccc0f0" />
          <ellipse cx="235" cy="118" rx="55"  ry="16" fill="#d4c8f8" />
          <ellipse cx="168" cy="130" rx="50"  ry="15" fill="#c4b8e8" />
        </g>

        {/* Cloud 2 — left-centre */}
        <g opacity="0.16" filter="url(#cfw)">
          <ellipse cx="545" cy="115" rx="95" ry="26" fill="#b0a4d8" />
        </g>
        <g opacity="0.15" filter="url(#cf)">
          <ellipse cx="528" cy="110" rx="65" ry="18" fill="#c8bef0" />
          <ellipse cx="568" cy="106" rx="48" ry="14" fill="#d0c8f8" />
        </g>

        {/* Cloud 3 — right-centre */}
        <g opacity="0.17" filter="url(#cfw)">
          <ellipse cx="1060" cy="120" rx="100" ry="28" fill="#b0a4d8" />
        </g>
        <g opacity="0.16" filter="url(#cf)">
          <ellipse cx="1042" cy="114" rx="70"  ry="20" fill="#ccc0f0" />
          <ellipse cx="1085" cy="110" rx="52"  ry="15" fill="#d4c8f8" />
          <ellipse cx="1022" cy="122" rx="45"  ry="14" fill="#c4b8e8" />
        </g>

        {/* Cloud 4 — right */}
        <g opacity="0.21" filter="url(#cfw)">
          <ellipse cx="1400" cy="112" rx="115" ry="30" fill="#b8aee0" />
        </g>
        <g opacity="0.19" filter="url(#cf)">
          <ellipse cx="1382" cy="106" rx="80"  ry="22" fill="#ccc0f0" />
          <ellipse cx="1428" cy="102" rx="60"  ry="17" fill="#d4c8f8" />
          <ellipse cx="1360" cy="116" rx="55"  ry="16" fill="#c4b8e8" />
        </g>

        {/* Cloud 5 — thin high wisp across centre */}
        <g opacity="0.10" filter="url(#cfw)">
          <ellipse cx="800" cy="88" rx="200" ry="18" fill="#c0b4e0" />
        </g>

        {/* ══════════════════════════════════════════
            FLOATING CANDLES
            Warm glow → light cone → body → wick → flame
            ══════════════════════════════════════════ */}
        {CANDLES.map(([cx, base, h], i) => {
          const bodyTop  = base - h;
          const wickTip  = bodyTop - 2;
          const flameTip = wickTip - 20;
          const flameMid = wickTip - 10;

          const outerFlame = `M ${cx} ${wickTip} C ${cx-6} ${flameMid} ${cx-5} ${flameTip+3} ${cx} ${flameTip} C ${cx+5} ${flameTip+3} ${cx+6} ${flameMid} ${cx} ${wickTip} Z`;
          const innerFlame = `M ${cx} ${wickTip-1} C ${cx-2.5} ${flameMid} ${cx-2.5} ${flameTip+5} ${cx} ${flameTip+3} C ${cx+2.5} ${flameTip+5} ${cx+2.5} ${flameMid} ${cx} ${wickTip-1} Z`;

          return (
            <g key={i}>
              {/* Warm light pool */}
              <ellipse cx={cx} cy={flameMid - 2} rx={30} ry={30} fill="url(#cglow)" />

              {/* Light cone falling below */}
              <path
                d={`M ${cx-4} ${base} L ${cx-20} 190 L ${cx+20} 190 L ${cx+4} ${base} Z`}
                fill="rgba(255,165,18,0.06)"
              />

              {/* Candle body */}
              <rect x={cx-5} y={bodyTop} width={10} height={h} rx={2} fill="#f4ecda" />

              {/* Wax drip */}
              <ellipse cx={cx-4} cy={bodyTop + h * 0.32} rx={2.5} ry={4} fill="#ece2c6" />

              {/* Wick */}
              <line x1={cx} y1={bodyTop} x2={cx} y2={wickTip} stroke="#3e2006" strokeWidth={1.3} />

              {/* Outer flame with bloom */}
              <path d={outerFlame} fill="url(#flame)" opacity={0.90} filter="url(#fg)" />

              {/* Inner bright core */}
              <path d={innerFlame} fill="#fffde8" opacity={0.88} />
            </g>
          );
        })}

        {/* ════════════
            CENTRE TEXT
            ════════════ */}
        <text
          x="800" y="82"
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
          x="800" y="108"
          textAnchor="middle"
          fontSize="11"
          letterSpacing="5"
          fill="#c49228"
          opacity="0.76"
          style={{ fontFamily: "var(--font-cinzel,'Times New Roman',serif)" }}
        >
          ✦  arcane library  ✦
        </text>

        {/* Gold base rule */}
        <line x1="0" y1="188.5" x2="1600" y2="188.5" stroke="url(#gr)" strokeWidth="0.8" />
      </svg>
    </div>
  );
}
