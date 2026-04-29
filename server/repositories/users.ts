import { eq } from "drizzle-orm";
import { db } from "@server/lib/db";
import { users, type User, type OnboardingInput } from "@shared/schema";

export async function getUserById(id: string): Promise<User | null> {
  const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return row ?? null;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const [row] = await db.select().from(users).where(eq(users.email, email.toLowerCase().trim())).limit(1);
  return row ?? null;
}

export async function createUser(email: string): Promise<User> {
  const [row] = await db
    .insert(users)
    .values({ email: email.toLowerCase().trim() })
    .returning();
  if (!row) throw new Error("Failed to create user");
  return row;
}

export async function getOrCreateUserByEmail(email: string): Promise<User> {
  const existing = await getUserByEmail(email);
  if (existing) return existing;
  return createUser(email);
}

export async function markUserLoggedIn(id: string): Promise<void> {
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, id));
}

export async function completeOnboarding(id: string, input: OnboardingInput): Promise<User> {
  const [row] = await db
    .update(users)
    .set({
      sectors: input.sectors,
      functions: input.functions,
      regions: input.regions,
      onboardingCompleted: true,
    })
    .where(eq(users.id, id))
    .returning();
  if (!row) throw new Error("User not found");
  return row;
}
