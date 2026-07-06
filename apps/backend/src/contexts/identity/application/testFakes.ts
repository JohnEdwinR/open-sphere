import type { PasswordHasherPort } from "../domain/PasswordHasherPort.js";
import type { NewUserAccount, UserAccount } from "../domain/User.js";
import type { UserRepository } from "../domain/UserRepository.js";

/** In-memory UserRepository test double — keeps use-case tests fast and DB-free. */
export class InMemoryUserRepository implements UserRepository {
  private readonly byId = new Map<string, UserAccount>();
  private nextId = 1;

  async findByEmail(email: string): Promise<UserAccount | undefined> {
    return [...this.byId.values()].find((user) => user.email === email);
  }

  async findById(id: string): Promise<UserAccount | undefined> {
    return this.byId.get(id);
  }

  async create(input: NewUserAccount): Promise<UserAccount> {
    const user: UserAccount = {
      id: `u${this.nextId++}`,
      email: input.email,
      passwordHash: input.passwordHash,
      displayName: input.displayName,
      isAdmin: false,
      isBanned: false,
      createdAt: new Date(),
    };
    this.byId.set(user.id, user);
    return user;
  }
}

/** Trivial reversible "hash" — decouples use-case tests from real Argon2 for speed. */
export class FakePasswordHasher implements PasswordHasherPort {
  async hash(plaintext: string): Promise<string> {
    return `hashed:${plaintext}`;
  }

  async verify(hash: string, plaintext: string): Promise<boolean> {
    return hash === `hashed:${plaintext}`;
  }
}
