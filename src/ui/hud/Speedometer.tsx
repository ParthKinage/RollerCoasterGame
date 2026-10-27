const MAX = 140;
const SWEEP = 260;
const R = 52;

function polar(angleDeg: number, r = R) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return [60 + Math.cos(a) * r, 60 + Math.sin(a) * r];
}

function arc(from: number, to: number, r = R) {
  const [x1, y1] = polar(from, r);
  const [x2, y2] = polar(to, r);
  const large = to - from > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
}

/** Arc gauge like the concept art: green → yellow → red as speed rises. */
export function Speedometer({ speed }: { speed: number }) {
  const start = -SWEEP / 2;
  const frac = Math.min(1, Math.max(0, speed / MAX));
  const end = start + SWEEP * frac;
  const color = frac < 0.45 ? '#22c55e' : frac < 0.7 ? '#facc15' : '#ef4444';
  return (
    <div className="relative h-28 w-28 sm:h-36 sm:w-36">
      <svg viewBox="0 0 120 120" className="h-full w-full drop-shadow-[0_6px_14px_rgba(0,0,0,0.6)]">
        <circle cx="60" cy="60" r="58" fill="rgba(8,13,26,0.82)" stroke="rgba(255,255,255,0.12)" />
        <defs>
          <linearGradient id="spd" x1="0" x2="1" y1="1" y2="0">
            <stop offset="0" stopColor="#22c55e" />
            <stop offset="0.55" stopColor="#facc15" />
            <stop offset="1" stopColor="#ef4444" />
          </linearGradient>
        </defs>
        <path d={arc(start, start + SWEEP)} stroke="rgba(255,255,255,0.12)" strokeWidth="9" fill="none" strokeLinecap="round" />
        {frac > 0.002 && <path d={arc(start, end)} stroke="url(#spd)" strokeWidth="9" fill="none" strokeLinecap="round" />}
        {Array.from({ length: 8 }, (_, i) => {
          const a = start + (SWEEP * i) / 7;
          const [x1, y1] = polar(a, 41);
          const [x2, y2] = polar(a, 45);
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />;
        })}
        <text x="60" y="66" textAnchor="middle" fontSize="30" fontWeight="800" fill="white" fontFamily="Inter">
          {Math.round(speed)}
        </text>
        <text x="60" y="84" textAnchor="middle" fontSize="10" fill={color} fontWeight="700" fontFamily="Inter">
          km/h
        </text>
      </svg>
    </div>
  );
}
