import { useEffect, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Header } from "@/components/Header";
import {
  CircularScoreLarge,
  CompanyMark,
  Icon,
  Pill,
  PrimaryButton,
  ScoreBar,
} from "@/components/ui";
import { ApiError, apiGet, apiPost } from "@/lib/api";
import { useBilling } from "@/lib/billing-context";
import { useSession } from "@/lib/session-context";

interface Company {
  id: string;
  name: string;
  slug: string;
  websiteUrl: string | null;
  city: string | null;
  region: string | null;
  sector: string | null;
  sectorPrecise: string | null;
  employeeCount: number | null;
  fundingStage: string | null;
  lastFundingAmount: number | null;
  lastFundingDate: string | null;
  ceoName: string | null;
  ceoLinkedinUrl: string | null;
}

interface CompanyScore {
  score: number;
  scoreVolume: number;
  scorePersistance: number;
  scoreRepublication: number;
  scoreCroissanceSales: number;
  flags: Array<{ type: string; label: string; severity: "low" | "med" | "high" }>;
  computedAt: string;
}

interface DecisionMaker {
  id: string;
  fullName: string;
  role: string;
  titleExact: string;
  linkedinUrl: string | null;
  startedAt: string | null;
  isRecent: boolean;
  angleApproach: string | null;
}

interface CompanyJob {
  id: string;
  title: string;
  function: string | null;
  level: string | null;
  city: string | null;
  publishedAt: string;
  republicationCount: number;
  url: string;
}

interface MandateEstimate {
  estimateMin: number;
  estimateMax: number;
  breakdownJson: Array<{ role: string; salary: number; rate: number; mandate: number }>;
}

interface Recommendation {
  recommendation: string;
  generatedAt: string;
}

interface TimelineEvent {
  id: string;
  eventDate: string;
  eventType: string;
  description: string;
}

interface CompanyDetailResponse {
  company: Company;
  jobs: CompanyJob[];
  score: CompanyScore | null;
  decisionMakers: DecisionMaker[];
  recommendation: Recommendation | null;
  mandate: MandateEstimate | null;
  timeline: TimelineEvent[];
  unlockedVia: string;
  markedAsContacted: boolean;
}

function bucketEmployees(n: number | null): string {
  if (n == null) return "Inconnu";
  if (n < 50) return "1-50";
  if (n < 200) return "50-200";
  if (n < 1000) return "200-1000";
  return "1000+";
}

