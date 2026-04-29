// Screen 3 v3 — Company detail (clear hierarchy, less cream-saturation)
function MandateBlock({ m }) {
  const [openCalc, setOpenCalc] = useState(false);
  return (
    <div className="rounded-lg p-7 surface-sage border">
      <div className="flex items-baseline justify-between gap-4 flex-wrap">
        <div className="text-[10px] font-semibold tracking-[0.22em] text-[#3F6B4E]">POTENTIEL MANDAT ESTIMÉ</div>
        <button
          onClick={() => setOpenCalc((v) => !v)}
          className="inline-flex items-center gap-1 text-xs text-[#3F6B4E] hover:text-forest underline decoration-dotted underline-offset-4"
        >
          {openCalc ? "Masquer le calcul" : "Voir le calcul"} <Icon name={openCalc ? "chevron-up" : "chevron-down"} size={11} />
        </button>
      </div>
      <div className="mt-3 font-serif font-light text-4xl lg:text-[44px] text-ink tracking-tight tabular-nums leading-none">
        {m.low.toLocaleString("fr-FR")} € — {m.high.toLocaleString("fr-FR")} €
      </div>
      <p className="mt-3 text-sm text-ink-soft leading-relaxed">{m.summary}</p>
      {openCalc && (
        <ul className="mt-4 pt-4 border-t space-y-2 text-sm text-ink" style={{ borderColor: "rgba(123,165,137,0.30)" }}>
          {m.breakdown.map((b, i) => (
            <li key={i} className="flex items-center justify-between gap-3">
              <span>{b.role} <span className="text-ink-soft">@ {b.salary}</span></span>
              <span className="text-ink-soft">×</span>
              <span className="text-ink-soft tabular-nums">{b.rate}</span>
              <span className="text-ink-soft">=</span>
              <span className="font-medium tabular-nums">{b.total}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function DecisionMakerCard({ d }) {
  return (
    <div className="surface-raised border hairline rounded-lg p-6">
      <div className="flex items-start gap-5">
        <CompanyMark initials={d.initials} size={56} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <h3 className="font-serif text-2xl font-light text-ink tracking-tight leading-tight">{d.name}</h3>
              <div className="mt-1 text-sm text-ink-soft">{d.role}</div>
            </div>
            <Pill tone={d.tagTone}>{d.tag}</Pill>
          </div>
          <a href="#" className="mt-3 inline-flex items-center gap-1.5 text-xs text-ink-soft hover:text-forest transition">
            <Icon name="linkedin" size={13} /> Voir profil
          </a>
        </div>
      </div>
      <div className="mt-5 pt-5 border-t hairline">
        <div className="text-[10px] font-medium tracking-[0.18em] text-ink-soft mb-2">ANGLE D'APPROCHE</div>
        <p className="font-serif text-[15px] italic font-light text-ink leading-relaxed">« {d.angle} »</p>
      </div>
    </div>
  );
}

function TimelineEvent({ e, isLast }) {
  return (
    <li className="relative pl-8">
      {!isLast && <span className="absolute left-[7px] top-4 bottom-[-20px] w-px" style={{ background: "rgba(26,26,26,0.15)" }} />}
      <span
        className={`absolute left-0 top-1.5 h-[15px] w-[15px] rounded-full border-2 ${e.now ? "bg-forest border-forest" : "bg-porcelain"}`}
        style={!e.now ? { borderColor: "#7BA589" } : {}}
      />
      <div className="grid grid-cols-1 md:grid-cols-[140px_1fr] gap-3">
        <div className="font-serif italic text-sm text-[#3F6B4E]">{e.when}</div>
        <div className={`text-sm ${e.now ? "text-ink font-medium" : "text-ink"} leading-relaxed`}>{e.text}</div>
      </div>
    </li>
  );
}

function CompanyPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const items = [
    { id: "pennylane", label: "Pennylane" },
    { id: "spendesk", label: "Spendesk" },
    { id: "aircall", label: "Aircall" },
  ];
  const cur = items.find((i) => i.id === value);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 h-9 px-3 rounded-md border hairline-strong surface text-xs text-ink-soft hover:text-ink"
      >
        <span className="text-ink-soft">Voir d'autres exemples :</span>
        <span className="text-ink font-medium">{cur.label}</span>
        <Icon name="chevron-down" size={13} />
      </button>
      {open && (
        <div className="absolute right-0 mt-1.5 min-w-[180px] surface-raised border hairline-strong rounded-md p-1 z-20">
          {items.map((it) => (
            <button
              key={it.id}
              onClick={() => { onChange(it.id); setOpen(false); }}
              className={`w-full text-left px-3 py-1.5 rounded text-xs ${value === it.id ? "bg-forest text-porcelain" : "text-ink hover:bg-porcelain-dark"}`}
            >
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Section header — used to open up sections without a card background
function SectionHeader({ eyebrow, title, subtitle, right }) {
  return (
    <div className="flex items-end justify-between gap-4 flex-wrap mb-5 pb-3 border-b hairline">
      <div>
        {eyebrow && <div className="text-[10px] font-semibold tracking-[0.22em] text-ink-soft mb-2">{eyebrow}</div>}
        {title && <h2 className="font-serif text-[28px] font-light text-ink tracking-tight leading-none">{title}</h2>}
        {subtitle && <p className="mt-1.5 text-sm text-ink-soft">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

function ScreenCompany({ onBack }) {
  const [companyId, setCompanyId] = useState("pennylane");
  const c = mockData.companies[companyId];
  const [contacted, setContacted] = useState(false);
  const [saved, setSaved] = useState(false);

  return (
    <div className="px-6 lg:px-12 py-10">
      <div className="max-w-6xl mx-auto">

        <div className="flex items-center justify-between mb-6">
          <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink transition">
            <Icon name="arrow-left" size={14} /> Retour aux résultats
          </button>
          <CompanyPicker value={companyId} onChange={setCompanyId} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-10">

          {/* Main column */}
          <div>

            {/* Header — no card, just identity */}
            <div className="flex items-start justify-between gap-6 flex-wrap pb-8 border-b hairline">
              <div className="flex items-start gap-5 flex-1 min-w-0">
                <CompanyMark initials={c.logo} size={64} />
                <div className="min-w-0">
                  <Pill tone="sage" icon="check">Fiche débloquée</Pill>
                  <h1 className="mt-3 font-serif font-light text-[44px] lg:text-[52px] leading-[1.02] tracking-tight text-ink">{c.name}</h1>
                  <div className="mt-2.5 flex items-center gap-3 text-sm text-ink-soft flex-wrap">
                    <span>{c.sector}</span>
                    <span style={{ opacity: 0.4 }}>·</span>
                    <span>{c.size}</span>
                    <span style={{ opacity: 0.4 }}>·</span>
                    <span>{c.city}</span>
                    <span style={{ opacity: 0.4 }}>·</span>
                    <a href="#" className="inline-flex items-center gap-1 text-forest hover:underline underline-offset-4">
                      {c.website} <Icon name="external-link" size={11} />
                    </a>
                  </div>
                </div>
              </div>
              <div className="shrink-0">
                <CircularScoreLarge score={c.score} />
              </div>
            </div>

            {/* PRIMARY 1 — Pourquoi maintenant — sage tinted, the eye lands here */}
            <section className="mt-8">
              <div className="surface-sage-strong border rounded-lg p-8">
                <div className="flex items-baseline justify-between mb-4 flex-wrap gap-2">
                  <div className="text-[10px] font-semibold tracking-[0.22em] text-[#3F6B4E]">POURQUOI MAINTENANT — RECOMMANDATION SIGNALS</div>
                  <span className="text-[11px] text-ink-soft">Mise à jour il y a 4h</span>
                </div>
                <p className="font-serif text-xl lg:text-[24px] italic font-light text-ink leading-[1.55]">« {c.reco} »</p>
              </div>
            </section>

            {/* PRIMARY 2 — Mandate */}
            <section className="mt-5">
              <MandateBlock m={c.mandate} />
            </section>

            {/* SECONDARY — Décideurs */}
            <section className="mt-12">
              <SectionHeader
                title="Décideurs identifiés"
                subtitle="Les bons interlocuteurs avec leur angle d'approche."
                right={<span className="text-xs text-ink-soft">{c.decisionMakers.length} contacts</span>}
              />
              <div className="space-y-4">
                {c.decisionMakers.map((d, i) => <DecisionMakerCard key={i} d={d} />)}
              </div>
            </section>

            {/* TERTIARY — Pourquoi ce score (open section, no card) */}
            <section className="mt-12">
              <SectionHeader eyebrow="POURQUOI CE SCORE" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
                {c.scoreBreakdown.map((s) => <ScoreBar key={s.label} {...s} />)}
              </div>
            </section>

            {/* TERTIARY — Timeline */}
            <section className="mt-12">
              <SectionHeader
                title="Timeline"
                subtitle="Comment cette opportunité s'est construite."
              />
              <ul className="space-y-5 pl-1">
                {c.timeline.map((e, i) => <TimelineEvent key={i} e={e} isLast={i === c.timeline.length - 1} />)}
              </ul>
            </section>

            {/* TERTIARY — Postes ouverts (table-like, no card bg) */}
            <section className="mt-12">
              <SectionHeader
                eyebrow="POSTES OUVERTS"
                right={<span className="text-xs text-ink-soft">{c.jobs.length} annonces actives</span>}
              />
              <ul className="divide-y" style={{ borderColor: "rgba(26,26,26,0.08)" }}>
                {c.jobs.map((j, i) => (
                  <li key={i} className="py-3.5 flex items-center gap-4 hover:bg-porcelain-dark/40 transition px-1 -mx-1 rounded">
                    <div className="h-9 w-9 rounded-md flex items-center justify-center text-[10px] font-medium tracking-wider"
                      style={{ background: "rgba(212,196,168,0.45)", color: "#5A4A2A" }}>
                      {j.type}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-ink font-medium truncate">{j.title}</div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-ink-soft">
                        <span>{j.date}</span>
                        {j.republished && (
                          <>
                            <span style={{ opacity: 0.4 }}>·</span>
                            <Pill tone="bordeaux">Republié</Pill>
                          </>
                        )}
                      </div>
                    </div>
                    <a href="#" className="text-ink-soft hover:text-forest p-2">
                      <Icon name="external-link" size={15} />
                    </a>
                  </li>
                ))}
              </ul>
            </section>

          </div>

          {/* Sidebar — minimal cards, white surface */}
          <aside className="space-y-5 lg:sticky lg:top-24 self-start">
            <div className="surface-raised border hairline rounded-lg p-6">
              <h3 className="text-[10px] font-semibold uppercase tracking-[0.22em] text-ink-soft mb-5">Signaux entreprise</h3>
              <dl className="space-y-3.5">
                {[
                  ["Effectif total", c.signals.effectif],
                  ["Croissance Sales 6 mois", c.signals.growth],
                  ["Effectif Sales actuel", c.signals.salesHeadcount],
                  ["Dernière levée", c.signals.lastFunding],
                  ["Lead investor", c.signals.leadInvestor],
                  ["Stade", c.signals.stage],
                ].map(([k, v]) => (
                  <div key={k} className="border-b hairline pb-3 last:border-b-0 last:pb-0">
                    <dt className="text-[11px] uppercase tracking-wider text-ink-soft">{k}</dt>
                    <dd className="mt-1 text-sm text-ink leading-snug">{v}</dd>
                  </div>
                ))}
                <div>
                  <dt className="text-[11px] uppercase tracking-wider text-ink-soft">CEO</dt>
                  <dd className="mt-1 text-sm text-ink leading-snug">
                    {c.signals.ceo}
                    <a href="#" className="ml-2 inline-flex items-center gap-1 text-xs text-ink-soft hover:text-forest">
                      <Icon name="linkedin" size={11} />
                    </a>
                  </dd>
                </div>
              </dl>
            </div>

            {/* Concurrence cabinet — disabled, kept low-key */}
            <div className="border hairline rounded-lg p-5" style={{ background: "rgba(26,26,26,0.02)" }}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[10px] font-semibold uppercase tracking-[0.22em] text-ink-soft">Concurrence cabinet</h3>
                <Pill tone="ink">Bientôt</Pill>
              </div>
              <p className="text-sm text-ink-soft leading-relaxed">
                <span className="blur-name select-none">3</span> cabinets ont contacté cette boîte ces 90 derniers jours.
              </p>
            </div>

            {/* Actions — primary uses forest, others stay quiet */}
            <div className="surface-raised border hairline rounded-lg p-6">
              <h3 className="text-[10px] font-semibold uppercase tracking-[0.22em] text-ink-soft mb-4">Actions</h3>
              <div className="space-y-2.5">
                <button
                  onClick={() => setContacted((v) => !v)}
                  className={`w-full inline-flex items-center justify-center gap-2 h-10 px-4 rounded-md text-sm font-medium transition ${
                    contacted
                      ? "bg-forest text-porcelain border border-forest"
                      : "bg-forest text-porcelain border border-forest hover:bg-forest-light"
                  }`}
                >
                  <Icon name={contacted ? "check" : "phone"} size={14} />
                  {contacted ? "Contacté" : "Marquer comme contacté"}
                </button>
                <button
                  onClick={() => setSaved((v) => !v)}
                  className={`w-full inline-flex items-center justify-center gap-2 h-10 px-4 rounded-md text-sm font-medium transition border ${
                    saved ? "bg-porcelain-dark text-ink border-ink/20" : "bg-transparent text-ink hover:bg-porcelain"
                  }`}
                  style={!saved ? { borderColor: "rgba(26,26,26,0.20)" } : {}}
                >
                  <Icon name={saved ? "bookmark-check" : "bookmark"} size={14} />
                  {saved ? "Sauvegardée" : "Sauvegarder"}
                </button>
                <button
                  disabled
                  className="w-full inline-flex items-center justify-center gap-2 h-10 px-4 rounded-md text-sm font-medium border bg-transparent text-ink-soft cursor-not-allowed"
                  style={{ borderColor: "rgba(26,26,26,0.10)" }}
                >
                  <Icon name="file-down" size={14} /> Exporter en PDF
                  <Pill tone="ink">Bientôt</Pill>
                </button>
              </div>
            </div>

            <p className="text-[11px] text-ink-soft text-center leading-relaxed px-2">
              Données vérifiées il y a 4h<br />
              <span style={{ opacity: 0.7 }}>Sources : France Travail, Adzuna, LinkedIn public, Pappers</span>
            </p>
          </aside>

        </div>
      </div>
    </div>
  );
}
window.ScreenCompany = ScreenCompany;
