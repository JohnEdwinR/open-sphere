import type { EntityId } from "../ecs/types.js";

export type DomainEventType =
  | "CreatureSpawned"
  | "CreatureFed"
  | "CreatureExplored"
  | "CreatureRested"
  | "CreatureDied"
  | "FoodSpawned"
  | "FoodRotted";

export interface DomainEvent {
  entityId: EntityId;
  type: DomainEventType;
  payload: Record<string, unknown>;
  tick: number;
  occurredAt: string;
}
