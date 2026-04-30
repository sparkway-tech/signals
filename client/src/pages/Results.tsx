import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Header } from "@/components/Header";
import {
  CompanyMark,
  Icon,
  Pill,
  PrimaryButton,
  ScoreCircle,
  SecondaryButton,
  scoreTone,
} from "@/components/ui";
import { ApiError, apiGet, apiPost } from "@/lib/api";
import { useBilling } from "@/lib/billing-context";
import { useSession } from "@/lib/session-context";

interface Freebie {
  id: string;
  name: string;
  slug: string;
  sector: string;
  city: string;
  size: string;
  score: number;
  flags: string[];
}

interface Teaser {
  id: string;
  score: number;
  sector: string;
  city: string;
  employeeCountRange: string;
  partialFlag: string;
  maskedInitial: string;
  maskedLength: number;
  alreadyUnlocked?: boolean;
}

interface SearchResultsResponse {
  searchId: string;
  totalCount: number;
  template: string;
  perimeterLabel: string;
  freebie: Freebie | null;
  teasers: Teaser[];
}

interface FreebieCardProps {
  freebie: Freebie;
  onOpen: () => void;
}

function initialsOf(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return (parts[0] ?? "??").slice(0, 2).toUpperCase();
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

function FreebieCard({ freebie, onOpen }: FreebieCardProps) {
  const t = scoreTone(freebie.score);
  return (
    <div className="bg-porcelain-dark rounded-lg p-8 lg:p-10" style={{ border: "1.5px solid #1F3A2E" }}>
      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div className="flex items-start gap-5 flex-1 min-w-0">
          <CompanyMark initials={initialsOf(freebie.name)} size={56} />
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <Pill tone="sage" icon="gift">
                1 fiche offerte
              </Pill>
            </div>
            <h2 className="mt-3 font-serif text-3xl lg:text-4xl font-light text-ink tracking-tight leading-tight">
              {freebie.name}
            </h2>
            <div className="mt-2 flex items-center gap-3 text-sm text-ink-soft flex-wrap">
              <span>{freebie.sector ?? "—"}</span>
              <span style={{ opacity: 0.4 }}>·</span>
              <span>{freebie.city ?? "—"}</span>
              <span style={{ opacity: 0.4 }}>·</span>
              <span>{freebie.size}</span>
            </div>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[10px] font-medium tracking-[0.22em] text-ink-soft mb-2">
            SCORE D'URGENCE
          </div>
          <div className="flex items-center gap-3 justify-end">
            <div className="font-serif font-light text-[64px] leading-none text-ink tabular-nums">
              {freebie.score}
            </div>
            <div className="flex flex-col items-start">
              <span
                className="text-[10px] font-medium tracking-[0.18em]"
                style={{ color: t.textSoft }}
              >
                {t.label}
              </span>
              <span className="text-xs text-ink-soft">/ 100</span>
            </div>
          </div>
        </div>
      </div>

      {freebie.flags.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          {freebie.flags.map((f, i) => (
            <Pill key={i} tone={i === 0 ? "forest" : i === 1 ? "bordeaux" : "sand"}>
              {f}
            </Pill>
          ))}
        </div>
      )}

      <div className="mt-6 flex justify-end">
        <PrimaryButton iconRight="arrow-right" onClick={onOpen}>
          Voir la fiche complète
        </PrimaryButton>
      </div>
    </div>
  );
}

interface TeasedCardProps {
  teaser: Teaser;
  onUnlock: () => void;
}

