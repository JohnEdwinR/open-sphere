import type { EntityId } from "../ecs/types.js";
import type { Perception } from "../components/Perception.js";
import type { Personality } from "../components/Personality.js";
import type { Transform } from "../components/Transform.js";
import type { Vitality } from "../components/Vitality.js";
import type { Action } from "./Action.js";
import type { World } from "../ecs/World.js";

export interface DecisionContext {
  entityId: EntityId;
  tick: number;
  transform: Transform;
  vitality: Vitality;
  personality: Personality;
  perception: Perception;
  /**
   * The Action chosen last tick, if any. Lets a strategy commit to a
   * multi-tick heading (e.g. keep exploring toward the same point) instead
   * of re-randomizing every tick, which would otherwise reduce "explore" to
   * an ineffective single-tick jitter with near-zero net displacement.
   */
  previousAction?: Action;
  /**
   * Read access to world state for resolving perceived entity positions.
   * Decision strategies must not mutate the world — enforced by convention
   * (documented here) rather than by the type system, since a read-only
   * view type would add ceremony disproportionate to MVP scope.
   */
  world: World;
}

/**
 * Port for creature decision-making (Simulation & World Design §3.2).
 * Swappable per-species: MVP ships UtilityAI; a Behavior Tree or hybrid
 * strategy can implement this same interface later without changing
 * DecisionSystem or any other part of the simulation loop.
 */
export interface DecisionStrategy {
  decide(context: DecisionContext): Action;
}
