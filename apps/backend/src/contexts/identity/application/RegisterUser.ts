import type { PasswordHasherPort } from "../domain/PasswordHasherPort.js";
import type { UserAccount } from "../domain/User.js";
import type { UserRepository } from "../domain/UserRepository.js";

export class EmailAlreadyRegisteredError extends Error {
  constructor(email: string) {
    super(`Email already registered: ${email}`);
    this.name = "EmailAlreadyRegisteredError";
  }
}

export interface RegisterUserInput {
  email: string;
  password: string;
  displayName: string;
}

/**
 * FR-ID-001 (Software Requirements Specification). Email uniqueness is
 * enforced case-insensitively here (normalize-then-compare), matching
 * Database Design §3.1's note that the DB only has a plain unique index and
 * relies on the application layer to lowercase before writing.
 */
export class RegisterUser {
  constructor(
    private readonly users: UserRepository,
    private readonly passwordHasher: PasswordHasherPort,
  ) {}

  async execute(input: RegisterUserInput): Promise<UserAccount> {
    const normalizedEmail = input.email.trim().toLowerCase();

    const existing = await this.users.findByEmail(normalizedEmail);
    if (existing) {
      throw new EmailAlreadyRegisteredError(normalizedEmail);
    }

    const passwordHash = await this.passwordHasher.hash(input.password);

    return this.users.create({
      email: normalizedEmail,
      passwordHash,
      displayName: input.displayName.trim(),
    });
  }
}
