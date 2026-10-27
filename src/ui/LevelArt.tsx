import type { EnvironmentId } from '../types';

const THEMES: Record<string, { sky: [string, string]; ground: string; hills: string; far: string; track: string; extra: 'wheel' | 'peaks' | 'neon' | 'mesa' }> = {
  sunny: { sky: ['#4aa3ff', '#cdeaff'], ground: '#4f9a34', hills: '#3c7a2a', far: '#7d8f86', track: '#e02424', extra: 'wheel' },
  mountain: { sky: ['#5b9bdc', '#e4f1ff'], ground: '#e8eef4', hills: '#4f6b5a', far: '#7a8698', track: '#1f6fd6', extra: 'peaks' },
  night: { sky: ['#05061a', '#3a1f6a'], ground: '#121a2a', hills: '#1b2238', far: '#24204a', track: '#c13cff', extra: 'neon' },
  canyon: { sky: ['#5a9ad8', '#f8d3a0'], ground: '#c8662f', hills: '#a34a22', far: '#d98c4a', track: '#f08a12', extra: 'mesa' },
};

/** Stylised vector thumbnail for level cards (no external images needed). */
export function LevelArt({ env, className = '' }: { env: EnvironmentId; className?: string }) {
  const t = THEMES[env] ?? THEMES.sunny;
  const id = `g-${env}`;
  return (
    <svg viewBox="0 0 160 110" className={className} preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={t.sky[0]} />
          <stop offset="1" stopColor={t.sky[1]} />
        </linearGradient>
      </defs>
      <rect width="160" height="110" fill={`url(#${id})`} />
      {env === 'night' && Array.from({ length: 24 }, (_, i) => <circle key={i} cx={(i * 37) % 160} cy={(i * 13) % 50} r={0.7} fill="white" opacity={0.8} />)}
      {env === 'night' && <circle cx="130" cy="18" r="8" fill="#f4f1ff" />}
      {t.extra === 'peaks' ? (
        <path d="M0 70 L25 30 L38 45 L60 15 L85 50 L105 25 L130 55 L160 35 L160 110 L0 110Z" fill={t.far} />
      ) : t.extra === 'mesa' ? (
        <path d="M0 60 L10 60 L14 40 L40 40 L44 62 L70 62 L74 30 L100 30 L104 58 L125 58 L128 45 L150 45 L154 60 L160 60 L160 110 L0 110Z" fill={t.far} />
      ) : (
        <path d="M0 62 Q20 40 40 55 T80 50 T120 45 T160 55 L160 110 L0 110Z" fill={t.far} opacity="0.9" />
      )}
      {t.extra === 'peaks' && <path d="M53 25 L60 15 L67 26 Z M100 32 L105 25 L111 33Z M33 38 L25 30 L20 38Z" fill="white" />}
      <path d="M0 80 Q40 65 80 78 T160 72 L160 110 L0 110Z" fill={t.hills} />
      <rect y="88" width="160" height="22" fill={t.ground} />
      {t.extra === 'wheel' && (
        <g transform="translate(40 56)" stroke="#f5f5f5" strokeWidth="1.2" fill="none">
          <circle r="20" />
          {Array.from({ length: 8 }, (_, i) => (
            <line key={i} x1="0" y1="0" x2={Math.cos((i * Math.PI) / 4) * 20} y2={Math.sin((i * Math.PI) / 4) * 20} />
          ))}
          {Array.from({ length: 8 }, (_, i) => (
            <rect key={i} x={Math.cos((i * Math.PI) / 4) * 20 - 2.5} y={Math.sin((i * Math.PI) / 4) * 20} width="5" height="4" fill={['#e63946', '#f4a261', '#2a9d8f', '#457b9d'][i % 4]} stroke="none" />
          ))}
          <path d="M-10 34 L0 0 L10 34" />
        </g>
      )}
      {t.extra === 'neon' && (
        <g>
          <g transform="translate(42 56)" stroke="#ff4fd8" strokeWidth="1.4" fill="none" style={{ filter: 'drop-shadow(0 0 3px #ff4fd8)' }}>
            <circle r="20" />
            {Array.from({ length: 8 }, (_, i) => (
              <line key={i} x1="0" y1="0" x2={Math.cos((i * Math.PI) / 4) * 20} y2={Math.sin((i * Math.PI) / 4) * 20} />
            ))}
          </g>
          {[20, 70, 110, 140].map((x, i) => (
            <rect key={x} x={x} y="80" width="10" height="8" fill={['#2bf3ff', '#ffe600', '#ff2bd6', '#7c3aed'][i]} opacity="0.9" />
          ))}
        </g>
      )}
      {/* coaster track */}
      <path
        d={env === 'canyon' ? 'M0 95 L30 95 Q45 95 55 20 Q62 5 70 30 L85 95 Q100 100 115 60 Q125 40 135 70 L160 80' : 'M0 92 L25 92 Q45 92 60 35 Q68 15 78 45 Q88 85 100 70 Q112 40 125 60 Q140 85 160 75'}
        stroke={t.track}
        strokeWidth="3"
        fill="none"
        style={env === 'night' ? { filter: `drop-shadow(0 0 3px ${t.track})` } : undefined}
      />
      {[30, 60, 90, 120].map((x) => (
        <line key={x} x1={x} y1="100" x2={x} y2={env === 'canyon' ? 70 : 75} stroke="white" strokeOpacity="0.6" strokeWidth="1" />
      ))}
    </svg>
  );
}