function TeasedCard({ teaser, onUnlock }: TeasedCardProps) {
  const t = scoreTone(teaser.score);
  // Nom flouté : on génère un nom factice de longueur réaliste pour l'effet blur.
  const fakeName = teaser.maskedInitial + "•".repeat(Math.max(2, teaser.maskedLength - 1));
  return (
    <div className="bg-porcelain border hairline rounded-lg p-5 hover:border-[rgba(26,26,26,0.20)] transition">
      <div className="flex items-start gap-4">
        <CompanyMark initials={teaser.maskedInitial} size={40} blurred />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="font-serif text-lg font-light text-ink leading-tight tracking-tight blur-name select-none">
                {fakeName}
              </div>
              <div className="mt-1 text-xs text-ink-soft truncate">
                {teaser.sector ?? "—"} · {teaser.city ?? "—"}
              </div>
            </div>
            <ScoreCircle score={teaser.score} size={42} />
          </div>

          <div className="mt-3">
            <span className="inline-flex items-center gap-1.5 text-xs text-ink-soft">
              <span
                className="inline-block w-3 h-3 rounded-sm"
                style={{ background: "rgba(26,26,26,0.15)" }}
              />
              <span className="blur-name select-none">{teaser.partialFlag}</span>
            </span>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <span
              className="text-[10px] font-medium tracking-[0.18em]"
              style={{ color: t.textSoft }}
            >
              {t.label}
            </span>
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

export function Results() {
  const navigate = useNavigate();
  const params = useParams();
  const searchId = params["searchId"];
  const { user, setCredits } = useSession();
  const { show: showBilling } = useBilling();

  const [data, setData] = useState<SearchResultsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unlocking, setUnlocking] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (!searchId) return;
    setLoading(true);
    apiGet<SearchResultsResponse>(`/api/search/${searchId}`)
      .then((r) => setData(r))
      .catch((err) => {
        console.error("[results] load failed", err);
        setError("Recherche introuvable.");
      })
      .finally(() => setLoading(false));
  }, [searchId]);

  const handleUnlock = async (companyId: string) => {
    if (!user) return;
    if (user.creditsBalance <= 0) {
      showBilling();
      return;
    }
    setUnlocking(companyId);
    try {
      const r = await apiPost<{ ok: true; balanceAfter: number }>(
        `/api/companies/${companyId}/unlock`,
      );
      setCredits(r.balanceAfter);
      navigate(`/boites/${companyId}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 402) {
        showBilling();
      } else {
        console.error("[unlock] failed", err);
        setError("Impossible de débloquer cette fiche. Réessaie.");
      }
    } finally {
      setUnlocking(null);
    }
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-porcelain">
        <Header credits={user.creditsBalance} onRecharge={showBilling} />
        <div className="flex items-center justify-center py-32">
          <p className="text-sm text-ink-soft">Chargement des résultats…</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-porcelain">
        <Header credits={user.creditsBalance} onRecharge={showBilling} />
        <div className="flex flex-col items-center justify-center py-32 px-6">
          <p className="text-sm text-bordeaux">{error ?? "Erreur inattendue."}</p>
          <button
            onClick={() => navigate("/recherche")}
            className="mt-4 text-sm text-forest hover:underline"
          >
            Retour à la recherche
          </button>
        </div>
      </div>
    );
  }

  const visibleTeasers = showAll ? data.teasers : data.teasers.slice(0, 8);
  const remaining = data.teasers.length - visibleTeasers.length;

  return (
    <div className="min-h-screen bg-porcelain">
      <Header credits={user.creditsBalance} onRecharge={showBilling} />

      <main className="px-6 lg:px-12 py-10">
        <div className="max-w-6xl mx-auto">
          <button
            onClick={() => navigate("/recherche")}
            className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink mb-6 transition"
          >
            <Icon name="arrow-left" size={14} /> Modifier la recherche
          </button>

          <div className="mb-10">
            <h1 className="font-serif font-light text-[40px] lg:text-[44px] leading-[1.1] tracking-tight text-ink">
              Signals a trouvé{" "}
              <span className="italic text-forest">{data.totalCount} boîtes</span> qui auraient
              besoin de toi.
            </h1>
            <p className="mt-3 text-sm text-ink-soft leading-relaxed">
              Template : <span className="text-ink">{data.template}</span> · Périmètre :{" "}
              <span className="text-ink">{data.perimeterLabel}</span>
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8 items-start">
            <div>
              {data.freebie ? (
                <FreebieCard
                  freebie={data.freebie}
                  onOpen={() => data.freebie && navigate(`/boites/${data.freebie.id}`)}
                />
              ) : (
                <div className="bg-porcelain-dark border hairline rounded-lg p-8 text-center">
                  <p className="text-sm text-ink-soft">
                    Toutes les boîtes pertinentes pour toi ont déjà été débloquées. Lance une
                    nouvelle recherche.
                  </p>
                </div>
              )}

              {data.teasers.length > 0 && (
                <>
                  <div className="mt-10 mb-4 flex items-baseline justify-between">
                    <h3 className="text-xs uppercase tracking-[0.22em] text-ink-soft">
                      Les {data.totalCount - 1} autres boîtes
                    </h3>
                    <span className="text-xs text-ink-soft">Trié par score décroissant</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {visibleTeasers.map((c) => (
                      <TeasedCard
                        key={c.id}
                        teaser={c}
                        onUnlock={() => unlocking !== c.id && handleUnlock(c.id)}
                      />
                    ))}
                  </div>

                  {remaining > 0 && (
                    <div className="mt-6 flex justify-center">
                      <SecondaryButton icon="chevron-down" onClick={() => setShowAll(true)}>
                        Voir les {remaining} autres boîtes
                      </SecondaryButton>
                    </div>
                  )}
                </>
              )}
            </div>

            <aside className="lg:sticky lg:top-24">
              <div className="bg-porcelain-dark border hairline rounded-lg p-6">
                <div className="text-xs uppercase tracking-[0.22em] text-ink-soft mb-3">
                  Tes credits
                </div>
                <div className="font-serif font-light text-4xl text-ink tabular-nums leading-none">
                  {user.creditsBalance}
                </div>
                <p className="mt-3 text-sm text-ink leading-relaxed">
                  Tu peux débloquer{" "}
                  <span className="font-medium">{user.creditsBalance} boîtes</span> de cette liste.
                </p>
                <div className="mt-5 pt-5 border-t hairline">
                  <button
                    onClick={showBilling}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-forest hover:text-forest-light transition"
                  >
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
      </main>
    </div>
  );
}
