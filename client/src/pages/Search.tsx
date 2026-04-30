import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Icon, PrimaryButton } from "@/components/ui";
import { apiGet, apiPost } from "@/lib/api";
import { useSession } from "@/lib/session-context";
import { useBilling } from "@/lib/billing-context";

interface Template {
  id: string;
  title: string;
  desc: string;
  count: number;
}

interface SearchResponse {
  searchId: string;
}

interface TemplateCardProps {
  template: Template;
  onClick: () => void;
}

function TemplateCard({ template, onClick }: TemplateCardProps) {
  return (
    <button
      onClick={onClick}
      className="group w-full text-left bg-porcelain-dark border hairline rounded-lg px-7 py-6 hover:border-forest transition focus-forest"
      style={{ backgroundColor: "rgb(235, 224, 204)" }}
    >
      <div className="flex items-start gap-6">
        <div className="flex-1 min-w-0">
          <h3 className="font-serif text-2xl font-light text-ink tracking-tight leading-snug">
            {template.title}
          </h3>
          <p className="mt-2 text-sm text-ink-soft leading-relaxed">{template.desc}</p>
          <div className="mt-4 inline-flex items-center gap-2 text-xs text-ink-soft">
            <span className="h-1 w-1 rounded-full bg-sage" />
            <span>
              ≈ <span className="text-ink font-medium tabular-nums">{template.count} boîtes</span>{" "}
              correspondent à ton périmètre
            </span>
          </div>
        </div>
        <div className="shrink-0 self-center text-ink-soft group-hover:text-forest group-hover:translate-x-1 transition-all">
          <Icon name="arrow-right" size={22} strokeWidth={1.4} />
        </div>
      </div>
    </button>
  );
}

interface FilterRowProps {
  label: string;
  children: React.ReactNode;
}

