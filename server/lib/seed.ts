/**
 * Seed initial : Pennylane, Spendesk, Aircall.
 *
 * Source : design-reference/data.jsx mockData.companies.
 * Idempotent : ON CONFLICT DO NOTHING sur slug pour companies, sur unique
 * (source, externalId) pour jobs. Les autres tables sont reset par companyId
 * (delete + insert) pour permettre des updates de fixtures.
 */
import { eq } from "drizzle-orm";
import { db } from "@server/lib/db";
import {
  companies,
  jobs,
  companyScores,
  decisionMakers,
  companyRecommendations,
  mandateEstimates,
  companyTimelineEvents,
} from "@shared/schema";

interface SeedJob {
  externalId: string;
  title: string;
  function: string;
  level: "junior" | "mid" | "senior" | "head" | "vp";
  publishedDaysAgo: number;
  republicationCount: number;
  url: string;
}

interface SeedDecisionMaker {
  fullName: string;
  role:
    | "ceo"
    | "vp_sales"
    | "head_of_sales"
    | "head_ta"
    | "sales_manager"
    | "cofounder"
    | "cmo"
    | "cto"
    | "vp_eng"
    | "vp_product"
    | "head_product"
    | "other";
  titleExact: string;
  linkedinUrl: string;
  isRecent: boolean;
  startedDaysAgo: number;
  angleApproach: string;
}

interface SeedTimelineEvent {
  daysAgo: number;
  eventType: "funding" | "leadership_change" | "job_published" | "job_republished" | "team_growth" | "other";
  description: string;
}

interface SeedCompany {
  slug: string;
  name: string;
  websiteUrl: string;
  city: string;
  region: string;
  sector: string;
  sectorPrecise: string;
  employeeCount: number;
  fundingStage: "seed" | "series_a" | "series_b" | "series_c" | "late_stage" | "public" | "bootstrap";
  lastFundingAmount: number;
  lastFundingDate: string;
  ceoName: string;
  ceoLinkedinUrl: string;
  score: {
    score: number;
    scoreVolume: number;
    scorePersistance: number;
    scoreRepublication: number;
    scoreCroissanceSales: number;
    flags: Array<{ type: string; label: string; severity: "low" | "med" | "high" }>;
  };
  recommendation: string;
  mandate: {
    estimateMin: number;
    estimateMax: number;
    breakdown: Array<{ role: string; salary: number; rate: number; mandate: number }>;
  };
  jobs: SeedJob[];
  decisionMakers: SeedDecisionMaker[];
  timeline: SeedTimelineEvent[];
}

