import type { NewUserAccount, UserAccount } from "./User.js";

/**
 * Repository Pattern port (Architecture §9) — application use cases depend
 * on this interface, never on Prisma directly, so they stay testable with
 * an in-memory fake and swappable if persistence changes later.
 */
export interface UserRepository {
  findByEmail(email: string): Promise<UserAccount | undefined>;
  findById(id: string): Promise<UserAccount | undefined>;
  create(user: NewUserAccount): Promise<UserAccount>;
}
