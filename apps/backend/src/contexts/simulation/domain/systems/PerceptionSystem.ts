import { ComponentType } from "../ecs/types.js";
import type { Perception } from "../components/Perception.js";
import type { Transform } from "../components/Transform.js";
import { distance } from "../util/Geometry.js";
import type { World } from "../ecs/World.js";
import type { System } from "./System.js";

/**
 * Updates each creature's bounded memory buffers (Simulation & World Design
 * §3.3): entities recently perceived remain "known" even after leaving
 * perception radius, up to Perception.memoryCapacity, which is what lets
 * personality-driven behavior look intentional ("returns to a known food
 * spot") without scripting.
 */
export class PerceptionSystem implements System {
  readonly name = "Perception";

  update(world: World): void {
    const perceivers = world.query([ComponentType.Transform, ComponentType.Perception]);
    const foodEntities = world.query([ComponentType.Transform, ComponentType.Consumable]);

    for (const id of perceivers) {
      const transform = world.requireComponent<Transform>(id, ComponentType.Transform);
      const perception = world.requireComponent<Perception>(id, ComponentType.Perception);

      const stillPresent = perception.knownFood.filter((foodId) => world.hasEntity(foodId));

      const inRange = foodEntities.filter((foodId) => {
        if (foodId === id) return false;
        const foodTransform = world.requireComponent<Transform>(foodId, ComponentType.Transform);
        return distance(transform, foodTransform) <= perception.radius;
      });

      const merged = [...inRange, ...stillPresent.filter((fid) => !inRange.includes(fid))];
      perception.knownFood = merged.slice(0, perception.memoryCapacity);

      // Threats are not yet modeled as entities (no aggression/predator system in Phase 1);
      // the buffer exists so ThreatSystem (future) can populate it without a component change.
      perception.knownThreats = perception.knownThreats.filter((tid) => world.hasEntity(tid));
    }
  }
}