const SEED_COMPANIES: SeedCompany[] = [
  {
    slug: "pennylane",
    name: "Pennylane",
    websiteUrl: "https://pennylane.com",
    city: "Paris",
    region: "Île-de-France",
    sector: "SaaS B2B",
    sectorPrecise: "SaaS Comptabilité B2B",
    employeeCount: 520,
    fundingStage: "series_c",
    lastFundingAmount: 40000,
    lastFundingDate: "2024-11-01",
    ceoName: "Arthur Waller",
    ceoLinkedinUrl: "https://www.linkedin.com/in/arthurwaller/",
    score: {
      score: 91,
      scoreVolume: 86,
      scorePersistance: 94,
      scoreRepublication: 92,
      scoreCroissanceSales: 88,
      flags: [
        { type: "active_jobs", label: "6 postes ouverts", severity: "high" },
        { type: "republication", label: "Annonce AE republiée 4x", severity: "high" },
        { type: "funding", label: "Série C il y a 5 mois", severity: "med" },
      ],
    },
    recommendation:
      "Pennylane traverse une fenêtre courte de difficulté de sourcing : republication 4x de l'AE Mid-Market sur 60 jours, équipe interne RH de 3 personnes seulement, et arrivée récente d'une VP Sales qui a déjà scalé un cabinet partner chez Aircall. Angle gagnant : proposer un mandat exclusif sur 2 postes Senior AE sous 7 jours.",
    mandate: {
      estimateMin: 92,
      estimateMax: 156,
      breakdown: [
        { role: "3 postes Senior AE", salary: 110, rate: 0.23, mandate: 75900 },
        { role: "1 poste Head of Mid-Market", salary: 130, rate: 0.25, mandate: 32500 },
        { role: "1 poste Sales Engineer", salary: 90, rate: 0.22, mandate: 19800 },
      ],
    },
    jobs: [
      { externalId: "seed-pennylane-1", title: "Account Executive — Mid-Market France", function: "account_executive", level: "senior", publishedDaysAgo: 14, republicationCount: 4, url: "https://pennylane.com/jobs/ae-midmarket" },
      { externalId: "seed-pennylane-2", title: "Senior AE — Expert-comptable", function: "account_executive", level: "senior", publishedDaysAgo: 21, republicationCount: 0, url: "https://pennylane.com/jobs/ae-expert" },
      { externalId: "seed-pennylane-3", title: "Head of Mid-Market Sales", function: "vp_sales", level: "head", publishedDaysAgo: 28, republicationCount: 2, url: "https://pennylane.com/jobs/head-midmarket" },
      { externalId: "seed-pennylane-4", title: "SDR Manager France", function: "sales_manager", level: "head", publishedDaysAgo: 35, republicationCount: 0, url: "https://pennylane.com/jobs/sdr-manager" },
      { externalId: "seed-pennylane-5", title: "Account Executive — SMB", function: "account_executive", level: "mid", publishedDaysAgo: 11, republicationCount: 0, url: "https://pennylane.com/jobs/ae-smb" },
      { externalId: "seed-pennylane-6", title: "Sales Engineer — Paris", function: "sales_engineer", level: "senior", publishedDaysAgo: 44, republicationCount: 1, url: "https://pennylane.com/jobs/se-paris" },
    ],
    decisionMakers: [
      { fullName: "Arthur Waller", role: "ceo", titleExact: "CEO & Co-founder", linkedinUrl: "https://www.linkedin.com/in/arthurwaller/", isRecent: false, startedDaysAgo: 1825, angleApproach: "Arthur poste régulièrement sur la transition Mid-Market depuis sa série C. Hook : un retour terrain sur les profils AE qui réussissent vs échouent en transition Solo→Mid-Market chez les concurrents." },
      { fullName: "Marie Dupont", role: "vp_sales", titleExact: "VP Sales", linkedinUrl: "https://www.linkedin.com/in/marie-dupont/", isRecent: true, startedDaysAgo: 150, angleApproach: "Marie vient d'Aircall où elle a scalé l'équipe AE de 8 à 35 en 18 mois. Elle connaît les cabs spé. Approche : LinkedIn direct, parler chiffres et profils précis dès le 1er échange." },
      { fullName: "Thomas Bernard", role: "head_ta", titleExact: "Head of Talent Acquisition", linkedinUrl: "https://www.linkedin.com/in/thomas-bernard/", isRecent: false, startedDaysAgo: 730, angleApproach: "Thomas a publié les 6 annonces Sales lui-même sur LinkedIn. Il porte la charge sourcing seul. Hook empathique : reconnaître la pression et proposer un soulagement immédiat sur 2-3 postes prioritaires." },
      { fullName: "Sophie Lambert", role: "head_of_sales", titleExact: "Head of Mid-Market Sales", linkedinUrl: "https://www.linkedin.com/in/sophie-lambert/", isRecent: true, startedDaysAgo: 240, angleApproach: "Sophie est l'utilisatrice finale des recrutements. Approche : la rencontrer en parallèle de Marie pour valider le profil 'ideal AE' — beaucoup de cabs ne le font jamais et ratent le brief." },
    ],
    timeline: [
      { daysAgo: 240, eventType: "leadership_change", description: "Sophie Lambert promue Head of Mid-Market Sales" },
      { daysAgo: 150, eventType: "funding", description: "Levée Série C de 40M€ (lead Sequoia)" },
      { daysAgo: 150, eventType: "leadership_change", description: "Marie Dupont rejoint en VP Sales (ex-Aircall)" },
      { daysAgo: 90, eventType: "job_published", description: "Première publication Account Executive Mid-Market" },
      { daysAgo: 60, eventType: "job_republished", description: "Republication x2 de l'AE Mid-Market" },
      { daysAgo: 30, eventType: "job_published", description: "Ouverture de Senior AE Enterprise + Sales Engineer" },
      { daysAgo: 14, eventType: "job_republished", description: "Republication x4 de l'AE Mid-Market" },
      { daysAgo: 0, eventType: "team_growth", description: "6 postes Sales ouverts, 0 hire visible sur LinkedIn" },
    ],
  },
  {
    slug: "spendesk",
    name: "Spendesk",
    websiteUrl: "https://spendesk.com",
    city: "Paris",
    region: "Île-de-France",
    sector: "Fintech",
    sectorPrecise: "Fintech B2B — Spend management",
    employeeCount: 650,
    fundingStage: "series_c",
    lastFundingAmount: 100000,
    lastFundingDate: "2025-09-01",
    ceoName: "Rodolphe Ardant",
    ceoLinkedinUrl: "https://www.linkedin.com/in/rodolpheardant/",
    score: {
      score: 89,
      scoreVolume: 88,
      scorePersistance: 90,
      scoreRepublication: 86,
      scoreCroissanceSales: 92,
      flags: [
        { type: "active_jobs", label: "7 postes ouverts", severity: "high" },
        { type: "republication", label: "AE EMEA republiée 2x", severity: "med" },
        { type: "leadership", label: "Nouveau CRO il y a 3 mois", severity: "high" },
      ],
    },
    recommendation:
      "Spendesk a réorganisé son go-to-market Enterprise sur Q1 2026 et republie deux fois l'AE Enterprise EMEA. Le nouveau CRO arrive d'Algolia avec un track record de cabinet-friendly hiring. Angle gagnant : proposer un mandat ciblé sur le profil 'AE Enterprise senior multi-pays', le plus dur à sourcer en interne.",
    mandate: {
      estimateMin: 78,
      estimateMax: 138,
      breakdown: [
        { role: "2 postes AE Enterprise EMEA", salary: 125, rate: 0.24, mandate: 60000 },
        { role: "1 poste Sales Manager DACH", salary: 140, rate: 0.25, mandate: 35000 },
        { role: "1 poste Sales Engineer Senior", salary: 100, rate: 0.22, mandate: 22000 },
      ],
    },
    jobs: [
      { externalId: "seed-spendesk-1", title: "Account Executive — Enterprise EMEA", function: "account_executive", level: "senior", publishedDaysAgo: 18, republicationCount: 2, url: "https://spendesk.com/jobs/ae-enterprise-emea" },
      { externalId: "seed-spendesk-2", title: "Sales Manager — DACH", function: "sales_manager", level: "head", publishedDaysAgo: 24, republicationCount: 0, url: "https://spendesk.com/jobs/sm-dach" },
      { externalId: "seed-spendesk-3", title: "AE Mid-Market France", function: "account_executive", level: "mid", publishedDaysAgo: 12, republicationCount: 0, url: "https://spendesk.com/jobs/ae-mm-fr" },
      { externalId: "seed-spendesk-4", title: "Senior Sales Engineer", function: "sales_engineer", level: "senior", publishedDaysAgo: 31, republicationCount: 1, url: "https://spendesk.com/jobs/se-senior" },
      { externalId: "seed-spendesk-5", title: "Head of Enterprise Sales UK", function: "vp_sales", level: "head", publishedDaysAgo: 41, republicationCount: 0, url: "https://spendesk.com/jobs/hes-uk" },
      { externalId: "seed-spendesk-6", title: "SDR Team Lead — Paris", function: "sales_manager", level: "head", publishedDaysAgo: 9, republicationCount: 0, url: "https://spendesk.com/jobs/sdr-tl-paris" },
      { externalId: "seed-spendesk-7", title: "AE — Italy & Spain", function: "account_executive", level: "senior", publishedDaysAgo: 22, republicationCount: 1, url: "https://spendesk.com/jobs/ae-it-es" },
    ],
    decisionMakers: [
      { fullName: "Rodolphe Ardant", role: "ceo", titleExact: "CEO & Co-founder", linkedinUrl: "https://www.linkedin.com/in/rodolpheardant/", isRecent: false, startedDaysAgo: 3650, angleApproach: "Rodolphe parle ouvertement de sa difficulté à recruter les profils Enterprise. Hook : retour structuré sur 3 candidats AE Enterprise placés chez Pigment ou Aircall ces 6 derniers mois." },
      { fullName: "Nicolas Martin", role: "vp_sales", titleExact: "CRO", linkedinUrl: "https://www.linkedin.com/in/nicolas-martin/", isRecent: true, startedDaysAgo: 90, angleApproach: "Nicolas vient d'Algolia où il a travaillé avec 2 cabinets externes spécialisés. Approche : message LinkedIn franc, mentionner un candidat spécifique disponible immédiatement, pas de pitch générique." },
      { fullName: "Léa Rousseau", role: "head_ta", titleExact: "VP Talent", linkedinUrl: "https://www.linkedin.com/in/lea-rousseau/", isRecent: false, startedDaysAgo: 540, angleApproach: "Léa pilote 4 recruteurs internes débordés sur Tech. Sales est son angle mort. Hook : proposer un audit gratuit du funnel AE Enterprise avant tout commercial — elle dira oui en 48h." },
      { fullName: "Pierre Caron", role: "head_of_sales", titleExact: "Head of Enterprise Sales EMEA", linkedinUrl: "https://www.linkedin.com/in/pierre-caron/", isRecent: true, startedDaysAgo: 120, angleApproach: "Pierre est le manager direct des AE recherchés. Il a publié sur LinkedIn ses critères 'profil idéal'. Approche : reformuler son brief en interview structurée, c'est ton ouverture." },
    ],
    timeline: [
      { daysAgo: 210, eventType: "funding", description: "Levée Série C de 100M€ (lead Index Ventures)" },
      { daysAgo: 120, eventType: "leadership_change", description: "Pierre Caron promu Head of Enterprise Sales EMEA" },
      { daysAgo: 90, eventType: "leadership_change", description: "Nicolas Martin rejoint en CRO (ex-Algolia)" },
      { daysAgo: 60, eventType: "other", description: "Annonce de la stratégie Mid-Market DACH" },
      { daysAgo: 42, eventType: "job_published", description: "Ouverture AE Enterprise EMEA + Sales Manager DACH" },
      { daysAgo: 21, eventType: "job_republished", description: "Republication AE Enterprise EMEA" },
      { daysAgo: 0, eventType: "team_growth", description: "7 postes Sales ouverts, 1 seul hire AE visible" },
    ],
  },
  {
    slug: "aircall",
    name: "Aircall",
    websiteUrl: "https://aircall.io",
    city: "Paris",
    region: "Île-de-France",
    sector: "SaaS B2B",
    sectorPrecise: "Cloud Telephony B2B",
    employeeCount: 780,
    fundingStage: "late_stage",
    lastFundingAmount: 120000,
    lastFundingDate: "2021-06-01",
    ceoName: "Olivier Pailhès",
    ceoLinkedinUrl: "https://www.linkedin.com/in/olivierpailhes/",
    score: {
      score: 84,
      scoreVolume: 82,
      scorePersistance: 88,
      scoreRepublication: 78,
      scoreCroissanceSales: 76,
      flags: [
        { type: "active_jobs", label: "5 postes ouverts", severity: "med" },
        { type: "republication", label: "AE EMEA republiée 3x", severity: "high" },
        { type: "leadership", label: "Nouvelle SVP Sales il y a 2 mois", severity: "high" },
      ],
    },
    recommendation:
      "Aircall a connu un turnover Sales important sur Q4 2025 et reconstruit son équipe AE EMEA avec 5 ouvertures simultanées en 6 semaines. La nouvelle SVP Sales arrive de Salesforce et privilégie les cabinets boutiques. Angle gagnant : un mandat d'urgence sur 2 postes AE EMEA avec garantie 90 jours.",
    mandate: {
      estimateMin: 64,
      estimateMax: 112,
      breakdown: [
        { role: "2 postes AE EMEA", salary: 110, rate: 0.22, mandate: 48400 },
        { role: "1 poste AE Mid-Market", salary: 95, rate: 0.21, mandate: 19950 },
        { role: "1 poste Sales Manager Benelux", salary: 120, rate: 0.23, mandate: 27600 },
      ],
    },
    jobs: [
      { externalId: "seed-aircall-1", title: "Account Executive — EMEA", function: "account_executive", level: "senior", publishedDaysAgo: 22, republicationCount: 3, url: "https://aircall.io/jobs/ae-emea" },
      { externalId: "seed-aircall-2", title: "AE — Mid-Market France", function: "account_executive", level: "mid", publishedDaysAgo: 31, republicationCount: 2, url: "https://aircall.io/jobs/ae-mm-fr" },
      { externalId: "seed-aircall-3", title: "Sales Manager — Benelux", function: "sales_manager", level: "head", publishedDaysAgo: 17, republicationCount: 0, url: "https://aircall.io/jobs/sm-benelux" },
      { externalId: "seed-aircall-4", title: "Senior AE — Italy", function: "account_executive", level: "senior", publishedDaysAgo: 28, republicationCount: 0, url: "https://aircall.io/jobs/ae-it" },
      { externalId: "seed-aircall-5", title: "SDR Team Lead", function: "sales_manager", level: "head", publishedDaysAgo: 14, republicationCount: 0, url: "https://aircall.io/jobs/sdr-tl" },
    ],
    decisionMakers: [
      { fullName: "Olivier Pailhès", role: "ceo", titleExact: "CEO & Co-founder", linkedinUrl: "https://www.linkedin.com/in/olivierpailhes/", isRecent: false, startedDaysAgo: 4380, angleApproach: "Olivier est sensible aux signaux de stabilité d'équipe après le turnover Q4. Hook : un point de vue sur la rétention AE post-onboarding plutôt qu'un pitch direct." },
      { fullName: "Caroline Petit", role: "vp_sales", titleExact: "SVP Sales EMEA", linkedinUrl: "https://www.linkedin.com/in/caroline-petit/", isRecent: true, startedDaysAgo: 60, angleApproach: "Caroline vient de Salesforce et a déjà bossé avec deux cabs spé pendant son passage. Approche : message LinkedIn court avec 1 candidat précis, garantie 90j explicite." },
      { fullName: "Mathieu Roche", role: "head_ta", titleExact: "Director of Talent", linkedinUrl: "https://www.linkedin.com/in/mathieu-roche/", isRecent: false, startedDaysAgo: 1095, angleApproach: "Mathieu connaît tous les cabs de la place. Le différenciant n'est pas le pitch mais la qualité du shortlist. Approche : envoyer 2 profils ciblés directement, sans pitch." },
      { fullName: "Julien Garnier", role: "head_of_sales", titleExact: "Head of Sales France", linkedinUrl: "https://www.linkedin.com/in/julien-garnier/", isRecent: true, startedDaysAgo: 180, angleApproach: "Julien recrute pour son équipe directement. Il préfère les cabs qui connaissent le marché telco/SaaS. Hook : références concrètes de placements chez Ringover, Diabolocom." },
    ],
    timeline: [
      { daysAgo: 270, eventType: "other", description: "Restructuration équipe Sales annoncée en interne" },
      { daysAgo: 180, eventType: "leadership_change", description: "Julien Garnier promu Head of Sales France" },
      { daysAgo: 120, eventType: "team_growth", description: "Vague de départs Sales (>10 AE EMEA)" },
      { daysAgo: 60, eventType: "leadership_change", description: "Caroline Petit rejoint en SVP Sales EMEA (ex-Salesforce)" },
      { daysAgo: 42, eventType: "job_published", description: "Ouverture simultanée de 5 postes AE EMEA" },
      { daysAgo: 21, eventType: "job_republished", description: "Republication AE EMEA et AE Mid-Market" },
      { daysAgo: 0, eventType: "team_growth", description: "5 postes Sales ouverts, équipe à reconstruire" },
    ],
  },
];

