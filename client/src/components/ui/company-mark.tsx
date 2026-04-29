interface CompanyMarkProps {
  initials: string;
  size?: number;
  blurred?: boolean;
}

/**
 * CompanyMark — monogramme initial sand sur fond carré.
 * Variante `blurred` pour les teasers (logo flouté côté résultats).
 */
export function CompanyMark({ initials, size = 44, blurred = false }: CompanyMarkProps) {
  return (
    <div
      className={`shrink-0 rounded-md flex items-center justify-center font-serif font-medium ${blurred ? "blur-name" : ""}`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.42,
        background: "rgba(212,196,168,0.55)",
        color: "#5A4A2A",
        border: "1px solid rgba(26,26,26,0.08)",
      }}
    >
      {initials}
    </div>
  );
}
