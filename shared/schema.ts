import { pgTable, uuid, text, timestamp, integer, boolean, jsonb, date, unique } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

/* ════════════════════════════════════════════════════════════════════════════
   Sparkway Signals — schéma DB (Drizzle)
   Source : SIGNALS_SPARKWAY.md §3
   Semaine 1 : users + magic_link_tokens + credit_transactions
   Semaine 2+ : companies, jobs, decision_makers, scores, etc.
   ════════════════════════════════════════════════════════════════════════════ */

// ── users ────────────────────────────────────────────────────────────────────
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  onboardingCompleted: boolean("onboarding_completed").notNull().default(false),
  // Périmètre (rempli à l'onboarding)
  sectors: jsonb("sectors").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  functions: jsonb("functions").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  regions: jsonb("regions").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  // Credits
  creditsBalance: integer("credits_balance").notNull().default(0),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

// ── magic_link_tokens ────────────────────────────────────────────────────────
export const magicLinkTokens = pgTable("magic_link_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  // tokenHash = SHA-256 du token clair envoyé par email (le clair n'est jamais persisté)
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type MagicLinkToken = typeof magicLinkTokens.$inferSelect;
export type NewMagicLinkToken = typeof magicLinkTokens.$inferInsert;

// ── credit_transactions ─────────────────────────────────────────────────────
export const creditTransactionTypes = ["purchase", "spend", "refund", "manual_adjust"] as const;
export type CreditTransactionType = (typeof creditTransactionTypes)[number];

export const creditPackTypes = ["decouverte", "pro", "cabinet"] as const;
export type CreditPackType = (typeof creditPackTypes)[number];

export const creditTransactions = pgTable("credit_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type").$type<CreditTransactionType>().notNull(),
  amount: integer("amount").notNull(), // positif pour purchase, négatif pour spend
  balanceAfter: integer("balance_after").notNull(),
  // Si purchase
  stripeSessionId: text("stripe_session_id").unique(),
  stripePaymentIntent: text("stripe_payment_intent"),
  packType: text("pack_type").$type<CreditPackType>(),
  amountEur: integer("amount_eur"), // en centimes
  // Si spend (FK vers unlocked_companies, ajouté semaine 3)
  unlockedCompanyId: uuid("unlocked_company_id"),
  // Métadonnées
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type CreditTransaction = typeof creditTransactions.$inferSelect;
export type NewCreditTransaction = typeof creditTransactions.$inferInsert;

// ── Schémas Zod (validation API) ─────────────────────────────────────────────
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);

/**
 * Schéma de validation onboarding (§4 endpoint POST /api/onboarding).
 * sectors max 3, functions max 5, regions min 1.
 */
export const onboardingSchema = z.object({
  sectors: z.array(z.string().min(1)).max(3),
  functions: z.array(z.string().min(1)).max(5),
  regions: z.array(z.string().min(1)).min(1),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;

/**
 * Schéma email pour POST /api/auth/magic-link.
 */
export const magicLinkRequestSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
});

export type MagicLinkRequest = z.infer<typeof magicLinkRequestSchema>;

/* ════════════════════════════════════════════════════════════════════════════
   Semaine 2-3 : tables produit (companies, jobs, scoring, AI, decisions)
   Source : SIGNALS_SPARKWAY.md §3
   ════════════════════════════════════════════════════════════════════════════ */

// ── companies ────────────────────────────────────────────────────────────────
export const fundingStages = ["bootstrap", "seed", "series_a", "series_b", "series_c", "late_stage", "public"] as const;
export type FundingStage = (typeof fundingStages)[number];

