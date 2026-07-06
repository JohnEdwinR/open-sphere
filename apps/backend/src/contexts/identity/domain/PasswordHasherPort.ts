/**
 * Port for password hashing (Security Specification §2 — Argon2id, never a
 * fast hash). Kept behind an interface so the concrete algorithm/library is
 * an infrastructure concern, not something application use cases import
 * directly.
 */
export interface PasswordHasherPort {
  hash(plaintext: string): Promise<string>;
  verify(hash: string, plaintext: string): Promise<boolean>;
}
