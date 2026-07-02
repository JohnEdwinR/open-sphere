import type { DomainEvent } from "./DomainEvent.js";

/**
 * Port for the per-entity event log (Simulation & World Design §7 —
 * every significant action is durably recorded and is the sole input to
 * narrative/diary features). MVP ships an in-memory adapter
 * (infrastructure/InMemoryEventLog); a Postgres-backed adapter targeting the
 * `event_log` table (Database Design §3.4) replaces it in Phase 3 without
 * any change to the systems that depend on this interface.
 */
export interface EventLogPort {
  append(event: DomainEvent): void;
  all(): readonly DomainEvent[];
  forEntity(entityId: string): readonly DomainEvent[];
}
