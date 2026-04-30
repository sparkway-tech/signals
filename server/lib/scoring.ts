/**
 * Pipeline scoring — Sparkway Signals.
 * Source : SIGNALS_SPARKWAY.md §6.
 *
 * Score d'urgence (0-100) = moyenne pondérée de 4 sous-scores :
 *  - Volume       (poids 25%) : nombre de postes Sales/tech actifs
 *  - Persistance  (poids 30%) : depuis combien de temps les annonces sont ouvertes
 *  - Republication(poids 25%) : maxRepublicationCount
 *  - CroissanceSales (poids 20%) : croissance effectif (proxy via funding récent)
 *
 * Tous bornés à [0, 100].
 */

import type { Job } from "@shared/schema";

export interface ScoreInput {
  jobs: Job[]; // jobs actifs de la company (closed_at = null)
  growthPercentSixMonths?: number | null; // ex: 35 = +35%
  fundingRecentMonths?: number | null; // mois depuis dernière levée
}

export interface ScoreOutput {
  score: number;
  scoreVolume: number;
  scorePersistance: number;
  scoreRepublication: number;
  scoreCroissanceSales: number;
}

export interface Flag {
  type: "volume" | "republication" | "funding" | "growth" | "senior_role";
  label: string;
  severity: "low" | "med" | "high";
}

const W_VOLUME = 0.25;
const W_PERSISTANCE = 0.3;
const W_REPUBLICATION = 0.25;
const W_GROWTH = 0.2;

function clamp100(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function ageInDays(publishedAt: Date | string): number {
  const t = typeof publishedAt === "string" ? new Date(publishedAt).getTime() : publishedAt.getTime();
  return Math.max(0, (Date.now() - t) / 86_400_000);
}

export function computeScore(input: ScoreInput): ScoreOutput {
  const activeJobs = input.jobs.filter((j) => !j.closedAt);

  // 1. Volume (25%)
  const scoreVolume = clamp100(activeJobs.length * 12);

  // 2. Persistance (30%)
  const ages = activeJobs.map((j) => ageInDays(j.publishedAt));
  const avgAge = ages.length > 0 ? ages.reduce((a, b) => a + b, 0) / ages.length : 0;
  const scorePersistance = clamp100(avgAge * 1.5);

  // 3. Republication (25%)
  const maxRepub = activeJobs.reduce((max, j) => Math.max(max, j.republicationCount), 0);
  const scoreRepublication = clamp100(maxRepub * 25);

  // 4. Croissance Sales (20%)
  // V1 : si data dispo on l'utilise, sinon proxy = funding récent (≤12 mois)
  let scoreCroissance: number;
  if (typeof input.growthPercentSixMonths === "number") {
    scoreCroissance = clamp100(input.growthPercentSixMonths * 2.5);
  } else if (typeof input.fundingRecentMonths === "number" && input.fundingRecentMonths <= 12) {
    // funding récent → proxy moyen-haut. 0 mois = 80, 12 mois = 30.
    scoreCroissance = clamp100(80 - (input.fundingRecentMonths / 12) * 50);
  } else {
    scoreCroissance = 30; // baseline
  }

  const score = clamp100(
    W_VOLUME * scoreVolume +
      W_PERSISTANCE * scorePersistance +
      W_REPUBLICATION * scoreRepublication +
      W_GROWTH * scoreCroissance,
  );

  return {
    score,
    scoreVolume,
    scorePersistance,
    scoreRepublication,
    scoreCroissanceSales: scoreCroissance,
  };
}

/**
 * Génère 2-3 drapeaux explicatifs à partir des sous-scores et des jobs.
 * Source : SIGNALS_SPARKWAY.md §6 "Génération des drapeaux".
 */
export function computeFlags(input: {
  scores: ScoreOutput;
  jobs: Job[];
  growthPercentSixMonths?: number | null;
  fundingRecentMonths?: number | null;
  fundingStage?: string | null;
}): Flag[] {
  const flags: Flag[] = [];
  const activeJobs = input.jobs.filter((j) => !j.closedAt);
  const maxRepub = activeJobs.reduce((max, j) => Math.max(max, j.republicationCount), 0);
  const seniorRolesActive = activeJobs.filter((j) => j.level === "head" || j.level === "vp" || j.level === "senior").length;

  if (input.scores.scoreVolume >= 70 && activeJobs.length > 0) {
    flags.push({
      type: "volume",
      label: `${activeJobs.length} postes ouverts`,
      severity: "high",
    });
  }

  if (input.scores.scoreRepublication >= 50 && maxRepub > 0) {
    flags.push({
      type: "republication",
      label: `Annonce republiée ${maxRepub}x`,
      severity: "high",
    });
  }

  if (
    typeof input.fundingRecentMonths === "number" &&
    input.fundingRecentMonths <= 12 &&
    input.fundingStage
  ) {
    const stageLabel = input.fundingStage.replace("series_", "Série ").replace("_", " ");
    flags.push({
      type: "funding",
      label: `Levée ${stageLabel} il y a ${input.fundingRecentMonths} mois`,
      severity: "med",
    });
  }

  if (typeof input.growthPercentSixMonths === "number" && input.growthPercentSixMonths >= 25) {
    flags.push({
      type: "growth",
      label: `+${Math.round(input.growthPercentSixMonths)}% effectif sur 6 mois`,
      severity: "med",
    });
  }

  if (seniorRolesActive > 0) {
    flags.push({
      type: "senior_role",
      label: `Recrute Head of / VP / Senior`,
      severity: "low",
    });
  }

  // Cap à 3 drapeaux affichés
  return flags.slice(0, 3);
}
