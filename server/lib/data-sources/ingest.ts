/**
 * Pipeline d'ingestion : Adzuna + France Travail → companies + jobs.
 *
 * Stratégie :
 *  1. Find or create company par nom + ville (slug normalisé)
 *  2. Find job by externalId — si existe + publishedAt plus vieux,
 *     incrémente republicationCount + log timeline event
 *     Si nouveau, insert + log timeline event "job_published"
 *  3. Mark job comme actif (closedAt = null)
 */

import { eq, and } from "drizzle-orm";
import { db } from "@server/lib/db";
import { companies, jobs, companyTimelineEvents, type Job } from "@shared/schema";
import { fetchAdzunaTechJobs, normalizeFunction, normalizeLevel } from "./adzuna";
import { fetchFranceTravailJobs } from "./france-travail";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

async function findOrCreateCompany(name: string, city: string | null): Promise<string> {
  const slug = slugify(name);
  const [existing] = await db.select({ id: companies.id }).from(companies).where(eq(companies.slug, slug)).limit(1);
  if (existing) return existing.id;
  const [row] = await db
    .insert(companies)
    .values({ name, slug, city, dataSourcesUsed: [] })
    .onConflictDoNothing()
    .returning({ id: companies.id });
  if (row) return row.id;
  // Race : someone else inserted, re-fetch
  const [retry] = await db.select({ id: companies.id }).from(companies).where(eq(companies.slug, slug)).limit(1);
  if (!retry) throw new Error(`Failed to find/create company ${name}`);
  return retry.id;
}

interface IngestStats {
  added: number;
  republished: number;
  errors: number;
}

export async function ingestAll(): Promise<IngestStats> {
  const stats: IngestStats = { added: 0, republished: 0, errors: 0 };

  // Adzuna
  try {
    const adzunaJobs = await fetchAdzunaTechJobs(1);
    for (const aj of adzunaJobs) {
      try {
        const companyName = aj.company.display_name?.trim();
        if (!companyName) continue;
        const city = aj.location?.area?.[2] ?? aj.location?.display_name ?? null;
        const companyId = await findOrCreateCompany(companyName, city);
        const publishedAt = new Date(aj.created);

        const [existing] = await db
          .select()
          .from(jobs)
          .where(and(eq(jobs.source, "adzuna"), eq(jobs.externalId, aj.id)))
          .limit(1);

        if (existing) {
          if (publishedAt.getTime() > new Date(existing.publishedAt).getTime()) {
            await db
              .update(jobs)
              .set({ publishedAt, republicationCount: existing.republicationCount + 1, closedAt: null })
              .where(eq(jobs.id, existing.id));
            await db.insert(companyTimelineEvents).values({
              companyId,
              eventDate: publishedAt.toISOString().slice(0, 10),
              eventType: "job_republished",
              description: aj.title,
            });
            stats.republished++;
          }
        } else {
          await db.insert(jobs).values({
            companyId,
            externalId: aj.id,
            source: "adzuna",
            title: aj.title,
            function: normalizeFunction(aj.title),
            level: normalizeLevel(aj.title),
            city,
            publishedAt,
            url: aj.redirect_url,
            rawData: aj,
          });
          await db.insert(companyTimelineEvents).values({
            companyId,
            eventDate: publishedAt.toISOString().slice(0, 10),
            eventType: "job_published",
            description: aj.title,
          });
          stats.added++;
        }
      } catch (err) {
        console.error("[ingest/adzuna] item failed:", err);
        stats.errors++;
      }
    }
  } catch (err) {
    console.error("[ingest/adzuna] global failed:", err);
  }

  // France Travail
  try {
    const ftJobs = await fetchFranceTravailJobs(50);
    for (const fj of ftJobs) {
      try {
        const companyName = fj.entreprise?.nom?.trim();
        if (!companyName) continue;
        const city = fj.lieuTravail?.commune ?? fj.lieuTravail?.libelle ?? null;
        const companyId = await findOrCreateCompany(companyName, city);
        const publishedAt = new Date(fj.dateCreation);

        const [existing] = await db
          .select()
          .from(jobs)
          .where(and(eq(jobs.source, "france_travail"), eq(jobs.externalId, fj.id)))
          .limit(1);

        if (existing) {
          if (publishedAt.getTime() > new Date(existing.publishedAt).getTime()) {
            await db
              .update(jobs)
              .set({ publishedAt, republicationCount: existing.republicationCount + 1, closedAt: null })
              .where(eq(jobs.id, existing.id));
            stats.republished++;
          }
        } else {
          await db.insert(jobs).values({
            companyId,
            externalId: fj.id,
            source: "france_travail",
            title: fj.intitule,
            function: normalizeFunction(fj.intitule),
            level: normalizeLevel(fj.intitule),
            city,
            publishedAt,
            url: fj.origineOffre?.urlOrigine ?? `https://candidat.francetravail.fr/offres/recherche/detail/${fj.id}`,
            rawData: fj,
          });
          stats.added++;
        }
      } catch (err) {
        console.error("[ingest/ft] item failed:", err);
        stats.errors++;
      }
    }
  } catch (err) {
    console.error("[ingest/ft] global failed:", err);
  }

  return stats;
}

/**
 * Recompute scores for all companies with at least 1 active job in last 90j.
 */
export async function recomputeAllScores(): Promise<{ scored: number }> {
  // Import scoring lazily pour éviter circular
  const { computeScore, computeFlags } = await import("../scoring");
  const { companyScores } = await import("@shared/schema");

  const allCompanies = await db.select({ id: companies.id, fundingStage: companies.fundingStage, lastFundingDate: companies.lastFundingDate }).from(companies);

  let scored = 0;
  for (const c of allCompanies) {
    const cJobs: Job[] = await db.select().from(jobs).where(eq(jobs.companyId, c.id));
    if (cJobs.length === 0) continue;

    const fundingMonths = c.lastFundingDate
      ? Math.floor((Date.now() - new Date(c.lastFundingDate).getTime()) / (30 * 86_400_000))
      : null;

    const scores = computeScore({ jobs: cJobs, fundingRecentMonths: fundingMonths });
    const flags = computeFlags({
      scores,
      jobs: cJobs,
      fundingRecentMonths: fundingMonths,
      fundingStage: c.fundingStage,
    });

    await db
      .insert(companyScores)
      .values({
        companyId: c.id,
        score: scores.score,
        scoreVolume: scores.scoreVolume,
        scorePersistance: scores.scorePersistance,
        scoreRepublication: scores.scoreRepublication,
        scoreCroissanceSales: scores.scoreCroissanceSales,
        flags,
      })
      .onConflictDoUpdate({
        target: companyScores.companyId,
        set: {
          score: scores.score,
          scoreVolume: scores.scoreVolume,
          scorePersistance: scores.scorePersistance,
          scoreRepublication: scores.scoreRepublication,
          scoreCroissanceSales: scores.scoreCroissanceSales,
          flags,
          computedAt: new Date(),
        },
      });
    scored++;
  }

  return { scored };
}
