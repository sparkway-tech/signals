/**
 * scoreTone — mappe un score (0-100) vers une palette earthy.
 * Source : design-reference/ui.jsx ligne 21-26.
 *
 * Forest = très chaud (≥80), sage = chaud (60-79), sand = tiède (40-59),
 * warmgray = froid (<40). bg/text pour la pastille pleine, soft/textSoft
 * pour les variantes tinted (label SCORE BAR, etc.).
 */

export interface ScoreTone {
  bg: string;
  text: string;
  label: "TRÈS CHAUD" | "CHAUD" | "TIÈDE" | "FROID";
  soft: string;
  textSoft: string;
}

export function scoreTone(score: number): ScoreTone {
  if (score >= 80) {
    return {
      bg: "#1F3A2E",
      text: "#F5F1EA",
      label: "TRÈS CHAUD",
      soft: "rgba(31,58,46,0.08)",
      textSoft: "#1F3A2E",
    };
  }
  if (score >= 60) {
    return {
      bg: "#7BA589",
      text: "#F5F1EA",
      label: "CHAUD",
      soft: "rgba(123,165,137,0.14)",
      textSoft: "#3F6B4E",
    };
  }
  if (score >= 40) {
    return {
      bg: "#D4C4A8",
      text: "#1A1A1A",
      label: "TIÈDE",
      soft: "rgba(212,196,168,0.30)",
      textSoft: "#7A6A45",
    };
  }
  return {
    bg: "#A8A29A",
    text: "#F5F1EA",
    label: "FROID",
    soft: "rgba(168,162,154,0.20)",
    textSoft: "#5A5A5A",
  };
}
