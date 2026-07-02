import { ComponentType } from "../ecs/types.js";
import type { Intent } from "../components/Intent.js";
import type { Perception } from "../components/Perception.js";
import type { Personality } from "../components/Personality.js";
import type { Transform } from "../components/Transform.js";
import type { Vitality } from "../components/Vitality.js";
import type { DecisionStrategy } from "../ai/DecisionStrategy.js";
import type { World } from "../ecs/World.js";
import type { System } from "./System.js";

/**
 * Runs each creature's DecisionStrategy and records the resulting Action as
 * an Intent component for downstream systems to act on this tick. Isolating
 * decision-making to this single system (rather than letting Movement/
 * Consumption each re-derive intent) keeps the AI swappable per §3.2 of the
 * Simulation & World Design without touching any other system.
 */
export class DecisionSystem implements System {
  readonly name = "Decision";

  constructor(private readonly strategy: DecisionStrategy) {}

  update(world: World, tick: number): void {
    const creatureIds = world.query([
      ComponentType.Transform,
      ComponentType.Vitality,
      ComponentType.Personality,
      ComponentType.Perception,
    ]);

    for (const id of creatureIds) {
      const previousIntent = world.getComponent<Intent>(id, ComponentType.Intent);

      const action = this.strategy.decide({
        entityId: id,
        tick,
        transform: world.requireComponent<Transform>(id, ComponentType.Transform),
        vitality: world.requireComponent<Vitality>(id, ComponentType.Vitality),
        personality: world.requireComponent<Personality>(id, ComponentType.Personality),
        perception: world.requireComponent<Perception>(id, ComponentType.Perception),
        world,
        ...(previousIntent ? { previousAction: previousIntent.action } : {}),
      });

      const intent: Intent = { action };
      world.addComponent(id, ComponentType.Intent, intent);
    }
  }
}
