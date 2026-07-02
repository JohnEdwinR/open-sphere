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
import { World } from "../contexts/simulation/domain/ecs/World.js";
import { createRng, rngRange } from "../contexts/simulation/domain/util/Rng.js";
import { UtilityAI } from "../contexts/simulation/domain/ai/UtilityAI.js";
import {
  ConsumptionSystem,
  DecisionSystem,
  EventSystem,
  LifecycleSystem,
  MovementSystem,
  PerceptionSystem,
  VitalitySystem,
} from "../contexts/simulation/domain/systems/index.js";
import type { System } from "../contexts/simulation/domain/systems/System.js";
import { SimulationClock } from "../contexts/simulation/application/SimulationClock.js";
import { spawnSnake } from "../contexts/simulation/application/SpawnSnake.js";
import { spawnFood } from "../contexts/simulation/application/SpawnFood.js";
import { InMemoryEventLog } from "../contexts/simulation/infrastructure/InMemoryEventLog.js";
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

function bootstrap() {
  const rng = createRng(SEED);
  const world = new World();
  const eventLog = new InMemoryEventLog();
  const decisionStrategy = new UtilityAI(rng);

  const systems: System[] = [
    new PerceptionSystem(),
    new DecisionSystem(decisionStrategy),
    new MovementSystem(),
    new ConsumptionSystem(eventLog),
    new VitalitySystem(),
    new LifecycleSystem(eventLog),
    new EventSystem(rng, eventLog, {
      chunkId: CHUNK_ID,
      bounds: BOUNDS,
      maxFoodEntities: INITIAL_FOOD * 2,
      spawnChancePerTick: 0.3,
      nutritionRange: [3, 12],
      decayTicksRange: [80, 200],
    }),
  ];

  const clock = new SimulationClock(world, systems);

  for (let i = 0; i < INITIAL_SNAKES; i += 1) {
    spawnSnake(world, rng, eventLog, {
      chunkId: CHUNK_ID,
      x: rngRange(rng, BOUNDS.minX, BOUNDS.maxX),
      y: rngRange(rng, BOUNDS.minY, BOUNDS.maxY),
      tick: clock.currentTick,
    });
  }

  for (let i = 0; i < INITIAL_FOOD; i += 1) {
    spawnFood(world, eventLog, {
      chunkId: CHUNK_ID,
      x: rngRange(rng, BOUNDS.minX, BOUNDS.maxX),
      y: rngRange(rng, BOUNDS.minY, BOUNDS.maxY),
      nutrition: rngRange(rng, 3, 12),
      decayTicksRemaining: Math.round(rngRange(rng, 80, 200)),
      tick: clock.currentTick,
    });
  }

  return { world, clock, eventLog };
}

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
  const { world, clock, eventLog } = bootstrap();
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
