import { describe, expect, it } from "vitest";
import { World } from "./World.js";
import { ComponentType } from "./types.js";

describe("World", () => {
  it("creates entities with unique ids", () => {
    const world = new World();
    const a = world.createEntity();
    const b = world.createEntity();
    expect(a).not.toBe(b);
    expect(world.entityCount).toBe(2);
  });

  it("stores and retrieves components by type", () => {
    const world = new World();
    const id = world.createEntity();
    world.addComponent(id, ComponentType.Transform, { chunkId: 0, x: 1, y: 2, heading: 0 });

    const transform = world.getComponent<{ x: number }>(id, ComponentType.Transform);
    expect(transform?.x).toBe(1);
  });

  it("throws when adding a component to an unknown entity", () => {
    const world = new World();
    expect(() =>
      world.addComponent("missing", ComponentType.Transform, { chunkId: 0, x: 0, y: 0, heading: 0 }),
    ).toThrow();
  });

  it("requireComponent throws when the component is absent", () => {
    const world = new World();
    const id = world.createEntity();
    expect(() => world.requireComponent(id, ComponentType.Vitality)).toThrow();
  });

  it("destroying an entity removes it from every component store", () => {
    const world = new World();
    const id = world.createEntity();
    world.addComponent(id, ComponentType.Transform, { chunkId: 0, x: 0, y: 0, heading: 0 });
    world.destroyEntity(id);

    expect(world.hasEntity(id)).toBe(false);
    expect(world.hasComponent(id, ComponentType.Transform)).toBe(false);
  });

  it("query returns only entities that have every requested component", () => {
    const world = new World();
    const both = world.createEntity();
    const onlyTransform = world.createEntity();
    world.addComponent(both, ComponentType.Transform, { chunkId: 0, x: 0, y: 0, heading: 0 });
    world.addComponent(both, ComponentType.Vitality, {
      hunger: 0,
      energy: 1,
      health: 1,
      age: 0,
      nutritionAccumulated: 0,
      growthStage: 0,
    });
    world.addComponent(onlyTransform, ComponentType.Transform, { chunkId: 0, x: 0, y: 0, heading: 0 });

    const result = world.query([ComponentType.Transform, ComponentType.Vitality]);
    expect(result).toEqual([both]);
  });
});
