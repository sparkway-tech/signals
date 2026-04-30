import { Fragment, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Logo, PrimaryButton, GhostButton } from "@/components/ui";
import { OnboardingChip } from "@/components/onboarding/OnboardingChip";
import { ONBOARDING_SECTORS, ONBOARDING_FUNCTIONS, ONBOARDING_REGIONS } from "@/lib/onboarding-options";

/**
 * Onboarding 3 étapes.
 * Port pixel-perfect de design-reference/screen-onboarding.jsx.
 *
 * Validation :
 *  - sectors max 3
 *  - functions max 5
 *  - regions min 1
 *
 * À la fin : POST /api/onboarding puis redirect /recherche.
 */

const STEPS = [
  { n: 1, label: "Secteurs" },
  { n: 2, label: "Fonctions" },
  { n: 3, label: "Régions" },
] as const;

function toggle<T>(arr: T[], value: T, max?: number): T[] {
  if (arr.includes(value)) return arr.filter((v) => v !== value);
  if (max && arr.length >= max) return arr;
  return [...arr, value];
}

export function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [sectors, setSectors] = useState<string[]>([]);
  const [functions, setFunctions] = useState<string[]>([]);
  const [regions, setRegions] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canNext =
    (step === 1 && sectors.length > 0) ||
    (step === 2 && functions.length > 0) ||
    (step === 3 && regions.length > 0);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const r = await fetch("/api/onboarding", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectors, functions, regions }),
      });
      if (!r.ok) {
        setError("Impossible d'enregistrer ton périmètre. Réessaie.");
        return;
      }
      navigate("/recherche");
    } catch {
      setError("Connexion impossible. Vérifie ta connexion réseau.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-2xl">
        {/* Logo header */}
        <div className="flex items-center justify-center mb-10">
          <Logo size={26} />
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-center gap-3 mb-12">
          {STEPS.map((s, i) => (
            <Fragment key={s.n}>
              <div className="flex items-center gap-2">
                <span
                  className={`h-6 w-6 rounded-full inline-flex items-center justify-center text-[11px] font-medium tabular-nums ${
                    step >= s.n
                      ? "bg-forest text-porcelain"
                      : "bg-transparent text-ink-soft border hairline-strong"
                  }`}
                >
                  {s.n}
                </span>
                <span className={`text-xs font-medium ${step === s.n ? "text-ink" : "text-ink-soft"}`}>{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <span className="h-px w-10" style={{ background: "rgba(26,26,26,0.15)" }} />
              )}
            </Fragment>
          ))}
        </div>

        {/* Title + subtitle */}
        <div className="text-center mb-10">
          <p className="text-xs uppercase tracking-[0.22em] text-ink-soft mb-4">Configure ton périmètre</p>
          {step === 1 && (
            <h1 className="font-serif font-light text-[40px] leading-[1.1] tracking-tight text-ink">
              Quels secteurs tu couvres ?
            </h1>
          )}
          {step === 2 && (
            <h1 className="font-serif font-light text-[40px] leading-[1.1] tracking-tight text-ink">
              Quelles expertises tu recrutes ?
            </h1>
          )}
          {step === 3 && (
            <h1 className="font-serif font-light text-[40px] leading-[1.1] tracking-tight text-ink">
              Sur quelles régions ?
            </h1>
          )}
          <p className="mt-4 text-sm text-ink-soft leading-relaxed max-w-md mx-auto">
            {step === 1 && "Choisis jusqu'à 3 verticales. On filtrera les boîtes à scanner en fonction."}
            {step === 2 && "Choisis jusqu'à 5 expertises. Les annonces hors périmètre seront ignorées."}
            {step === 3 && "Sélectionne autant de zones que nécessaire."}
          </p>
        </div>

        {/* Chips */}
        <div className="flex flex-wrap justify-center gap-2 mb-12">
          {step === 1 &&
            ONBOARDING_SECTORS.map((s) => (
              <OnboardingChip
                key={s}
                label={s}
                selected={sectors.includes(s)}
                disabled={sectors.length >= 3}
                onClick={() => setSectors(toggle(sectors, s, 3))}
              />
            ))}
          {step === 2 &&
            ONBOARDING_FUNCTIONS.map((s) => (
              <OnboardingChip
                key={s}
                label={s}
                selected={functions.includes(s)}
                disabled={functions.length >= 5}
                onClick={() => setFunctions(toggle(functions, s, 5))}
              />
            ))}
          {step === 3 &&
            ONBOARDING_REGIONS.map((s) => (
              <OnboardingChip
                key={s}
                label={s}
                selected={regions.includes(s)}
                onClick={() => setRegions(toggle(regions, s))}
              />
            ))}
        </div>

        {error && (
          <p className="text-center text-sm text-bordeaux mb-4" role="alert">
            {error}
          </p>
        )}

        {/* Footer nav */}
        <div className="flex items-center justify-between pt-6 border-t hairline">
          <GhostButton
            icon={step > 1 ? "arrow-left" : null}
            onClick={() => step > 1 && setStep((step - 1) as 1 | 2 | 3)}
            disabled={step === 1}
          >
            {step === 1 ? "" : "Retour"}
          </GhostButton>
          <div className="text-xs text-ink-soft">
            {step === 1 && `${sectors.length}/3 secteurs`}
            {step === 2 && `${functions.length}/5 expertises`}
            {step === 3 && `${regions.length} régions`}
          </div>
          {step < 3 ? (
            <PrimaryButton
              iconRight="arrow-right"
              disabled={!canNext}
              onClick={() => setStep((step + 1) as 1 | 2 | 3)}
            >
              Continuer
            </PrimaryButton>
          ) : (
            <PrimaryButton iconRight="arrow-right" disabled={!canNext || submitting} onClick={handleSubmit}>
              {submitting ? "Enregistrement…" : "Lancer Signals"}
            </PrimaryButton>
          )}
        </div>
      </div>
    </div>
  );
}
