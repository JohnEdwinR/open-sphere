/**
 * Domain-level user shape — deliberately not the generated Prisma `User`
 * type. Application/domain code depends on this; PrismaUserRepository maps
 * to/from it. Keeps the Identity context's business logic free of a
 * generated-client dependency, same as Simulation's domain layer never
 * importing Prisma/Fastify (Architecture §4).
 */
export interface UserAccount {
  id: string;
  email: string;
  passwordHash: string | null;
  displayName: string;
  isAdmin: boolean;
  isBanned: boolean;
  createdAt: Date;
}

export interface NewUserAccount {
  email: string;
  passwordHash: string;
  displayName: string;
}
