import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@server/lib/db";
import {
  unlockedCompanies,
  creditTransactions,
  users,
  companies,
  companyScores,
  type UnlockedCompany,
} from "@shared/schema";

export async function isUnlocked(userId: string, companyId: string): Promise<UnlockedCompany | null> {
  const [row] = await db
    .select()
    .from(unlockedCompanies)
    .where(and(eq(unlockedCompanies.userId, userId), eq(unlockedCompanies.companyId, companyId)))
    .limit(1);
  return row ?? null;
}

export async function unlockAsFreebie(userId: string, companyId: string): Promise<UnlockedCompany> {
  const [row] = await db
    .insert(unlockedCompanies)
    .values({ userId, companyId, unlockedVia: "freebie", creditsCost: 0 })
    .onConflictDoNothing()
    .returning();
  if (!row) {
    const existing = await isUnlocked(userId, companyId);
    if (!existing) throw new Error("Unlock failed");
    return existing;
  }
  return row;
}

/**
 * Unlock avec credit : décrément atomique + insert unlock + log transaction.
 * Throw "INSUFFICIENT_CREDITS" si solde < 1.
 */
export async function unlockWithCredit(
  userId: string,
  companyId: string,
): Promise<{ unlock: UnlockedCompany; balanceAfter: number }> {
  const updated = await db
    .update(users)
    .set({ creditsBalance: sql`${users.creditsBalance} - 1` })
    .where(and(eq(users.id, userId), gte(users.creditsBalance, 1)))
    .returning({ creditsBalance: users.creditsBalance });

  if (updated.length === 0) {
    throw new Error("INSUFFICIENT_CREDITS");
  }

  const balanceAfter = updated[0]?.creditsBalance ?? 0;

  const [unlock] = await db
    .insert(unlockedCompanies)
    .values({ userId, companyId, unlockedVia: "credit", creditsCost: 1 })
    .onConflictDoNothing()
    .returning();

  if (!unlock) {
    // Compensate : already unlocked, refund the credit
    await db
      .update(users)
      .set({ creditsBalance: sql`${users.creditsBalance} + 1` })
      .where(eq(users.id, userId));
    throw new Error("ALREADY_UNLOCKED");
  }

  await db.insert(creditTransactions).values({
    userId,
    type: "spend",
    amount: -1,
    balanceAfter,
    unlockedCompanyId: unlock.id,
    description: "Unlock company",
  });

  return { unlock, balanceAfter };
}

export async function listUnlockedByUser(userId: string, limit = 20) {
  return db
    .select({
      unlock: unlockedCompanies,
      companyName: companies.name,
      companyId: companies.id,
      score: companyScores.score,
    })
    .from(unlockedCompanies)
    .innerJoin(companies, eq(companies.id, unlockedCompanies.companyId))
    .leftJoin(companyScores, eq(companyScores.companyId, companies.id))
    .where(eq(unlockedCompanies.userId, userId))
    .orderBy(desc(unlockedCompanies.unlockedAt))
    .limit(limit);
}

export async function markContacted(userId: string, companyId: string): Promise<UnlockedCompany | null> {
  const [row] = await db
    .update(unlockedCompanies)
    .set({ markedAsContacted: true, markedAsContactedAt: new Date() })
    .where(and(eq(unlockedCompanies.userId, userId), eq(unlockedCompanies.companyId, companyId)))
    .returning();
  return row ?? null;
}

export async function listTransactions(userId: string, limit = 10) {
  return db
    .select()
    .from(creditTransactions)
    .where(eq(creditTransactions.userId, userId))
    .orderBy(desc(creditTransactions.createdAt))
    .limit(limit);
}
