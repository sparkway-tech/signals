import { Router, type Response } from "express";
import { requireAuth, type AuthedRequest } from "@server/lib/session";
import { TEMPLATES } from "@server/lib/templates";
import { countCompaniesInPerimeter } from "@server/repositories/companies";
import { getUserById } from "@server/repositories/users";

const router = Router();

/**
 * GET /api/templates
 * Renvoie les 4 templates avec, pour chacun, le nombre estimé de boîtes
 * dans le périmètre du user connecté.
 */
router.get("/", requireAuth, async (req, res: Response) => {
  const userId = (req as AuthedRequest).userId;
  const user = await getUserById(userId);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const counts = await Promise.all(
    TEMPLATES.map(async (t) => {
      const n = await countCompaniesInPerimeter({
        sectors: user.sectors,
        regions: user.regions,
      }).catch(() => 0);
      return { ...t, count: n };
    }),
  );

  res.json({ templates: counts });
});

export default router;
