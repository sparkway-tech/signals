var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  checkoutRequestSchema: () => checkoutRequestSchema,
  companies: () => companies,
  companyRecommendations: () => companyRecommendations,
  companyScores: () => companyScores,
  companyTimelineEvents: () => companyTimelineEvents,
  creditPackTypes: () => creditPackTypes,
  creditTransactionTypes: () => creditTransactionTypes,
  creditTransactions: () => creditTransactions,
  decisionMakerRoles: () => decisionMakerRoles,
  decisionMakers: () => decisionMakers,
  fundingStages: () => fundingStages,
  insertUserSchema: () => insertUserSchema,
  jobLevels: () => jobLevels,
  jobSources: () => jobSources,
  jobs: () => jobs,
  magicLinkRequestSchema: () => magicLinkRequestSchema,
  magicLinkTokens: () => magicLinkTokens,
  mandateEstimates: () => mandateEstimates,
  onboardingSchema: () => onboardingSchema,
  perimeterUpdateSchema: () => perimeterUpdateSchema,
  searchRequestSchema: () => searchRequestSchema,
  searchResults: () => searchResults,
  searchTemplates: () => searchTemplates,
  searches: () => searches,
  selectUserSchema: () => selectUserSchema,
  timelineEventTypes: () => timelineEventTypes,
  unlockedCompanies: () => unlockedCompanies,
  unlockedVia: () => unlockedVia,
  users: () => users
});
import { pgTable, uuid, text, timestamp, integer, boolean, jsonb, date, unique } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
var users, magicLinkTokens, creditTransactionTypes, creditPackTypes, creditTransactions, insertUserSchema, selectUserSchema, onboardingSchema, magicLinkRequestSchema, fundingStages, companies, jobSources, jobLevels, jobs, companyScores, decisionMakerRoles, decisionMakers, companyRecommendations, mandateEstimates, timelineEventTypes, companyTimelineEvents, searchTemplates, searches, searchResults, unlockedVia, unlockedCompanies, searchRequestSchema, checkoutRequestSchema, perimeterUpdateSchema;
var init_schema = __esm({
  "shared/schema.ts"() {
    "use strict";
    users = pgTable("users", {
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
    magicLinkTokens = pgTable("magic_link_tokens", {
      id: uuid("id").primaryKey().defaultRandom(),
      userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
      // tokenHash = SHA-256 du token clair envoyé par email (le clair n'est jamais persisté)
      tokenHash: text("token_hash").notNull().unique(),
      expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
      usedAt: timestamp("used_at", { withTimezone: true }),
      createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
    });
    creditTransactionTypes = ["purchase", "spend", "refund", "manual_adjust"];
    creditPackTypes = ["decouverte", "pro", "cabinet"];
    creditTransactions = pgTable("credit_transactions", {
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
    insertUserSchema = createInsertSchema(users);
    selectUserSchema = createSelectSchema(users);
    onboardingSchema = z.object({
      sectors: z.array(z.string().min(1)).max(3),
      functions: z.array(z.string().min(1)).max(5),
      regions: z.array(z.string().min(1)).min(1)
    });
    magicLinkRequestSchema = z.object({
      email: z.string().email().toLowerCase().trim()
    });
    fundingStages = ["bootstrap", "seed", "series_a", "series_b", "series_c", "late_stage", "public"];
    companies = pgTable("companies", {
      id: uuid("id").primaryKey().defaultRandom(),
      name: text("name").notNull(),
      slug: text("slug").notNull().unique(),
      websiteUrl: text("website_url"),
      city: text("city"),
      region: text("region"),
      sector: text("sector"),
      sectorPrecise: text("sector_precise"),
      employeeCount: integer("employee_count"),
      fundingStage: text("funding_stage").$type(),
      lastFundingAmount: integer("last_funding_amount"),
      // milliers d'euros
      lastFundingDate: date("last_funding_date"),
      ceoName: text("ceo_name"),
      ceoLinkedinUrl: text("ceo_linkedin_url"),
      pappersId: text("pappers_id"),
      // métadonnées
      firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull().defaultNow(),
      lastUpdatedAt: timestamp("last_updated_at", { withTimezone: true }).notNull().defaultNow(),
      dataSourcesUsed: jsonb("data_sources_used").$type().notNull().default(sql`'[]'::jsonb`)
    });
    jobSources = ["adzuna", "france_travail", "manual", "seed"];
    jobLevels = ["junior", "mid", "senior", "head", "vp"];
    jobs = pgTable(
      "jobs",
      {
        id: uuid("id").primaryKey().defaultRandom(),
        companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
        externalId: text("external_id").notNull(),
        source: text("source").$type().notNull(),
        title: text("title").notNull(),
        function: text("function"),
        // 'account_executive' | 'sdr' | 'sales_manager' | 'engineer' | 'pm' | etc.
        level: text("level").$type(),
        city: text("city"),
        publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
        closedAt: timestamp("closed_at", { withTimezone: true }),
        republicationCount: integer("republication_count").notNull().default(0),
        url: text("url").notNull(),
        rawData: jsonb("raw_data")
      },
      (t) => ({
        sourceExternal: unique("jobs_source_external_uniq").on(t.source, t.externalId)
      })
    );
    companyScores = pgTable("company_scores", {
      id: uuid("id").primaryKey().defaultRandom(),
      companyId: uuid("company_id").notNull().unique().references(() => companies.id, { onDelete: "cascade" }),
      score: integer("score").notNull(),
      // 0-100
      scoreVolume: integer("score_volume").notNull(),
      scorePersistance: integer("score_persistance").notNull(),
      scoreRepublication: integer("score_republication").notNull(),
      scoreCroissanceSales: integer("score_croissance_sales").notNull(),
      flags: jsonb("flags").$type().notNull().default(sql`'[]'::jsonb`),
      computedAt: timestamp("computed_at", { withTimezone: true }).notNull().defaultNow()
    });
    decisionMakerRoles = ["ceo", "vp_sales", "head_of_sales", "head_ta", "sales_manager", "cofounder", "cmo", "cto", "vp_eng", "vp_product", "head_product", "other"];
    decisionMakers = pgTable("decision_makers", {
      id: uuid("id").primaryKey().defaultRandom(),
      companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
      fullName: text("full_name").notNull(),
      role: text("role").$type().notNull(),
      titleExact: text("title_exact").notNull(),
      linkedinUrl: text("linkedin_url"),
      startedAt: date("started_at"),
      isRecent: boolean("is_recent").notNull().default(false),
      source: text("source").notNull(),
      // 'pappers' | 'linkedin_public' | 'manual'
      angleApproach: text("angle_approach"),
      angleGeneratedAt: timestamp("angle_generated_at", { withTimezone: true })
    });
    companyRecommendations = pgTable("company_recommendations", {
      id: uuid("id").primaryKey().defaultRandom(),
      companyId: uuid("company_id").notNull().unique().references(() => companies.id, { onDelete: "cascade" }),
      recommendation: text("recommendation").notNull(),
      generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
      modelUsed: text("model_used").notNull()
    });
    mandateEstimates = pgTable("mandate_estimates", {
      id: uuid("id").primaryKey().defaultRandom(),
      companyId: uuid("company_id").notNull().unique().references(() => companies.id, { onDelete: "cascade" }),
      estimateMin: integer("estimate_min").notNull(),
      // milliers d'euros
      estimateMax: integer("estimate_max").notNull(),
      breakdownJson: jsonb("breakdown_json").$type().notNull().default(sql`'[]'::jsonb`),
      computedAt: timestamp("computed_at", { withTimezone: true }).notNull().defaultNow()
    });
    timelineEventTypes = ["funding", "leadership_change", "job_published", "job_republished", "team_growth", "other"];
    companyTimelineEvents = pgTable("company_timeline_events", {
      id: uuid("id").primaryKey().defaultRandom(),
      companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
      eventDate: date("event_date").notNull(),
      eventType: text("event_type").$type().notNull(),
      description: text("description").notNull(),
      metadata: jsonb("metadata"),
      sortOrder: integer("sort_order").notNull().default(0)
    });
    searchTemplates = ["scaleups_hypercroissance", "galere_recruter", "levees_recentes", "midmarket_ouverture", "custom"];
    searches = pgTable("searches", {
      id: uuid("id").primaryKey().defaultRandom(),
      userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
      templateUsed: text("template_used").$type(),
      filters: jsonb("filters").notNull().default(sql`'{}'::jsonb`),
      resultCount: integer("result_count").notNull().default(0),
      freebieCompanyId: uuid("freebie_company_id"),
      createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
    });
    searchResults = pgTable("search_results", {
      id: uuid("id").primaryKey().defaultRandom(),
      searchId: uuid("search_id").notNull().references(() => searches.id, { onDelete: "cascade" }),
      companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
      rank: integer("rank").notNull(),
      scoreSnapshot: integer("score_snapshot").notNull(),
      flagsSnapshot: jsonb("flags_snapshot")
    });
    unlockedVia = ["freebie", "credit", "manual_grant"];
    unlockedCompanies = pgTable(
      "unlocked_companies",
      {
        id: uuid("id").primaryKey().defaultRandom(),
        userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
        companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
        unlockedVia: text("unlocked_via").$type().notNull(),
        creditsCost: integer("credits_cost").notNull(),
        unlockedAt: timestamp("unlocked_at", { withTimezone: true }).notNull().defaultNow(),
        markedAsContacted: boolean("marked_as_contacted").notNull().default(false),
        markedAsContactedAt: timestamp("marked_as_contacted_at", { withTimezone: true })
      },
      (t) => ({
        userCompanyUniq: unique("unlocked_user_company_uniq").on(t.userId, t.companyId)
      })
    );
    searchRequestSchema = z.object({
      template: z.enum(searchTemplates).optional(),
      filters: z.object({
        sectors: z.array(z.string()).optional(),
        sizes: z.array(z.string()).optional(),
        regions: z.array(z.string()).optional(),
        fundingStages: z.array(z.string()).optional(),
        minAgeDays: z.number().int().min(0).optional()
      }).optional()
    });
    checkoutRequestSchema = z.object({
      pack: z.enum(creditPackTypes)
    });
    perimeterUpdateSchema = onboardingSchema.partial();
  }
});

// server/lib/scoring.ts
var scoring_exports = {};
__export(scoring_exports, {
  computeFlags: () => computeFlags,
  computeScore: () => computeScore
});
function clamp100(n) {
  return Math.max(0, Math.min(100, Math.round(n)));
}
function ageInDays(publishedAt) {
  const t = typeof publishedAt === "string" ? new Date(publishedAt).getTime() : publishedAt.getTime();
  return Math.max(0, (Date.now() - t) / 864e5);
}
function computeScore(input) {
  const activeJobs = input.jobs.filter((j) => !j.closedAt);
  const scoreVolume = clamp100(activeJobs.length * 12);
  const ages = activeJobs.map((j) => ageInDays(j.publishedAt));
  const avgAge = ages.length > 0 ? ages.reduce((a, b) => a + b, 0) / ages.length : 0;
  const scorePersistance = clamp100(avgAge * 1.5);
  const maxRepub = activeJobs.reduce((max, j) => Math.max(max, j.republicationCount), 0);
  const scoreRepublication = clamp100(maxRepub * 25);
  let scoreCroissance;
  if (typeof input.growthPercentSixMonths === "number") {
    scoreCroissance = clamp100(input.growthPercentSixMonths * 2.5);
  } else if (typeof input.fundingRecentMonths === "number" && input.fundingRecentMonths <= 12) {
    scoreCroissance = clamp100(80 - input.fundingRecentMonths / 12 * 50);
  } else {
    scoreCroissance = 30;
  }
  const score = clamp100(
    W_VOLUME * scoreVolume + W_PERSISTANCE * scorePersistance + W_REPUBLICATION * scoreRepublication + W_GROWTH * scoreCroissance
  );
  return {
    score,
    scoreVolume,
    scorePersistance,
    scoreRepublication,
    scoreCroissanceSales: scoreCroissance
  };
}
function computeFlags(input) {
  const flags = [];
  const activeJobs = input.jobs.filter((j) => !j.closedAt);
  const maxRepub = activeJobs.reduce((max, j) => Math.max(max, j.republicationCount), 0);
  const seniorRolesActive = activeJobs.filter((j) => j.level === "head" || j.level === "vp" || j.level === "senior").length;
  if (input.scores.scoreVolume >= 70 && activeJobs.length > 0) {
    flags.push({
      type: "volume",
      label: `${activeJobs.length} postes ouverts`,
      severity: "high"
    });
  }
  if (input.scores.scoreRepublication >= 50 && maxRepub > 0) {
    flags.push({
      type: "republication",
      label: `Annonce republi\xE9e ${maxRepub}x`,
      severity: "high"
    });
  }
  if (typeof input.fundingRecentMonths === "number" && input.fundingRecentMonths <= 12 && input.fundingStage) {
    const stageLabel = input.fundingStage.replace("series_", "S\xE9rie ").replace("_", " ");
    flags.push({
      type: "funding",
      label: `Lev\xE9e ${stageLabel} il y a ${input.fundingRecentMonths} mois`,
      severity: "med"
    });
  }
  if (typeof input.growthPercentSixMonths === "number" && input.growthPercentSixMonths >= 25) {
    flags.push({
      type: "growth",
      label: `+${Math.round(input.growthPercentSixMonths)}% effectif sur 6 mois`,
      severity: "med"
    });
  }
  if (seniorRolesActive > 0) {
    flags.push({
      type: "senior_role",
      label: `Recrute Head of / VP / Senior`,
      severity: "low"
    });
  }
  return flags.slice(0, 3);
}
var W_VOLUME, W_PERSISTANCE, W_REPUBLICATION, W_GROWTH;
var init_scoring = __esm({
  "server/lib/scoring.ts"() {
    "use strict";
    W_VOLUME = 0.25;
    W_PERSISTANCE = 0.3;
    W_REPUBLICATION = 0.25;
    W_GROWTH = 0.2;
  }
});

// server/index.ts
import express from "express";
import cookieParser from "cookie-parser";

// server/routes/auth.ts
init_schema();
import { Router } from "express";

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
init_schema();
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing \u2014 provision Neon via Vercel Marketplace");
}
var sql2 = neon(process.env.DATABASE_URL);
var db = drizzle(sql2, { schema: schema_exports });

// server/repositories/users.ts
init_schema();
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
init_schema();
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
init_schema();
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
init_schema();
import { Router as Router3 } from "express";

// server/repositories/unlocks.ts
import { and as and2, desc, eq as eq3, gte, sql as sql3 } from "drizzle-orm";
init_schema();
async function isUnlocked(userId, companyId) {
  const [row] = await db.select().from(unlockedCompanies).where(and2(eq3(unlockedCompanies.userId, userId), eq3(unlockedCompanies.companyId, companyId))).limit(1);
  return row ?? null;
}
async function unlockAsFreebie(userId, companyId) {
  const [row] = await db.insert(unlockedCompanies).values({ userId, companyId, unlockedVia: "freebie", creditsCost: 0 }).onConflictDoNothing().returning();
  if (!row) {
    const existing = await isUnlocked(userId, companyId);
    if (!existing) throw new Error("Unlock failed");
    return existing;
  }
  return row;
}
async function unlockWithCredit(userId, companyId) {
  const updated = await db.update(users).set({ creditsBalance: sql3`${users.creditsBalance} - 1` }).where(and2(eq3(users.id, userId), gte(users.creditsBalance, 1))).returning({ creditsBalance: users.creditsBalance });
  if (updated.length === 0) {
    throw new Error("INSUFFICIENT_CREDITS");
  }
  const balanceAfter = updated[0]?.creditsBalance ?? 0;
  const [unlock] = await db.insert(unlockedCompanies).values({ userId, companyId, unlockedVia: "credit", creditsCost: 1 }).onConflictDoNothing().returning();
  if (!unlock) {
    await db.update(users).set({ creditsBalance: sql3`${users.creditsBalance} + 1` }).where(eq3(users.id, userId));
    throw new Error("ALREADY_UNLOCKED");
  }
  await db.insert(creditTransactions).values({
    userId,
    type: "spend",
    amount: -1,
    balanceAfter,
    unlockedCompanyId: unlock.id,
    description: "Unlock company"
  });
  return { unlock, balanceAfter };
}
async function listUnlockedByUser(userId, limit = 20) {
  return db.select({
    unlock: unlockedCompanies,
    companyName: companies.name,
    companyId: companies.id
  }).from(unlockedCompanies).innerJoin(companies, eq3(companies.id, unlockedCompanies.companyId)).where(eq3(unlockedCompanies.userId, userId)).orderBy(desc(unlockedCompanies.unlockedAt)).limit(limit);
}
async function markContacted(userId, companyId) {
  const [row] = await db.update(unlockedCompanies).set({ markedAsContacted: true, markedAsContactedAt: /* @__PURE__ */ new Date() }).where(and2(eq3(unlockedCompanies.userId, userId), eq3(unlockedCompanies.companyId, companyId))).returning();
  return row ?? null;
}
async function listTransactions(userId, limit = 10) {
  return db.select().from(creditTransactions).where(eq3(creditTransactions.userId, userId)).orderBy(desc(creditTransactions.createdAt)).limit(limit);
}

// server/routes/me.ts
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
router3.get("/transactions", requireAuth, async (req, res) => {
  const userId = req.userId;
  const txs = await listTransactions(userId, 10);
  res.json({ transactions: txs });
});
router3.get("/unlocked", requireAuth, async (req, res) => {
  const userId = req.userId;
  const items = await listUnlockedByUser(userId, 20);
  res.json({ items });
});
router3.patch("/perimeter", requireAuth, async (req, res) => {
  const userId = req.userId;
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
    regions: parsed.data.regions ?? user.regions
  });
  res.json({ ok: true, user: updated });
});
var me_default = router3;

// server/routes/templates.ts
import { Router as Router4 } from "express";

// server/lib/templates.ts
var TEMPLATES = [
  {
    id: "scaleups_hypercroissance",
    title: "Scale-ups en hyper-croissance",
    desc: "Bo\xEEtes s\xE9rie B/C qui staffent leurs \xE9quipes commerciales et tech. Friction de sourcing \xE9lev\xE9e.",
    filters: {
      fundingStages: ["series_b", "series_c", "late_stage"],
      minActiveJobs: 3
    }
  },
  {
    id: "galere_recruter",
    title: "Bo\xEEtes qui gal\xE8rent \xE0 recruter",
    desc: "Annonces ouvertes depuis plus de 45 jours, republi\xE9es au moins 2 fois.",
    filters: {
      minRepublicationCount: 2
    }
  },
  {
    id: "levees_recentes",
    title: "Lev\xE9es r\xE9centes",
    desc: "Bo\xEEtes qui ont clos\xE9 une lev\xE9e et qui staffent leur Go-to-Market.",
    filters: {
      fundingMaxMonths: 12,
      minActiveJobs: 2
    }
  },
  {
    id: "midmarket_ouverture",
    title: "Mid-Market en ouverture",
    desc: "PME 50-200 personnes qui structurent leurs fonctions commerciales et tech pour la premi\xE8re fois.",
    filters: {
      sizeBuckets: ["50-200"],
      minActiveJobs: 1
    }
  }
];
function getTemplateById(id) {
  return TEMPLATES.find((t) => t.id === id);
}

// server/repositories/companies.ts
import { eq as eq4, and as and3, desc as desc2, inArray, isNull as isNull2, gte as gte2, sql as dsql } from "drizzle-orm";
init_schema();
async function getCompanyById(id) {
  const [row] = await db.select().from(companies).where(eq4(companies.id, id)).limit(1);
  return row ?? null;
}
async function getActiveJobsForCompany(companyId) {
  return db.select().from(jobs).where(and3(eq4(jobs.companyId, companyId), isNull2(jobs.closedAt))).orderBy(desc2(jobs.publishedAt));
}
async function getScoreForCompany(companyId) {
  const [row] = await db.select().from(companyScores).where(eq4(companyScores.companyId, companyId)).limit(1);
  return row ?? null;
}
async function getDecisionMakersForCompany(companyId) {
  return db.select().from(decisionMakers).where(eq4(decisionMakers.companyId, companyId));
}
async function getRecommendationForCompany(companyId) {
  const [row] = await db.select().from(companyRecommendations).where(eq4(companyRecommendations.companyId, companyId)).limit(1);
  return row ?? null;
}
async function getMandateForCompany(companyId) {
  const [row] = await db.select().from(mandateEstimates).where(eq4(mandateEstimates.companyId, companyId)).limit(1);
  return row ?? null;
}
async function getTimelineForCompany(companyId) {
  return db.select().from(companyTimelineEvents).where(eq4(companyTimelineEvents.companyId, companyId)).orderBy(desc2(companyTimelineEvents.eventDate), desc2(companyTimelineEvents.sortOrder));
}
async function searchCompanies(filters) {
  const conditions = [];
  if (filters.sectors && filters.sectors.length > 0) {
    conditions.push(inArray(companies.sector, filters.sectors));
  }
  if (filters.regions && filters.regions.length > 0) {
    conditions.push(inArray(companies.region, filters.regions));
  }
  if (filters.fundingStages && filters.fundingStages.length > 0) {
    conditions.push(inArray(companies.fundingStage, filters.fundingStages));
  }
  const where = conditions.length > 0 ? and3(...conditions) : void 0;
  const rows = await db.select({ company: companies, score: companyScores }).from(companies).innerJoin(companyScores, eq4(companies.id, companyScores.companyId)).where(where).orderBy(desc2(companyScores.score)).limit(50);
  return rows.filter((r) => r.company !== null && r.score !== null);
}
async function countCompaniesInPerimeter(filters) {
  const conditions = [gte2(companyScores.score, 1)];
  if (filters.sectors && filters.sectors.length > 0) {
    conditions.push(inArray(companies.sector, filters.sectors));
  }
  if (filters.regions && filters.regions.length > 0) {
    conditions.push(inArray(companies.region, filters.regions));
  }
  const result = await db.select({ n: dsql`COUNT(*)::int` }).from(companies).innerJoin(companyScores, eq4(companies.id, companyScores.companyId)).where(and3(...conditions));
  return result[0]?.n ?? 0;
}

// server/routes/templates.ts
var router4 = Router4();
router4.get("/", requireAuth, async (req, res) => {
  const userId = req.userId;
  const user = await getUserById(userId);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const counts = await Promise.all(
    TEMPLATES.map(async (t) => {
      const n = await countCompaniesInPerimeter({
        sectors: user.sectors,
        regions: user.regions
      }).catch(() => 0);
      return { ...t, count: n };
    })
  );
  res.json({ templates: counts });
});
var templates_default = router4;

// server/routes/search.ts
import { Router as Router5 } from "express";
init_schema();
init_schema();
var router5 = Router5();
router5.post("/", requireAuth, async (req, res) => {
  const userId = req.userId;
  const parsed = searchRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid filters" });
    return;
  }
  const user = await getUserById(userId);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const tpl = parsed.data.template ? getTemplateById(parsed.data.template) : void 0;
  const sectors = parsed.data.filters?.sectors ?? user.sectors;
  const regions = parsed.data.filters?.regions ?? user.regions;
  const fundingStages2 = parsed.data.filters?.fundingStages ?? tpl?.filters.fundingStages;
  const matches = await searchCompanies({
    sectors,
    regions,
    fundingStages: fundingStages2,
    excludeUnlockedByUserId: userId
  });
  let freebieCompanyId = null;
  for (const m of matches) {
    const already = await isUnlocked(userId, m.company.id);
    if (!already) {
      freebieCompanyId = m.company.id;
      break;
    }
  }
  const [search] = await db.insert(searches).values({
    userId,
    templateUsed: parsed.data.template ?? null,
    filters: parsed.data.filters ?? {},
    resultCount: matches.length,
    freebieCompanyId
  }).returning();
  if (!search) {
    res.status(500).json({ error: "Failed to create search" });
    return;
  }
  if (matches.length > 0) {
    await db.insert(searchResults).values(
      matches.map((m, i) => ({
        searchId: search.id,
        companyId: m.company.id,
        rank: i + 1,
        scoreSnapshot: m.score.score,
        flagsSnapshot: m.score.flags
      }))
    );
  }
  if (freebieCompanyId) {
    await unlockAsFreebie(userId, freebieCompanyId);
  }
  const freebieMatch = matches.find((m) => m.company.id === freebieCompanyId);
  const teasers = matches.filter((m) => m.company.id !== freebieCompanyId).slice(0, 12).map((m) => ({
    id: m.company.id,
    score: m.score.score,
    sector: m.company.sector,
    city: m.company.city,
    employeeCountRange: bucketEmployees(m.company.employeeCount),
    partialFlag: m.score.flags[0]?.label ?? "Postes ouverts",
    maskedInitial: m.company.name.charAt(0).toUpperCase(),
    maskedLength: m.company.name.length
  }));
  res.json({
    searchId: search.id,
    totalCount: matches.length,
    template: tpl?.title ?? "Custom",
    perimeterLabel: `${sectors.slice(0, 2).join(" / ")} / ${regions[0] ?? "France"}`,
    freebie: freebieMatch ? {
      id: freebieMatch.company.id,
      name: freebieMatch.company.name,
      slug: freebieMatch.company.slug,
      sector: freebieMatch.company.sector,
      city: freebieMatch.company.city,
      size: bucketEmployees(freebieMatch.company.employeeCount),
      score: freebieMatch.score.score,
      flags: freebieMatch.score.flags.map((f) => f.label)
    } : null,
    teasers
  });
});
function bucketEmployees(n) {
  if (n == null) return "Inconnu";
  if (n < 50) return "1-50";
  if (n < 200) return "50-200";
  if (n < 1e3) return "200-1000";
  return "1000+";
}
var search_default = router5;

