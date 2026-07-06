import { Queue, Worker } from "bullmq";
import type { EventSystem } from "../../domain/systems/EventSystem.js";

export type WorldEventType = "FoodBloom" | "FoodShortage";

export interface WorldEventDefinition {
  type: WorldEventType;
  spawnChanceMultiplier: number;
  durationMs: number;
}

export interface WorldEventNotification {
  type: WorldEventType;
  startsAt: string;
  endsAt: string;
}

const WORLD_EVENTS: readonly WorldEventDefinition[] = [
  { type: "FoodBloom", spawnChanceMultiplier: 3, durationMs: 30_000 },
  { type: "FoodShortage", spawnChanceMultiplier: 0.2, durationMs: 30_000 },
];

const QUEUE_NAME = "world-events";
const RECURRING_JOB_ID = "recurring-world-event";

/**
 * Scheduled world events (Simulation & World Design §6: "Daily... Scheduled
 * job (BullMQ)"; §6 also: "Events are implemented as time-boxed modifiers to
 * system parameters... rather than bespoke one-off code paths"). A BullMQ
 * repeatable job fires on an interval; each firing, the worker picks a
 * random event definition and applies its spawn-chance multiplier to the
 * live EventSystem for `durationMs`, then reverts it.
 *
 * The event *type* is chosen inside the worker (not baked into the
 * repeatable job's payload), since BullMQ repeat jobs reuse the same
 * payload every firing — picking randomness in the processor is what gives
 * variety across occurrences. Real-time selection uses Math.random(), not
 * the simulation's seeded Rng — this is wall-clock job scheduling, not part
 * of the deterministic tick loop, so it's a deliberately separate concern.
 *
 * Producer and worker deliberately share this one process: there is exactly
 * one simulation instance to apply the modifier to, so a separate worker
 * process would only add IPC for no benefit at this scale.
 */
export class WorldEventScheduler {
  private readonly queue: Queue;
  private readonly worker: Worker;

  constructor(
    redisUrl: string,
    private readonly eventSystem: EventSystem,
    private readonly onWorldEvent: (event: WorldEventNotification) => void,
  ) {
    const { hostname, port } = new URL(redisUrl);
    const connection = { host: hostname, port: Number(port) };

    this.queue = new Queue(QUEUE_NAME, { connection });
    this.worker = new Worker(QUEUE_NAME, async () => this.triggerRandomEvent(), { connection });
  }

  /**
   * Enqueues the repeatable job. BullMQ derives a repeatable job's dedup key
   * from its repeat options (including `every`), not just `jobId` — so
   * restarting this process with a *different* interval than last time
   * would otherwise leave the old schedule running forever alongside the
   * new one. Clearing existing repeatable jobs first makes `start()`
   * idempotent regardless of interval changes across restarts.
   */
  async start(everyMs: number): Promise<void> {
    const existing = await this.queue.getRepeatableJobs();
    await Promise.all(existing.map((job) => this.queue.removeRepeatableByKey(job.key)));

    await this.queue.add(
      "trigger-world-event",
      {},
      { repeat: { every: everyMs }, jobId: RECURRING_JOB_ID },
    );
  }

  private triggerRandomEvent(): void {
    const definition = WORLD_EVENTS[Math.floor(Math.random() * WORLD_EVENTS.length)]!;
    const startsAt = new Date();
    const endsAt = new Date(startsAt.getTime() + definition.durationMs);

    this.eventSystem.setSpawnChanceMultiplier(definition.spawnChanceMultiplier);
    this.onWorldEvent({ type: definition.type, startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString() });

    setTimeout(() => {
      this.eventSystem.setSpawnChanceMultiplier(1);
    }, definition.durationMs);
  }

  async close(): Promise<void> {
    await this.worker.close();
    await this.queue.close();
  }
}
