import { World } from "../domain/ecs/World.js";
import { createRng, rngRange } from "../domain/util/Rng.js";
import { UtilityAI } from "../domain/ai/UtilityAI.js";
import {
  ConsumptionSystem,
  DecisionSystem,
  EventSystem,
  LifecycleSystem,
  MovementSystem,
  PerceptionSystem,
  VitalitySystem,
} from "../domain/systems/index.js";
import type { System } from "../domain/systems/System.js";
import { SimulationClock } from "./SimulationClock.js";
import { spawnSnake } from "./SpawnSnake.js";
import { spawnFood } from "./SpawnFood.js";
import { InMemoryEventLog } from "../infrastructure/InMemoryEventLog.js";

export interface SimulationBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface BootstrapSimulationOptions {
  seed: number;
  chunkId: number;
  bounds: SimulationBounds;
  initialSnakes: number;
  initialFood: number;
  foodSpawnChancePerTick: number;
}

export interface SimulationHandle {
  world: World;
  clock: SimulationClock;
  eventLog: InMemoryEventLog;
}

/**
 * Wires the fixed system pipeline (Simulation & World Design §2.2) and
 * seeds the initial population. Shared by every runtime entry point
 * (headless.ts, server.ts, ...) so "how a simulation is assembled" has a
 * single definition — the entry points differ only in what they do with
 * ticks (log to stdout vs. broadcast over WebSocket), not in how the world
 * is built.
 */
export function bootstrapSimulation(options: BootstrapSimulationOptions): SimulationHandle {
  const rng = createRng(options.seed);
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
      chunkId: options.chunkId,
      bounds: options.bounds,
      maxFoodEntities: options.initialFood * 2,
      spawnChancePerTick: options.foodSpawnChancePerTick,
      nutritionRange: [3, 12],
      decayTicksRange: [80, 200],
    }),
  ];

  const clock = new SimulationClock(world, systems);

  for (let i = 0; i < options.initialSnakes; i += 1) {
    spawnSnake(world, rng, eventLog, {
      chunkId: options.chunkId,
      x: rngRange(rng, options.bounds.minX, options.bounds.maxX),
      y: rngRange(rng, options.bounds.minY, options.bounds.maxY),
      tick: clock.currentTick,
    });
  }

  for (let i = 0; i < options.initialFood; i += 1) {
    spawnFood(world, eventLog, {
      chunkId: options.chunkId,
      x: rngRange(rng, options.bounds.minX, options.bounds.maxX),
      y: rngRange(rng, options.bounds.minY, options.bounds.maxY),
      nutrition: rngRange(rng, 3, 12),
      decayTicksRemaining: Math.round(rngRange(rng, 80, 200)),
      tick: clock.currentTick,
    });
  }

  return { world, clock, eventLog };
}
