var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import express from "express";
import cookieParser from "cookie-parser";

// server/routes/auth.ts
import { Router } from "express";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  creditPackTypes: () => creditPackTypes,
  creditTransactionTypes: () => creditTransactionTypes,
  creditTransactions: () => creditTransactions,
  insertUserSchema: () => insertUserSchema,
  magicLinkRequestSchema: () => magicLinkRequestSchema,
  magicLinkTokens: () => magicLinkTokens,
  onboardingSchema: () => onboardingSchema,
  selectUserSchema: () => selectUserSchema,
  users: () => users
});
import { pgTable, uuid, text, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
var users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  onboardingCompleted: boolean("onboarding_completed").notNull().default(false),
  // Périmètre (rempli à l'onboarding)
  sectors: jsonb("sectors").$type().notNull().default(sql`'[]'::jsonb`),
  functions: jsonb("functions").$type().notNull().default(sql`'[]'::jsonb`),
  regions: jsonb("regions").$type().notNull().default(sql`'[]'::jsonb`),
  // Credits
  creditsBalance: integer("credits_balance").notNull().default(0)
});
var magicLinkTokens = pgTable("magic_link_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  // tokenHash = SHA-256 du token clair envoyé par email (le clair n'est jamais persisté)
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});
var creditTransactionTypes = ["purchase", "spend", "refund", "manual_adjust"];
var creditPackTypes = ["decouverte", "pro", "cabinet"];
var creditTransactions = pgTable("credit_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").$type().notNull(),
  amount: integer("amount").notNull(),
  // positif pour purchase, négatif pour spend
  balanceAfter: integer("balance_after").notNull(),
  // Si purchase
  stripeSessionId: text("stripe_session_id").unique(),
  stripePaymentIntent: text("stripe_payment_intent"),
  packType: text("pack_type").$type(),
  amountEur: integer("amount_eur"),
  // en centimes
  // Si spend (FK vers unlocked_companies, ajouté semaine 3)
  unlockedCompanyId: uuid("unlocked_company_id"),
  // Métadonnées
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});
var insertUserSchema = createInsertSchema(users);
var selectUserSchema = createSelectSchema(users);
var onboardingSchema = z.object({
  sectors: z.array(z.string().min(1)).max(3),
  functions: z.array(z.string().min(1)).max(5),
  regions: z.array(z.string().min(1)).min(1)
});
var magicLinkRequestSchema = z.object({
  email: z.string().email().toLowerCase().trim()
});

// server/lib/crypto-tokens.ts
import crypto from "node:crypto";
function generateMagicLinkToken() {
  const plain = crypto.randomBytes(32).toString("hex");
  const hash = hashToken(plain);
  return { plain, hash };
}
function hashToken(plain) {
  return crypto.createHash("sha256").update(plain).digest("hex");
}

