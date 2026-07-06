/**
 * Phase 1 exit-criteria harness (Roadmap — Phase 1: Simulation Engine):
 * a headless (no UI, no network) process that runs the tick-based
 * simulation unattended, logging significant events to stdout so a
 * developer can observe emergent behavior without the mobile client or
 * backend API existing yet.
 *
 * Run: pnpm --filter @open-sphere/backend sim:headless
 * Run with durable Postgres history: SIM_PERSIST=true pnpm --filter @open-sphere/backend sim:headless
 */
import { ComponentType } from "../contexts/simulation/domain/ecs/types.js";
import type { World } from "../contexts/simulation/domain/ecs/World.js";
import type { SimulationClock } from "../contexts/simulation/application/SimulationClock.js";
import { bootstrapSimulation } from "../contexts/simulation/application/bootstrapSimulation.js";
import type { Vitality } from "../contexts/simulation/domain/components/Vitality.js";
import { prisma } from "../contexts/simulation/infrastructure/prisma/prismaClient.js";
import { PrismaEventLogPort } from "../contexts/simulation/infrastructure/prisma/PrismaEventLogPort.js";
import { PrismaCreatureCheckpoint } from "../contexts/simulation/infrastructure/prisma/PrismaCreatureCheckpoint.js";

const SEED = Number(process.env.SIM_SEED ?? 42);
const TICK_INTERVAL_MS = Number(process.env.SIM_TICK_INTERVAL_MS ?? 250);
const INITIAL_SNAKES = Number(process.env.SIM_INITIAL_SNAKES ?? 8);
const INITIAL_FOOD = Number(process.env.SIM_INITIAL_FOOD ?? 30);
const SUMMARY_EVERY_N_TICKS = Number(process.env.SIM_SUMMARY_INTERVAL ?? 40);
const PERSIST_TO_POSTGRES = process.env.SIM_PERSIST === "true";
const CHECKPOINT_EVERY_N_TICKS = Number(process.env.SIM_CHECKPOINT_INTERVAL ?? 20);
const CHUNK_ID = 0;
// Kept small relative to food count so the default demo shows feeding and
// growth, not a sparse-desert mass-starvation scenario — see the note in
// UtilityAI's committed-exploration fix for why food density vs. perception
// radius matters mechanically, not just cosmetically.
const BOUNDS = { minX: 0, maxX: 60, minY: 0, maxY: 60 };

function printSummary(world: World, clock: SimulationClock): void {
  const snakeIds = world.query([ComponentType.Vitality]);
  const foodCount = world.query([ComponentType.Consumable]).length;
  const avgHunger =
    snakeIds.length === 0
      ? 0
      : snakeIds.reduce((sum, id) => {
          const vitality = world.requireComponent<Vitality>(id, ComponentType.Vitality);
          return sum + vitality.hunger;
        }, 0) / snakeIds.length;

  console.log(
    `[tick ${clock.currentTick}] snakes=${snakeIds.length} food=${foodCount} avgHunger=${avgHunger.toFixed(2)}`,
  );
}

function main(): void {
  const persistedEventLog = PERSIST_TO_POSTGRES ? new PrismaEventLogPort(prisma) : undefined;
  const checkpoint = PERSIST_TO_POSTGRES ? new PrismaCreatureCheckpoint(prisma) : undefined;

  const { world, clock, eventLog } = bootstrapSimulation({
    seed: SEED,
    chunkId: CHUNK_ID,
    bounds: BOUNDS,
    initialSnakes: INITIAL_SNAKES,
    initialFood: INITIAL_FOOD,
    foodSpawnChancePerTick: 0.3,
    ...(persistedEventLog ? { eventLog: persistedEventLog } : {}),
  });
  let lastLoggedEventIndex = 0;

  // Checkpoint+flush are async (real I/O); ticks fire on a plain sync
  // interval. This guard prevents overlapping persistence calls if Postgres
  // is slower than the tick interval — it never blocks or skips a
  // simulation tick, only a redundant persistence pass.
  let persisting = false;
  async function persistTick(): Promise<void> {
    if (!checkpoint || !persistedEventLog || persisting) return;
    persisting = true;
    try {
      await checkpoint.checkpoint(world); // must run before flush() — event_log.creature_id is a real FK
      await persistedEventLog.flush();
    } catch (error) {
      console.error("Persistence tick failed:", error);
    } finally {
      persisting = false;
    }
  }

  const interval = setInterval(() => {
    clock.step();

    const allEvents = eventLog.all();
    for (let i = lastLoggedEventIndex; i < allEvents.length; i += 1) {
      const event = allEvents[i]!;
      if (event.type === "CreatureDied" || event.type === "CreatureSpawned" || event.type === "CreatureFed") {
        console.log(`  tick ${event.tick}: ${event.type} entity=${event.entityId}`, event.payload);
      }
    }
    lastLoggedEventIndex = allEvents.length;

    if (clock.currentTick % SUMMARY_EVERY_N_TICKS === 0) {
      printSummary(world, clock);
    }

    if (PERSIST_TO_POSTGRES && clock.currentTick % CHECKPOINT_EVERY_N_TICKS === 0) {
      void persistTick();
    }
  }, TICK_INTERVAL_MS);

  const shutdown = () => {
    clearInterval(interval);
    console.log("\nShutting down simulation.");
    printSummary(world, clock);

    const cleanup = PERSIST_TO_POSTGRES ? persistTick().then(() => prisma.$disconnect()) : Promise.resolve();
    cleanup.finally(() => process.exit(0));
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  console.log(
    `Open Sphere headless simulation started (seed=${SEED}, tick=${TICK_INTERVAL_MS}ms, persist=${PERSIST_TO_POSTGRES}). Press Ctrl+C to stop.`,
  );
}

main();
