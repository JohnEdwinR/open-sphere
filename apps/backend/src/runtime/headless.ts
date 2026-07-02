/**
 * Phase 1 exit-criteria harness (Roadmap — Phase 1: Simulation Engine):
 * a headless (no UI, no network) process that runs the tick-based
 * simulation unattended, logging significant events to stdout so a
 * developer can observe emergent behavior without the mobile client or
 * backend API existing yet.
 *
 * Run: pnpm --filter @open-sphere/backend sim:headless
 */
import { ComponentType } from "../contexts/simulation/domain/ecs/types.js";
import type { World } from "../contexts/simulation/domain/ecs/World.js";
import type { SimulationClock } from "../contexts/simulation/application/SimulationClock.js";
import { bootstrapSimulation } from "../contexts/simulation/application/bootstrapSimulation.js";
import type { Vitality } from "../contexts/simulation/domain/components/Vitality.js";

const SEED = Number(process.env.SIM_SEED ?? 42);
const TICK_INTERVAL_MS = Number(process.env.SIM_TICK_INTERVAL_MS ?? 250);
const INITIAL_SNAKES = Number(process.env.SIM_INITIAL_SNAKES ?? 8);
const INITIAL_FOOD = Number(process.env.SIM_INITIAL_FOOD ?? 30);
const SUMMARY_EVERY_N_TICKS = Number(process.env.SIM_SUMMARY_INTERVAL ?? 40);
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
  const { world, clock, eventLog } = bootstrapSimulation({
    seed: SEED,
    chunkId: CHUNK_ID,
    bounds: BOUNDS,
    initialSnakes: INITIAL_SNAKES,
    initialFood: INITIAL_FOOD,
    foodSpawnChancePerTick: 0.3,
  });
  let lastLoggedEventIndex = 0;

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
  }, TICK_INTERVAL_MS);

  const shutdown = () => {
    clearInterval(interval);
    console.log("\nShutting down simulation.");
    printSummary(world, clock);
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  console.log(
    `Open Sphere headless simulation started (seed=${SEED}, tick=${TICK_INTERVAL_MS}ms). Press Ctrl+C to stop.`,
  );
}

main();
