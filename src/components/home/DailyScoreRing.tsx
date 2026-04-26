// src/components/home/DailyScoreRing.tsx
import { useEffect, useRef, useState } from 'react';

interface DailyScoreRingProps {
  score: number | null;   // 0-100, null = not yet calculated
  size?: number;          // default 64
  onTap?: () => void;
}

function scoreColor(score: number): string {
  if (score >= 70) return '#0CFF9C';
  if (score >= 40) return '#F5C518';
  return '#FF3B5C';
}

export function DailyScoreRing({ score, size = 64, onTap }: DailyScoreRingProps) {
  const [displayed, setDisplayed] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (score === null) { setDisplayed(0); return; }
    const target = score;
    const start = performance.now();
    const duration = 1200;
    const animate = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(Math.round(eased * target));
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [score]);

  const cx = size / 2;
  const cy = size / 2;
  const strokeW = size * 0.09;
  const r = (size - strokeW) / 2 - 2;
  const circ = 2 * Math.PI * r;
  const fillPct = score !== null ? displayed / 100 : 0;
  const dashFill = fillPct * circ;
  const color = score !== null ? scoreColor(score) : '#4A5568';

  return (
    <button
      onClick={onTap}
      style={{
        background: 'none', border: 'none', cursor: onTap ? 'pointer' : 'default',
        padding: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
      }}
    >
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
          {/* Track */}
          <circle
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={strokeW}
          />
          {/* Fill */}
          <circle
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={color}
            strokeWidth={strokeW}
            strokeLinecap="round"
            strokeDasharray={`${dashFill} ${circ - dashFill}`}
            strokeDashoffset={circ / 4}
            transform={`rotate(-90 ${cx} ${cy})`}
            style={{ transition: 'stroke 0.4s' }}
          />
          {/* Glow effect */}
          {score !== null && score > 0 && (
            <circle
              cx={cx} cy={cy} r={r}
              fill="none"
              stroke={color}
              strokeWidth={strokeW * 0.4}
              strokeLinecap="round"
              strokeDasharray={`${dashFill} ${circ - dashFill}`}
              strokeDashoffset={circ / 4}
              transform={`rotate(-90 ${cx} ${cy})`}
              opacity={0.3}
              filter={`blur(${strokeW * 0.6}px)`}
            />
          )}
          {/* Center content */}
          {score !== null ? (
            <>
              <text
                x={cx} y={cy + 1}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={color}
                fontSize={size * 0.26}
                fontWeight={800}
                fontFamily="inherit"
              >
                {displayed}
              </text>
            </>
          ) : (
            <text
              x={cx} y={cy + 1}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#4A5568"
              fontSize={size * 0.3}
              fontWeight={700}
            >
              ?
            </text>
          )}
        </svg>
      </div>
      <span style={{ fontSize: 10, fontWeight: 700, color: '#4A5568', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
        {score !== null ? 'Daily Score' : 'Log mood'}
      </span>
    </button>
  );
}
