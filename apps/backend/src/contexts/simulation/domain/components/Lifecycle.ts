export type LifecycleState = "alive" | "dead" | "despawned";

export interface Lifecycle {
  spawnedAtTick: number;
  state: LifecycleState;
  diedAtTick?: number;
  /** Human-readable cause, used for the memorial/event-log record. */
  causeOfDeath?: string;
}
