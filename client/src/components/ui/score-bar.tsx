import { scoreTone } from "./score-tone";

interface ScoreBarProps {
  label: string;
  value: number;
  note: string;
}

/**
 * ScoreBar — barre horizontale 3px utilisée dans le bloc "Pourquoi ce score"
 * de la fiche entreprise. Label à gauche, valeur tabulaire serif à droite,
 * barre fillée à la couleur du tone, note explicative en dessous.
 */
export function ScoreBar({ label, value, note }: ScoreBarProps) {
  const tone = scoreTone(value);
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <div className="text-sm font-medium text-ink">{label}</div>
        <div className="font-serif text-base font-light text-ink tabular-nums">{value}</div>
      </div>
      <div className="h-[3px] rounded-full overflow-hidden" style={{ background: "rgba(26,26,26,0.08)" }}>
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: tone.bg }} />
      </div>
      <div className="mt-2 text-xs text-ink-soft leading-relaxed">{note}</div>
    </div>
  );
}