// server/routes/companies.ts
import { Router as Router6 } from "express";
var router6 = Router6();
router6.get("/:id", requireAuth, async (req, res) => {
  const userId = req.userId;
  const companyId = req.params["id"];
  if (typeof companyId !== "string" || !companyId) {
    res.status(400).json({ error: "id required" });
    return;
  }
  const unlock = await isUnlocked(userId, companyId);
  if (!unlock) {
    res.status(403).json({ error: "LOCKED", message: "D\xE9bloque cette fiche pour 1 credit." });
    return;
  }
  const [company, jobs2, score, decisionMakers2, recommendation, mandate, timeline] = await Promise.all([
    getCompanyById(companyId),
    getActiveJobsForCompany(companyId),
    getScoreForCompany(companyId),
    getDecisionMakersForCompany(companyId),
    getRecommendationForCompany(companyId),
    getMandateForCompany(companyId),
    getTimelineForCompany(companyId)
  ]);
  if (!company) {
    res.status(404).json({ error: "Company not found" });
    return;
  }
  res.json({
    company,
    jobs: jobs2,
    score,
    decisionMakers: decisionMakers2,
    recommendation,
    mandate,
    timeline,
    unlockedVia: unlock.unlockedVia,
    markedAsContacted: unlock.markedAsContacted
  });
});
router6.post("/:id/unlock", requireAuth, async (req, res) => {
  const userId = req.userId;
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
router6.post("/:id/mark-contacted", requireAuth, async (req, res) => {
  const userId = req.userId;
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
var companies_default = router6;

// server/routes/credits.ts
init_schema();
import { Router as Router7 } from "express";
import Stripe from "stripe";

// server/lib/credit-packs.ts
var CREDIT_PACKS = [
  {
    id: "decouverte",
    name: "D\xE9couverte",
    credits: 30,
    priceEur: 29,
    perCreditEur: 0.97,
    tag: "Beta",
    tagTone: "sand",
    desc: "Pour tester l'outil sur une vague de prospection.",
    envKey: "STRIPE_PRICE_DECOUVERTE"
  },
  {
    id: "pro",
    name: "Pro",
    credits: 100,
    priceEur: 79,
    perCreditEur: 0.79,
    tag: "Recommand\xE9",
    tagTone: "sage",
    desc: "Le rythme d'un consultant qui d\xE9bloque 4-5 fiches par semaine.",
    envKey: "STRIPE_PRICE_PRO"
  },
  {
    id: "cabinet",
    name: "Cabinet",
    credits: 500,
    priceEur: 299,
    perCreditEur: 0.6,
    tag: "Volume",
    tagTone: "sand",
    desc: "Mutualis\xE9 pour une \xE9quipe de 3 \xE0 6 consultants.",
    envKey: "STRIPE_PRICE_CABINET"
  }
];
function getPackById(id) {
  return CREDIT_PACKS.find((p) => p.id === id);
}

// server/routes/credits.ts
var router7 = Router7();
var cachedStripe = null;
function getStripe() {
  if (cachedStripe) return cachedStripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  cachedStripe = new Stripe(key, { apiVersion: "2025-02-24.acacia" });
  return cachedStripe;
}
var APP_URL2 = process.env.APP_URL ?? "https://signals.sparkway.work";
router7.get("/packs", async (_req, res) => {
  res.json({
    packs: CREDIT_PACKS.map(({ envKey: _envKey, ...rest }) => rest)
  });
});
router7.post("/checkout", requireAuth, async (req, res) => {
  const userId = req.userId;
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
      success_url: `${APP_URL2}/profil?payment=success`,
      cancel_url: `${APP_URL2}/profil?payment=cancel`,
      customer_email: user.email,
      metadata: { userId, pack: pack.id }
    });
    res.json({ checkoutUrl: session.url });
  } catch (err) {
    console.error("[checkout] error:", err);
    res.status(500).json({ error: "Stripe error" });
  }
});
var credits_default = router7;

// server/routes/stripe-webhook.ts
import { Router as Router8 } from "express";
import Stripe2 from "stripe";
import { eq as eq5, sql as sql4 } from "drizzle-orm";
init_schema();
var router8 = Router8();
var cachedStripe2 = null;
function getStripe2() {
  if (cachedStripe2) return cachedStripe2;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  cachedStripe2 = new Stripe2(key, { apiVersion: "2025-02-24.acacia" });
  return cachedStripe2;
}
router8.post("/", async (req, res) => {
  const stripe = getStripe2();
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
  const rawBody = req.body;
  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error("[stripe-webhook] signature verification failed:", err);
    res.status(400).json({ error: "Invalid signature" });
    return;
  }
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const userId = session.metadata?.["userId"];
    const packId = session.metadata?.["pack"];
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
    const existing = await db.select().from(creditTransactions).where(eq5(creditTransactions.stripeSessionId, sessionId)).limit(1);
    if (existing.length > 0) {
      console.log("[stripe-webhook] already processed", sessionId);
      res.json({ received: true, idempotent: true });
      return;
    }
    const [updated] = await db.update(users).set({ creditsBalance: sql4`${users.creditsBalance} + ${pack.credits}` }).where(eq5(users.id, userId)).returning({ balance: users.creditsBalance });
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
      description: `Achat ${pack.name}`
    });
    console.log("[stripe-webhook] credited", { userId, pack: packId, balance: updated.balance });
  }
  res.json({ received: true });
});
var stripe_webhook_default = router8;

