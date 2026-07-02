import { ComponentType } from "../ecs/types.js";
import type { Intent } from "../components/Intent.js";
import type { Movement } from "../components/Movement.js";
import type { Transform } from "../components/Transform.js";
import { distance } from "../util/Geometry.js";
import type { World } from "../ecs/World.js";
import type { System } from "./System.js";

/**
 * Advances position toward the current Intent's target (SeekFood/Explore).
 * Rest/Eat/Flee-with-no-target intents produce no movement this tick. This
 * system only ever reads Intent — it never decides *what* to do (that is
 * DecisionSystem's sole responsibility), keeping the two concerns separable.
 */
export class MovementSystem implements System {
  readonly name = "Movement";

  update(world: World): void {
    const movers = world.query([ComponentType.Transform, ComponentType.Movement, ComponentType.Intent]);

    for (const id of movers) {
      const transform = world.requireComponent<Transform>(id, ComponentType.Transform);
      const movement = world.requireComponent<Movement>(id, ComponentType.Movement);
      const { action } = world.requireComponent<Intent>(id, ComponentType.Intent);

      const target = action.targetPosition;
      if (!target || action.type === "Rest" || action.type === "Eat") {
        continue;
      }

      const remaining = distance(transform, target);
      if (remaining <= movement.speed) {
        transform.x = target.x;
        transform.y = target.y;
        continue;
      }

      const dx = target.x - transform.x;
      const dy = target.y - transform.y;
      const heading = Math.atan2(dy, dx);
      transform.x += Math.cos(heading) * movement.speed;
      transform.y += Math.sin(heading) * movement.speed;
      transform.heading = heading;
    }
  }
}
