import type { Prisma, PrismaClient } from "@prisma/client";
import type { DomainEvent } from "../../domain/events/DomainEvent.js";
import type { EventLogPort } from "../../domain/events/EventLogPort.js";

const RECENT_WINDOW_SIZE = 5000;

/**
 * Postgres-backed EventLogPort (Database Design §3.4 — the `event_log`
 * table). `append()` stays synchronous, matching the port's contract:
 * domain/application code must never await I/O (Architecture §4 — domain
 * has zero framework/infrastructure dependency, and that includes not
 * blocking the tick loop on a database round-trip). Events are buffered in
 * memory and persisted in batches via `flush()`, which the runtime calls on
 * a configurable interval — the same checkpoint-not-every-tick model
 * Database Design §6 describes for creature state.
 *
 * Precondition: `event_log.creature_id` is a real foreign key to
 * `creatures.id`. Flushing an event for a creature Postgres has never heard
 * of will throw — callers must checkpoint the creature (see
 * PrismaCreatureCheckpoint) before or in the same batch as flushing its
 * events.
 *
 * `event_log` is documented (Database Design §2 ERD: `CREATURES ||--o{
 * EVENT_LOG : generates`) as creature-scoped history, not a general
 * entity log — so `flush()` only persists events whose type is
 * `Creature*` (CreatureSpawned/Fed/Died/...). Food/world events
 * (FoodSpawned, FoodRotted) reference a food entity id, which is never
 * checkpointed as a `creatures` row and would otherwise violate the same
 * foreign key; they stay in the in-memory `recent` window for live/debug
 * use only, per the "no creature diary needs a food item's rot time" reading
 * of Simulation & World Design §7 ("every creature action... is appended").
 *
 * `all()`/`forEntity()` intentionally return only a bounded recent window,
 * not the full persisted history — full history is a paginated Prisma query
 * against `event_log` directly (the future `/creatures/:id/history`
 * endpoint), not something this in-process port should hold unbounded in
 * memory.
 */
export class PrismaEventLogPort implements EventLogPort {
  private buffer: DomainEvent[] = [];
  private readonly recent: DomainEvent[] = [];

  constructor(private readonly prisma: PrismaClient) {}

  append(event: DomainEvent): void {
    this.buffer.push(event);
    this.recent.push(event);
    if (this.recent.length > RECENT_WINDOW_SIZE) {
      this.recent.shift();
    }
  }

  all(): readonly DomainEvent[] {
    return this.recent;
  }

  forEntity(entityId: string): readonly DomainEvent[] {
    return this.recent.filter((event) => event.entityId === entityId);
  }

  /** Persists buffered creature-scoped events since the last flush. Returns the count flushed. */
  async flush(): Promise<number> {
    if (this.buffer.length === 0) return 0;
    const toFlush = this.buffer.filter((event) => event.type.startsWith("Creature"));
    this.buffer = [];

    if (toFlush.length === 0) return 0;

    await this.prisma.eventLog.createMany({
      data: toFlush.map((event) => ({
        creatureId: event.entityId,
        eventType: event.type,
        payload: event.payload as Prisma.InputJsonValue,
        tick: BigInt(event.tick),
        occurredAt: new Date(event.occurredAt),
      })),
    });

    return toFlush.length;
  }
}
