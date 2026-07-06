import type { PrismaClient, User as PrismaUser } from "@prisma/client";
import type { NewUserAccount, UserAccount } from "../domain/User.js";
import type { UserRepository } from "../domain/UserRepository.js";

export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByEmail(email: string): Promise<UserAccount | undefined> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    return user ? toDomain(user) : undefined;
  }

  async findById(id: string): Promise<UserAccount | undefined> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    return user ? toDomain(user) : undefined;
  }

  async create(input: NewUserAccount): Promise<UserAccount> {
    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        passwordHash: input.passwordHash,
        displayName: input.displayName,
      },
    });
    return toDomain(user);
  }
}

function toDomain(user: PrismaUser): UserAccount {
  return {
    id: user.id,
    email: user.email,
    passwordHash: user.passwordHash,
    displayName: user.displayName,
    isAdmin: user.isAdmin,
    isBanned: user.isBanned,
    createdAt: user.createdAt,
  };
}
