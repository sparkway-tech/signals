/**
 * Pipeline d'ingestion : Adzuna + France Travail → companies + jobs.
 *
 * Version optimisée :
 *  - Fetch parallèle des deux sources
 *  - Resolve companies en parallèle par chunks de 10
 *  - Bulk find existing jobs par source + externalId
 *  - Bulk insert nouveaux jobs par chunks de 100
 *  - Mapping ville → région appliqué côté ingestion
 *
 * NOTE : pas de timeline events sur l'ingestion masse (trop coûteux en
 * inserts unitaires). Les events timeline pertinents sont seedés ou
 * inférés à la volée par la fiche entreprise.
 */

import { eq, and, inArray, isNull } from "drizzle-orm";
import { db } from "@server/lib/db";
import { companies, jobs, type Job, type JobSource } from "@shared/schema";
import { fetchAdzunaTechJobs, normalizeFunction, normalizeLevel, type AdzunaJob } from "./adzuna";
import { fetchFranceTravailJobs, type FranceTravailJob } from "./france-travail";
import { cityToRegion } from "./city-to-region";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

interface CompanyResolveInput {
  name: string;
  city: string | null;
}

async function resolveCompany(input: CompanyResolveInput): Promise<string | null> {
  const slug = slugify(input.name);
  if (!slug) return null;
  const region = cityToRegion(input.city);

  const [existing] = await db
    .select({ id: companies.id, region: companies.region })
    .from(companies)
    .where(eq(companies.slug, slug))
    .limit(1);

  if (existing) {
    // Backfill region si manquante
    if (!existing.region && region) {
      await db.update(companies).set({ region, lastUpdatedAt: new Date() }).where(eq(companies.id, existing.id));
    }
    return existing.id;
  }

  const [row] = await db
    .insert(companies)
    .values({ name: input.name, slug, city: input.city, region, dataSourcesUsed: [] })
    .onConflictDoNothing()
    .returning({ id: companies.id });

  if (row) return row.id;

  // Race condition : refetch
  const [retry] = await db.select({ id: companies.id }).from(companies).where(eq(companies.slug, slug)).limit(1);
  return retry?.id ?? null;
}

interface IngestStats {
  added: number;
  republished: number;
  errors: number;
  companiesResolved: number;
  adzunaFetched: number;
  ftFetched: number;
}

interface NormalizedJob {
  source: JobSource;
  externalId: string;
  companyName: string;
  city: string | null;
  publishedAt: Date;
  title: string;
  function: string;
  level: "junior" | "mid" | "senior" | "head" | "vp";
  url: string;
  rawData: unknown;
}

function fromAdzuna(j: AdzunaJob): NormalizedJob | null {
  const companyName = j.company.display_name?.trim();
  if (!companyName) return null;
  return {
    source: "adzuna",
    externalId: j.id,
    companyName,
    city: j.location?.area?.[2] ?? j.location?.display_name ?? null,
    publishedAt: new Date(j.created),
    title: j.title,
    function: normalizeFunction(j.title),
    level: normalizeLevel(j.title),
    url: j.redirect_url,
    rawData: j,
  };
}

function fromFranceTravail(j: FranceTravailJob): NormalizedJob | null {
  const companyName = j.entreprise?.nom?.trim();
  if (!companyName) return null;
  return {
    source: "france_travail",
    externalId: j.id,
    companyName,
    city: j.lieuTravail?.commune ?? j.lieuTravail?.libelle ?? null,
    publishedAt: new Date(j.dateCreation),
    title: j.intitule,
    function: normalizeFunction(j.intitule),
    level: normalizeLevel(j.intitule),
    url: j.origineOffre?.urlOrigine ?? `https://candidat.francetravail.fr/offres/recherche/detail/${j.id}`,
    rawData: j,
  };
}

async function chunked<T, R>(items: T[], size: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += size) {
    const chunk = items.slice(i, i + size);
    const results = await Promise.all(chunk.map(fn));
    out.push(...results);
  }
  return out;
}

