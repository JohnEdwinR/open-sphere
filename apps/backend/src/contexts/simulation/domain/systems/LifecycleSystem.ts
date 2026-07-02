import { ComponentType } from "../ecs/types.js";
import type { Consumable } from "../components/Consumable.js";
import type { Lifecycle } from "../components/Lifecycle.js";
import type { Vitality } from "../components/Vitality.js";
import type { EventLogPort } from "../events/EventLogPort.js";
import type { World } from "../ecs/World.js";
import type { System } from "./System.js";

/**
 * Transitions creatures to "dead" when health reaches zero and expires
 * unconsumed food via decay. Death is permanent and generates a memorial
 * event (Core Gameplay §2, Business Requirements BR — "death... generates a
 * memorial/history entry") rather than silently removing the entity; the
 * event log entry *is* the memorial (Database Design §3.2 trigger note —
 * this system is the application-layer equivalent of that DB trigger for
 * the in-memory Phase 1 engine).
 */
export class LifecycleSystem implements System {
  readonly name = "Lifecycle";

  constructor(private readonly eventLog: EventLogPort) {}

  update(world: World, tick: number): void {
    this.processCreatureDeaths(world, tick);
    this.processFoodDecay(world, tick);
  }

  private processCreatureDeaths(world: World, tick: number): void {
    const creatureIds = world.query([ComponentType.Vitality, ComponentType.Lifecycle]);

    for (const id of creatureIds) {
      const vitality = world.requireComponent<Vitality>(id, ComponentType.Vitality);
      const lifecycle = world.requireComponent<Lifecycle>(id, ComponentType.Lifecycle);

      if (lifecycle.state !== "alive" || vitality.health > 0) continue;

      lifecycle.state = "dead";
      lifecycle.diedAtTick = tick;
      lifecycle.causeOfDeath = vitality.hunger >= 1 ? "starvation" : "unknown";

      this.eventLog.append({
        entityId: id,
        type: "CreatureDied",
        payload: { cause: lifecycle.causeOfDeath, ageAtDeath: vitality.age },
        tick,
        occurredAt: new Date().toISOString(),
      });

      world.destroyEntity(id);
    }
  }

  private processFoodDecay(world: World, tick: number): void {
    const foodIds = world.query([ComponentType.Consumable]);

    for (const id of foodIds) {
      const consumable = world.requireComponent<Consumable>(id, ComponentType.Consumable);
      consumable.decayTicksRemaining -= 1;

      if (consumable.decayTicksRemaining <= 0) {
        this.eventLog.append({
          entityId: id,
          type: "FoodRotted",
          payload: {},
          tick,
          occurredAt: new Date().toISOString(),
        });
        world.destroyEntity(id);
      }
    }
  }
}
