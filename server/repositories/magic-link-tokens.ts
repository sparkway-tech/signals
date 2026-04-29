import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@server/lib/db";
import { magicLinkTokens, type MagicLinkToken } from "@shared/schema";

const TOKEN_TTL_MINUTES = 15;

export async function createToken(userId: string, tokenHash: string): Promise<MagicLinkToken> {
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000);
  const [row] = await db.insert(magicLinkTokens).values({ userId, tokenHash, expiresAt }).returning();
  if (!row) throw new Error("Failed to create magic link token");
  return row;
}

export async function findValidTokenByHash(tokenHash: string): Promise<MagicLinkToken | null> {
  const [row] = await db
    .select()
    .from(magicLinkTokens)
    .where(
      and(
        eq(magicLinkTokens.tokenHash, tokenHash),
        gt(magicLinkTokens.expiresAt, new Date()),
        isNull(magicLinkTokens.usedAt),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function markTokenUsed(id: string): Promise<void> {
  await db.update(magicLinkTokens).set({ usedAt: new Date() }).where(eq(magicLinkTokens.id, id));
}