function initialsOf(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return (parts[0] ?? "??").slice(0, 2).toUpperCase();
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

function relativeFr(iso: string): string {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (days <= 0) return "Aujourd'hui";
  if (days === 1) return "Hier";
  if (days < 7) return `Il y a ${days} jours`;
  if (days < 30) return `Il y a ${Math.floor(days / 7)} semaines`;
  if (days < 365) return `Il y a ${Math.floor(days / 30)} mois`;
  return `Il y a ${Math.floor(days / 365)} ans`;
}

function formatPublishedDate(iso: string): string {
  return `Publié ${relativeFr(iso).toLowerCase()}`;
}

function formatEventDate(date: string): string {
  return relativeFr(date);
}

function formatEuros(amount: number): string {
  return `${amount.toLocaleString("fr-FR")} €`;
}

interface MandateBlockProps {
  mandate: MandateEstimate;
}

function MandateBlock({ mandate }: MandateBlockProps) {
  const [openCalc, setOpenCalc] = useState(false);
  return (
    <div className="rounded-lg p-7 surface-sage border">
      <div className="flex items-baseline justify-between gap-4 flex-wrap">
        <div className="text-[10px] font-semibold tracking-[0.22em] text-[#3F6B4E]">
          POTENTIEL MANDAT ESTIMÉ
        </div>
        <button
          onClick={() => setOpenCalc((v) => !v)}
          className="inline-flex items-center gap-1 text-xs text-[#3F6B4E] hover:text-forest underline decoration-dotted underline-offset-4"
        >
          {openCalc ? "Masquer le calcul" : "Voir le calcul"}{" "}
          <Icon name={openCalc ? "chevron-up" : "chevron-down"} size={11} />
        </button>
      </div>
      <div className="mt-3 font-serif font-light text-4xl lg:text-[44px] text-ink tracking-tight tabular-nums leading-none">
        {formatEuros(mandate.estimateMin * 1000)} — {formatEuros(mandate.estimateMax * 1000)}
      </div>
      <p className="mt-3 text-sm text-ink-soft leading-relaxed">
        {mandate.breakdownJson.length} placement{mandate.breakdownJson.length > 1 ? "s" : ""}{" "}
        identifié{mandate.breakdownJson.length > 1 ? "s" : ""} · fees calculés sur les salaires
        senior estimés.
      </p>
      {openCalc && mandate.breakdownJson.length > 0 && (
        <ul
          className="mt-4 pt-4 border-t space-y-2 text-sm text-ink"
          style={{ borderColor: "rgba(123,165,137,0.30)" }}
        >
          {mandate.breakdownJson.map((b, i) => (
            <li key={i} className="flex items-center justify-between gap-3">
              <span>
                {b.role}{" "}
                <span className="text-ink-soft">@ {formatEuros(b.salary * 1000)}</span>
              </span>
              <span className="text-ink-soft">×</span>
              <span className="text-ink-soft tabular-nums">{Math.round(b.rate * 100)}%</span>
              <span className="text-ink-soft">=</span>
              <span className="font-medium tabular-nums">{formatEuros(b.mandate)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface DecisionMakerCardProps {
  dm: DecisionMaker;
}

function DecisionMakerCard({ dm }: DecisionMakerCardProps) {
  return (
    <div className="surface-raised border hairline rounded-lg p-6">
      <div className="flex items-start gap-5">
        <CompanyMark initials={initialsOf(dm.fullName)} size={56} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <h3 className="font-serif text-2xl font-light text-ink tracking-tight leading-tight">
                {dm.fullName}
              </h3>
              <div className="mt-1 text-sm text-ink-soft">{dm.titleExact}</div>
            </div>
            <Pill tone={dm.isRecent ? "sage" : "sand"}>
              {dm.isRecent ? "Arrivé récemment" : "En poste"}
            </Pill>
          </div>
          {dm.linkedinUrl && (
            <a
              href={dm.linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-xs text-ink-soft hover:text-forest transition"
            >
              <Icon name="linkedin" size={13} /> Voir profil
            </a>
          )}
        </div>
      </div>
      {dm.angleApproach && (
        <div className="mt-5 pt-5 border-t hairline">
          <div className="text-[10px] font-medium tracking-[0.18em] text-ink-soft mb-2">
            ANGLE D'APPROCHE
          </div>
          <p className="font-serif text-[15px] italic font-light text-ink leading-relaxed">
            « {dm.angleApproach} »
          </p>
        </div>
      )}
    </div>
  );
}

interface TimelineEventItemProps {
  event: TimelineEvent;
  isLast: boolean;
  isNow: boolean;
}

function TimelineEventItem({ event, isLast, isNow }: TimelineEventItemProps) {
  return (
    <li className="relative pl-8">
      {!isLast && (
        <span
          className="absolute left-[7px] top-4 bottom-[-20px] w-px"
          style={{ background: "rgba(26,26,26,0.15)" }}
        />
      )}
      <span
        className={`absolute left-0 top-1.5 h-[15px] w-[15px] rounded-full border-2 ${
          isNow ? "bg-forest border-forest" : "bg-porcelain"
        }`}
        style={!isNow ? { borderColor: "#7BA589" } : {}}
      />
      <div className="grid grid-cols-1 md:grid-cols-[140px_1fr] gap-3">
        <div className="font-serif italic text-sm text-[#3F6B4E]">
          {formatEventDate(event.eventDate)}
        </div>
        <div
          className={`text-sm ${isNow ? "text-ink font-medium" : "text-ink"} leading-relaxed`}
        >
          {event.description}
        </div>
      </div>
    </li>
  );
}

interface SectionHeaderProps {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  right?: ReactNode;
}

function SectionHeader({ eyebrow, title, subtitle, right }: SectionHeaderProps) {
  return (
    <div className="flex items-end justify-between gap-4 flex-wrap mb-5 pb-3 border-b hairline">
      <div>
        {eyebrow && (
          <div className="text-[10px] font-semibold tracking-[0.22em] text-ink-soft mb-2">
            {eyebrow}
          </div>
        )}
        {title && (
          <h2 className="font-serif text-[28px] font-light text-ink tracking-tight leading-none">
            {title}
          </h2>
        )}
        {subtitle && <p className="mt-1.5 text-sm text-ink-soft">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

const FUNCTION_LABELS: Record<string, string> = {
  account_executive: "AE",
  sales_engineer: "SE",
  sales_manager: "Mgr",
  vp_sales: "Lead",
  customer_success: "CS",
  sdr: "SDR",
  marketing: "Mkt",
  growth: "Gth",
  product: "Prod",
  engineer: "Eng",
  data: "Data",
};

function jobTypeLabel(fn: string | null, level: string | null): string {
  if (fn && FUNCTION_LABELS[fn]) return FUNCTION_LABELS[fn];
  if (level === "head" || level === "vp") return "Lead";
  if (fn) return fn.slice(0, 3).toUpperCase();
  return "—";
}

export function CompanyDetail() {
  const navigate = useNavigate();
  const params = useParams();
  const companyId = params["companyId"];
  const { user, setCredits } = useSession();
  const { show: showBilling } = useBilling();

  const [data, setData] = useState<CompanyDetailResponse | null>(null);
  const [locked, setLocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [contacted, setContacted] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) return;
    setLoading(true);
    apiGet<CompanyDetailResponse>(`/api/companies/${companyId}`)
      .then((r) => {
        setData(r);
        setContacted(r.markedAsContacted);
        setLocked(false);
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 403) {
          setLocked(true);
        } else if (err instanceof ApiError && err.status === 404) {
          setError("Fiche introuvable.");
        } else {
          console.error("[company] load failed", err);
          setError("Erreur de chargement.");
        }
      })
      .finally(() => setLoading(false));
  }, [companyId]);

  const handleUnlock = async () => {
    if (!companyId || !user) return;
    if (user.creditsBalance <= 0) {
      showBilling();
      return;
    }
    try {
      const r = await apiPost<{ ok: true; balanceAfter: number }>(
        `/api/companies/${companyId}/unlock`,
      );
      setCredits(r.balanceAfter);
      setLoading(true);
      const detail = await apiGet<CompanyDetailResponse>(`/api/companies/${companyId}`);
      setData(detail);
      setContacted(detail.markedAsContacted);
      setLocked(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 402) {
        showBilling();
      } else {
        console.error("[unlock] failed", err);
        setError("Impossible de débloquer cette fiche.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMarkContacted = async () => {
    if (!companyId) return;
    try {
      const r = await apiPost<{ ok: true; markedAsContacted: boolean }>(
        `/api/companies/${companyId}/mark-contacted`,
      );
      setContacted(r.markedAsContacted);
    } catch (err) {
      console.error("[mark-contacted] failed", err);
    }
  };

  if (!user) return null;

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-porcelain">
        <Header credits={user.creditsBalance} onRecharge={showBilling} />
        <div className="flex items-center justify-center py-32">
          <p className="text-sm text-ink-soft">Chargement de la fiche…</p>
        </div>
      </div>
    );
  }

  if (locked) {
    return (
      <div className="min-h-screen bg-porcelain">
        <Header credits={user.creditsBalance} onRecharge={showBilling} />
        <main className="px-6 lg:px-12 py-20">
          <div className="max-w-md mx-auto text-center">
            <Icon name="lock" size={32} className="text-ink-soft mx-auto" />
            <h1 className="mt-6 font-serif font-light text-[36px] tracking-tight text-ink leading-tight">
              Cette fiche est verrouillée.
            </h1>
            <p className="mt-3 text-sm text-ink-soft leading-relaxed">
              Débloque-la pour 1 credit. Tu auras accès aux décideurs, à la timeline et au mandat
              estimé.
            </p>
            <div className="mt-8">
              <PrimaryButton icon="lock-open" onClick={handleUnlock}>
                Débloquer · 1 credit
              </PrimaryButton>
            </div>
            <button
              onClick={() => navigate(-1)}
              className="mt-4 text-xs text-ink-soft hover:text-ink transition"
            >
              Retour
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-porcelain">
        <Header credits={user.creditsBalance} onRecharge={showBilling} />
        <div className="flex flex-col items-center justify-center py-32 px-6">
          <p className="text-sm text-bordeaux">{error ?? "Fiche introuvable."}</p>
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

  const { company, score, recommendation, mandate, decisionMakers, timeline, jobs } = data;

  const scoreBars = score
    ? [
        {
          label: "Volume de postes",
          value: score.scoreVolume,
          note: `${jobs.length} postes actifs`,
        },
        {
          label: "Persistance",
          value: score.scorePersistance,
          note: jobs.length > 0 ? "Annonces ouvertes depuis longtemps" : "Pas d'annonces actives",
        },
        {
          label: "Re-publication",
          value: score.scoreRepublication,
          note: `Max ${Math.max(0, ...jobs.map((j) => j.republicationCount))} republications`,
        },
        {
          label: "Croissance",
          value: score.scoreCroissanceSales,
          note: company.fundingStage
            ? `Stade ${company.fundingStage.replace("_", " ")}`
            : "Pas de signal de croissance",
        },
      ]
    : [];

  const lastEventIdx = timeline.length - 1;

  return (
    <div className="min-h-screen bg-porcelain">
      <Header credits={user.creditsBalance} onRecharge={showBilling} />

      <main className="px-6 lg:px-12 py-10">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink transition"
            >
              <Icon name="arrow-left" size={14} /> Retour
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-10">
            <div>
              {/* Header */}
              <div className="flex items-start justify-between gap-6 flex-wrap pb-8 border-b hairline">
                <div className="flex items-start gap-5 flex-1 min-w-0">
                  <CompanyMark initials={initialsOf(company.name)} size={64} />
                  <div className="min-w-0">
                    <Pill tone="sage" icon="check">
                      Fiche débloquée
                    </Pill>
                    <h1 className="mt-3 font-serif font-light text-[44px] lg:text-[52px] leading-[1.02] tracking-tight text-ink">
                      {company.name}
                    </h1>
                    <div className="mt-2.5 flex items-center gap-3 text-sm text-ink-soft flex-wrap">
                      {(company.sectorPrecise || company.sector) && (
                        <>
                          <span>{company.sectorPrecise ?? company.sector}</span>
                          <span style={{ opacity: 0.4 }}>·</span>
                        </>
                      )}
                      <span>{bucketEmployees(company.employeeCount)}</span>
                      {company.city && (
                        <>
                          <span style={{ opacity: 0.4 }}>·</span>
                          <span>{company.city}</span>
                        </>
                      )}
                      {company.websiteUrl && (
                        <>
                          <span style={{ opacity: 0.4 }}>·</span>
                          <a
                            href={company.websiteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-forest hover:underline underline-offset-4"
                          >
                            {company.websiteUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}{" "}
                            <Icon name="external-link" size={11} />
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                {score && (
                  <div className="shrink-0">
                    <CircularScoreLarge score={score.score} />
                  </div>
                )}
              </div>

              {/* PRIMARY 1 — Pourquoi maintenant */}
              {recommendation && (
                <section className="mt-8">
                  <div className="surface-sage-strong border rounded-lg p-8">
                    <div className="flex items-baseline justify-between mb-4 flex-wrap gap-2">
                      <div className="text-[10px] font-semibold tracking-[0.22em] text-[#3F6B4E]">
                        POURQUOI MAINTENANT — RECOMMANDATION SIGNALS
                      </div>
                      <span className="text-[11px] text-ink-soft">
                        Mise à jour {relativeFr(recommendation.generatedAt).toLowerCase()}
                      </span>
                    </div>
                    <p className="font-serif text-xl lg:text-[24px] italic font-light text-ink leading-[1.55]">
                      « {recommendation.recommendation} »
                    </p>
                  </div>
                </section>
              )}

              {/* PRIMARY 2 — Mandate */}
              {mandate && (
                <section className="mt-5">
                  <MandateBlock mandate={mandate} />
                </section>
              )}

              {/* SECONDARY — Décideurs */}
              {decisionMakers.length > 0 && (
                <section className="mt-12">
                  <SectionHeader
                    title="Décideurs identifiés"
                    subtitle="Les bons interlocuteurs avec leur angle d'approche."
                    right={
                      <span className="text-xs text-ink-soft">
                        {decisionMakers.length} contact{decisionMakers.length > 1 ? "s" : ""}
                      </span>
                    }
                  />
                  <div className="space-y-4">
                    {decisionMakers.map((d) => (
                      <DecisionMakerCard key={d.id} dm={d} />
                    ))}
                  </div>
                </section>
              )}

              {/* TERTIARY — Pourquoi ce score */}
              {score && (
                <section className="mt-12">
                  <SectionHeader eyebrow="POURQUOI CE SCORE" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
                    {scoreBars.map((s) => (
                      <ScoreBar key={s.label} {...s} />
                    ))}
                  </div>
                </section>
              )}

              {/* TERTIARY — Timeline */}
              {timeline.length > 0 && (
                <section className="mt-12">
                  <SectionHeader
                    title="Timeline"
                    subtitle="Comment cette opportunité s'est construite."
                  />
                  <ul className="space-y-5 pl-1">
                    {timeline.map((e, i) => (
                      <TimelineEventItem
                        key={e.id}
                        event={e}
                        isLast={i === lastEventIdx}
                        isNow={i === lastEventIdx}
                      />
                    ))}
                  </ul>
                </section>
              )}

              {/* TERTIARY — Postes ouverts */}
              {jobs.length > 0 && (
                <section className="mt-12">
                  <SectionHeader
                    eyebrow="POSTES OUVERTS"
                    right={
                      <span className="text-xs text-ink-soft">
                        {jobs.length} annonce{jobs.length > 1 ? "s" : ""} active
                        {jobs.length > 1 ? "s" : ""}
                      </span>
                    }
                  />
                  <ul className="divide-y" style={{ borderColor: "rgba(26,26,26,0.08)" }}>
                    {jobs.map((j) => (
                      <li
                        key={j.id}
                        className="py-3.5 flex items-center gap-4 hover:bg-porcelain-dark/40 transition px-1 -mx-1 rounded"
                      >
                        <div
                          className="h-9 w-9 rounded-md flex items-center justify-center text-[10px] font-medium tracking-wider"
                          style={{ background: "rgba(212,196,168,0.45)", color: "#5A4A2A" }}
                        >
                          {jobTypeLabel(j.function, j.level)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-ink font-medium truncate">{j.title}</div>
                          <div className="mt-0.5 flex items-center gap-2 text-xs text-ink-soft">
                            <span>{formatPublishedDate(j.publishedAt)}</span>
                            {j.republicationCount > 0 && (
                              <>
                                <span style={{ opacity: 0.4 }}>·</span>
                                <Pill tone="bordeaux">Republié</Pill>
                              </>
                            )}
                          </div>
                        </div>
                        <a
                          href={j.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-ink-soft hover:text-forest p-2"
                        >
                          <Icon name="external-link" size={15} />
                        </a>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>

            {/* Sidebar */}
            <aside className="space-y-5 lg:sticky lg:top-24 self-start">
              <div className="surface-raised border hairline rounded-lg p-6">
                <h3 className="text-[10px] font-semibold uppercase tracking-[0.22em] text-ink-soft mb-5">
                  Signaux entreprise
                </h3>
                <dl className="space-y-3.5">
                  <SignalRow
                    label="Effectif total"
                    value={
                      company.employeeCount
                        ? `${company.employeeCount.toLocaleString("fr-FR")} personnes`
                        : "Non renseigné"
                    }
                  />
                  {company.fundingStage && (
                    <SignalRow
                      label="Stade"
                      value={company.fundingStage.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                    />
                  )}
                  {company.lastFundingAmount && (
                    <SignalRow
                      label="Dernière levée"
                      value={`${company.lastFundingAmount.toLocaleString("fr-FR")} k€${
                        company.lastFundingDate
                          ? ` (${new Date(company.lastFundingDate).toLocaleDateString("fr-FR", {
                              month: "short",
                              year: "numeric",
                            })})`
                          : ""
                      }`}
                    />
                  )}
                  {company.region && <SignalRow label="Région" value={company.region} />}
                  {company.ceoName && (
                    <div>
                      <dt className="text-[11px] uppercase tracking-wider text-ink-soft">CEO</dt>
                      <dd className="mt-1 text-sm text-ink leading-snug">
                        {company.ceoName}
                        {company.ceoLinkedinUrl && (
                          <a
                            href={company.ceoLinkedinUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-2 inline-flex items-center gap-1 text-xs text-ink-soft hover:text-forest"
                          >
                            <Icon name="linkedin" size={11} />
                          </a>
                        )}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>

              <div
                className="border hairline rounded-lg p-5"
                style={{ background: "rgba(26,26,26,0.02)" }}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[10px] font-semibold uppercase tracking-[0.22em] text-ink-soft">
                    Concurrence cabinet
                  </h3>
                  <Pill tone="ink">Bientôt</Pill>
                </div>
                <p className="text-sm text-ink-soft leading-relaxed">
                  Combien de cabinets ont contacté cette boîte récemment.
                </p>
              </div>

              <div className="surface-raised border hairline rounded-lg p-6">
                <h3 className="text-[10px] font-semibold uppercase tracking-[0.22em] text-ink-soft mb-4">
                  Actions
                </h3>
                <div className="space-y-2.5">
                  <button
                    onClick={handleMarkContacted}
                    className="w-full inline-flex items-center justify-center gap-2 h-10 px-4 rounded-md text-sm font-medium transition bg-forest text-porcelain border border-forest hover:bg-forest-light"
                  >
                    <Icon name={contacted ? "check" : "phone"} size={14} />
                    {contacted ? "Contacté" : "Marquer comme contacté"}
                  </button>
                  <button
                    onClick={() => setSaved((v) => !v)}
                    className={`w-full inline-flex items-center justify-center gap-2 h-10 px-4 rounded-md text-sm font-medium transition border ${
                      saved
                        ? "bg-porcelain-dark text-ink border-ink/20"
                        : "bg-transparent text-ink hover:bg-porcelain"
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
                {score && `Données calculées ${relativeFr(score.computedAt).toLowerCase()}`}
                <br />
                <span style={{ opacity: 0.7 }}>
                  Sources : France Travail, Adzuna, LinkedIn public
                </span>
              </p>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}

function SignalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b hairline pb-3 last:border-b-0 last:pb-0">
      <dt className="text-[11px] uppercase tracking-wider text-ink-soft">{label}</dt>
      <dd className="mt-1 text-sm text-ink leading-snug">{value}</dd>
    </div>
  );
}
