interface OnboardingChipProps {
  label: string;
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
}

/**
 * Chip toggle pour l'onboarding.
 * Source : design-reference/screen-onboarding.jsx ligne 2-19.
 */
export function OnboardingChip({ label, selected, onClick, disabled = false }: OnboardingChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled && !selected}
      className={`inline-flex items-center justify-center px-4 h-10 rounded-md text-sm transition border ${
        selected
          ? "bg-forest text-porcelain border-forest"
          : disabled
            ? "bg-transparent text-ink-soft border-[rgba(26,26,26,0.10)] opacity-50 cursor-not-allowed"
            : "bg-transparent text-ink border-[rgba(26,26,26,0.20)] hover:bg-porcelain-dark"
      }`}
    >
      {label}
    </button>
  );
}
