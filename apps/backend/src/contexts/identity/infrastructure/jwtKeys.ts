import { generateKeyPairSync } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const KEYS_DIR = fileURLToPath(new URL("../../../../.keys", import.meta.url));
const PRIVATE_KEY_PATH = join(KEYS_DIR, "jwt_private.pem");
const PUBLIC_KEY_PATH = join(KEYS_DIR, "jwt_public.pem");

export interface JwtKeyPair {
  privateKey: string;
  publicKey: string;
}

/**
 * Security Specification §2 — RS256 (asymmetric), not HS256, "so
 * verification keys can be distributed to stateless API instances without
 * sharing the signing secret". Dev-mode convenience: generates a keypair on
 * first run and persists it to apps/backend/.keys (gitignored) so tokens
 * survive a process restart. Production must provision real keys via
 * secrets management — this auto-generation is explicitly a local-dev story
 * only.
 */
export function loadOrCreateJwtKeys(): JwtKeyPair {
  if (existsSync(PRIVATE_KEY_PATH) && existsSync(PUBLIC_KEY_PATH)) {
    return {
      privateKey: readFileSync(PRIVATE_KEY_PATH, "utf-8"),
      publicKey: readFileSync(PUBLIC_KEY_PATH, "utf-8"),
    };
  }

  const { privateKey, publicKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    privateKeyEncoding: { type: "pkcs1", format: "pem" },
    publicKeyEncoding: { type: "pkcs1", format: "pem" },
  });

  mkdirSync(KEYS_DIR, { recursive: true });
  writeFileSync(PRIVATE_KEY_PATH, privateKey, { mode: 0o600 });
  writeFileSync(PUBLIC_KEY_PATH, publicKey, { mode: 0o600 });

  return { privateKey, publicKey };
}
