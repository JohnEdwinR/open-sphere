import { Algorithm, hash, verify } from "@node-rs/argon2";
import type { PasswordHasherPort } from "../domain/PasswordHasherPort.js";

/**
 * Security Specification §2 — Argon2id, never a fast hash. `@node-rs/argon2`
 * ships prebuilt native bindings (napi, no local compiler required), unlike
 * the `argon2` npm package which needs node-gyp — a meaningfully safer bet
 * across contributor machines/CI.
 */
export class Argon2PasswordHasher implements PasswordHasherPort {
  async hash(plaintext: string): Promise<string> {
    return hash(plaintext, { algorithm: Algorithm.Argon2id });
  }

  async verify(hashValue: string, plaintext: string): Promise<boolean> {
    return verify(hashValue, plaintext);
  }
}
