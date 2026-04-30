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

const CURRENT_SCHEMA_VERSION = 1;

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

  // ─── Mark version as up-to-date ────────────────────────────────────────
  await db.execute(sql`UPDATE "schema_version" SET version = ${CURRENT_SCHEMA_VERSION}, updated_at = NOW() WHERE id = 1`);
  console.log(`[startup-migrations] Completed v${CURRENT_SCHEMA_VERSION} in ${Date.now() - t0}ms`);
}