// server/routes/cron.ts
import { Router as Router9 } from "express";
import crypto3 from "node:crypto";

// server/lib/data-sources/ingest.ts
import { eq as eq6, and as and4 } from "drizzle-orm";
init_schema();

// server/lib/data-sources/adzuna.ts
var BASE = "https://api.adzuna.com/v1/api/jobs/fr";
var TECH_KEYWORDS = [
  // Sales
  "Account Executive",
  "Sales Manager",
  "Head of Sales",
  "VP Sales",
  "SDR",
  "BDR",
  "Customer Success",
  "Sales Engineer",
  // Marketing
  "Growth Manager",
  "Head of Marketing",
  "CMO",
  "Product Marketing",
  // Tech
  "Software Engineer",
  "Engineering Manager",
  "VP Engineering",
  "CTO",
  "DevOps",
  "Data Engineer",
  "Machine Learning",
  // Product
  "Product Manager",
  "Head of Product",
  "VP Product",
  "Product Designer"
];
function getCreds() {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) return null;
  return { appId, appKey };
}
async function fetchAdzunaTechJobs(maxPagesPerKeyword = 1) {
  const creds = getCreds();
  if (!creds) {
    console.warn("[adzuna] credentials missing \u2014 skip");
    return [];
  }
  const seen = /* @__PURE__ */ new Set();
  const all = [];
  for (const keyword of TECH_KEYWORDS) {
    for (let page = 1; page <= maxPagesPerKeyword; page++) {
      const url = `${BASE}/search/${page}?app_id=${encodeURIComponent(creds.appId)}&app_key=${encodeURIComponent(creds.appKey)}&results_per_page=50&what=${encodeURIComponent(keyword)}&content-type=application/json`;
      try {
        const res = await fetch(url);
        if (!res.ok) {
          console.warn(`[adzuna] ${keyword} p${page} \u2192 ${res.status}`);
          continue;
        }
        const data = await res.json();
        for (const job of data.results) {
          if (!seen.has(job.id)) {
            seen.add(job.id);
            all.push(job);
          }
        }
      } catch (err) {
        console.error(`[adzuna] ${keyword} p${page} fetch failed:`, err);
      }
    }
  }
  console.log(`[adzuna] fetched ${all.length} unique jobs across ${TECH_KEYWORDS.length} keywords`);
  return all;
}
function normalizeFunction(title) {
  const t = title.toLowerCase();
  if (/account executive|\bae\b/.test(t)) return "account_executive";
  if (/\bsdr\b|\bbdr\b|sales development|business development/.test(t)) return "sdr";
  if (/sales manager|head of sales|director.*sales/.test(t)) return "sales_manager";
  if (/vp sales|vp.*revenue|cro\b/.test(t)) return "sales_manager";
  if (/sales engineer/.test(t)) return "sales_engineer";
  if (/customer success|csm\b/.test(t)) return "customer_success";
  if (/growth|demand gen|brand|content marketing/.test(t)) return "marketing";
  if (/product marketing|pmm\b/.test(t)) return "product_marketing";
  if (/cmo|head of marketing|vp marketing/.test(t)) return "marketing";
  if (/data engineer|data scientist|machine learning|\bml\b/.test(t)) return "data_engineer";
  if (/devops|sre\b|reliability|infrastructure/.test(t)) return "devops";
  if (/software engineer|developer|frontend|backend|fullstack|full-stack/.test(t)) return "software_engineer";
  if (/engineering manager|head of engineering|vp engineering|\bcto\b/.test(t)) return "engineering_manager";
  if (/product manager|\bpm\b(?!\w)/.test(t)) return "product_manager";
  if (/head of product|vp product|chief product/.test(t)) return "product_manager";
  if (/product designer|ux designer|ui designer/.test(t)) return "product_design";
  return "other";
}
function normalizeLevel(title) {
  const t = title.toLowerCase();
  if (/\bvp\b|vice president|chief|cro|cto|cmo|cpo/.test(t)) return "vp";
  if (/head of|director|leader/.test(t)) return "head";
  if (/senior|lead|principal/.test(t)) return "senior";
  if (/junior|entry|graduate|stagiaire/.test(t)) return "junior";
  return "mid";
}

