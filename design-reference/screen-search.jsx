// Screen 1 — Search (templates + filters)
function TemplateCard({ t, onClick }) {
  return (
    <button
      onClick={onClick}
      className="group w-full text-left bg-porcelain-dark border hairline rounded-lg px-7 py-6 hover:border-forest transition focus-forest" style={{ backgroundColor: "rgb(235, 224, 204)" }}>
      
      <div className="flex items-start gap-6">
        <div className="flex-1 min-w-0">
          <h3 className="font-serif text-2xl font-light text-ink tracking-tight leading-snug">{t.title}</h3>
          <p className="mt-2 text-sm text-ink-soft leading-relaxed">{t.desc}</p>
          <div className="mt-4 inline-flex items-center gap-2 text-xs text-ink-soft">
            <span className="h-1 w-1 rounded-full bg-sage" />
            <span>≈ <span className="text-ink font-medium tabular-nums">{t.count} boîtes</span> correspondent à ton périmètre</span>
          </div>
        </div>
        <div className="shrink-0 self-center text-ink-soft group-hover:text-forest group-hover:translate-x-1 transition-all">
          <Icon name="arrow-right" size={22} strokeWidth={1.4} />
        </div>
      </div>
    </button>);

}

function FilterRow({ label, children }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-4 items-start py-5 border-b hairline last:border-b-0">
      <div className="text-sm font-medium text-ink">{label}</div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>);

}

function FilterChip({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center h-8 px-3 rounded-md text-xs font-medium transition border ${
      active ? "bg-forest text-porcelain border-forest" : "bg-porcelain text-ink border-[rgba(26,26,26,0.15)] hover:bg-porcelain-dark"}`
      }>
      
      {label}
    </button>);

}

function ScreenSearch({ perimeter, onLaunch }) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [size, setSize] = useState(["50-200", "200-1000"]);
  const [stage, setStage] = useState(["Series A", "Series B", "Series C+"]);
  const [age, setAge] = useState("toutes");

  const toggle = (arr, setArr, v) => arr.includes(v) ? setArr(arr.filter((x) => x !== v)) : setArr([...arr, v]);

  return (
    <div className="px-6 lg:px-12 py-12 lg:py-16">
      <div className="max-w-3xl mx-auto">

        <div className="text-center mb-12">
          <h1 className="font-serif font-light text-[44px] lg:text-[52px] leading-[1.05] tracking-tight text-ink text-balance">
            Trouve les boîtes qui ont besoin de toi <span className="italic text-forest">avant qu'elles ne le sachent.</span>
          </h1>
          <p className="mt-6 text-base text-ink-soft leading-relaxed max-w-xl mx-auto">
            Choisis un template ou ajuste tes filtres. Tu reçois 1 boîte gratuite par recherche.
          </p>
        </div>

        <section>
          <div className="flex items-baseline justify-between mb-5">
            <h2 className="text-xs uppercase tracking-[0.22em] text-ink-soft">Templates de recherche</h2>
            <span className="text-xs text-ink-soft">4 templates · mis à jour ce matin</span>
          </div>
          <div className="space-y-3">
            {mockData.templates.map((t) =>
            <TemplateCard key={t.id} t={t} onClick={() => onLaunch(t)} />
            )}
          </div>
        </section>

        {/* Filters */}
        <section className="mt-12">
          <button
            onClick={() => setFiltersOpen((v) => !v)}
            className="w-full flex items-center justify-between py-4 border-t border-b hairline hover:bg-porcelain-dark/40 px-2 transition">
            
            <span className="text-xs uppercase tracking-[0.22em] text-ink-soft">Ou ajuste tes filtres</span>
            <Icon name={filtersOpen ? "chevron-up" : "chevron-down"} size={16} className="text-ink-soft" />
          </button>

          {filtersOpen &&
          <div className="px-2">
              <FilterRow label="Secteur">
                {perimeter.sectors.map((s) => <FilterChip key={s} label={s} active onClick={() => {}} />)}
                <FilterChip label="+ ajouter" onClick={() => {}} />
              </FilterRow>
              <FilterRow label="Taille effectif">
                {["1-50", "50-200", "200-1000", "1000+"].map((s) =>
              <FilterChip key={s} label={s} active={size.includes(s)} onClick={() => toggle(size, setSize, s)} />
              )}
              </FilterRow>
              <FilterRow label="Région">
                {perimeter.regions.map((s) => <FilterChip key={s} label={s} active onClick={() => {}} />)}
                <FilterChip label="+ ajouter" onClick={() => {}} />
              </FilterRow>
              <FilterRow label="Fonctions ouvertes">
                {perimeter.functions.map((s) => <FilterChip key={s} label={s} active onClick={() => {}} />)}
              </FilterRow>
              <FilterRow label="Stade de financement">
                {["Bootstrap", "Series A", "Series B", "Series C+", "Late stage", "Public"].map((s) =>
              <FilterChip key={s} label={s} active={stage.includes(s)} onClick={() => toggle(stage, setStage, s)} />
              )}
              </FilterRow>
              <FilterRow label="Ancienneté annonces">
                {["toutes", ">30j", ">60j"].map((s) =>
              <FilterChip key={s} label={s} active={age === s} onClick={() => setAge(s)} />
              )}
              </FilterRow>
            </div>
          }
        </section>

        <div className="mt-12 flex justify-center">
          <PrimaryButton size="lg" iconRight="arrow-right" onClick={() => onLaunch(mockData.templates[0])}>
            Lancer la recherche
          </PrimaryButton>
        </div>

      </div>
    </div>);

}
window.ScreenSearch = ScreenSearch;