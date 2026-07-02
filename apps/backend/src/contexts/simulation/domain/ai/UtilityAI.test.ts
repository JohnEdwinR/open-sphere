import { describe, expect, it } from "vitest";
import { World } from "../ecs/World.js";
import { ComponentType } from "../ecs/types.js";
import { createRng } from "../util/Rng.js";
import { UtilityAI } from "./UtilityAI.js";
import type { DecisionContext } from "./DecisionStrategy.js";
import type { Personality } from "../components/Personality.js";
import type { Vitality } from "../components/Vitality.js";

function basePersonality(overrides: Partial<Personality> = {}): Personality {
  return {
    aggression: 0.2,
    fear: 0.2,
    curiosity: 0.2,
    patience: 0.2,
    greed: 0.2,
    exploration: 0.2,
    intelligence: 0.2,
    memory: 0.2,
    confidence: 0.2,
    hunger: 0.2,
    ...overrides,
  };
}

function baseVitality(overrides: Partial<Vitality> = {}): Vitality {
  return {
    hunger: 0.2,
    energy: 0.8,
    health: 1,
    age: 0,
    nutritionAccumulated: 0,
    growthStage: 0,
    ...overrides,
  };
}

function makeContext(world: World, overrides: Partial<DecisionContext> = {}): DecisionContext {
  return {
    entityId: "self",
    tick: 1,
    transform: { chunkId: 0, x: 0, y: 0, heading: 0 },
    vitality: baseVitality(),
    personality: basePersonality(),
    perception: { radius: 10, knownFood: [], knownThreats: [], memoryCapacity: 5 },
    world,
    ...overrides,
  };
}

describe("UtilityAI", () => {
  it("chooses Eat when a known food entity is within eating range", () => {
    const world = new World();
    const foodId = world.createEntity();
    world.addComponent(foodId, ComponentType.Transform, { chunkId: 0, x: 0.5, y: 0, heading: 0 });
    world.addComponent(foodId, ComponentType.Consumable, { nutrition: 5, decayTicksRemaining: 100 });

    const ai = new UtilityAI(createRng(1));
    const action = ai.decide(
      makeContext(world, {
        vitality: baseVitality({ hunger: 0.8 }),
        perception: { radius: 10, knownFood: [foodId], knownThreats: [], memoryCapacity: 5 },
      }),
    );

    expect(action.type).toBe("Eat");
    expect(action.targetEntityId).toBe(foodId);
  });

  it("chooses SeekFood toward known food that is out of eating range", () => {
    const world = new World();
    const foodId = world.createEntity();
    world.addComponent(foodId, ComponentType.Transform, { chunkId: 0, x: 8, y: 0, heading: 0 });
    world.addComponent(foodId, ComponentType.Consumable, { nutrition: 5, decayTicksRemaining: 100 });

    const ai = new UtilityAI(createRng(1));
    const action = ai.decide(
      makeContext(world, {
        vitality: baseVitality({ hunger: 0.9 }),
        personality: basePersonality({ hunger: 0.9, greed: 0.9 }),
        perception: { radius: 10, knownFood: [foodId], knownThreats: [], memoryCapacity: 5 },
      }),
    );

    expect(action.type).toBe("SeekFood");
    expect(action.targetEntityId).toBe(foodId);
  });

  it("prefers Explore over Rest for a well-fed, high-curiosity, high-energy creature", () => {
    const world = new World();
    const ai = new UtilityAI(createRng(1));

    const action = ai.decide(
      makeContext(world, {
        vitality: baseVitality({ hunger: 0.1, energy: 1 }),
        personality: basePersonality({ curiosity: 0.95, exploration: 0.95, patience: 0.1 }),
      }),
    );

    expect(action.type).toBe("Explore");
  });

  it("prefers Rest over Explore for an exhausted, incurious creature", () => {
    const world = new World();
    const ai = new UtilityAI(createRng(1));

    const action = ai.decide(
      makeContext(world, {
        vitality: baseVitality({ hunger: 0.1, energy: 0.05 }),
        personality: basePersonality({ curiosity: 0.05, exploration: 0.05, patience: 0.9 }),
      }),
    );

    expect(action.type).toBe("Rest");
  });
});
