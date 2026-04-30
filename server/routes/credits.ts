import { Router, type Response } from "express";
import Stripe from "stripe";
import { checkoutRequestSchema } from "@shared/schema";
import { requireAuth, type AuthedRequest } from "@server/lib/session";
import { CREDIT_PACKS, getPackById } from "@server/lib/credit-packs";
import { getUserById } from "@server/repositories/users";

const router = Router();

let cachedStripe: Stripe | null = null;
function getStripe(): Stripe | null {
  if (cachedStripe) return cachedStripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  cachedStripe = new Stripe(key, { apiVersion: "2025-02-24.acacia" });
  return cachedStripe;
}

const APP_URL = process.env.APP_URL ?? "https://signals.sparkway.work";

/**
 * GET /api/credits/packs
 * Public-friendly : retourne les 3 packs (sans secret).
 */
router.get("/packs", async (_req, res: Response) => {
  res.json({
    packs: CREDIT_PACKS.map(({ envKey: _envKey, ...rest }) => rest),
  });
});

/**
 * POST /api/credits/checkout
 * Body : { pack }
 * Crée une session Stripe Checkout one-shot.
 */
router.post("/checkout", requireAuth, async (req, res: Response) => {
  const userId = (req as AuthedRequest).userId;
  const parsed = checkoutRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid pack" });
    return;
  }
  const pack = getPackById(parsed.data.pack);
  if (!pack) {
    res.status(400).json({ error: "Unknown pack" });
    return;
  }
  const priceId = process.env[pack.envKey];
  if (!priceId) {
    res.status(503).json({ error: "STRIPE_PRICE_NOT_CONFIGURED", pack: pack.id });
    return;
  }

  const stripe = getStripe();
  if (!stripe) {
    res.status(503).json({ error: "STRIPE_NOT_CONFIGURED" });
    return;
  }

  const user = await getUserById(userId);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${APP_URL}/profil?payment=success`,
      cancel_url: `${APP_URL}/profil?payment=cancel`,
      customer_email: user.email,
      metadata: { userId, pack: pack.id },
    });
    res.json({ checkoutUrl: session.url });
  } catch (err) {
    console.error("[checkout] error:", err);
    res.status(500).json({ error: "Stripe error" });
  }
});

export default router;