function daysAgoDate(days: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d;
}

function dateOnly(days: number): string {
  return daysAgoDate(days).toISOString().slice(0, 10);
}

export interface SeedResult {
  companiesUpserted: number;
  jobsUpserted: number;
  scoresUpserted: number;
  decisionMakersUpserted: number;
  recommendationsUpserted: number;
  mandatesUpserted: number;
  timelineEventsUpserted: number;
}

/**
 * Seed les 3 boîtes de référence. Idempotent.
 */
export async function seedReferenceCompanies(): Promise<SeedResult> {
  const result: SeedResult = {
    companiesUpserted: 0,
    jobsUpserted: 0,
    scoresUpserted: 0,
    decisionMakersUpserted: 0,
    recommendationsUpserted: 0,
    mandatesUpserted: 0,
    timelineEventsUpserted: 0,
  };

  for (const seed of SEED_COMPANIES) {
    // Upsert company
    const [company] = await db
      .insert(companies)
      .values({
        name: seed.name,
        slug: seed.slug,
        websiteUrl: seed.websiteUrl,
        city: seed.city,
        region: seed.region,
        sector: seed.sector,
        sectorPrecise: seed.sectorPrecise,
        employeeCount: seed.employeeCount,
        fundingStage: seed.fundingStage,
        lastFundingAmount: seed.lastFundingAmount,
        lastFundingDate: seed.lastFundingDate,
        ceoName: seed.ceoName,
        ceoLinkedinUrl: seed.ceoLinkedinUrl,
        dataSourcesUsed: ["seed"],
      })
      .onConflictDoUpdate({
        target: companies.slug,
        set: {
          name: seed.name,
          websiteUrl: seed.websiteUrl,
          employeeCount: seed.employeeCount,
          sector: seed.sector,
          sectorPrecise: seed.sectorPrecise,
          fundingStage: seed.fundingStage,
          lastFundingAmount: seed.lastFundingAmount,
          lastFundingDate: seed.lastFundingDate,
          lastUpdatedAt: new Date(),
        },
      })
      .returning();

    if (!company) continue;
    result.companiesUpserted += 1;
    const companyId = company.id;

    // Jobs
    for (const j of seed.jobs) {
      await db
        .insert(jobs)
        .values({
          companyId,
          externalId: j.externalId,
          source: "seed",
          title: j.title,
          function: j.function,
          level: j.level,
          city: seed.city,
          publishedAt: daysAgoDate(j.publishedDaysAgo),
          republicationCount: j.republicationCount,
          url: j.url,
        })
        .onConflictDoNothing();
      result.jobsUpserted += 1;
    }

    // Score (delete + insert : idempotent)
    await db.delete(companyScores).where(eq(companyScores.companyId, companyId));
    await db.insert(companyScores).values({
      companyId,
      score: seed.score.score,
      scoreVolume: seed.score.scoreVolume,
      scorePersistance: seed.score.scorePersistance,
      scoreRepublication: seed.score.scoreRepublication,
      scoreCroissanceSales: seed.score.scoreCroissanceSales,
      flags: seed.score.flags,
    });
    result.scoresUpserted += 1;

    // Decision makers
    await db.delete(decisionMakers).where(eq(decisionMakers.companyId, companyId));
    for (const dm of seed.decisionMakers) {
      await db.insert(decisionMakers).values({
        companyId,
        fullName: dm.fullName,
        role: dm.role,
        titleExact: dm.titleExact,
        linkedinUrl: dm.linkedinUrl,
        startedAt: dateOnly(dm.startedDaysAgo),
        isRecent: dm.isRecent,
        source: "seed",
        angleApproach: dm.angleApproach,
        angleGeneratedAt: new Date(),
      });
      result.decisionMakersUpserted += 1;
    }

    // Recommendation
    await db.delete(companyRecommendations).where(eq(companyRecommendations.companyId, companyId));
    await db.insert(companyRecommendations).values({
      companyId,
      recommendation: seed.recommendation,
      modelUsed: "seed",
    });
    result.recommendationsUpserted += 1;

    // Mandate
    await db.delete(mandateEstimates).where(eq(mandateEstimates.companyId, companyId));
    await db.insert(mandateEstimates).values({
      companyId,
      estimateMin: seed.mandate.estimateMin,
      estimateMax: seed.mandate.estimateMax,
      breakdownJson: seed.mandate.breakdown,
    });
    result.mandatesUpserted += 1;

    // Timeline
    await db.delete(companyTimelineEvents).where(eq(companyTimelineEvents.companyId, companyId));
    let order = 0;
    for (const ev of seed.timeline) {
      await db.insert(companyTimelineEvents).values({
        companyId,
        eventDate: dateOnly(ev.daysAgo),
        eventType: ev.eventType,
        description: ev.description,
        sortOrder: order++,
      });
      result.timelineEventsUpserted += 1;
    }
  }

  return result;
}
