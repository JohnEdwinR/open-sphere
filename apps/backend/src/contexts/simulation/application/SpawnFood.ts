import { ComponentType, type EntityId } from "../domain/ecs/types.js";
import type { World } from "../domain/ecs/World.js";
import type { Consumable } from "../domain/components/Consumable.js";
import type { Transform } from "../domain/components/Transform.js";
import type { EventLogPort } from "../domain/events/EventLogPort.js";

export interface SpawnFoodParams {
  chunkId: number;
  x: number;
  y: number;
  nutrition: number;
  decayTicksRemaining: number;
  tick: number;
}

/** Initial world-seeding use case; ongoing periodic spawns are EventSystem's responsibility. */
export function spawnFood(world: World, eventLog: EventLogPort, params: SpawnFoodParams): EntityId {
  const id = world.createEntity();

  const transform: Transform = { chunkId: params.chunkId, x: params.x, y: params.y, heading: 0 };
  const consumable: Consumable = {
    nutrition: params.nutrition,
    decayTicksRemaining: params.decayTicksRemaining,
  };

  world.addComponent(id, ComponentType.Transform, transform);
  world.addComponent(id, ComponentType.Consumable, consumable);

  eventLog.append({
    entityId: id,
    type: "FoodSpawned",
    payload: { x: params.x, y: params.y, nutrition: params.nutrition },
    tick: params.tick,
    occurredAt: new Date().toISOString(),
  });

  return id;
}
