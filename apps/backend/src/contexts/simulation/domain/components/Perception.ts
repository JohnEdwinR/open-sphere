import type { EntityId } from "../ecs/types.js";

export interface Perception {
  /** World-unit radius within which entities can be sensed. */
  radius: number;
  /** Bounded recent-memory buffer of perceived food entities, sized by the memory trait. */
  knownFood: EntityId[];
  /** Bounded recent-memory buffer of perceived threats (empty until threat entities exist). */
  knownThreats: EntityId[];
  /** Max length of each memory buffer above. */
  memoryCapacity: number;
}