// server/lib/email.ts
import { Resend } from "resend";
var cachedClient = null;
function getClient() {
  if (cachedClient) return cachedClient;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY missing \u2014 provision Resend via Vercel Marketplace");
  cachedClient = new Resend(apiKey);
  return cachedClient;
}
var FROM = process.env.RESEND_FROM_EMAIL ?? "signals@sparkway.work";
var APP_URL = process.env.APP_URL ?? "https://signals.sparkway.work";
async function sendMagicLinkEmail(to, token) {
  const url = `${APP_URL}/api/auth/verify?token=${encodeURIComponent(token)}`;
  const html = renderMagicLinkHtml(url);
  const text2 = `Connecte-toi \xE0 Sparkway Signals

Clique sur ce lien (valide 15 minutes) :
${url}

Si tu n'as pas demand\xE9 ce lien, ignore cet email.`;
  await getClient().emails.send({
    from: `Sparkway Signals <${FROM}>`,
    to,
    subject: "Ton lien de connexion Sparkway Signals",
    html,
    text: text2
  });
}
function renderMagicLinkHtml(url) {
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Sparkway Signals</title>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,500&family=Inter:wght@400;500&display=swap" rel="stylesheet" />
</head>
<body style="margin:0;padding:0;background:#F5F1EA;font-family:'Inter',Arial,sans-serif;color:#1A1A1A;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F5F1EA;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" border="0" style="background:#FFFFFF;border:1px solid rgba(26,26,26,0.10);border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:32px 32px 8px 32px;">
              <span style="display:inline-block;width:22px;height:22px;background:#1F3A2E;border-radius:3px;vertical-align:middle;"></span>
              <span style="font-family:'Fraunces',Georgia,serif;font-size:17px;font-weight:500;color:#1A1A1A;letter-spacing:-0.01em;margin-left:8px;">Sparkway <span style="font-style:italic;color:#5A5A5A;font-weight:300;">Signals</span></span>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 24px 32px;">
              <h1 style="margin:24px 0 12px 0;font-family:'Fraunces',Georgia,serif;font-weight:300;font-size:28px;line-height:1.2;color:#1A1A1A;">Ton lien de connexion</h1>
              <p style="margin:0 0 24px 0;font-size:15px;line-height:1.6;color:#5A5A5A;">Clique sur le bouton ci-dessous pour te connecter. Le lien est valide pendant <strong>15 minutes</strong>.</p>
              <a href="${url}" style="display:inline-block;background:#1F3A2E;color:#F5F1EA;text-decoration:none;font-weight:500;font-size:15px;padding:12px 24px;border-radius:8px;">Me connecter</a>
              <p style="margin:24px 0 0 0;font-size:13px;line-height:1.5;color:#A8A29A;">Ou copie ce lien dans ton navigateur :<br /><a href="${url}" style="color:#5A5A5A;word-break:break-all;">${url}</a></p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px;border-top:1px solid rgba(26,26,26,0.10);">
              <p style="margin:0;font-size:12px;color:#A8A29A;">Si tu n'as pas demand\xE9 ce lien, ignore simplement cet email.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// server/lib/session.ts
import crypto2 from "node:crypto";
var COOKIE_NAME = "signals_session";
var COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET missing or too short (require \u226532 chars hex). Generate via `openssl rand -hex 32`.");
  }
  return secret;
}
function sign(value) {
  return crypto2.createHmac("sha256", getSecret()).update(value).digest("hex");
}
function buildSessionCookie(userId) {
  const encoded = Buffer.from(userId, "utf8").toString("base64url");
  const signature = sign(encoded);
  const value = `${encoded}.${signature}`;
  return {
    name: COOKIE_NAME,
    value,
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: COOKIE_MAX_AGE_SECONDS * 1e3
    }
  };
}
function clearSessionCookie() {
  return {
    name: COOKIE_NAME,
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0
    }
  };
}
function verifyAndDecode(cookieValue) {
  const [encoded, signature] = cookieValue.split(".");
  if (!encoded || !signature) return null;
  const expected = sign(encoded);
  if (signature.length !== expected.length) return null;
  try {
    if (!crypto2.timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex"))) return null;
  } catch {
    return null;
  }
  try {
    return Buffer.from(encoded, "base64url").toString("utf8");
  } catch {
    return null;
  }
}
function requireAuth(req, res, next) {
  const cookie = req.cookies?.[COOKIE_NAME];
  if (typeof cookie !== "string") {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const userId = verifyAndDecode(cookie);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  req.userId = userId;
  next();
}

// server/repositories/users.ts
import { eq } from "drizzle-orm";

// server/lib/db.ts
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing \u2014 provision Neon via Vercel Marketplace");
}
var sql2 = neon(process.env.DATABASE_URL);
var db = drizzle(sql2, { schema: schema_exports });

// server/repositories/users.ts
async function getUserById(id) {
  const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return row ?? null;
}
async function getUserByEmail(email) {
  const [row] = await db.select().from(users).where(eq(users.email, email.toLowerCase().trim())).limit(1);
  return row ?? null;
}
async function createUser(email) {
  const [row] = await db.insert(users).values({ email: email.toLowerCase().trim() }).returning();
  if (!row) throw new Error("Failed to create user");
  return row;
}
async function getOrCreateUserByEmail(email) {
  const existing = await getUserByEmail(email);
  if (existing) return existing;
  return createUser(email);
}
async function markUserLoggedIn(id) {
  await db.update(users).set({ lastLoginAt: /* @__PURE__ */ new Date() }).where(eq(users.id, id));
}
async function completeOnboarding(id, input) {
  const [row] = await db.update(users).set({
    sectors: input.sectors,
    functions: input.functions,
    regions: input.regions,
    onboardingCompleted: true
  }).where(eq(users.id, id)).returning();
  if (!row) throw new Error("User not found");
  return row;
}

// server/repositories/magic-link-tokens.ts
import { and, eq as eq2, gt, isNull } from "drizzle-orm";
var TOKEN_TTL_MINUTES = 15;
async function createToken(userId, tokenHash) {
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1e3);
  const [row] = await db.insert(magicLinkTokens).values({ userId, tokenHash, expiresAt }).returning();
  if (!row) throw new Error("Failed to create magic link token");
  return row;
}
async function findValidTokenByHash(tokenHash) {
  const [row] = await db.select().from(magicLinkTokens).where(
    and(
      eq2(magicLinkTokens.tokenHash, tokenHash),
      gt(magicLinkTokens.expiresAt, /* @__PURE__ */ new Date()),
      isNull(magicLinkTokens.usedAt)
    )
  ).limit(1);
  return row ?? null;
}
async function markTokenUsed(id) {
  await db.update(magicLinkTokens).set({ usedAt: /* @__PURE__ */ new Date() }).where(eq2(magicLinkTokens.id, id));
}

