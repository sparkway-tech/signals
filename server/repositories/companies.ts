import { eq, and, desc, inArray, isNull, gte, or, sql as dsql } from "drizzle-orm";
import { db } from "@server/lib/db";
import {
  companies,
  jobs,
  companyScores,
  decisionMakers,
  companyRecommendations,
  mandateEstimates,
  companyTimelineEvents,
  type Company,
  type Job,
  type CompanyScore,
  type DecisionMaker,
  type CompanyTimelineEvent,
  type CompanyRecommendation,
  type MandateEstimate,
} from "@shared/schema";

export async function getCompanyById(id: string): Promise<Company | null> {
  const [row] = await db.select().from(companies).where(eq(companies.id, id)).limit(1);
  return row ?? null;
}

export async function getCompanyBySlug(slug: string): Promise<Company | null> {
  const [row] = await db.select().from(companies).where(eq(companies.slug, slug)).limit(1);
  return row ?? null;
}

export async function getActiveJobsForCompany(companyId: string): Promise<Job[]> {
  return db.select().from(jobs).where(and(eq(jobs.companyId, companyId), isNull(jobs.closedAt))).orderBy(desc(jobs.publishedAt));
}

export async function getScoreForCompany(companyId: string): Promise<CompanyScore | null> {
  const [row] = await db.select().from(companyScores).where(eq(companyScores.companyId, companyId)).limit(1);
  return row ?? null;
}

export async function getDecisionMakersForCompany(companyId: string): Promise<DecisionMaker[]> {
  return db.select().from(decisionMakers).where(eq(decisionMakers.companyId, companyId));
}

export async function getRecommendationForCompany(companyId: string): Promise<CompanyRecommendation | null> {
  const [row] = await db.select().from(companyRecommendations).where(eq(companyRecommendations.companyId, companyId)).limit(1);
  return row ?? null;
}

export async function getMandateForCompany(companyId: string): Promise<MandateEstimate | null> {
  const [row] = await db.select().from(mandateEstimates).where(eq(mandateEstimates.companyId, companyId)).limit(1);
  return row ?? null;
}

export async function getTimelineForCompany(companyId: string): Promise<CompanyTimelineEvent[]> {
  return db
    .select()
    .from(companyTimelineEvents)
    .where(eq(companyTimelineEvents.companyId, companyId))
    .orderBy(desc(companyTimelineEvents.eventDate), desc(companyTimelineEvents.sortOrder));
}

/**
 * Recherche : retourne les companies qui matchent les filtres + sont scorées.
 * Tri par score desc. Limite 50.
 */
export interface SearchFilters {
  sectors?: string[];
  regions?: string[];
  fundingStages?: string[];
  excludeUnlockedByUserId?: string;
}

export interface SearchResultRow {
  company: Company;
  score: CompanyScore;
}

export async function searchCompanies(filters: SearchFilters): Promise<SearchResultRow[]> {
  const conditions = [];

  // Sector : si la company a un secteur connu il doit matcher, sinon on
  // laisse passer (les ingestions n'ont pas toujours de secteur).
  if (filters.sectors && filters.sectors.length > 0) {
    conditions.push(or(isNull(companies.sector), inArray(companies.sector, filters.sectors)));
  }

  // Région : strict (sinon le périmètre ne sert plus à rien).
  if (filters.regions && filters.regions.length > 0) {
    conditions.push(inArray(companies.region, filters.regions));
  }

  if (filters.fundingStages && filters.fundingStages.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    conditions.push(inArray(companies.fundingStage, filters.fundingStages as any));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select({ company: companies, score: companyScores })
    .from(companies)
    .innerJoin(companyScores, eq(companies.id, companyScores.companyId))
    .where(where)
    .orderBy(desc(companyScores.score))
    .limit(50);

  return rows.filter((r): r is SearchResultRow => r.company !== null && r.score !== null);
}

/**
 * Compte les companies scorées dans le périmètre user (pour /api/templates).
 */
export async function countCompaniesInPerimeter(filters: SearchFilters): Promise<number> {
  const conditions = [gte(companyScores.score, 1)];
  if (filters.sectors && filters.sectors.length > 0) {
    conditions.push(inArray(companies.sector, filters.sectors));
  }
  if (filters.regions && filters.regions.length > 0) {
    conditions.push(inArray(companies.region, filters.regions));
  }

  const result = await db
    .select({ n: dsql<number>`COUNT(*)::int` })
    .from(companies)
    .innerJoin(companyScores, eq(companies.id, companyScores.companyId))
    .where(and(...conditions));

  return result[0]?.n ?? 0;
}
