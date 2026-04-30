import { Router, type Response } from "express";
import { perimeterUpdateSchema } from "@shared/schema";
import { requireAuth, type AuthedRequest } from "@server/lib/session";
import { getUserById, completeOnboarding } from "@server/repositories/users";
import { listTransactions, listUnlockedByUser } from "@server/repositories/unlocks";

const router = Router();

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

router.get("/transactions", requireAuth, async (req, res: Response) => {
  const userId = (req as AuthedRequest).userId;
  const txs = await listTransactions(userId, 10);
  res.json({ transactions: txs });
});

router.get("/unlocked", requireAuth, async (req, res: Response) => {
  const userId = (req as AuthedRequest).userId;
  const items = await listUnlockedByUser(userId, 20);
  res.json({ items });
});

/**
 * PATCH /api/me/perimeter
 * Update sectors/functions/regions partiel.
 */
router.patch("/perimeter", requireAuth, async (req, res: Response) => {
  const userId = (req as AuthedRequest).userId;
  const parsed = perimeterUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed" });
    return;
  }
  const user = await getUserById(userId);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const updated = await completeOnboarding(userId, {
    sectors: parsed.data.sectors ?? user.sectors,
    functions: parsed.data.functions ?? user.functions,
    regions: parsed.data.regions ?? user.regions,
  });
  res.json({ ok: true, user: updated });
});

export default router;
