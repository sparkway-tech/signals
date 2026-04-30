import { Router, type Request, type Response } from "express";
import Stripe from "stripe";
import { eq, sql } from "drizzle-orm";
import { db } from "@server/lib/db";
import { users, creditTransactions, type CreditPackType } from "@shared/schema";
import { getPackById } from "@server/lib/credit-packs";

const router = Router();

let cachedStripe: Stripe | null = null;
function getStripe(): Stripe | null {
  if (cachedStripe) return cachedStripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  cachedStripe = new Stripe(key, { apiVersion: "2025-02-24.acacia" });
  return cachedStripe;
}

/**
 * POST /api/stripe/webhook
 * RAW body required (signature verification). On gère uniquement
 * checkout.session.completed pour créditer le user.
 *
 * Idempotence : check si stripe_session_id existe déjà avant de créditer.
 */
router.post("/", async (req: Request, res: Response) => {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !webhookSecret) {
    res.status(503).json({ error: "STRIPE_NOT_CONFIGURED" });
    return;
  }

  const sig = req.headers["stripe-signature"];
  if (typeof sig !== "string") {
    res.status(400).json({ error: "Missing stripe-signature" });
    return;
  }

  // req.body ici est un Buffer car le router est mounté avec express.raw().
  const rawBody = req.body as Buffer;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error("[stripe-webhook] signature verification failed:", err);
    res.status(400).json({ error: "Invalid signature" });
    return;
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.["userId"];
    const packId = session.metadata?.["pack"] as CreditPackType | undefined;
    const sessionId = session.id;

    if (!userId || !packId) {
      console.warn("[stripe-webhook] missing metadata", { userId, packId });
      res.json({ received: true });
      return;
    }

    const pack = getPackById(packId);
    if (!pack) {
      console.warn("[stripe-webhook] unknown pack", packId);
      res.json({ received: true });
      return;
    }

    // Idempotence
    const existing = await db
      .select()
      .from(creditTransactions)
      .where(eq(creditTransactions.stripeSessionId, sessionId))
      .limit(1);
    if (existing.length > 0) {
      console.log("[stripe-webhook] already processed", sessionId);
      res.json({ received: true, idempotent: true });
      return;
    }

    // Crédite l'utilisateur
    const [updated] = await db
      .update(users)
      .set({ creditsBalance: sql`${users.creditsBalance} + ${pack.credits}` })
      .where(eq(users.id, userId))
      .returning({ balance: users.creditsBalance });

    if (!updated) {
      console.error("[stripe-webhook] user not found", userId);
      res.status(404).json({ error: "user_not_found" });
      return;
    }

    await db.insert(creditTransactions).values({
      userId,
      type: "purchase",
      amount: pack.credits,
      balanceAfter: updated.balance,
      stripeSessionId: sessionId,
      stripePaymentIntent: typeof session.payment_intent === "string" ? session.payment_intent : null,
      packType: packId,
      amountEur: pack.priceEur * 100,
      description: `Achat ${pack.name}`,
    });

    console.log("[stripe-webhook] credited", { userId, pack: packId, balance: updated.balance });
  }

  res.json({ received: true });
});

export default router;
