import crypto from "node:crypto";

/**
 * Génère un token clair de 32 bytes (64 chars hex) destiné au lien magique.
 * Le clair est envoyé par email, jamais persisté. Le hash SHA-256 est stocké
 * dans `magic_link_tokens.token_hash`.
 */
export function generateMagicLinkToken(): { plain: string; hash: string } {
  const plain = crypto.randomBytes(32).toString("hex");
  const hash = hashToken(plain);
  return { plain, hash };
}

export function hashToken(plain: string): string {
  return crypto.createHash("sha256").update(plain).digest("hex");
}
