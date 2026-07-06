/**
 * Phase 2/3 entry point (Roadmap): the real backend process per
 * Architecture §3 — one Fastify instance hosting both the REST API (Identity
 * auth for now) and the WebSocket world gateway, plus the static "fishbowl"
 * viewer page. Phase 2's earlier "no Fastify yet" rationale no longer
 * applies now that real REST routes (auth) exist.
 *
 * Run: pnpm --filter @open-sphere/backend world:viewer
 * Open: http://localhost:4000
 */
import Fastify from "fastify";
import fastifyJwt from "@fastify/jwt";
import fastifyStatic from "@fastify/static";
import { createAdapter } from "@socket.io/redis-adapter";
import { Redis } from "ioredis";
import { fileURLToPath } from "node:url";
import { bootstrapSimulation } from "../contexts/simulation/application/bootstrapSimulation.js";
import { WorldGateway } from "../contexts/simulation/interface/websocket/WorldGateway.js";
import { prisma } from "../contexts/simulation/infrastructure/prisma/prismaClient.js";
import { PrismaEventLogPort } from "../contexts/simulation/infrastructure/prisma/PrismaEventLogPort.js";
import { PrismaCreatureCheckpoint } from "../contexts/simulation/infrastructure/prisma/PrismaCreatureCheckpoint.js";
import { PrismaUserRepository } from "../contexts/identity/infrastructure/PrismaUserRepository.js";
import { Argon2PasswordHasher } from "../contexts/identity/infrastructure/Argon2PasswordHasher.js";
import { loadOrCreateJwtKeys } from "../contexts/identity/infrastructure/jwtKeys.js";
import { identityRoutes } from "../contexts/identity/interface/http/identityRoutes.js";
import { WorldEventScheduler } from "../contexts/simulation/infrastructure/jobs/WorldEventScheduler.js";

const PORT = Number(process.env.SIM_SERVER_PORT ?? 4000);
const SEED = Number(process.env.SIM_SEED ?? 42);
const TICK_INTERVAL_MS = Number(process.env.SIM_TICK_INTERVAL_MS ?? 150);
const INITIAL_SNAKES = Number(process.env.SIM_INITIAL_SNAKES ?? 8);
const INITIAL_FOOD = Number(process.env.SIM_INITIAL_FOOD ?? 30);
const PERSIST_TO_POSTGRES = process.env.SIM_PERSIST === "true";
const CHECKPOINT_EVERY_N_TICKS = Number(process.env.SIM_CHECKPOINT_INTERVAL ?? 20);
const USE_REDIS_ADAPTER = process.env.SIM_REDIS_ADAPTER === "true";
const WORLD_EVENTS_ENABLED = process.env.SIM_WORLD_EVENTS === "true";
const WORLD_EVENT_INTERVAL_MS = Number(process.env.SIM_WORLD_EVENT_INTERVAL_MS ?? 60_000);
// 127.0.0.1, not "localhost" — see the note in .env.example about
// Docker Desktop + WSL2's IPv6-first resolution silently connecting
// through a dead relay instead of the container.
const REDIS_URL = process.env.REDIS_URL ?? "redis://127.0.0.1:6379";
const CHUNK_ID = 0;
const BOUNDS = { minX: 0, maxX: 60, minY: 0, maxY: 60 };

const PUBLIC_DIR = fileURLToPath(new URL("../../public", import.meta.url));

async function main(): Promise<void> {
  const persistedEventLog = PERSIST_TO_POSTGRES ? new PrismaEventLogPort(prisma) : undefined;
  const checkpoint = PERSIST_TO_POSTGRES ? new PrismaCreatureCheckpoint(prisma) : undefined;

  const { world, clock, eventSystem } = bootstrapSimulation({
    seed: SEED,
    chunkId: CHUNK_ID,
    bounds: BOUNDS,
    initialSnakes: INITIAL_SNAKES,
    initialFood: INITIAL_FOOD,
    foodSpawnChancePerTick: 0.3,
    ...(persistedEventLog ? { eventLog: persistedEventLog } : {}),
  });

  const app = Fastify({ logger: false });

  const { privateKey, publicKey } = loadOrCreateJwtKeys();
  await app.register(fastifyJwt, {
    secret: { private: privateKey, public: publicKey },
    sign: { algorithm: "RS256" },
  });

  app.decorate("authenticate", async function authenticate(request, reply) {
    try {
      await request.jwtVerify();
    } catch (error) {
      await reply.send(error);
    }
  });

  await app.register(fastifyStatic, { root: PUBLIC_DIR });

  await app.register(
    async (instance) => {
      await identityRoutes(instance, {
        users: new PrismaUserRepository(prisma),
        passwordHasher: new Argon2PasswordHasher(),
      });
    },
    { prefix: "/api/v1" },
  );

  let redisAdapter: ReturnType<typeof createAdapter> | undefined;
  if (USE_REDIS_ADAPTER) {
    const pubClient = new Redis(REDIS_URL);
    const subClient = pubClient.duplicate();
    redisAdapter = createAdapter(pubClient, subClient);
  }

  const gateway = new WorldGateway(app.server, CHUNK_ID, redisAdapter);

  let worldEventScheduler: WorldEventScheduler | undefined;
  if (WORLD_EVENTS_ENABLED) {
    worldEventScheduler = new WorldEventScheduler(REDIS_URL, eventSystem, (event) => {
      app.log.info(event, "World event triggered");
      gateway.broadcastWorldEvent(event);
    });
    await worldEventScheduler.start(WORLD_EVENT_INTERVAL_MS);
  }

  let persisting = false;
  async function persistTick(): Promise<void> {
    if (!checkpoint || !persistedEventLog || persisting) return;
    persisting = true;
    try {
      await checkpoint.checkpoint(world);
      await persistedEventLog.flush();
    } catch (error) {
      app.log.error(error, "Persistence tick failed");
    } finally {
      persisting = false;
    }
  }

  const interval = setInterval(() => {
    clock.step();
    gateway.broadcastTick(world, clock.currentTick);

    if (PERSIST_TO_POSTGRES && clock.currentTick % CHECKPOINT_EVERY_N_TICKS === 0) {
      void persistTick();
    }
  }, TICK_INTERVAL_MS);

  await app.listen({ port: PORT, host: "0.0.0.0" });
  console.log(
    `Open Sphere world viewer + API: http://localhost:${PORT} (tick=${TICK_INTERVAL_MS}ms, seed=${SEED}, persist=${PERSIST_TO_POSTGRES}, redisAdapter=${USE_REDIS_ADAPTER}, worldEvents=${WORLD_EVENTS_ENABLED})`,
  );

  const shutdown = async () => {
    clearInterval(interval);
    gateway.close();
    await worldEventScheduler?.close();
    await app.close();
    if (PERSIST_TO_POSTGRES) {
      await persistTick();
      await prisma.$disconnect();
    }
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());
}

main();
