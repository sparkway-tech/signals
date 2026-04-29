import { Router, type Response } from "express";
import { requireAuth, type AuthedRequest } from "@server/lib/session";
import { getUserById } from "@server/repositories/users";

const router = Router();

/**
 * GET /api/me
 * Renvoie le user courant (sans données sensibles).
 */
router.get("/", requireAuth, async (req, res: Response) => {
  const userId = (req as AuthedRequest).userId;
  const user = await getUserById(userId);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({
    id: user.id,
    email: user.email,
    onboardingCompleted: user.onboardingCompleted,
    sectors: user.sectors,
    functions: user.functions,
    regions: user.regions,
    creditsBalance: user.creditsBalance,
  });
});

export default router;
