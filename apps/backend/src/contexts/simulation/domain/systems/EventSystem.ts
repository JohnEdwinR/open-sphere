import { ComponentType } from "../ecs/types.js";
import type { Consumable } from "../components/Consumable.js";
import type { Transform } from "../components/Transform.js";
import type { EventLogPort } from "../events/EventLogPort.js";
import type { Rng } from "../util/Rng.js";
import { rngRange } from "../util/Rng.js";
import type { World } from "../ecs/World.js";
import type { System } from "./System.js";

export interface WorldEventConfig {
  chunkId: number;
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
  maxFoodEntities: number;
  spawnChancePerTick: number;
  nutritionRange: [number, number];
  decayTicksRange: [number, number];
}

/**
 * The Phase 1 slice of the broader Event System (Simulation & World Design
 * §6): keeps the world stocked with food via a weighted random roll each
 * tick, bounded by maxFoodEntities. Daily/weekly/global events (meteor,
 * storm, migration, etc.) plug into this same system as additional
 * modifier-roll methods in later phases — the config-driven shape here is
 * chosen specifically so new events are data plus a modifier function, not a
 * new engine subsystem.
 */
export class EventSystem implements System {
  readonly name = "Event";

  /**
   * Time-boxed modifier applied to spawnChancePerTick (Simulation & World
   * Design §6 — "Events are implemented as time-boxed modifiers to system
   * parameters... rather than bespoke one-off code paths"). Defaults to 1
   * (no modifier). A scheduled world event (see WorldEventScheduler) sets
   * this above 1 for a "bloom" or below 1 for a "shortage", then restores it
   * to 1 when the event ends.
   */
  private spawnChanceMultiplier = 1;

  constructor(
    private readonly rng: Rng,
    private readonly eventLog: EventLogPort,
    private readonly config: WorldEventConfig,
  ) {}

  setSpawnChanceMultiplier(multiplier: number): void {
    this.spawnChanceMultiplier = multiplier;
  }

  update(world: World, tick: number): void {
    const currentFoodCount = world.query([ComponentType.Consumable]).length;
    if (currentFoodCount >= this.config.maxFoodEntities) return;
    const effectiveSpawnChance = Math.min(1, this.config.spawnChancePerTick * this.spawnChanceMultiplier);
    if (this.rng() > effectiveSpawnChance) return;

    const id = world.createEntity();
    const transform: Transform = {
      chunkId: this.config.chunkId,
      x: rngRange(this.rng, this.config.bounds.minX, this.config.bounds.maxX),
      y: rngRange(this.rng, this.config.bounds.minY, this.config.bounds.maxY),
      heading: 0,
    };
    const consumable: Consumable = {
      nutrition: rngRange(this.rng, ...this.config.nutritionRange),
      decayTicksRemaining: Math.round(rngRange(this.rng, ...this.config.decayTicksRange)),
    };

    world.addComponent(id, ComponentType.Transform, transform);
    world.addComponent(id, ComponentType.Consumable, consumable);

    this.eventLog.append({
      entityId: id,
      type: "FoodSpawned",
      payload: { x: transform.x, y: transform.y, nutrition: consumable.nutrition },
      tick,
      occurredAt: new Date().toISOString(),
    });
  }
}