// server/lib/data-sources/france-travail.ts
var TOKEN_URL = "https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=%2Fpartenaire";
var SEARCH_URL = "https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search";
var ROME_CODES = ["M1704", "M1707", "D1402", "D1407", "M1805", "M1806", "M1810", "M1402", "M1701"];
var cachedToken = null;
function getCreds2() {
  const id = process.env.FRANCE_TRAVAIL_CLIENT_ID;
  const secret = process.env.FRANCE_TRAVAIL_CLIENT_SECRET;
  if (!id || !secret) return null;
  return { id, secret };
}
async function getToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 6e4) {
    return cachedToken.token;
  }
  const creds = getCreds2();
  if (!creds) return null;
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: creds.id,
    client_secret: creds.secret,
    scope: "api_offresdemploiv2 o2dsoffre"
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString()
  });
  if (!res.ok) {
    console.error("[ft] token failed:", res.status, await res.text());
    return null;
  }
  const data = await res.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1e3
  };
  return data.access_token;
}
async function fetchFranceTravailJobs(maxPerCode = 100) {
  const token = await getToken();
  if (!token) {
    console.warn("[ft] no token \u2014 skip");
    return [];
  }
  const seen = /* @__PURE__ */ new Set();
  const all = [];
  for (const code of ROME_CODES) {
    const url = `${SEARCH_URL}?codeROME=${code}&range=0-${maxPerCode - 1}`;
    try {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        console.warn(`[ft] ${code} \u2192 ${res.status}`);
        await new Promise((r) => setTimeout(r, 1100));
        continue;
      }
      const data = await res.json();
      for (const job of data.resultats ?? []) {
        if (!seen.has(job.id)) {
          seen.add(job.id);
          all.push(job);
        }
      }
      await new Promise((r) => setTimeout(r, 1100));
    } catch (err) {
      console.error(`[ft] ${code} failed:`, err);
    }
  }
  console.log(`[ft] fetched ${all.length} unique jobs across ${ROME_CODES.length} ROME codes`);
  return all;
}

