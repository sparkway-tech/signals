import { pgTable, uuid, text, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
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
