import type { Action } from "../ai/Action.js";

/**
 * Transient per-tick component written by DecisionSystem and consumed by
 * MovementSystem/ConsumptionSystem. Not persisted — recomputed every tick.
 */
export interface Intent {
  action: Action;
}
