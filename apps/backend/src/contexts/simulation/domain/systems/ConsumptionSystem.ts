import { ComponentType } from "../ecs/types.js";
import type { Consumable } from "../components/Consumable.js";
import type { Intent } from "../components/Intent.js";
import type { Vitality } from "../components/Vitality.js";
import { growthStageForNutrition } from "../components/Vitality.js";
import type { EventLogPort } from "../events/EventLogPort.js";
import type { World } from "../ecs/World.js";
import type { System } from "./System.js";

/**
 * Resolves an "Eat" Intent: removes the consumed food entity, applies its
 * nutrition to the eater's Vitality, and logs a CreatureFed domain event —
 * the event log is what every diary/narrative feature reads from later
 * (Simulation & World Design §7), so this is the single place a "fed" fact
 * is ever recorded.
 */
export class ConsumptionSystem implements System {
  readonly name = "Consumption";

  constructor(private readonly eventLog: EventLogPort) {}

  update(world: World, tick: number): void {
    const eaters = world.query([ComponentType.Vitality, ComponentType.Intent]);

    for (const id of eaters) {
      const { action } = world.requireComponent<Intent>(id, ComponentType.Intent);
      if (action.type !== "Eat" || !action.targetEntityId) continue;
      if (!world.hasEntity(action.targetEntityId)) continue;

      const consumable = world.getComponent<Consumable>(action.targetEntityId, ComponentType.Consumable);
      if (!consumable) continue;

      const vitality = world.requireComponent<Vitality>(id, ComponentType.Vitality);
      vitality.hunger = Math.max(0, vitality.hunger - consumable.nutrition / 10);
      vitality.nutritionAccumulated += consumable.nutrition;
      vitality.growthStage = growthStageForNutrition(vitality.nutritionAccumulated);

      world.destroyEntity(action.targetEntityId);

      this.eventLog.append({
        entityId: id,
        type: "CreatureFed",
        payload: { foodEntityId: action.targetEntityId, nutrition: consumable.nutrition },
        tick,
        occurredAt: new Date().toISOString(),
      });
    }
  }
}
