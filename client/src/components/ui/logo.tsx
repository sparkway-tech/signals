interface LogoProps {
  size?: number;
}

/**
 * Logo — "Sparkway Signals" avec petit chevron forest dans un carré.
 * Source : design-reference/ui.jsx ligne 163-176.
 */
export function Logo({ size = 22 }: LogoProps) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className="inline-flex items-center justify-center rounded-sm bg-forest text-porcelain"
        style={{ width: size, height: size }}
      >
        <svg
          viewBox="0 0 12 12"
          width={size * 0.55}
          height={size * 0.55}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        >
          <path d="M2 8 L4 6 L6 8 L10 4" />
        </svg>
      </span>
      <span className="font-serif text-[17px] font-medium text-ink tracking-tight">
        Sparkway <span className="text-ink-soft font-light italic">Signals</span>
      </span>
    </span>
  );
}
