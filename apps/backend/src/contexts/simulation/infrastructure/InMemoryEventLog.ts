import type { DomainEvent } from "../domain/events/DomainEvent.js";
import type { EventLogPort } from "../domain/events/EventLogPort.js";

/**
 * Phase 1 adapter: holds events in memory for the lifetime of the process.
 * Replaced by a Postgres-backed adapter against the `event_log` table
 * (Database Design §3.4, append-only + partitioned) once persistence lands
 * in Phase 3 — DecisionSystem/ConsumptionSystem/LifecycleSystem depend only
 * on EventLogPort, so that swap requires no change to domain code.
 */
export class InMemoryEventLog implements EventLogPort {
  private readonly events: DomainEvent[] = [];
  private readonly byEntity = new Map<string, DomainEvent[]>();

  append(event: DomainEvent): void {
    this.events.push(event);
    const bucket = this.byEntity.get(event.entityId) ?? [];
    bucket.push(event);
    this.byEntity.set(event.entityId, bucket);
  }

  all(): readonly DomainEvent[] {
    return this.events;
  }

  forEntity(entityId: string): readonly DomainEvent[] {
    return this.byEntity.get(entityId) ?? [];
  }
}
