import type { World } from "../ecs/World.js";

/**
 * A System is stateless logic over component data, run once per tick in a
 * fixed pipeline order (Perception -> Decision -> Movement -> Consumption ->
 * Vitality -> Lifecycle -> Event, per Simulation & World Design §2.2). Any
 * infrastructure a system needs (event log, decision strategy, RNG) is
 * injected via constructor — never imported directly — so systems stay unit
 * testable without a running database (traces Architecture §9, Dependency
 * Injection).
 */
export interface System {
  readonly name: string;
  update(world: World, tick: number): void;
}
