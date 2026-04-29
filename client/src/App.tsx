import { Logo, CreditsBadge, PrimaryButton, ScoreCircle, CircularScoreLarge, Pill } from "@/components/ui";

/**
 * App.tsx — placeholder semaine 1.
 * Affiche les UI primitives portées depuis design-reference/ui.jsx pour
 * vérifier visuellement que la palette + fonts + utilities sont OK.
 * Sera remplacé par le shell + router complet dès qu'on attaque l'auth
 * et l'onboarding (étapes 6 et 7).
 */
export function App() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 backdrop-blur bg-porcelain/90 border-b hairline">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Logo />
          <CreditsBadge credits={12} onRecharge={() => {}} />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12 space-y-12">
        <section>
          <h1 className="font-serif text-5xl font-light text-ink leading-tight">
            Trouve les boîtes qui ont besoin de toi{" "}
            <span className="italic text-forest">avant qu'elles ne le sachent.</span>
          </h1>
          <p className="mt-4 text-ink-soft text-lg max-w-2xl">
            Foundation OK. Stack Vite + React 18 + Tailwind v4 + Inter/Fraunces. Les écrans complets
            arrivent dans les prochaines étapes.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-serif text-2xl text-ink">UI primitives — sanity check</h2>
          <div className="flex items-center gap-4 flex-wrap">
            <ScoreCircle score={92} />
            <ScoreCircle score={74} />
            <ScoreCircle score={48} />
            <ScoreCircle score={28} />
            <CircularScoreLarge score={87} />
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Pill tone="forest" icon="check">Fiche débloquée</Pill>
            <Pill tone="sage" icon="trending-up">Croissance Sales +35%</Pill>
            <Pill tone="sand" icon="briefcase">3 postes ouverts</Pill>
            <Pill tone="bordeaux" icon="alert-circle">Recrute Head of</Pill>
            <Pill tone="ink">Série B</Pill>
          </div>
          <div className="flex items-center gap-3">
            <PrimaryButton icon="search" size="lg">Lancer la recherche</PrimaryButton>
          </div>
        </section>
      </main>
    </div>
  );
}
