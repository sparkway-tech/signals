// Screen 2 — Results (freebie + teased)
function FreebieCard({ c, onOpen }) {
  const t = scoreTone(c.score);
  return (
    <div className="bg-porcelain-dark rounded-lg p-8 lg:p-10" style={{ border: "1.5px solid #1F3A2E" }}>
      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div className="flex items-start gap-5 flex-1 min-w-0">
          <CompanyMark initials={c.logo} size={56} />
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <Pill tone="sage" icon="gift">1 fiche offerte</Pill>
            </div>
            <h2 className="mt-3 font-serif text-3xl lg:text-4xl font-light text-ink tracking-tight leading-tight">{c.name}</h2>
            <div className="mt-2 flex items-center gap-3 text-sm text-ink-soft flex-wrap">
              <span>{c.sector}</span>
              <span style={{ opacity: 0.4 }}>·</span>
              <span>{c.city}</span>
              <span style={{ opacity: 0.4 }}>·</span>
              <span>{c.size}</span>
            </div>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[10px] font-medium tracking-[0.22em] text-ink-soft mb-2">SCORE D'URGENCE</div>
          <div className="flex items-center gap-3 justify-end">
            <div className="font-serif font-light text-[64px] leading-none text-ink tabular-nums">{c.score}</div>
            <div className="flex flex-col items-start">
              <span className="text-[10px] font-medium tracking-[0.18em]" style={{ color: t.textSoft }}>{t.label}</span>
              <span className="text-xs text-ink-soft">/ 100</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {c.flags.map((f, i) => (
          <Pill key={i} tone={i === 0 ? "forest" : i === 1 ? "bordeaux" : "sand"}>{f}</Pill>
        ))}
      </div>

      <div className="mt-6 pt-6 border-t hairline">
        <p className="font-serif text-lg italic font-light text-ink leading-relaxed">
          <span className="text-ink-soft text-[10px] tracking-[0.22em] not-italic font-sans font-medium block mb-2">RECOMMANDATION SIGNALS</span>
          « {c.reco} »
        </p>
      </div>

      <div className="mt-6 flex justify-end">
        <PrimaryButton iconRight="arrow-right" onClick={onOpen}>Voir la fiche complète</PrimaryButton>
      </div>
    </div>
  );
}

function TeasedCard({ c, onUnlock }) {
  const t = scoreTone(c.score);
  return (
    <div className="bg-porcelain border hairline rounded-lg p-5 hover:border-[rgba(26,26,26,0.20)] transition">
      <div className="flex items-start gap-4">
        <CompanyMark initials={c.initials} size={40} blurred />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="font-serif text-lg font-light text-ink leading-tight tracking-tight blur-name select-none">
                {c.realName}
              </div>
              <div className="mt-1 text-xs text-ink-soft truncate">
                {c.sector} · {c.city}
              </div>
            </div>
            <ScoreCircle score={c.score} size={42} />
          </div>

          <div className="mt-3">
            <span className="inline-flex items-center gap-1.5 text-xs text-ink-soft">
              <span className="inline-block w-3 h-3 rounded-sm" style={{ background: "rgba(26,26,26,0.15)" }} />
              <span className="blur-name select-none">5 postes Sales ouverts</span>
            </span>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <span className="text-[10px] font-medium tracking-[0.18em]" style={{ color: t.textSoft }}>{t.label}</span>
            <button
              onClick={onUnlock}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-forest hover:text-forest-light transition"
            >
              <Icon name="lock-open" size={12} /> Débloquer · 1 credit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ScreenResults({ template, onBack, onOpen, onUnlock, credits, onRecharge }) {
  const r = mockData.results;
  const tpl = template?.title || r.template;

  return (
    <div className="px-6 lg:px-12 py-10">
      <div className="max-w-6xl mx-auto">

        <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink mb-6 transition">
          <Icon name="arrow-left" size={14} /> Modifier la recherche
        </button>

        {/* Header */}
        <div className="mb-10">
          <h1 className="font-serif font-light text-[40px] lg:text-[44px] leading-[1.1] tracking-tight text-ink">
            Signals a trouvé <span className="italic text-forest">{r.total} boîtes</span> qui auraient besoin de toi.
          </h1>
          <p className="mt-3 text-sm text-ink-soft leading-relaxed">
            Template : <span className="text-ink">{tpl}</span> · Périmètre : <span className="text-ink">{r.perimeter}</span>
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8 items-start">

          <div>
            <FreebieCard c={r.freebie} onOpen={onOpen} />

            <div className="mt-10 mb-4 flex items-baseline justify-between">
              <h3 className="text-xs uppercase tracking-[0.22em] text-ink-soft">Les {r.total - 1} autres boîtes</h3>
              <span className="text-xs text-ink-soft">Trié par score décroissant</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {r.teased.map((c, i) => (
                <TeasedCard key={i} c={c} onUnlock={() => onUnlock(c.realName)} />
              ))}
            </div>

            <div className="mt-6 flex justify-center">
              <SecondaryButton icon="chevron-down">Voir les {r.total - 1 - r.teased.length} autres boîtes</SecondaryButton>
            </div>
          </div>

          {/* Sticky sidebar */}
          <aside className="lg:sticky lg:top-24">
            <div className="bg-porcelain-dark border hairline rounded-lg p-6">
              <div className="text-xs uppercase tracking-[0.22em] text-ink-soft mb-3">Tes credits</div>
              <div className="font-serif font-light text-4xl text-ink tabular-nums leading-none">{credits}</div>
              <p className="mt-3 text-sm text-ink leading-relaxed">
                Tu peux débloquer <span className="font-medium">{credits} boîtes</span> de cette liste.
              </p>
              <div className="mt-5 pt-5 border-t hairline">
                <button onClick={onRecharge} className="inline-flex items-center gap-1.5 text-sm font-medium text-forest hover:text-forest-light transition">
                  Recharger mes credits <Icon name="arrow-right" size={14} />
                </button>
              </div>
            </div>

            <div className="mt-4 p-5 text-xs text-ink-soft leading-relaxed">
              <p className="italic font-serif text-sm text-ink leading-snug">
                « 47 boîtes scorées pour 29 €. Tu rentabilises avec le premier mandat. »
              </p>
            </div>
          </aside>

        </div>
      </div>
    </div>
  );
}
window.ScreenResults = ScreenResults;
