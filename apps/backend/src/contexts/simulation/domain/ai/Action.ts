import type { EntityId } from "../ecs/types.js";

export type ActionType = "SeekFood" | "Eat" | "Explore" | "Rest" | "Flee";

export interface Action {
  type: ActionType;
  targetEntityId?: EntityId;
  targetPosition?: { x: number; y: number };
  /** Utility score that won the decision — kept for observability/debugging, not used downstream. */
  score: number;
}
