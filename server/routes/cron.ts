import { Router, type Request, type Response } from "express";
import crypto from "node:crypto";
import { ingestAll, recomputeAllScores } from "@server/lib/data-sources/ingest";

const router = Router();

function authorize(req: Request, res: Response): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    res.status(503).json({ error: "CRON_SECRET not configured" });
    return false;
  }
  const provided =
    req.header("x-cron-secret") ||
    (req.header("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!provided) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

/**
 * GET /api/cron/ingest-jobs
 * Cron toutes les 6h.
 */
router.get("/ingest-jobs", async (req: Request, res: Response) => {
  if (!authorize(req, res)) return;
  try {
    const stats = await ingestAll();
    res.json({ ok: true, ...stats });
  } catch (err) {
    console.error("[cron/ingest] failed:", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed" });
  }
});

/**
 * GET /api/cron/recompute-scores
 * Cron toutes les 6h, décalé de 30 min après ingest.
 */
router.get("/recompute-scores", async (req: Request, res: Response) => {
  if (!authorize(req, res)) return;
  try {
    const stats = await recomputeAllScores();
    res.json({ ok: true, ...stats });
  } catch (err) {
    console.error("[cron/recompute] failed:", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed" });
  }
});

export default router;