export const companies = pgTable("companies", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  websiteUrl: text("website_url"),
  city: text("city"),
  region: text("region"),
  sector: text("sector"),
  sectorPrecise: text("sector_precise"),
  employeeCount: integer("employee_count"),
  fundingStage: text("funding_stage").$type<FundingStage>(),
  lastFundingAmount: integer("last_funding_amount"), // milliers d'euros
  lastFundingDate: date("last_funding_date"),
  ceoName: text("ceo_name"),
  ceoLinkedinUrl: text("ceo_linkedin_url"),
  pappersId: text("pappers_id"),
  // métadonnées
  firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull().defaultNow(),
  lastUpdatedAt: timestamp("last_updated_at", { withTimezone: true }).notNull().defaultNow(),
  dataSourcesUsed: jsonb("data_sources_used").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
});
export type Company = typeof companies.$inferSelect;

// ── jobs ────────────────────────────────────────────────────────────────────
export const jobSources = ["adzuna", "france_travail", "manual", "seed"] as const;
export type JobSource = (typeof jobSources)[number];

export const jobLevels = ["junior", "mid", "senior", "head", "vp"] as const;
export type JobLevel = (typeof jobLevels)[number];

export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    externalId: text("external_id").notNull(),
    source: text("source").$type<JobSource>().notNull(),
    title: text("title").notNull(),
    function: text("function"), // 'account_executive' | 'sdr' | 'sales_manager' | 'engineer' | 'pm' | etc.
    level: text("level").$type<JobLevel>(),
    city: text("city"),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    republicationCount: integer("republication_count").notNull().default(0),
    url: text("url").notNull(),
    rawData: jsonb("raw_data"),
  },
  (t) => ({
    sourceExternal: unique("jobs_source_external_uniq").on(t.source, t.externalId),
  }),
);
export type Job = typeof jobs.$inferSelect;

// ── company_scores ──────────────────────────────────────────────────────────
export const companyScores = pgTable("company_scores", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id")
    .notNull()
    .unique()
    .references(() => companies.id, { onDelete: "cascade" }),
  score: integer("score").notNull(), // 0-100
  scoreVolume: integer("score_volume").notNull(),
  scorePersistance: integer("score_persistance").notNull(),
  scoreRepublication: integer("score_republication").notNull(),
  scoreCroissanceSales: integer("score_croissance_sales").notNull(),
  flags: jsonb("flags").$type<Array<{ type: string; label: string; severity: "low" | "med" | "high" }>>().notNull().default(sql`'[]'::jsonb`),
  computedAt: timestamp("computed_at", { withTimezone: true }).notNull().defaultNow(),
});
export type CompanyScore = typeof companyScores.$inferSelect;

// ── decision_makers ──────────────────────────────────────────────────────────
export const decisionMakerRoles = ["ceo", "vp_sales", "head_of_sales", "head_ta", "sales_manager", "cofounder", "cmo", "cto", "vp_eng", "vp_product", "head_product", "other"] as const;
export type DecisionMakerRole = (typeof decisionMakerRoles)[number];

export const decisionMakers = pgTable("decision_makers", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  fullName: text("full_name").notNull(),
  role: text("role").$type<DecisionMakerRole>().notNull(),
  titleExact: text("title_exact").notNull(),
  linkedinUrl: text("linkedin_url"),
  startedAt: date("started_at"),
  isRecent: boolean("is_recent").notNull().default(false),
  source: text("source").notNull(), // 'pappers' | 'linkedin_public' | 'manual'
  angleApproach: text("angle_approach"),
  angleGeneratedAt: timestamp("angle_generated_at", { withTimezone: true }),
});
export type DecisionMaker = typeof decisionMakers.$inferSelect;

// ── company_recommendations ─────────────────────────────────────────────────
export const companyRecommendations = pgTable("company_recommendations", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id")
    .notNull()
    .unique()
    .references(() => companies.id, { onDelete: "cascade" }),
  recommendation: text("recommendation").notNull(),
  generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
  modelUsed: text("model_used").notNull(),
});
export type CompanyRecommendation = typeof companyRecommendations.$inferSelect;

