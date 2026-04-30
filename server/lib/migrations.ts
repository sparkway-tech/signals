import { sql } from "drizzle-orm";
import { db } from "./db";

/**
 * Migrations idempotentes au boot.
 *
 * Pattern hérité de Sparkway ATS (Huntr) — fiable sur Vercel serverless :
 * - Toutes les statements sont CREATE TABLE IF NOT EXISTS / ALTER TABLE
 *   ADD COLUMN IF NOT EXISTS, donc safe à re-jouer.
 * - Schema version gate : on bump CURRENT_SCHEMA_VERSION à chaque ajout
 *   pour éviter de re-run à chaque cold start. Stocké dans schema_version.
 *
 * Pour ajouter une migration : append du SQL en bas, bump
 * CURRENT_SCHEMA_VERSION. Le prochain cold start re-jouera tout (idempotent).
 */

const CURRENT_SCHEMA_VERSION = 2;

let migrationsRan = false;

export async function runStartupMigrations(): Promise<void> {
  if (migrationsRan) return;
  migrationsRan = true;

  const t0 = Date.now();
  const log = (step: string) => console.log(`[startup-migrations] ${step} (+${Date.now() - t0}ms)`);
  log("start");

  // ─── Schema version gate ───────────────────────────────────────────────
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "schema_version" (
      "id" integer PRIMARY KEY,
      "version" integer NOT NULL DEFAULT 0,
      "updated_at" timestamp NOT NULL DEFAULT now()
    )
  `);
  log("schema_version table OK");
  await db.execute(sql`INSERT INTO "schema_version" ("id", "version") VALUES (1, 0) ON CONFLICT ("id") DO NOTHING`);
  const versionRows = await db.execute<{ version: number }>(
    sql`SELECT version FROM "schema_version" WHERE id = 1`,
  );
  const currentVersion = (versionRows as { rows?: { version: number }[] }).rows?.[0]?.version ?? 0;
  log(`currentVersion = ${currentVersion}, target = ${CURRENT_SCHEMA_VERSION}`);

  if (currentVersion >= CURRENT_SCHEMA_VERSION) {
    log("up-to-date, skipping");
    return;
  }

  console.log(`[startup-migrations] Schema v${currentVersion} → v${CURRENT_SCHEMA_VERSION}, running migrations...`);

  // ─── 0001 — Foundation (semaine 1) ─────────────────────────────────────
  // users
  await db.execute(sql`
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

  // magic_link_tokens
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "magic_link_tokens" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "token_hash" text NOT NULL UNIQUE,
      "expires_at" timestamptz NOT NULL,
      "used_at" timestamptz,
      "created_at" timestamptz NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "magic_link_tokens_user_id_idx" ON "magic_link_tokens" ("user_id")`);

  // credit_transactions
  await db.execute(sql`
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
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "credit_transactions_user_id_idx" ON "credit_transactions" ("user_id", "created_at" DESC)`);
  log("0001 done");

  // ─── 0002 — Tables produit (semaines 2-3) ────────────────────────────
  await db.execute(sql`
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
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "companies_slug_idx" ON "companies" ("slug")`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "companies_sector_idx" ON "companies" ("sector")`);

  await db.execute(sql`
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
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "jobs_company_id_idx" ON "jobs" ("company_id")`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "jobs_published_at_idx" ON "jobs" ("published_at" DESC)`);

  await db.execute(sql`
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
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "company_scores_score_idx" ON "company_scores" ("score" DESC)`);

  await db.execute(sql`
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
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "decision_makers_company_id_idx" ON "decision_makers" ("company_id")`);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "company_recommendations" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "company_id" uuid NOT NULL UNIQUE REFERENCES "companies"("id") ON DELETE CASCADE,
      "recommendation" text NOT NULL,
      "generated_at" timestamptz NOT NULL DEFAULT now(),
      "model_used" text NOT NULL
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "mandate_estimates" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "company_id" uuid NOT NULL UNIQUE REFERENCES "companies"("id") ON DELETE CASCADE,
      "estimate_min" integer NOT NULL,
      "estimate_max" integer NOT NULL,
      "breakdown_json" jsonb NOT NULL DEFAULT '[]'::jsonb,
      "computed_at" timestamptz NOT NULL DEFAULT now()
    )
  `);

  await db.execute(sql`
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
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "timeline_company_id_idx" ON "company_timeline_events" ("company_id", "event_date" DESC)`);

  await db.execute(sql`
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
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "searches_user_id_idx" ON "searches" ("user_id", "created_at" DESC)`);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "search_results" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "search_id" uuid NOT NULL REFERENCES "searches"("id") ON DELETE CASCADE,
      "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
      "rank" integer NOT NULL,
      "score_snapshot" integer NOT NULL,
      "flags_snapshot" jsonb
    )
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "search_results_search_id_idx" ON "search_results" ("search_id", "rank")`);

  await db.execute(sql`
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
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "unlocked_user_idx" ON "unlocked_companies" ("user_id", "unlocked_at" DESC)`);

  log("0002 done");

  // ─── Mark version as up-to-date ────────────────────────────────────────
  await db.execute(sql`UPDATE "schema_version" SET version = ${CURRENT_SCHEMA_VERSION}, updated_at = NOW() WHERE id = 1`);
  console.log(`[startup-migrations] Completed v${CURRENT_SCHEMA_VERSION} in ${Date.now() - t0}ms`);
}