// server/lib/data-sources/ingest.ts
function slugify(s) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}
async function findOrCreateCompany(name, city) {
  const slug = slugify(name);
  const [existing] = await db.select({ id: companies.id }).from(companies).where(eq6(companies.slug, slug)).limit(1);
  if (existing) return existing.id;
  const [row] = await db.insert(companies).values({ name, slug, city, dataSourcesUsed: [] }).onConflictDoNothing().returning({ id: companies.id });
  if (row) return row.id;
  const [retry] = await db.select({ id: companies.id }).from(companies).where(eq6(companies.slug, slug)).limit(1);
  if (!retry) throw new Error(`Failed to find/create company ${name}`);
  return retry.id;
}
async function ingestAll() {
  const stats = { added: 0, republished: 0, errors: 0 };
  try {
    const adzunaJobs = await fetchAdzunaTechJobs(1);
    for (const aj of adzunaJobs) {
      try {
        const companyName = aj.company.display_name?.trim();
        if (!companyName) continue;
        const city = aj.location?.area?.[2] ?? aj.location?.display_name ?? null;
        const companyId = await findOrCreateCompany(companyName, city);
        const publishedAt = new Date(aj.created);
        const [existing] = await db.select().from(jobs).where(and4(eq6(jobs.source, "adzuna"), eq6(jobs.externalId, aj.id))).limit(1);
        if (existing) {
          if (publishedAt.getTime() > new Date(existing.publishedAt).getTime()) {
            await db.update(jobs).set({ publishedAt, republicationCount: existing.republicationCount + 1, closedAt: null }).where(eq6(jobs.id, existing.id));
            await db.insert(companyTimelineEvents).values({
              companyId,
              eventDate: publishedAt.toISOString().slice(0, 10),
              eventType: "job_republished",
              description: aj.title
            });
            stats.republished++;
          }
        } else {
          await db.insert(jobs).values({
            companyId,
            externalId: aj.id,
            source: "adzuna",
            title: aj.title,
            function: normalizeFunction(aj.title),
            level: normalizeLevel(aj.title),
            city,
            publishedAt,
            url: aj.redirect_url,
            rawData: aj
          });
          await db.insert(companyTimelineEvents).values({
            companyId,
            eventDate: publishedAt.toISOString().slice(0, 10),
            eventType: "job_published",
            description: aj.title
          });
          stats.added++;
        }
      } catch (err) {
        console.error("[ingest/adzuna] item failed:", err);
        stats.errors++;
      }
    }
  } catch (err) {
    console.error("[ingest/adzuna] global failed:", err);
  }
  try {
    const ftJobs = await fetchFranceTravailJobs(50);
    for (const fj of ftJobs) {
      try {
        const companyName = fj.entreprise?.nom?.trim();
        if (!companyName) continue;
        const city = fj.lieuTravail?.commune ?? fj.lieuTravail?.libelle ?? null;
        const companyId = await findOrCreateCompany(companyName, city);
        const publishedAt = new Date(fj.dateCreation);
        const [existing] = await db.select().from(jobs).where(and4(eq6(jobs.source, "france_travail"), eq6(jobs.externalId, fj.id))).limit(1);
        if (existing) {
          if (publishedAt.getTime() > new Date(existing.publishedAt).getTime()) {
            await db.update(jobs).set({ publishedAt, republicationCount: existing.republicationCount + 1, closedAt: null }).where(eq6(jobs.id, existing.id));
            stats.republished++;
          }
        } else {
          await db.insert(jobs).values({
            companyId,
            externalId: fj.id,
            source: "france_travail",
            title: fj.intitule,
            function: normalizeFunction(fj.intitule),
            level: normalizeLevel(fj.intitule),
            city,
            publishedAt,
            url: fj.origineOffre?.urlOrigine ?? `https://candidat.francetravail.fr/offres/recherche/detail/${fj.id}`,
            rawData: fj
          });
          stats.added++;
        }
      } catch (err) {
        console.error("[ingest/ft] item failed:", err);
        stats.errors++;
      }
    }
  } catch (err) {
    console.error("[ingest/ft] global failed:", err);
  }
  return stats;
}
async function recomputeAllScores() {
  const { computeScore: computeScore2, computeFlags: computeFlags2 } = await Promise.resolve().then(() => (init_scoring(), scoring_exports));
  const { companyScores: companyScores2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
  const allCompanies = await db.select({ id: companies.id, fundingStage: companies.fundingStage, lastFundingDate: companies.lastFundingDate }).from(companies);
  let scored = 0;
  for (const c of allCompanies) {
    const cJobs = await db.select().from(jobs).where(eq6(jobs.companyId, c.id));
    if (cJobs.length === 0) continue;
    const fundingMonths = c.lastFundingDate ? Math.floor((Date.now() - new Date(c.lastFundingDate).getTime()) / (30 * 864e5)) : null;
    const scores = computeScore2({ jobs: cJobs, fundingRecentMonths: fundingMonths });
    const flags = computeFlags2({
      scores,
      jobs: cJobs,
      fundingRecentMonths: fundingMonths,
      fundingStage: c.fundingStage
    });
    await db.insert(companyScores2).values({
      companyId: c.id,
      score: scores.score,
      scoreVolume: scores.scoreVolume,
      scorePersistance: scores.scorePersistance,
      scoreRepublication: scores.scoreRepublication,
      scoreCroissanceSales: scores.scoreCroissanceSales,
      flags
    }).onConflictDoUpdate({
      target: companyScores2.companyId,
      set: {
        score: scores.score,
        scoreVolume: scores.scoreVolume,
        scorePersistance: scores.scorePersistance,
        scoreRepublication: scores.scoreRepublication,
        scoreCroissanceSales: scores.scoreCroissanceSales,
        flags,
        computedAt: /* @__PURE__ */ new Date()
      }
    });
    scored++;
  }
  return { scored };
}

// server/routes/cron.ts
var router9 = Router9();
function authorize(req, res) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    res.status(503).json({ error: "CRON_SECRET not configured" });
    return false;
  }
  const provided = req.header("x-cron-secret") || (req.header("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!provided) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto3.timingSafeEqual(a, b)) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}
router9.get("/ingest-jobs", async (req, res) => {
  if (!authorize(req, res)) return;
  try {
    const stats = await ingestAll();
    res.json({ ok: true, ...stats });
  } catch (err) {
    console.error("[cron/ingest] failed:", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed" });
  }
});
router9.get("/recompute-scores", async (req, res) => {
  if (!authorize(req, res)) return;
  try {
    const stats = await recomputeAllScores();
    res.json({ ok: true, ...stats });
  } catch (err) {
    console.error("[cron/recompute] failed:", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed" });
  }
});
var cron_default = router9;

// server/lib/migrations.ts
import { sql as sql5 } from "drizzle-orm";
var CURRENT_SCHEMA_VERSION = 2;
var migrationsRan = false;
async function runStartupMigrations() {
  if (migrationsRan) return;
  migrationsRan = true;
  const t0 = Date.now();
  const log = (step) => console.log(`[startup-migrations] ${step} (+${Date.now() - t0}ms)`);
  log("start");
  await db.execute(sql5`
    CREATE TABLE IF NOT EXISTS "schema_version" (
      "id" integer PRIMARY KEY,
      "version" integer NOT NULL DEFAULT 0,
      "updated_at" timestamp NOT NULL DEFAULT now()
    )
  `);
  log("schema_version table OK");
  await db.execute(sql5`INSERT INTO "schema_version" ("id", "version") VALUES (1, 0) ON CONFLICT ("id") DO NOTHING`);
  const versionRows = await db.execute(
    sql5`SELECT version FROM "schema_version" WHERE id = 1`
  );
  const currentVersion = versionRows.rows?.[0]?.version ?? 0;
  log(`currentVersion = ${currentVersion}, target = ${CURRENT_SCHEMA_VERSION}`);
  if (currentVersion >= CURRENT_SCHEMA_VERSION) {
    log("up-to-date, skipping");
    return;
  }
  console.log(`[startup-migrations] Schema v${currentVersion} \u2192 v${CURRENT_SCHEMA_VERSION}, running migrations...`);
  await db.execute(sql5`
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
  await db.execute(sql5`
    CREATE TABLE IF NOT EXISTS "magic_link_tokens" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "token_hash" text NOT NULL UNIQUE,
      "expires_at" timestamptz NOT NULL,
      "used_at" timestamptz,
      "created_at" timestamptz NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql5`CREATE INDEX IF NOT EXISTS "magic_link_tokens_user_id_idx" ON "magic_link_tokens" ("user_id")`);
  await db.execute(sql5`
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
  await db.execute(sql5`CREATE INDEX IF NOT EXISTS "credit_transactions_user_id_idx" ON "credit_transactions" ("user_id", "created_at" DESC)`);
  log("0001 done");
  await db.execute(sql5`
    CREATE TABLE IF NOT EXISTS "companies" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "name" text NOT NULL,
      "slug" text NOT NULL UNIQUE,
      "website_url" text,
      "city" text,
      "region" text,
      "sector" text,
      "sector_precise" text,
      "employee_count" integer,
      "funding_stage" text,
      "last_funding_amount" integer,
      "last_funding_date" date,
      "ceo_name" text,
      "ceo_linkedin_url" text,
      "pappers_id" text,
      "first_seen_at" timestamptz NOT NULL DEFAULT now(),
      "last_updated_at" timestamptz NOT NULL DEFAULT now(),
      "data_sources_used" jsonb NOT NULL DEFAULT '[]'::jsonb
    )
  `);
  await db.execute(sql5`CREATE INDEX IF NOT EXISTS "companies_slug_idx" ON "companies" ("slug")`);
  await db.execute(sql5`CREATE INDEX IF NOT EXISTS "companies_sector_idx" ON "companies" ("sector")`);
  await db.execute(sql5`
    CREATE TABLE IF NOT EXISTS "jobs" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
      "external_id" text NOT NULL,
      "source" text NOT NULL,
      "title" text NOT NULL,
      "function" text,
      "level" text,
      "city" text,
      "published_at" timestamptz NOT NULL,
      "closed_at" timestamptz,
      "republication_count" integer NOT NULL DEFAULT 0,
      "url" text NOT NULL,
      "raw_data" jsonb,
      CONSTRAINT "jobs_source_external_uniq" UNIQUE ("source", "external_id")
    )
  `);
  await db.execute(sql5`CREATE INDEX IF NOT EXISTS "jobs_company_id_idx" ON "jobs" ("company_id")`);
  await db.execute(sql5`CREATE INDEX IF NOT EXISTS "jobs_published_at_idx" ON "jobs" ("published_at" DESC)`);
  await db.execute(sql5`
    CREATE TABLE IF NOT EXISTS "company_scores" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "company_id" uuid NOT NULL UNIQUE REFERENCES "companies"("id") ON DELETE CASCADE,
      "score" integer NOT NULL,
      "score_volume" integer NOT NULL,
      "score_persistance" integer NOT NULL,
      "score_republication" integer NOT NULL,
      "score_croissance_sales" integer NOT NULL,
      "flags" jsonb NOT NULL DEFAULT '[]'::jsonb,
      "computed_at" timestamptz NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql5`CREATE INDEX IF NOT EXISTS "company_scores_score_idx" ON "company_scores" ("score" DESC)`);
  await db.execute(sql5`
    CREATE TABLE IF NOT EXISTS "decision_makers" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
      "full_name" text NOT NULL,
      "role" text NOT NULL,
      "title_exact" text NOT NULL,
      "linkedin_url" text,
      "started_at" date,
      "is_recent" boolean NOT NULL DEFAULT false,
      "source" text NOT NULL,
      "angle_approach" text,
      "angle_generated_at" timestamptz
    )
  `);
  await db.execute(sql5`CREATE INDEX IF NOT EXISTS "decision_makers_company_id_idx" ON "decision_makers" ("company_id")`);
  await db.execute(sql5`
    CREATE TABLE IF NOT EXISTS "company_recommendations" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "company_id" uuid NOT NULL UNIQUE REFERENCES "companies"("id") ON DELETE CASCADE,
      "recommendation" text NOT NULL,
      "generated_at" timestamptz NOT NULL DEFAULT now(),
      "model_used" text NOT NULL
    )
  `);
  await db.execute(sql5`
    CREATE TABLE IF NOT EXISTS "mandate_estimates" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "company_id" uuid NOT NULL UNIQUE REFERENCES "companies"("id") ON DELETE CASCADE,
      "estimate_min" integer NOT NULL,
      "estimate_max" integer NOT NULL,
      "breakdown_json" jsonb NOT NULL DEFAULT '[]'::jsonb,
      "computed_at" timestamptz NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql5`
    CREATE TABLE IF NOT EXISTS "company_timeline_events" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
      "event_date" date NOT NULL,
      "event_type" text NOT NULL,
      "description" text NOT NULL,
      "metadata" jsonb,
      "sort_order" integer NOT NULL DEFAULT 0
    )
  `);
  await db.execute(sql5`CREATE INDEX IF NOT EXISTS "timeline_company_id_idx" ON "company_timeline_events" ("company_id", "event_date" DESC)`);
  await db.execute(sql5`
    CREATE TABLE IF NOT EXISTS "searches" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "template_used" text,
      "filters" jsonb NOT NULL DEFAULT '{}'::jsonb,
      "result_count" integer NOT NULL DEFAULT 0,
      "freebie_company_id" uuid,
      "created_at" timestamptz NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql5`CREATE INDEX IF NOT EXISTS "searches_user_id_idx" ON "searches" ("user_id", "created_at" DESC)`);
  await db.execute(sql5`
    CREATE TABLE IF NOT EXISTS "search_results" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "search_id" uuid NOT NULL REFERENCES "searches"("id") ON DELETE CASCADE,
      "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
      "rank" integer NOT NULL,
      "score_snapshot" integer NOT NULL,
      "flags_snapshot" jsonb
    )
  `);
  await db.execute(sql5`CREATE INDEX IF NOT EXISTS "search_results_search_id_idx" ON "search_results" ("search_id", "rank")`);
  await db.execute(sql5`
    CREATE TABLE IF NOT EXISTS "unlocked_companies" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
      "unlocked_via" text NOT NULL,
      "credits_cost" integer NOT NULL,
      "unlocked_at" timestamptz NOT NULL DEFAULT now(),
      "marked_as_contacted" boolean NOT NULL DEFAULT false,
      "marked_as_contacted_at" timestamptz,
      CONSTRAINT "unlocked_user_company_uniq" UNIQUE ("user_id", "company_id")
    )
  `);
  await db.execute(sql5`CREATE INDEX IF NOT EXISTS "unlocked_user_idx" ON "unlocked_companies" ("user_id", "unlocked_at" DESC)`);
  log("0002 done");
  await db.execute(sql5`UPDATE "schema_version" SET version = ${CURRENT_SCHEMA_VERSION}, updated_at = NOW() WHERE id = 1`);
  console.log(`[startup-migrations] Completed v${CURRENT_SCHEMA_VERSION} in ${Date.now() - t0}ms`);
}

// server/index.ts
var app = express();
var PORT = Number(process.env.PORT ?? 3e3);
app.use("/api/stripe/webhook", express.raw({ type: "application/json" }), stripe_webhook_default);
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
app.use("/api/templates", templates_default);
app.use("/api/search", search_default);
app.use("/api/companies", companies_default);
app.use("/api/credits", credits_default);
app.use("/api/cron", cron_default);
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
