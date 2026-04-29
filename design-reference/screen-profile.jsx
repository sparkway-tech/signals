// Screen 5 — Profile
function ScreenProfile({ onLogout, onRecharge, onView, onEditPerimeter }) {
  const u = mockData.user;

  const Section = ({ title, action, children }) => (
    <section>
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-xs uppercase tracking-[0.22em] text-ink-soft">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );

  return (
    <div className="px-6 lg:px-12 py-10">
      <div className="max-w-3xl mx-auto">

        <div className="mb-12">
          <h1 className="font-serif font-light text-[40px] tracking-tight text-ink leading-tight">Profil & paramètres</h1>
          <p className="mt-2 text-sm text-ink-soft">Gère ton compte, ton périmètre et ton historique.</p>
        </div>

        <div className="space-y-12">

          <Section
            title="Mon périmètre"
            action={<GhostButton icon="pencil" onClick={onEditPerimeter}>Modifier</GhostButton>}
          >
            <div className="bg-porcelain-dark border hairline rounded-lg p-7 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-[140px_1fr] gap-3">
                <div className="text-xs uppercase tracking-wider text-ink-soft">Secteurs</div>
                <div className="flex flex-wrap gap-2">
                  {u.perimeter.sectors.map(s => <Pill key={s} tone="forest">{s}</Pill>)}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-[140px_1fr] gap-3 pt-5 border-t hairline">
                <div className="text-xs uppercase tracking-wider text-ink-soft">Fonctions</div>
                <div className="flex flex-wrap gap-2">
                  {u.perimeter.functions.map(s => <Pill key={s} tone="forest">{s}</Pill>)}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-[140px_1fr] gap-3 pt-5 border-t hairline">
                <div className="text-xs uppercase tracking-wider text-ink-soft">Régions</div>
                <div className="flex flex-wrap gap-2">
                  {u.perimeter.regions.map(s => <Pill key={s} tone="forest">{s}</Pill>)}
                </div>
              </div>
            </div>
          </Section>

          <Section title="Mes credits">
            <div className="bg-porcelain-dark border hairline rounded-lg p-7">
              <div className="flex items-end justify-between flex-wrap gap-4">
                <div>
                  <div className="text-xs text-ink-soft mb-2">Solde actuel</div>
                  <div className="font-serif font-light text-6xl text-ink tabular-nums leading-none">{u.credits}</div>
                  <div className="mt-2 text-sm text-ink-soft">credits disponibles</div>
                </div>
                <PrimaryButton icon="plus" onClick={onRecharge}>Recharger</PrimaryButton>
              </div>

              <div className="mt-7 pt-6 border-t hairline">
                <div className="text-[11px] uppercase tracking-wider text-ink-soft mb-3">Historique des achats</div>
                <ul className="divide-y" style={{ borderColor: "rgba(26,26,26,0.08)" }}>
                  {mockData.purchaseHistory.map((p, i) => (
                    <li key={i} className="py-3 flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-ink">{p.pack}</div>
                        <div className="text-xs text-ink-soft">{p.date}</div>
                      </div>
                      <div className="text-sm text-sage tabular-nums">{p.credits}</div>
                      <div className="text-sm text-ink font-medium tabular-nums w-16 text-right">{p.amount}</div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Section>

          <Section title="Mes fiches débloquées" action={<span className="text-xs text-ink-soft">{mockData.unlockedHistory.length} fiches</span>}>
            <div className="bg-porcelain-dark border hairline rounded-lg overflow-hidden">
              <ul className="divide-y" style={{ borderColor: "rgba(26,26,26,0.08)" }}>
                {mockData.unlockedHistory.map((h, i) => (
                  <li key={i} className="px-6 py-4 flex items-center gap-4">
                    <CompanyMark initials={h.name.slice(0, 2).toUpperCase()} size={36} />
                    <div className="flex-1 min-w-0">
                      <div className="font-serif text-base font-light text-ink tracking-tight">{h.name}</div>
                      <div className="text-xs text-ink-soft">Débloqué {h.date.toLowerCase()}</div>
                    </div>
                    <ScoreCircle score={h.score} size={36} />
                    <button onClick={onView} className="inline-flex items-center gap-1 text-sm text-forest hover:text-forest-light transition">
                      Revoir <Icon name="arrow-right" size={13} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </Section>

          <Section title="Compte">
            <div className="bg-porcelain-dark border hairline rounded-lg p-7 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-wider text-ink-soft mb-1">Email</div>
                  <div className="text-sm text-ink">{u.email}</div>
                </div>
                <GhostButton icon="pencil">Modifier</GhostButton>
              </div>
              <div className="pt-5 border-t hairline flex items-center justify-between">
                <div className="text-xs text-ink-soft">Membre depuis {u.joinedAt}</div>
                <button onClick={onLogout} className="inline-flex items-center gap-1.5 text-sm font-medium text-bordeaux hover:underline underline-offset-4 transition">
                  <Icon name="log-out" size={14} /> Se déconnecter
                </button>
              </div>
            </div>
          </Section>

        </div>
      </div>
    </div>
  );
}
window.ScreenProfile = ScreenProfile;
