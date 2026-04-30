import { Router, type Response } from "express";
import { requireAuth, type AuthedRequest } from "@server/lib/session";
import {
  getCompanyById,
  getActiveJobsForCompany,
  getScoreForCompany,
  getDecisionMakersForCompany,
  getRecommendationForCompany,
  getMandateForCompany,
  getTimelineForCompany,
} from "@server/repositories/companies";
import { isUnlocked, unlockWithCredit, markContacted } from "@server/repositories/unlocks";

const router = Router();

/**
 * GET /api/companies/:id
 * Si user a débloqué → retourne tout. Sinon 403.
 */
router.get("/:id", requireAuth, async (req, res: Response) => {
  const userId = (req as AuthedRequest).userId;
  const companyId = req.params["id"];
  if (typeof companyId !== "string" || !companyId) {
    res.status(400).json({ error: "id required" });
    return;
  }

  const unlock = await isUnlocked(userId, companyId);
  if (!unlock) {
    res.status(403).json({ error: "LOCKED", message: "Débloque cette fiche pour 1 credit." });
    return;
  }

  const [company, jobs, score, decisionMakers, recommendation, mandate, timeline] = await Promise.all([
    getCompanyById(companyId),
    getActiveJobsForCompany(companyId),
    getScoreForCompany(companyId),
    getDecisionMakersForCompany(companyId),
    getRecommendationForCompany(companyId),
    getMandateForCompany(companyId),
    getTimelineForCompany(companyId),
  ]);

  if (!company) {
    res.status(404).json({ error: "Company not found" });
    return;
  }

  res.json({
    company,
    jobs,
    score,
    decisionMakers,
    recommendation,
    mandate,
    timeline,
    unlockedVia: unlock.unlockedVia,
    markedAsContacted: unlock.markedAsContacted,
  });
});

/**
 * POST /api/companies/:id/unlock
 * Débloque pour 1 credit.
 */
router.post("/:id/unlock", requireAuth, async (req, res: Response) => {
  const userId = (req as AuthedRequest).userId;
  const companyId = req.params["id"];
  if (typeof companyId !== "string" || !companyId) {
    res.status(400).json({ error: "id required" });
    return;
  }

  try {
    const result = await unlockWithCredit(userId, companyId);
    res.json({ ok: true, balanceAfter: result.balanceAfter });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "INSUFFICIENT_CREDITS") {
        res.status(402).json({ error: "INSUFFICIENT_CREDITS" });
        return;
      }
      if (err.message === "ALREADY_UNLOCKED") {
        res.status(409).json({ error: "ALREADY_UNLOCKED" });
        return;
      }
    }
    console.error("[unlock] error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * POST /api/companies/:id/mark-contacted
 */
router.post("/:id/mark-contacted", requireAuth, async (req, res: Response) => {
  const userId = (req as AuthedRequest).userId;
  const companyId = req.params["id"];
  if (typeof companyId !== "string" || !companyId) {
    res.status(400).json({ error: "id required" });
    return;
  }

  const updated = await markContacted(userId, companyId);
  if (!updated) {
    res.status(404).json({ error: "Not unlocked yet" });
    return;
  }
  res.json({ ok: true, markedAsContacted: updated.markedAsContacted });
});

export default router;
