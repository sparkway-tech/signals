// UI primitives — Forest/Porcelain
const { useState, useEffect, useRef, useMemo } = React;

function Icon({ name, size = 18, className = "", strokeWidth = 1.5 }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current && window.lucide && window.lucide.icons) {
      const iconKey = name.split("-").map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join("");
      const icon = window.lucide.icons[iconKey] || window.lucide.icons[name];
      if (icon && typeof icon.toSvg === "function") {
        ref.current.innerHTML = icon.toSvg({ width: size, height: size, "stroke-width": strokeWidth });
      } else {
        ref.current.innerHTML = "";
      }
    }
  }, [name, size, strokeWidth]);
  return <span ref={ref} className={`inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }} />;
}

// Score color — Forest/Sage/Sand/Warmgray (forest = hottest)
function scoreTone(score) {
  if (score >= 80) return { bg: "#1F3A2E", text: "#F5F1EA", label: "TRÈS CHAUD", soft: "rgba(31,58,46,0.08)", textSoft: "#1F3A2E" };
  if (score >= 60) return { bg: "#7BA589", text: "#F5F1EA", label: "CHAUD", soft: "rgba(123,165,137,0.14)", textSoft: "#3F6B4E" };
  if (score >= 40) return { bg: "#D4C4A8", text: "#1A1A1A", label: "TIÈDE", soft: "rgba(212,196,168,0.30)", textSoft: "#7A6A45" };
  return { bg: "#A8A29A", text: "#F5F1EA", label: "FROID", soft: "rgba(168,162,154,0.20)", textSoft: "#5A5A5A" };
}

function ScoreCircle({ score, size = 56 }) {
  const t = scoreTone(score);
  return (
    <div
      className="inline-flex items-center justify-center font-serif font-light tabular-nums"
      style={{
        width: size, height: size, borderRadius: "50%",
        background: t.bg, color: t.text, fontSize: size * 0.42,
      }}
    >
      {score}
    </div>
  );
}

function CircularScoreLarge({ score }) {
  const t = scoreTone(score);
  const r = 64;
  const C = 2 * Math.PI * r;
  const dash = (score / 100) * C;
  return (
    <div className="relative" style={{ width: 160, height: 160 }}>
      <svg width="160" height="160" viewBox="0 0 160 160" className="-rotate-90">
        <circle cx="80" cy="80" r={r} stroke="rgba(26,26,26,0.08)" strokeWidth="6" fill="none" />
        <circle cx="80" cy="80" r={r} stroke={t.bg} strokeWidth="6" fill="none" strokeLinecap="round" strokeDasharray={`${dash} ${C}`} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="font-serif font-light text-5xl text-ink tabular-nums leading-none">{score}</div>
        <div className="mt-1.5 text-[10px] font-medium tracking-[0.18em]" style={{ color: t.textSoft }}>{t.label}</div>
      </div>
    </div>
  );
}

function Pill({ children, tone = "sand", icon = null }) {
  const tones = {
    sand: { bg: "rgba(212,196,168,0.45)", color: "#5A4A2A" },
    sage: { bg: "rgba(123,165,137,0.18)", color: "#3F6B4E" },
    bordeaux: { bg: "rgba(122,46,46,0.10)", color: "#7A2E2E" },
    forest: { bg: "rgba(31,58,46,0.10)", color: "#1F3A2E" },
    ink: { bg: "rgba(26,26,26,0.06)", color: "#1A1A1A" },
  };
  const t = tones[tone] || tones.sand;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium" style={{ background: t.bg, color: t.color }}>
      {icon && <Icon name={icon} size={11} />}
      {children}
    </span>
  );
}

function PrimaryButton({ children, onClick, icon = null, iconRight = null, className = "", type = "button", disabled = false, size = "md" }) {
  const sz = size === "lg" ? "h-12 px-6 text-[15px]" : "h-10 px-5 text-sm";
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 ${sz} rounded-md font-medium text-porcelain bg-forest hover:bg-forest-light transition focus-forest disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {icon && <Icon name={icon} size={15} />}
      {children}
      {iconRight && <Icon name={iconRight} size={15} />}
    </button>
  );
}

function SecondaryButton({ children, onClick, icon = null, className = "", disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 h-10 px-4 rounded-md text-sm font-medium border text-ink bg-transparent hover:bg-porcelain-dark transition focus-forest disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
      style={{ borderColor: "rgba(26,26,26,0.20)" }}
    >
      {icon && <Icon name={icon} size={15} />}
      {children}
    </button>
  );
}

function GhostButton({ children, onClick, icon = null, className = "", disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-ink transition ${className}`}
    >
      {icon && <Icon name={icon} size={14} />}
      {children}
    </button>
  );
}

function Card({ children, className = "", tone = "porcelain-dark" }) {
  const bg = tone === "porcelain" ? "bg-porcelain" : "bg-porcelain-dark";
  return (
    <div className={`${bg} border hairline rounded-lg ${className}`}>{children}</div>
  );
}

function CompanyMark({ initials, size = 44, blurred = false }) {
  return (
    <div
      className={`shrink-0 rounded-md flex items-center justify-center font-serif font-medium ${blurred ? "blur-name" : ""}`}
      style={{
        width: size, height: size, fontSize: size * 0.42,
        background: "rgba(212,196,168,0.55)",
        color: "#5A4A2A",
        border: "1px solid rgba(26,26,26,0.08)",
      }}
    >
      {initials}
    </div>
  );
}

function ScoreBar({ label, value, note }) {
  const t = scoreTone(value);
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <div className="text-sm font-medium text-ink">{label}</div>
        <div className="font-serif text-base font-light text-ink tabular-nums">{value}</div>
      </div>
      <div className="h-[3px] rounded-full overflow-hidden" style={{ background: "rgba(26,26,26,0.08)" }}>
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: t.bg }} />
      </div>
      <div className="mt-2 text-xs text-ink-soft leading-relaxed">{note}</div>
    </div>
  );
}

function Logo({ size = 22 }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="inline-flex items-center justify-center rounded-sm bg-forest text-porcelain" style={{ width: size, height: size }}>
        <svg viewBox="0 0 12 12" width={size * 0.55} height={size * 0.55} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
          <path d="M2 8 L4 6 L6 8 L10 4" />
        </svg>
      </span>
      <span className="font-serif text-[17px] font-medium text-ink tracking-tight">
        Sparkway <span className="text-ink-soft font-light italic">Signals</span>
      </span>
    </span>
  );
}

function CreditsBadge({ credits, onRecharge }) {
  return (
    <div className="inline-flex items-center gap-3 text-sm">
      <span className="text-ink-soft">
        <span className="font-serif text-base font-light text-ink tabular-nums">{credits}</span> credits
      </span>
      <span className="text-ink-soft" style={{ opacity: 0.4 }}>·</span>
      <button onClick={onRecharge} className="text-ink-soft hover:text-forest underline decoration-dotted underline-offset-4 transition">
        Recharger
      </button>
    </div>
  );
}

Object.assign(window, {
  Icon, scoreTone, ScoreCircle, CircularScoreLarge, Pill,
  PrimaryButton, SecondaryButton, GhostButton, Card, CompanyMark,
  ScoreBar, Logo, CreditsBadge,
});
