import type { World } from "../domain/ecs/World.js";
import type { System } from "../domain/systems/System.js";

/**
 * Orchestrates the fixed system pipeline, one tick at a time
 * (Architecture §5 — the simulation tick loop is its own long-lived
 * process, not driven by HTTP request/response). `step()` is deterministic
 * given the same World state and injected Rng seeds, which is what makes
 * `run(n)` usable in integration tests as well as in the real headless
 * runtime.
 */
export class SimulationClock {
  private tick = 0;

  constructor(
    private readonly world: World,
    private readonly systems: readonly System[],
  ) {}

  get currentTick(): number {
    return this.tick;
  }

  step(): void {
    this.tick += 1;
    for (const system of this.systems) {
      system.update(this.world, this.tick);
    }
  }

  run(ticks: number): void {
    for (let i = 0; i < ticks; i += 1) {
      this.step();
    }
  }
}
