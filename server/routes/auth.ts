import { Router, type Request, type Response } from "express";
import { magicLinkRequestSchema } from "@shared/schema";
import { generateMagicLinkToken, hashToken } from "@server/lib/crypto-tokens";
import { sendMagicLinkEmail } from "@server/lib/email";
import { buildSessionCookie, clearSessionCookie } from "@server/lib/session";
import { getOrCreateUserByEmail, markUserLoggedIn, getUserById } from "@server/repositories/users";
import { createToken, findValidTokenByHash, markTokenUsed } from "@server/repositories/magic-link-tokens";

const router = Router();

/**
 * POST /api/auth/magic-link
 * Body : { email }
 * Génère un token, hash, persiste, envoie l'email Resend.
 * Réponse : { ok: true } (toujours, même si l'email n'existe pas — anti-enum).
 */
router.post("/magic-link", async (req: Request, res: Response) => {
  const parsed = magicLinkRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Email invalide" });
    return;
  }

  const { email } = parsed.data;
  try {
    const user = await getOrCreateUserByEmail(email);
    const { plain, hash } = generateMagicLinkToken();
    await createToken(user.id, hash);
    await sendMagicLinkEmail(email, plain);
    res.json({ ok: true });
  } catch (err) {
    console.error("[auth/magic-link]", err);
    // Anti-enum : on renvoie ok même si erreur silencieuse côté serveur
    res.json({ ok: true });
  }
});

/**
 * GET /api/auth/verify?token=...
 * Vérifie le token, set le cookie session, redirect vers
 * /onboarding ou /recherche selon onboardingCompleted.
 */
router.get("/verify", async (req: Request, res: Response) => {
  const token = typeof req.query.token === "string" ? req.query.token : "";
  if (!token || token.length < 32) {
    res.redirect("/auth/login?error=invalid_token");
    return;
  }

  const hash = hashToken(token);
  const row = await findValidTokenByHash(hash);
  if (!row) {
    res.redirect("/auth/login?error=expired_token");
    return;
  }

  await markTokenUsed(row.id);
  const user = await getUserById(row.userId);
  if (!user) {
    res.redirect("/auth/login?error=user_not_found");
    return;
  }

  await markUserLoggedIn(user.id);

  const cookie = buildSessionCookie(user.id);
  res.cookie(cookie.name, cookie.value, cookie.options);

  res.redirect(user.onboardingCompleted ? "/recherche" : "/onboarding");
});

/**
 * POST /api/auth/logout
 */
router.post("/logout", (_req: Request, res: Response) => {
  const c = clearSessionCookie();
  res.cookie(c.name, "", c.options);
  res.json({ ok: true });
});

export default router;
