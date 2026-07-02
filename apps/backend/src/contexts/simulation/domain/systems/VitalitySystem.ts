import { ComponentType } from "../ecs/types.js";
import type { Intent } from "../components/Intent.js";
import type { Vitality } from "../components/Vitality.js";
import type { World } from "../ecs/World.js";
import type { System } from "./System.js";

const HUNGER_DRIFT_PER_TICK = 0.006;
const ENERGY_REST_GAIN_PER_TICK = 0.05;
const ENERGY_ACTIVITY_DRAIN_PER_TICK = 0.01;
const STARVATION_HEALTH_DRAIN_PER_TICK = 0.05;
const HEALTH_REGEN_PER_TICK = 0.01;
const STARVATION_HUNGER_THRESHOLD = 1;
const WELL_FED_HUNGER_THRESHOLD = 0.5;
const RESTED_ENERGY_THRESHOLD = 0.5;

/**
 * Ages every creature one tick and updates hunger/energy/health per
 * Simulation & World Design §2 core systems. Runs after Consumption so a
 * same-tick meal is reflected before starvation damage is evaluated.
 */
export class VitalitySystem implements System {
  readonly name = "Vitality";

  /** tick is unused here but kept in the signature to match the System interface uniformly. */
  update(world: World, _tick: number): void {
    const creatureIds = world.query([ComponentType.Vitality, ComponentType.Intent]);

    for (const id of creatureIds) {
      const vitality = world.requireComponent<Vitality>(id, ComponentType.Vitality);
      const { action } = world.requireComponent<Intent>(id, ComponentType.Intent);

      vitality.age += 1;
      vitality.hunger = Math.min(1, vitality.hunger + HUNGER_DRIFT_PER_TICK);

      if (action.type === "Rest") {
        vitality.energy = Math.min(1, vitality.energy + ENERGY_REST_GAIN_PER_TICK);
      } else {
        vitality.energy = Math.max(0, vitality.energy - ENERGY_ACTIVITY_DRAIN_PER_TICK);
      }

      if (vitality.hunger >= STARVATION_HUNGER_THRESHOLD) {
        vitality.health = Math.max(0, vitality.health - STARVATION_HEALTH_DRAIN_PER_TICK);
      } else if (
        vitality.hunger <= WELL_FED_HUNGER_THRESHOLD &&
        vitality.energy >= RESTED_ENERGY_THRESHOLD
      ) {
        vitality.health = Math.min(1, vitality.health + HEALTH_REGEN_PER_TICK);
      }
    }
  }
}
