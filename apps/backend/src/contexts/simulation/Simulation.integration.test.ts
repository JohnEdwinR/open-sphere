import { describe, expect, it } from "vitest";
import { World } from "./domain/ecs/World.js";
import { ComponentType } from "./domain/ecs/types.js";
import { createRng, rngRange } from "./domain/util/Rng.js";
import { UtilityAI } from "./domain/ai/UtilityAI.js";
import {
  ConsumptionSystem,
  DecisionSystem,
  EventSystem,
  LifecycleSystem,
  MovementSystem,
  PerceptionSystem,
  VitalitySystem,
} from "./domain/systems/index.js";
import type { System } from "./domain/systems/System.js";
import { SimulationClock } from "./application/SimulationClock.js";
import { spawnSnake } from "./application/SpawnSnake.js";
import { spawnFood } from "./application/SpawnFood.js";
import { InMemoryEventLog } from "./infrastructure/InMemoryEventLog.js";

const BOUNDS = { minX: 0, maxX: 50, minY: 0, maxY: 50 };

function buildSimulation(seed: number) {
  const rng = createRng(seed);
  const world = new World();
  const eventLog = new InMemoryEventLog();

  const systems: System[] = [
    new PerceptionSystem(),
    new DecisionSystem(new UtilityAI(rng)),
    new MovementSystem(),
    new ConsumptionSystem(eventLog),
    new VitalitySystem(),
    new LifecycleSystem(eventLog),
    new EventSystem(rng, eventLog, {
      chunkId: 0,
      bounds: BOUNDS,
      maxFoodEntities: 30,
      spawnChancePerTick: 0.2,
      nutritionRange: [3, 12],
      decayTicksRange: [80, 200],
    }),
  ];

  const clock = new SimulationClock(world, systems);

  for (let i = 0; i < 10; i += 1) {
    spawnSnake(world, rng, eventLog, {
      chunkId: 0,
      x: rngRange(rng, BOUNDS.minX, BOUNDS.maxX),
      y: rngRange(rng, BOUNDS.minY, BOUNDS.maxY),
      tick: 0,
    });
  }
  for (let i = 0; i < 15; i += 1) {
    spawnFood(world, eventLog, {
      chunkId: 0,
      x: rngRange(rng, BOUNDS.minX, BOUNDS.maxX),
      y: rngRange(rng, BOUNDS.minY, BOUNDS.maxY),
      nutrition: rngRange(rng, 3, 12),
      decayTicksRemaining: Math.round(rngRange(rng, 80, 200)),
      tick: 0,
    });
  }

  return { world, clock, eventLog };
}

describe("Simulation (integration)", () => {
  it("runs for many ticks without throwing and keeps component data within valid bounds", () => {
    const { world, clock } = buildSimulation(7);

    expect(() => clock.run(2000)).not.toThrow();

    for (const id of world.query([ComponentType.Vitality])) {
      const vitality = world.requireComponent<{ hunger: number; energy: number; health: number }>(
        id,
        ComponentType.Vitality,
      );
      expect(vitality.hunger).toBeGreaterThanOrEqual(0);
      expect(vitality.hunger).toBeLessThanOrEqual(1);
      expect(vitality.energy).toBeGreaterThanOrEqual(0);
      expect(vitality.energy).toBeLessThanOrEqual(1);
      expect(vitality.health).toBeGreaterThan(0); // dead creatures are destroyed, so survivors have health > 0
    }
  });

  it("produces the same event sequence for the same seed (determinism)", () => {
    const run1 = buildSimulation(99);
    const run2 = buildSimulation(99);

    run1.clock.run(500);
    run2.clock.run(500);

    const types1 = run1.eventLog.all().map((e) => `${e.tick}:${e.type}`);
    const types2 = run2.eventLog.all().map((e) => `${e.tick}:${e.type}`);

    expect(types1).toEqual(types2);
  });

  it("records a CreatureDied memorial event for every creature that stops existing", () => {
    const { world, clock, eventLog } = buildSimulation(3);
    const initialAliveIds = new Set(world.query([ComponentType.Vitality]));

    clock.run(3000);

    const deathEvents = eventLog.all().filter((e) => e.type === "CreatureDied");
    const survivorIds = new Set(world.query([ComponentType.Vitality]));
    const diedIds = [...initialAliveIds].filter((id) => !survivorIds.has(id));

    // every originally-spawned snake that is no longer alive must have a memorial event
    for (const id of diedIds) {
      expect(deathEvents.some((e) => e.entityId === id)).toBe(true);
    }
  });
});
