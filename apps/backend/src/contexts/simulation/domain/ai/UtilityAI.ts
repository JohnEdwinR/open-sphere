import { ComponentType } from "../ecs/types.js";
import type { Consumable } from "../components/Consumable.js";
import type { Transform } from "../components/Transform.js";
import { distance } from "../util/Geometry.js";
import type { Rng } from "../util/Rng.js";
import type { Action, ActionType } from "./Action.js";
import type { DecisionContext, DecisionStrategy } from "./DecisionStrategy.js";

const EAT_RADIUS = 1.0;
const EXPLORE_STEP = 20.0;
const EXPLORE_ARRIVAL_RADIUS = 1.5;

/**
 * MVP decision strategy (Simulation & World Design §3.2). Scores each
 * candidate action from current Vitality + Personality + Perception state
 * and picks the highest-scoring one. Chosen over a Behavior Tree for MVP
 * because a small trait set produces smoother, less obviously-scripted
 * emergent behavior and is simpler to balance; the DecisionStrategy
 * interface is what allows a Behavior Tree to replace this later per
 * species without touching DecisionSystem.
 */
export class UtilityAI implements DecisionStrategy {
  constructor(private readonly rng: Rng) {}

  decide(context: DecisionContext): Action {
    const candidates = [
      this.scoreEatOrSeekFood(context),
      this.scoreExplore(context),
      this.scoreRest(context),
      this.scoreFlee(context),
    ];

    return candidates.reduce((best, candidate) =>
      candidate.score > best.score ? candidate : best,
    );
  }

  private scoreEatOrSeekFood(context: DecisionContext): Action {
    const nearestFood = this.nearestKnownFood(context);
    if (!nearestFood) {
      return this.noop("SeekFood", 0);
    }

    const hungerDrive = context.vitality.hunger * (0.5 + context.personality.hunger);
    const dist = distance(context.transform, nearestFood.transform);

    if (dist <= EAT_RADIUS) {
      return {
        type: "Eat",
        targetEntityId: nearestFood.id,
        targetPosition: { x: nearestFood.transform.x, y: nearestFood.transform.y },
        score: hungerDrive + 0.5,
      };
    }

    const proximityBonus = 1 / (1 + dist);
    return {
      type: "SeekFood",
      targetEntityId: nearestFood.id,
      targetPosition: { x: nearestFood.transform.x, y: nearestFood.transform.y },
      score: hungerDrive * (0.5 + context.personality.greed) * proximityBonus,
    };
  }

  private scoreExplore(context: DecisionContext): Action {
    const score =
      context.personality.curiosity *
      (0.3 + context.personality.exploration) *
      (1 - context.vitality.hunger * 0.5);

    // Commit to the previous tick's exploration target until it's reached,
    // rather than re-rolling a direction every tick. Without this, "explore"
    // degenerates into an uncorrelated per-tick jitter whose net
    // displacement barely grows over the creature's lifetime — it never
    // covers enough ground to find sparsely-spawned food.
    const previous = context.previousAction;
    if (
      previous?.type === "Explore" &&
      previous.targetPosition &&
      distance(context.transform, previous.targetPosition) > EXPLORE_ARRIVAL_RADIUS
    ) {
      return { type: "Explore", targetPosition: previous.targetPosition, score };
    }

    const angle = this.rng() * Math.PI * 2;
    return {
      type: "Explore",
      targetPosition: {
        x: context.transform.x + Math.cos(angle) * EXPLORE_STEP,
        y: context.transform.y + Math.sin(angle) * EXPLORE_STEP,
      },
      score,
    };
  }

  private scoreRest(context: DecisionContext): Action {
    const score = (1 - context.vitality.energy) * (0.3 + context.personality.patience);
    return this.noop("Rest", score);
  }

  private scoreFlee(context: DecisionContext): Action {
    if (context.perception.knownThreats.length === 0) {
      return this.noop("Flee", 0);
    }
    const score = context.personality.fear * 0.9;
    return this.noop("Flee", score);
  }

  private nearestKnownFood(
    context: DecisionContext,
  ): { id: string; transform: Transform } | undefined {
    let nearest: { id: string; transform: Transform; dist: number } | undefined;

    for (const foodId of context.perception.knownFood) {
      if (!context.world.hasEntity(foodId)) continue;
      const transform = context.world.getComponent<Transform>(foodId, ComponentType.Transform);
      const consumable = context.world.getComponent<Consumable>(foodId, ComponentType.Consumable);
      if (!transform || !consumable) continue;

      const dist = distance(context.transform, transform);
      if (!nearest || dist < nearest.dist) {
        nearest = { id: foodId, transform, dist };
      }
    }

    return nearest;
  }

  private noop(type: ActionType, score: number): Action {
    return { type, score };
  }
}
