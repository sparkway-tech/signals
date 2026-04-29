import { scoreTone } from "./score-tone";

interface ScoreCircleProps {
  score: number;
  size?: number;
}

export function ScoreCircle({ score, size = 56 }: ScoreCircleProps) {
  const tone = scoreTone(score);
  return (
    <div
      className="inline-flex items-center justify-center font-serif font-light tabular-nums"
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: tone.bg,
        color: tone.text,
        fontSize: size * 0.42,
      }}
    >
      {score}
    </div>
  );
}