async function processBatch(items: NormalizedJob[], stats: IngestStats): Promise<void> {
  if (items.length === 0) return;
  const source = items[0]?.source;
  if (!source) return;

  // 1. Unique companies
  const uniqueByName = new Map<string, CompanyResolveInput>();
  for (const it of items) {
    const slug = slugify(it.companyName);
    if (!slug) continue;
    if (!uniqueByName.has(slug)) uniqueByName.set(slug, { name: it.companyName, city: it.city });
  }

  // Resolve in parallel chunks of 10
  const slugs = [...uniqueByName.keys()];
  const slugToId = new Map<string, string>();
  await chunked(slugs, 10, async (slug) => {
    const input = uniqueByName.get(slug);
    if (!input) return;
    const id = await resolveCompany(input);
    if (id) {
      slugToId.set(slug, id);
      stats.companiesResolved++;
    }
  });

  // 2. Bulk find existing jobs
  const externalIds = items.map((i) => i.externalId);
  const existing: Job[] = [];
  // Limit to chunks of 200 ids to avoid huge IN clauses
  for (let i = 0; i < externalIds.length; i += 200) {
    const chunk = externalIds.slice(i, i + 200);
    const rows = await db
      .select()
      .from(jobs)
      .where(and(eq(jobs.source, source), inArray(jobs.externalId, chunk)));
    existing.push(...rows);
  }
  const existingByExt = new Map<string, Job>();
  for (const e of existing) existingByExt.set(e.externalId, e);

  // 3. Split insert / update
  type NewJobValues = typeof jobs.$inferInsert;
  const toInsert: NewJobValues[] = [];
  const toUpdate: Array<{ id: string; publishedAt: Date; republicationCount: number }> = [];

  for (const it of items) {
    const cid = slugToId.get(slugify(it.companyName));
    if (!cid) {
      stats.errors++;
      continue;
    }
    const exist = existingByExt.get(it.externalId);
    if (exist) {
      if (it.publishedAt.getTime() > new Date(exist.publishedAt).getTime()) {
        toUpdate.push({
          id: exist.id,
          publishedAt: it.publishedAt,
          republicationCount: exist.republicationCount + 1,
        });
      }
      continue;
    }
    toInsert.push({
      companyId: cid,
      externalId: it.externalId,
      source: it.source,
      title: it.title,
      function: it.function,
      level: it.level,
      city: it.city,
      publishedAt: it.publishedAt,
      url: it.url,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rawData: it.rawData as any,
    });
  }

  // 4. Bulk insert (chunks of 100, conflict-safe)
  for (let i = 0; i < toInsert.length; i += 100) {
    const chunk = toInsert.slice(i, i + 100);
    try {
      await db.insert(jobs).values(chunk).onConflictDoNothing();
      stats.added += chunk.length;
    } catch (err) {
      console.error("[ingest/bulk-insert] failed:", err);
      stats.errors += chunk.length;
    }
  }

  // 5. Updates (republications) — sequential, généralement minoritaire
  for (const u of toUpdate) {
    try {
      await db
        .update(jobs)
        .set({ publishedAt: u.publishedAt, republicationCount: u.republicationCount, closedAt: null })
        .where(eq(jobs.id, u.id));
      stats.republished++;
    } catch (err) {
      console.error("[ingest/update] failed:", err);
      stats.errors++;
    }
  }
}

export async function ingestAll(): Promise<IngestStats> {
  const stats: IngestStats = {
    added: 0,
    republished: 0,
    errors: 0,
    companiesResolved: 0,
    adzunaFetched: 0,
    ftFetched: 0,
  };

  // Fetch les 2 sources en parallèle
  const [adzunaJobs, ftJobs] = await Promise.all([
    fetchAdzunaTechJobs(2).catch((err) => {
      console.error("[ingest/adzuna] global failed:", err);
      return [] as AdzunaJob[];
    }),
    fetchFranceTravailJobs(150).catch((err) => {
      console.error("[ingest/ft] global failed:", err);
      return [] as FranceTravailJob[];
    }),
  ]);

  stats.adzunaFetched = adzunaJobs.length;
  stats.ftFetched = ftJobs.length;

  const adzunaNormalized = adzunaJobs.map(fromAdzuna).filter((x): x is NormalizedJob => x !== null);
  const ftNormalized = ftJobs.map(fromFranceTravail).filter((x): x is NormalizedJob => x !== null);

  // Process source by source pour scoper les checks externalId
  await processBatch(adzunaNormalized, stats);
  await processBatch(ftNormalized, stats);

  return stats;
}

/**
 * Backfill : pour les companies sans région mais avec une ville,
 * applique le mapping cityToRegion.
 */
export async function backfillRegionsFromCity(): Promise<{ updated: number; total: number }> {
  const rows = await db.select({ id: companies.id, city: companies.city }).from(companies).where(isNull(companies.region));
  let updated = 0;
  for (const r of rows) {
    const region = cityToRegion(r.city);
    if (region) {
      await db.update(companies).set({ region, lastUpdatedAt: new Date() }).where(eq(companies.id, r.id));
      updated++;
    }
  }
  return { updated, total: rows.length };
}

/**
 * Recompute scores for all companies with at least 1 active job in last 90j.
 */
export async function recomputeAllScores(): Promise<{ scored: number }> {
  // Import scoring lazily pour éviter circular
  const { computeScore, computeFlags } = await import("../scoring");
  const { companyScores } = await import("@shared/schema");

  const allCompanies = await db
    .select({ id: companies.id, fundingStage: companies.fundingStage, lastFundingDate: companies.lastFundingDate })
    .from(companies);

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
