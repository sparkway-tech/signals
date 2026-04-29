import crypto from "node:crypto";
import type { Request, Response, NextFunction } from "express";

/**
 * Session minimaliste : cookie HMAC-signé contenant `userId`.
 * Pas de session store DB (V1) — userId encodé dans le cookie + sig HMAC pour
 * intégrité. TTL géré côté cookie (Max-Age 30 jours).
 *
 * Format : `<base64url(userId)>.<hex(hmac sha256)>`.
 */

const COOKIE_NAME = "signals_session";
const COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 jours

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET missing or too short (require ≥32 chars hex). Generate via `openssl rand -hex 32`.");
  }
  return secret;
}

function sign(value: string): string {
  return crypto.createHmac("sha256", getSecret()).update(value).digest("hex");
}

export function buildSessionCookie(userId: string): { name: string; value: string; options: { httpOnly: boolean; secure: boolean; sameSite: "lax"; path: string; maxAge: number } } {
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
      maxAge: COOKIE_MAX_AGE_SECONDS * 1000,
    },
  };
}

export function clearSessionCookie(): { name: string; options: { httpOnly: boolean; secure: boolean; sameSite: "lax"; path: string; maxAge: number } } {
  return {
    name: COOKIE_NAME,
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    },
  };
}

function verifyAndDecode(cookieValue: string): string | null {
  const [encoded, signature] = cookieValue.split(".");
  if (!encoded || !signature) return null;
  const expected = sign(encoded);
  if (signature.length !== expected.length) return null;
  try {
    if (!crypto.timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex"))) return null;
  } catch {
    return null;
  }
  try {
    return Buffer.from(encoded, "base64url").toString("utf8");
  } catch {
    return null;
  }
}

export interface AuthedRequest extends Request {
  userId: string;
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
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
  (req as AuthedRequest).userId = userId;
  next();
}

export function getUserIdFromRequest(req: Request): string | null {
  const cookie = req.cookies?.[COOKIE_NAME];
  if (typeof cookie !== "string") return null;
  return verifyAndDecode(cookie);
}
