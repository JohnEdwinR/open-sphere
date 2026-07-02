import { describe, expect, it } from "vitest";
import { World } from "../ecs/World.js";
import { ComponentType } from "../ecs/types.js";
import { VitalitySystem } from "./VitalitySystem.js";
import type { Vitality } from "../components/Vitality.js";
import type { Intent } from "../components/Intent.js";

function setupCreature(world: World, vitality: Vitality, intent: Intent) {
  const id = world.createEntity();
  world.addComponent(id, ComponentType.Vitality, vitality);
  world.addComponent(id, ComponentType.Intent, intent);
  return id;
}

describe("VitalitySystem", () => {
  it("increments age and drifts hunger upward every tick", () => {
    const world = new World();
    const id = setupCreature(
      world,
      { hunger: 0.2, energy: 0.5, health: 1, age: 0, nutritionAccumulated: 0, growthStage: 0 },
      { action: { type: "Explore", score: 1 } },
    );

    new VitalitySystem().update(world, 1);

    const vitality = world.requireComponent<Vitality>(id, ComponentType.Vitality);
    expect(vitality.age).toBe(1);
    expect(vitality.hunger).toBeGreaterThan(0.2);
  });

  it("regenerates energy when resting and drains it otherwise", () => {
    const world = new World();
    const resting = setupCreature(
      world,
      { hunger: 0.2, energy: 0.5, health: 1, age: 0, nutritionAccumulated: 0, growthStage: 0 },
      { action: { type: "Rest", score: 1 } },
    );
    const exploring = setupCreature(
      world,
      { hunger: 0.2, energy: 0.5, health: 1, age: 0, nutritionAccumulated: 0, growthStage: 0 },
      { action: { type: "Explore", score: 1 } },
    );

    new VitalitySystem().update(world, 1);

    expect(world.requireComponent<Vitality>(resting, ComponentType.Vitality).energy).toBeGreaterThan(0.5);
    expect(world.requireComponent<Vitality>(exploring, ComponentType.Vitality).energy).toBeLessThan(0.5);
  });

  it("drains health when starving and does not exceed the [0, 1] bounds over many ticks", () => {
    const world = new World();
    const id = setupCreature(
      world,
      { hunger: 1, energy: 0, health: 1, age: 0, nutritionAccumulated: 0, growthStage: 0 },
      { action: { type: "Rest", score: 1 } },
    );

    const system = new VitalitySystem();
    for (let i = 0; i < 100; i += 1) {
      system.update(world, i + 1);
    }

    const vitality = world.requireComponent<Vitality>(id, ComponentType.Vitality);
    expect(vitality.health).toBe(0);
    expect(vitality.hunger).toBeLessThanOrEqual(1);
    expect(vitality.energy).toBeGreaterThanOrEqual(0);
    expect(vitality.energy).toBeLessThanOrEqual(1);
  });
});
