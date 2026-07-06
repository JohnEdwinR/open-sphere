import type { PasswordHasherPort } from "../domain/PasswordHasherPort.js";
import type { UserAccount } from "../domain/User.js";
import type { UserRepository } from "../domain/UserRepository.js";

export class InvalidCredentialsError extends Error {
  constructor() {
    super("Invalid email or password");
    this.name = "InvalidCredentialsError";
  }
}

export class AccountBannedError extends Error {
  constructor() {
    super("This account has been banned");
    this.name = "AccountBannedError";
  }
}

export interface AuthenticateUserInput {
  email: string;
  password: string;
}

/**
 * FR-ID-001. Checks password validity before the banned check so an
 * incorrect password never reveals whether an account exists/is banned
 * (Security Specification — standard credential-enumeration hardening).
 */
export class AuthenticateUser {
  constructor(
    private readonly users: UserRepository,
    private readonly passwordHasher: PasswordHasherPort,
  ) {}

  async execute(input: AuthenticateUserInput): Promise<UserAccount> {
    const normalizedEmail = input.email.trim().toLowerCase();
    const user = await this.users.findByEmail(normalizedEmail);

    if (!user || !user.passwordHash || !(await this.passwordHasher.verify(user.passwordHash, input.password))) {
      throw new InvalidCredentialsError();
    }

    if (user.isBanned) {
      throw new AccountBannedError();
    }

    return user;
  }
}
