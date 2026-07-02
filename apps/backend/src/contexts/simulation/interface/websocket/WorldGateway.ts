import type { Server as HttpServer } from "node:http";
import { Server as SocketIOServer } from "socket.io";
import { ComponentType, type EntityId } from "../../domain/ecs/types.js";
import type { World } from "../../domain/ecs/World.js";
import type { Transform } from "../../domain/components/Transform.js";
import type { Vitality } from "../../domain/components/Vitality.js";
import type { Consumable } from "../../domain/components/Consumable.js";

export type EntityKind = "snake" | "food";

export interface EntityView {
  id: EntityId;
  kind: EntityKind;
  x: number;
  y: number;
  heading?: number;
  hunger?: number;
  growthStage?: number;
  nutrition?: number;
}

export interface ChunkSnapshot {
  chunkId: number;
  tick: number;
  entities: EntityView[];
}

export interface ChunkDelta {
  chunkId: number;
  tick: number;
  added: EntityView[];
  updated: EntityView[];
  removed: EntityId[];
}

/**
 * Interface-layer adapter (Architecture §4 — domain never imports this):
 * translates World state into the wire contract documented in
 * 05_API/APISpecification.md §3 (`chunk:snapshot` on join, `chunk:delta`
 * per tick). Phase 2 serves a single chunk to every connected socket —
 * there is no per-chunk room subscription yet (`chunk:subscribe` from the
 * API spec), since the "fishbowl" viewer (Roadmap Phase 2) only ever shows
 * one chunk. Multi-chunk room routing is Phase 3+ work once the world
 * actually spans more than one chunk.
 */
export class WorldGateway {
  private readonly io: SocketIOServer;
  private previousEntities = new Map<EntityId, EntityView>();
  private latestTick = 0;

  constructor(
    httpServer: HttpServer,
    private readonly chunkId: number,
  ) {
    this.io = new SocketIOServer(httpServer, { cors: { origin: "*" } });

    this.io.on("connection", (socket) => {
      const snapshot: ChunkSnapshot = {
        chunkId: this.chunkId,
        tick: this.latestTick,
        entities: [...this.previousEntities.values()],
      };
      socket.emit("chunk:snapshot", snapshot);
    });
  }

  broadcastTick(world: World, tick: number): void {
    this.latestTick = tick;
    const current = snapshotEntities(world);
    const delta = diffEntities(this.previousEntities, current);
    this.previousEntities = current;

    if (delta.added.length === 0 && delta.updated.length === 0 && delta.removed.length === 0) {
      return;
    }

    const payload: ChunkDelta = { chunkId: this.chunkId, tick, ...delta };
    this.io.emit("chunk:delta", payload);
  }

  get connectedClientCount(): number {
    return this.io.engine.clientsCount;
  }

  close(): void {
    this.io.close();
  }
}

function snapshotEntities(world: World): Map<EntityId, EntityView> {
  const result = new Map<EntityId, EntityView>();

  for (const id of world.query([ComponentType.Transform, ComponentType.Vitality])) {
    const transform = world.requireComponent<Transform>(id, ComponentType.Transform);
    const vitality = world.requireComponent<Vitality>(id, ComponentType.Vitality);
    result.set(id, {
      id,
      kind: "snake",
      x: transform.x,
      y: transform.y,
      heading: transform.heading,
      hunger: vitality.hunger,
      growthStage: vitality.growthStage,
    });
  }

  for (const id of world.query([ComponentType.Transform, ComponentType.Consumable])) {
    const transform = world.requireComponent<Transform>(id, ComponentType.Transform);
    const consumable = world.requireComponent<Consumable>(id, ComponentType.Consumable);
    result.set(id, {
      id,
      kind: "food",
      x: transform.x,
      y: transform.y,
      nutrition: consumable.nutrition,
    });
  }

  return result;
}

function diffEntities(
  previous: Map<EntityId, EntityView>,
  current: Map<EntityId, EntityView>,
): Pick<ChunkDelta, "added" | "updated" | "removed"> {
  const added: EntityView[] = [];
  const updated: EntityView[] = [];
  const removed: EntityId[] = [];

  for (const [id, view] of current) {
    if (previous.has(id)) {
      updated.push(view);
    } else {
      added.push(view);
    }
  }
  for (const id of previous.keys()) {
    if (!current.has(id)) {
      removed.push(id);
    }
  }

  return { added, updated, removed };
}
