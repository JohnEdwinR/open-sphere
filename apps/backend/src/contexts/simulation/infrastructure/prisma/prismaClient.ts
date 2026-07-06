import { PrismaClient } from "@prisma/client";

/**
 * Single shared PrismaClient per process (Prisma's own guidance) — avoids
 * exhausting Postgres connections by constructing a new client, and its own
 * connection pool, per call site.
 */
export const prisma = new PrismaClient();