function FilterRow({ label, children }: FilterRowProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-4 items-start py-5 border-b hairline last:border-b-0">
      <div className="text-sm font-medium text-ink">{label}</div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

interface FilterChipProps {
  label: string;
  active?: boolean;
  onClick: () => void;
}

function FilterChip({ label, active = false, onClick }: FilterChipProps) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center h-8 px-3 rounded-md text-xs font-medium transition border ${
        active
          ? "bg-forest text-porcelain border-forest"
          : "bg-porcelain text-ink border-[rgba(26,26,26,0.15)] hover:bg-porcelain-dark"
      }`}
    >
      {label}
    </button>
  );
}

const STAGES = ["Bootstrap", "Series A", "Series B", "Series C+", "Late stage", "Public"] as const;
const SIZES = ["1-50", "50-200", "200-1000", "1000+"] as const;
const AGES = ["toutes", ">30j", ">60j"] as const;

export function Search() {
  const navigate = useNavigate();
  const { user, loading: sessionLoading } = useSession();
  const { show: showBilling } = useBilling();

  const [templates, setTemplates] = useState<Template[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [size, setSize] = useState<string[]>(["50-200", "200-1000"]);
  const [stage, setStage] = useState<string[]>(["Series A", "Series B", "Series C+"]);
  const [age, setAge] = useState<string>("toutes");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<{ templates: Template[] }>("/api/templates")
      .then((r) => setTemplates(r.templates))
      .catch((err) => {
        console.error("[search] templates failed", err);
        setError("Impossible de charger les templates.");
      });
  }, []);

  const toggle = (arr: string[], setArr: (v: string[]) => void, v: string) =>
    arr.includes(v) ? setArr(arr.filter((x) => x !== v)) : setArr([...arr, v]);

  const launch = async (templateId?: string) => {
    setSubmitting(true);
    setError(null);
    try {
      const r = await apiPost<SearchResponse>("/api/search", {
        ...(templateId ? { template: templateId } : {}),
      });
      navigate(`/recherches/${r.searchId}`);
    } catch (err) {
      console.error("[search] launch failed", err);
      setError("Impossible de lancer la recherche. Réessaie.");
    } finally {
      setSubmitting(false);
    }
  };

  if (sessionLoading || !user) {
    return (
      <div className="min-h-screen bg-porcelain flex items-center justify-center">
        <p className="text-sm text-ink-soft">Chargement…</p>
      </div>
    );
  }

  const perimeter = {
    sectors: user.sectors,
    functions: user.functions,
    regions: user.regions,
  };

  return (
    <div className="min-h-screen bg-porcelain">
      <Header credits={user.creditsBalance} onRecharge={showBilling} />

      <main className="px-6 lg:px-12 py-12 lg:py-16">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="font-serif font-light text-[44px] lg:text-[52px] leading-[1.05] tracking-tight text-ink text-balance">
              Trouve les boîtes qui ont besoin de toi{" "}
              <span className="italic text-forest">avant qu'elles ne le sachent.</span>
            </h1>
            <p className="mt-6 text-base text-ink-soft leading-relaxed max-w-xl mx-auto">
              Choisis un template ou ajuste tes filtres. Tu reçois 1 boîte gratuite par recherche.
            </p>
          </div>

          <section>
            <div className="flex items-baseline justify-between mb-5">
              <h2 className="text-xs uppercase tracking-[0.22em] text-ink-soft">
                Templates de recherche
              </h2>
              <span className="text-xs text-ink-soft">
                {templates.length} templates · mis à jour ce matin
              </span>
            </div>
            <div className="space-y-3">
              {templates.map((t) => (
                <TemplateCard key={t.id} template={t} onClick={() => launch(t.id)} />
              ))}
            </div>
          </section>

          <section className="mt-12">
            <button
              onClick={() => setFiltersOpen((v) => !v)}
              className="w-full flex items-center justify-between py-4 border-t border-b hairline hover:bg-porcelain-dark/40 px-2 transition"
            >
              <span className="text-xs uppercase tracking-[0.22em] text-ink-soft">
                Ou ajuste tes filtres
              </span>
              <Icon name={filtersOpen ? "chevron-up" : "chevron-down"} size={16} className="text-ink-soft" />
            </button>

            {filtersOpen && (
              <div className="px-2">
                <FilterRow label="Secteur">
                  {perimeter.sectors.map((s) => (
                    <FilterChip key={s} label={s} active onClick={() => {}} />
                  ))}
                </FilterRow>
                <FilterRow label="Taille effectif">
                  {SIZES.map((s) => (
                    <FilterChip
                      key={s}
                      label={s}
                      active={size.includes(s)}
                      onClick={() => toggle(size, setSize, s)}
                    />
                  ))}
                </FilterRow>
                <FilterRow label="Région">
                  {perimeter.regions.map((s) => (
                    <FilterChip key={s} label={s} active onClick={() => {}} />
                  ))}
                </FilterRow>
                <FilterRow label="Fonctions ouvertes">
                  {perimeter.functions.map((s) => (
                    <FilterChip key={s} label={s} active onClick={() => {}} />
                  ))}
                </FilterRow>
                <FilterRow label="Stade de financement">
                  {STAGES.map((s) => (
                    <FilterChip
                      key={s}
                      label={s}
                      active={stage.includes(s)}
                      onClick={() => toggle(stage, setStage, s)}
                    />
                  ))}
                </FilterRow>
                <FilterRow label="Ancienneté annonces">
                  {AGES.map((s) => (
                    <FilterChip key={s} label={s} active={age === s} onClick={() => setAge(s)} />
                  ))}
                </FilterRow>
              </div>
            )}
          </section>

          {error && (
            <p className="mt-6 text-center text-sm text-bordeaux" role="alert">
              {error}
            </p>
          )}

          <div className="mt-12 flex justify-center">
            <PrimaryButton
              size="lg"
              iconRight="arrow-right"
              disabled={submitting}
              onClick={() => launch()}
            >
              {submitting ? "Recherche en cours…" : "Lancer la recherche"}
            </PrimaryButton>
          </div>
        </div>
      </main>
    </div>
  );
}