// server/routes/auth.ts
var router = Router();
router.post("/magic-link", async (req, res) => {
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
    res.json({ ok: true });
  }
});
router.get("/verify", async (req, res) => {
  const t0 = Date.now();
  const log = (step) => console.log(`[verify] ${step} (+${Date.now() - t0}ms)`);
  const token = typeof req.query.token === "string" ? req.query.token : "";
  if (!token || token.length < 32) {
    log("invalid_token (length)");
    res.redirect("/auth/login?error=invalid_token");
    return;
  }
  try {
    const hash = hashToken(token);
    log("hash computed");
    const row = await findValidTokenByHash(hash);
    log(`findValidTokenByHash \u2192 ${row ? "found" : "not_found"}`);
    if (!row) {
      res.redirect("/auth/login?error=expired_token");
      return;
    }
    await markTokenUsed(row.id);
    log("markTokenUsed");
    const user = await getUserById(row.userId);
    log(`getUserById \u2192 ${user ? user.email : "not_found"}`);
    if (!user) {
      res.redirect("/auth/login?error=user_not_found");
      return;
    }
    await markUserLoggedIn(user.id);
    log("markUserLoggedIn");
    const cookie = buildSessionCookie(user.id);
    res.cookie(cookie.name, cookie.value, cookie.options);
    log("cookie set");
    const redirectTo = user.onboardingCompleted ? "/recherche" : "/onboarding";
    log(`redirect \u2192 ${redirectTo}`);
    res.redirect(redirectTo);
  } catch (err) {
    log(`ERROR: ${err instanceof Error ? err.message : String(err)}`);
    console.error("[verify] stack:", err);
    res.redirect("/auth/login?error=server_error");
  }
});
router.post("/logout", (_req, res) => {
  const c = clearSessionCookie();
  res.cookie(c.name, "", c.options);
  res.json({ ok: true });
});
var auth_default = router;

// server/routes/onboarding.ts
import { Router as Router2 } from "express";
var router2 = Router2();
router2.post("/", requireAuth, async (req, res) => {
  const parsed = onboardingSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", issues: parsed.error.issues });
    return;
  }
  const userId = req.userId;
  try {
    const user = await completeOnboarding(userId, parsed.data);
    res.json({ ok: true, user });
  } catch (err) {
    console.error("[onboarding]", err);
    res.status(500).json({ error: "Failed to save onboarding" });
  }
});
var onboarding_default = router2;

// server/routes/me.ts
import { Router as Router3 } from "express";
var router3 = Router3();
router3.get("/", requireAuth, async (req, res) => {
  const userId = req.userId;
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
    creditsBalance: user.creditsBalance
  });
});
var me_default = router3;

