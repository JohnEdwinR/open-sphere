import type { ComponentTypeName, EntityId } from "./types.js";

/**
 * Minimal Entity-Component store. Entities are IDs; components are pure data
 * held in per-type maps. Systems query by component-type presence rather than
 * by entity "class", which is what lets a new entity type (e.g. a future
 * species) be added by composing existing components — no engine change
 * required (traces FR-SIM-003 in the Software Requirements Specification).
 */
export class World {
  private nextEntitySeq = 1;
  private readonly entities = new Set<EntityId>();
  private readonly stores = new Map<ComponentTypeName, Map<EntityId, unknown>>();

  createEntity(): EntityId {
    const id = `e${this.nextEntitySeq++}`;
    this.entities.add(id);
    return id;
  }

  destroyEntity(id: EntityId): void {
    this.entities.delete(id);
    for (const store of this.stores.values()) {
      store.delete(id);
    }
  }

  hasEntity(id: EntityId): boolean {
    return this.entities.has(id);
  }

  entityIds(): readonly EntityId[] {
    return [...this.entities];
  }

  get entityCount(): number {
    return this.entities.size;
  }

  addComponent<T>(id: EntityId, type: ComponentTypeName, component: T): void {
    if (!this.entities.has(id)) {
      throw new Error(`Cannot add component "${type}" to unknown entity "${id}"`);
    }
    this.storeFor<T>(type).set(id, component);
  }

  getComponent<T>(id: EntityId, type: ComponentTypeName): T | undefined {
    return this.storeFor<T>(type).get(id);
  }

  /** Throws if absent — use when a system's contract guarantees the component exists on queried entities. */
  requireComponent<T>(id: EntityId, type: ComponentTypeName): T {
    const component = this.getComponent<T>(id, type);
    if (component === undefined) {
      throw new Error(`Entity "${id}" is missing required component "${type}"`);
    }
    return component;
  }

  hasComponent(id: EntityId, type: ComponentTypeName): boolean {
    return this.storeFor(type).has(id);
  }

  removeComponent(id: EntityId, type: ComponentTypeName): void {
    this.storeFor(type).delete(id);
  }

  /** Entities that have every component type listed. */
  query(types: readonly ComponentTypeName[]): EntityId[] {
    if (types.length === 0) return this.entityIds() as EntityId[];
    const [first, ...rest] = types;
    const candidates = this.storeFor(first as ComponentTypeName).keys();
    const result: EntityId[] = [];
    for (const id of candidates) {
      if (!this.entities.has(id)) continue;
      if (rest.every((type) => this.storeFor(type).has(id))) {
        result.push(id);
      }
    }
    return result;
  }

  private storeFor<T>(type: ComponentTypeName): Map<EntityId, T> {
    let store = this.stores.get(type);
    if (!store) {
      store = new Map<EntityId, unknown>();
      this.stores.set(type, store);
    }
    return store as Map<EntityId, T>;
  }
}
