import { scoreTone } from "./score-tone";

interface CircularScoreLargeProps {
  score: number;
}

/**
 * CircularScoreLarge — score 160px avec arc SVG progressif.
 * Utilisé dans le header de la fiche entreprise débloquée.
 */
export function CircularScoreLarge({ score }: CircularScoreLargeProps) {
  const tone = scoreTone(score);
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const dash = (score / 100) * circumference;
  return (
    <div className="relative" style={{ width: 160, height: 160 }}>
      <svg width="160" height="160" viewBox="0 0 160 160" className="-rotate-90">
        <circle cx="80" cy="80" r={radius} stroke="rgba(26,26,26,0.08)" strokeWidth="6" fill="none" />
        <circle
          cx="80"
          cy="80"
          r={radius}
          stroke={tone.bg}
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="font-serif font-light text-5xl text-ink tabular-nums leading-none">{score}</div>
        <div className="mt-1.5 text-[10px] font-medium tracking-[0.18em]" style={{ color: tone.textSoft }}>
          {tone.label}
        </div>
      </div>
    </div>
  );
}
