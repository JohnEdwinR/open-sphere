import { ComponentType, type EntityId } from "../domain/ecs/types.js";
import type { World } from "../domain/ecs/World.js";
import { PERSONALITY_TRAIT_NAMES, type Personality } from "../domain/components/Personality.js";
import type { Genetics } from "../domain/components/Genetics.js";
import { phenotypeOf } from "../domain/components/Genetics.js";
import type { Vitality } from "../domain/components/Vitality.js";
import type { Perception } from "../domain/components/Perception.js";
import type { Movement } from "../domain/components/Movement.js";
import type { Lifecycle } from "../domain/components/Lifecycle.js";
import type { Ownership } from "../domain/components/Ownership.js";
import type { Transform } from "../domain/components/Transform.js";
import type { EventLogPort } from "../domain/events/EventLogPort.js";
import { rngRange, type Rng } from "../domain/util/Rng.js";

export interface SpawnSnakeParams {
  chunkId: number;
  x: number;
  y: number;
  ownerUserId?: string | null;
  tick: number;
}

/**
 * Creates a snake entity with the MVP component set (Simulation & World
 * Design §2.1/§4). Personality traits and genetic alleles are rolled from
 * the injected Rng so spawning is reproducible under a fixed seed. This is
 * an application-layer use case (not a domain method) because "how a snake
 * is composed" is an orchestration concern, while the components themselves
 * remain framework-free domain data.
 */
export function spawnSnake(
  world: World,
  rng: Rng,
  eventLog: EventLogPort,
  params: SpawnSnakeParams,
): EntityId {
  const id = world.createEntity();

  const alleles: Genetics["alleles"] = {};
  for (const trait of PERSONALITY_TRAIT_NAMES) {
    alleles[trait] = [rng(), rng()];
  }
  const genetics: Genetics = { seed: Math.floor(rng() * 1_000_000), alleles };

  const personality: Personality = PERSONALITY_TRAIT_NAMES.reduce((acc, trait) => {
    acc[trait] = phenotypeOf(genetics, trait);
    return acc;
  }, {} as Personality);

  const transform: Transform = { chunkId: params.chunkId, x: params.x, y: params.y, heading: 0 };
  const vitality: Vitality = {
    hunger: 0.3,
    energy: 0.8,
    health: 1,
    age: 0,
    nutritionAccumulated: 0,
    growthStage: 0,
  };
  const perception: Perception = {
    radius: 16,
    knownFood: [],
    knownThreats: [],
    memoryCapacity: Math.max(2, Math.round(personality.memory * 10)),
  };
  const movement: Movement = { speed: rngRange(rng, 0.5, 1.5) };
  const lifecycle: Lifecycle = { spawnedAtTick: params.tick, state: "alive" };
  const ownership: Ownership = { ownerUserId: params.ownerUserId ?? null };

  world.addComponent(id, ComponentType.Transform, transform);
  world.addComponent(id, ComponentType.Vitality, vitality);
  world.addComponent(id, ComponentType.Personality, personality);
  world.addComponent(id, ComponentType.Perception, perception);
  world.addComponent(id, ComponentType.Movement, movement);
  world.addComponent(id, ComponentType.Lifecycle, lifecycle);
  world.addComponent(id, ComponentType.Ownership, ownership);
  world.addComponent(id, ComponentType.Genetics, genetics);

  eventLog.append({
    entityId: id,
    type: "CreatureSpawned",
    payload: { species: "snake", chunkId: params.chunkId },
    tick: params.tick,
    occurredAt: new Date().toISOString(),
  });

  return id;
}