// ── mandate_estimates ───────────────────────────────────────────────────────
export const mandateEstimates = pgTable("mandate_estimates", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id")
    .notNull()
    .unique()
    .references(() => companies.id, { onDelete: "cascade" }),
  estimateMin: integer("estimate_min").notNull(), // milliers d'euros
  estimateMax: integer("estimate_max").notNull(),
  breakdownJson: jsonb("breakdown_json").$type<Array<{ role: string; salary: number; rate: number; mandate: number }>>().notNull().default(sql`'[]'::jsonb`),
  computedAt: timestamp("computed_at", { withTimezone: true }).notNull().defaultNow(),
});
export type MandateEstimate = typeof mandateEstimates.$inferSelect;

// ── company_timeline_events ─────────────────────────────────────────────────
export const timelineEventTypes = ["funding", "leadership_change", "job_published", "job_republished", "team_growth", "other"] as const;
export type TimelineEventType = (typeof timelineEventTypes)[number];

export const companyTimelineEvents = pgTable("company_timeline_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  eventDate: date("event_date").notNull(),
  eventType: text("event_type").$type<TimelineEventType>().notNull(),
  description: text("description").notNull(),
  metadata: jsonb("metadata"),
  sortOrder: integer("sort_order").notNull().default(0),
});
export type CompanyTimelineEvent = typeof companyTimelineEvents.$inferSelect;

// ── searches ────────────────────────────────────────────────────────────────
export const searchTemplates = ["scaleups_hypercroissance", "galere_recruter", "levees_recentes", "midmarket_ouverture", "custom"] as const;
export type SearchTemplate = (typeof searchTemplates)[number];

export const searches = pgTable("searches", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  templateUsed: text("template_used").$type<SearchTemplate>(),
  filters: jsonb("filters").notNull().default(sql`'{}'::jsonb`),
  resultCount: integer("result_count").notNull().default(0),
  freebieCompanyId: uuid("freebie_company_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
export type Search = typeof searches.$inferSelect;

// ── search_results ──────────────────────────────────────────────────────────
export const searchResults = pgTable("search_results", {
  id: uuid("id").primaryKey().defaultRandom(),
  searchId: uuid("search_id")
    .notNull()
    .references(() => searches.id, { onDelete: "cascade" }),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  rank: integer("rank").notNull(),
  scoreSnapshot: integer("score_snapshot").notNull(),
  flagsSnapshot: jsonb("flags_snapshot"),
});
export type SearchResult = typeof searchResults.$inferSelect;

// ── unlocked_companies ──────────────────────────────────────────────────────
export const unlockedVia = ["freebie", "credit", "manual_grant"] as const;
export type UnlockedVia = (typeof unlockedVia)[number];

export const unlockedCompanies = pgTable(
  "unlocked_companies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    unlockedVia: text("unlocked_via").$type<UnlockedVia>().notNull(),
    creditsCost: integer("credits_cost").notNull(),
    unlockedAt: timestamp("unlocked_at", { withTimezone: true }).notNull().defaultNow(),
    markedAsContacted: boolean("marked_as_contacted").notNull().default(false),
    markedAsContactedAt: timestamp("marked_as_contacted_at", { withTimezone: true }),
  },
  (t) => ({
    userCompanyUniq: unique("unlocked_user_company_uniq").on(t.userId, t.companyId),
  }),
);
export type UnlockedCompany = typeof unlockedCompanies.$inferSelect;

// ── Schémas Zod additionnels ────────────────────────────────────────────────
export const searchRequestSchema = z.object({
  template: z.enum(searchTemplates).optional(),
  filters: z.object({
    sectors: z.array(z.string()).optional(),
    sizes: z.array(z.string()).optional(),
    regions: z.array(z.string()).optional(),
    fundingStages: z.array(z.string()).optional(),
    minAgeDays: z.number().int().min(0).optional(),
  }).optional(),
});
export type SearchRequest = z.infer<typeof searchRequestSchema>;

export const checkoutRequestSchema = z.object({
  pack: z.enum(creditPackTypes),
});
export type CheckoutRequest = z.infer<typeof checkoutRequestSchema>;

export const perimeterUpdateSchema = onboardingSchema.partial();
