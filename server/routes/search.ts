import { Router, type Response } from "express";
import { db } from "@server/lib/db";
import { searches, searchResults } from "@shared/schema";
import { searchRequestSchema } from "@shared/schema";
import { requireAuth, type AuthedRequest } from "@server/lib/session";
import { getTemplateById } from "@server/lib/templates";
import { searchCompanies } from "@server/repositories/companies";
import { getUserById } from "@server/repositories/users";
import { isUnlocked, unlockAsFreebie } from "@server/repositories/unlocks";

const router = Router();

/**
 * POST /api/search
 * Body : { template?, filters? }
 * Match contre le périmètre user (intersection), score les résultats,
 * sélectionne la freebie (1ère boîte non encore débloquée par ce user).
 */
router.post("/", requireAuth, async (req, res: Response) => {
  const userId = (req as AuthedRequest).userId;
  const parsed = searchRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid filters" });
    return;
  }

  const user = await getUserById(userId);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const tpl = parsed.data.template ? getTemplateById(parsed.data.template) : undefined;

  // Combine user perimeter + filters override + template
  const sectors = parsed.data.filters?.sectors ?? user.sectors;
  const regions = parsed.data.filters?.regions ?? user.regions;
  const fundingStages = parsed.data.filters?.fundingStages ?? tpl?.filters.fundingStages;

  const matches = await searchCompanies({
    sectors,
    regions,
    fundingStages,
    excludeUnlockedByUserId: userId,
  });

  // Pick freebie : première company que le user n'a pas encore débloquée
  let freebieCompanyId: string | null = null;
  for (const m of matches) {
    const already = await isUnlocked(userId, m.company.id);
    if (!already) {
      freebieCompanyId = m.company.id;
      break;
    }
  }

  // Persiste la search
  const [search] = await db
    .insert(searches)
    .values({
      userId,
      templateUsed: parsed.data.template ?? null,
      filters: parsed.data.filters ?? {},
      resultCount: matches.length,
      freebieCompanyId,
    })
    .returning();

  if (!search) {
    res.status(500).json({ error: "Failed to create search" });
    return;
  }

  // Persiste les results
  if (matches.length > 0) {
    await db.insert(searchResults).values(
      matches.map((m, i) => ({
        searchId: search.id,
        companyId: m.company.id,
        rank: i + 1,
        scoreSnapshot: m.score.score,
        flagsSnapshot: m.score.flags,
      })),
    );
  }

  // Auto-unlock freebie
  if (freebieCompanyId) {
    await unlockAsFreebie(userId, freebieCompanyId);
  }

  // Build response : freebie complète + teasers floutés
  const freebieMatch = matches.find((m) => m.company.id === freebieCompanyId);
  const teasers = matches
    .filter((m) => m.company.id !== freebieCompanyId)
    .slice(0, 12)
    .map((m) => ({
      id: m.company.id,
      score: m.score.score,
      sector: m.company.sector,
      city: m.company.city,
      employeeCountRange: bucketEmployees(m.company.employeeCount),
      partialFlag: m.score.flags[0]?.label ?? "Postes ouverts",
      maskedInitial: m.company.name.charAt(0).toUpperCase(),
      maskedLength: m.company.name.length,
    }));

  res.json({
    searchId: search.id,
    totalCount: matches.length,
    template: tpl?.title ?? "Custom",
    perimeterLabel: `${sectors.slice(0, 2).join(" / ")} / ${regions[0] ?? "France"}`,
    freebie: freebieMatch
      ? {
          id: freebieMatch.company.id,
          name: freebieMatch.company.name,
          slug: freebieMatch.company.slug,
          sector: freebieMatch.company.sector,
          city: freebieMatch.company.city,
          size: bucketEmployees(freebieMatch.company.employeeCount),
          score: freebieMatch.score.score,
          flags: freebieMatch.score.flags.map((f) => f.label),
        }
      : null,
    teasers,
  });
});

function bucketEmployees(n: number | null): string {
  if (n == null) return "Inconnu";
  if (n < 50) return "1-50";
  if (n < 200) return "50-200";
  if (n < 1000) return "200-1000";
  return "1000+";
}

export default router;
