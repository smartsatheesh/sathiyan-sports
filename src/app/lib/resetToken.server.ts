import { createHash, randomBytes } from "crypto";

// Reset links carry a random token; only its SHA-256 is stored, so a database leak can't be replayed.
export function newResetToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("hex");
  return { token, hash: hashResetToken(token) };
}

export function hashResetToken(token: string): string {
  return createHash("sha256").update(String(token)).digest("hex");
}
