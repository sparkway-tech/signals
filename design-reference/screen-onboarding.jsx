// Screen 0 — Onboarding (3 steps)
function OnboardingChip({ label, selected, onClick, disabled }) {
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

function ScreenOnboarding({ onDone }) {
  const [step, setStep] = useState(1);
  const [sectors, setSectors] = useState([]);
  const [functions, setFunctions] = useState([]);
  const [regions, setRegions] = useState([]);

  const toggle = (arr, setArr, value, max) => {
    if (arr.includes(value)) setArr(arr.filter((v) => v !== value));
    else if (!max || arr.length < max) setArr([...arr, value]);
  };

  const steps = [
    { n: 1, label: "Secteurs" },
    { n: 2, label: "Fonctions" },
    { n: 3, label: "Régions" },
  ];

  const canNext =
    (step === 1 && sectors.length > 0) ||
    (step === 2 && functions.length > 0) ||
    (step === 3 && regions.length > 0);

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-2xl">

        <div className="flex items-center justify-center mb-10">
          <Logo size={26} />
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-center gap-3 mb-12">
          {steps.map((s, i) => (
            <React.Fragment key={s.n}>
              <div className="flex items-center gap-2">
                <span
                  className={`h-6 w-6 rounded-full inline-flex items-center justify-center text-[11px] font-medium tabular-nums ${
                    step >= s.n ? "bg-forest text-porcelain" : "bg-transparent text-ink-soft border hairline-strong border"
                  }`}
                >
                  {s.n}
                </span>
                <span className={`text-xs font-medium ${step === s.n ? "text-ink" : "text-ink-soft"}`}>{s.label}</span>
              </div>
              {i < steps.length - 1 && <span className="h-px w-10" style={{ background: "rgba(26,26,26,0.15)" }} />}
            </React.Fragment>
          ))}
        </div>

        <div className="text-center mb-10">
          <p className="text-xs uppercase tracking-[0.22em] text-ink-soft mb-4">Configure ton périmètre</p>
          {step === 1 && (
            <h1 className="font-serif font-light text-[40px] leading-[1.1] tracking-tight text-ink">Quels secteurs tu couvres ?</h1>
          )}
          {step === 2 && (
            <h1 className="font-serif font-light text-[40px] leading-[1.1] tracking-tight text-ink">Quelles fonctions tu places ?</h1>
          )}
          {step === 3 && (
            <h1 className="font-serif font-light text-[40px] leading-[1.1] tracking-tight text-ink">Sur quelles régions ?</h1>
          )}
          <p className="mt-4 text-sm text-ink-soft leading-relaxed max-w-md mx-auto">
            {step === 1 && "Choisis jusqu'à 3 verticales. On filtrera les boîtes à scanner en fonction."}
            {step === 2 && "Choisis jusqu'à 5 fonctions. Les annonces hors périmètre seront ignorées."}
            {step === 3 && "Sélectionne autant de zones que nécessaire."}
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-2 mb-12">
          {step === 1 && mockData.onboarding.sectors.map((s) => (
            <OnboardingChip key={s} label={s} selected={sectors.includes(s)} disabled={sectors.length >= 3} onClick={() => toggle(sectors, setSectors, s, 3)} />
          ))}
          {step === 2 && mockData.onboarding.functions.map((s) => (
            <OnboardingChip key={s} label={s} selected={functions.includes(s)} disabled={functions.length >= 5} onClick={() => toggle(functions, setFunctions, s, 5)} />
          ))}
          {step === 3 && mockData.onboarding.regions.map((s) => (
            <OnboardingChip key={s} label={s} selected={regions.includes(s)} onClick={() => toggle(regions, setRegions, s)} />
          ))}
        </div>

        <div className="flex items-center justify-between pt-6 border-t hairline">
          <GhostButton icon={step > 1 ? "arrow-left" : null} onClick={() => step > 1 && setStep(step - 1)} disabled={step === 1}>
            {step === 1 ? "" : "Retour"}
          </GhostButton>
          <div className="text-xs text-ink-soft">
            {step === 1 && `${sectors.length}/3 secteurs`}
            {step === 2 && `${functions.length}/5 fonctions`}
            {step === 3 && `${regions.length} régions`}
          </div>
          {step < 3 ? (
            <PrimaryButton iconRight="arrow-right" disabled={!canNext} onClick={() => setStep(step + 1)}>Continuer</PrimaryButton>
          ) : (
            <PrimaryButton iconRight="arrow-right" disabled={!canNext} onClick={() => onDone({ sectors, functions, regions })}>Lancer Signals</PrimaryButton>
          )}
        </div>

      </div>
    </div>
  );
}
window.ScreenOnboarding = ScreenOnboarding;
