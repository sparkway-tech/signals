import type { ReactNode } from "react";
import { Icon } from "./icon";

export type PillTone = "sand" | "sage" | "bordeaux" | "forest" | "ink";

interface PillProps {
  children: ReactNode;
  tone?: PillTone;
  icon?: string | null;
}

const TONES: Record<PillTone, { bg: string; color: string }> = {
  sand: { bg: "rgba(212,196,168,0.45)", color: "#5A4A2A" },
  sage: { bg: "rgba(123,165,137,0.18)", color: "#3F6B4E" },
  bordeaux: { bg: "rgba(122,46,46,0.10)", color: "#7A2E2E" },
  forest: { bg: "rgba(31,58,46,0.10)", color: "#1F3A2E" },
  ink: { bg: "rgba(26,26,26,0.06)", color: "#1A1A1A" },
};

export function Pill({ children, tone = "sand", icon = null }: PillProps) {
  const t = TONES[tone];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
      style={{ background: t.bg, color: t.color }}
    >
      {icon && <Icon name={icon} size={11} />}
      {children}
    </span>
  );
}
