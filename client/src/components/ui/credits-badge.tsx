interface CreditsBadgeProps {
  credits: number;
  onRecharge: () => void;
}

export function CreditsBadge({ credits, onRecharge }: CreditsBadgeProps) {
  return (
    <div className="inline-flex items-center gap-3 text-sm">
      <span className="text-ink-soft">
        <span className="font-serif text-base font-light text-ink tabular-nums">{credits}</span> credits
      </span>
      <span className="text-ink-soft" style={{ opacity: 0.4 }}>
        ·
      </span>
      <button
        onClick={onRecharge}
        className="text-ink-soft hover:text-forest underline decoration-dotted underline-offset-4 transition"
      >
        Recharger
      </button>
    </div>
  );
}
