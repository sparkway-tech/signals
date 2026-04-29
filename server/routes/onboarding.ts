import { Router, type Response } from "express";
import { onboardingSchema } from "@shared/schema";
import { requireAuth, type AuthedRequest } from "@server/lib/session";
import { completeOnboarding } from "@server/repositories/users";

const router = Router();

/**
 * POST /api/onboarding
 * Auth requis. Body : { sectors[max 3], functions[max 5], regions[min 1] }
 */
router.post("/", requireAuth, async (req, res: Response) => {
  const parsed = onboardingSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", issues: parsed.error.issues });
    return;
  }

  const userId = (req as AuthedRequest).userId;
  try {
    const user = await completeOnboarding(userId, parsed.data);
    res.json({ ok: true, user });
  } catch (err) {
    console.error("[onboarding]", err);
    res.status(500).json({ error: "Failed to save onboarding" });
  }
});

export default router;