// server/lib/migrations.ts
import { sql as sql3 } from "drizzle-orm";
var CURRENT_SCHEMA_VERSION = 1;
var migrationsRan = false;
async function runStartupMigrations() {
  if (migrationsRan) return;
  migrationsRan = true;
  const t0 = Date.now();
  const log = (step) => console.log(`[startup-migrations] ${step} (+${Date.now() - t0}ms)`);
  log("start");
  await db.execute(sql3`
    CREATE TABLE IF NOT EXISTS "schema_version" (
      "id" integer PRIMARY KEY,
      "version" integer NOT NULL DEFAULT 0,
      "updated_at" timestamp NOT NULL DEFAULT now()
    )
  `);
  log("schema_version table OK");
  await db.execute(sql3`INSERT INTO "schema_version" ("id", "version") VALUES (1, 0) ON CONFLICT ("id") DO NOTHING`);
  const versionRows = await db.execute(
    sql3`SELECT version FROM "schema_version" WHERE id = 1`
  );
  const currentVersion = versionRows.rows?.[0]?.version ?? 0;
  log(`currentVersion = ${currentVersion}, target = ${CURRENT_SCHEMA_VERSION}`);
  if (currentVersion >= CURRENT_SCHEMA_VERSION) {
    log("up-to-date, skipping");
    return;
  }
  console.log(`[startup-migrations] Schema v${currentVersion} \u2192 v${CURRENT_SCHEMA_VERSION}, running migrations...`);
  await db.execute(sql3`
    CREATE TABLE IF NOT EXISTS "users" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "email" text NOT NULL UNIQUE,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "last_login_at" timestamptz,
      "onboarding_completed" boolean NOT NULL DEFAULT false,
      "sectors" jsonb NOT NULL DEFAULT '[]'::jsonb,
      "functions" jsonb NOT NULL DEFAULT '[]'::jsonb,
      "regions" jsonb NOT NULL DEFAULT '[]'::jsonb,
      "credits_balance" integer NOT NULL DEFAULT 0
    )
  `);
  await db.execute(sql3`
    CREATE TABLE IF NOT EXISTS "magic_link_tokens" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "token_hash" text NOT NULL UNIQUE,
      "expires_at" timestamptz NOT NULL,
      "used_at" timestamptz,
      "created_at" timestamptz NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql3`CREATE INDEX IF NOT EXISTS "magic_link_tokens_user_id_idx" ON "magic_link_tokens" ("user_id")`);
  await db.execute(sql3`
    CREATE TABLE IF NOT EXISTS "credit_transactions" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "type" text NOT NULL,
      "amount" integer NOT NULL,
      "balance_after" integer NOT NULL,
      "stripe_session_id" text UNIQUE,
      "stripe_payment_intent" text,
      "pack_type" text,
      "amount_eur" integer,
      "unlocked_company_id" uuid,
      "description" text,
      "created_at" timestamptz NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql3`CREATE INDEX IF NOT EXISTS "credit_transactions_user_id_idx" ON "credit_transactions" ("user_id", "created_at" DESC)`);
  await db.execute(sql3`UPDATE "schema_version" SET version = ${CURRENT_SCHEMA_VERSION}, updated_at = NOW() WHERE id = 1`);
  console.log(`[startup-migrations] Completed v${CURRENT_SCHEMA_VERSION} in ${Date.now() - t0}ms`);
}

// server/index.ts
var app = express();
var PORT = Number(process.env.PORT ?? 3e3);
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
var migrationsPromise = null;
app.use(async (_req, _res, next) => {
  if (!migrationsPromise) {
    migrationsPromise = runStartupMigrations().catch((err) => {
      console.error("[startup-migrations] failed:", err);
      migrationsPromise = null;
      throw err;
    });
  }
  try {
    await migrationsPromise;
    next();
  } catch (err) {
    next(err);
  }
});
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, ts: (/* @__PURE__ */ new Date()).toISOString() });
});
app.use("/api/auth", auth_default);
app.use("/api/onboarding", onboarding_default);
app.use("/api/me", me_default);
if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`[signals] dev API ready on http://localhost:${PORT}`);
  });
}
var index_default = app;

// server/vercel-handler.ts
var vercel_handler_default = index_default;
export {
  vercel_handler_default as default
};
