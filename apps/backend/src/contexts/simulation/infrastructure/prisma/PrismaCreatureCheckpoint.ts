import type { Prisma, PrismaClient } from "@prisma/client";
import { ComponentType, type EntityId } from "../../domain/ecs/types.js";
import type { World } from "../../domain/ecs/World.js";
import type { Genetics } from "../../domain/components/Genetics.js";
import type { Lifecycle } from "../../domain/components/Lifecycle.js";
import type { Ownership } from "../../domain/components/Ownership.js";
import type { Personality } from "../../domain/components/Personality.js";
import type { Transform } from "../../domain/components/Transform.js";

/**
 * Periodically checkpoints live creature entities into the `creatures`
 * table (Database Design §6): Redis/in-memory state is authoritative at
 * tick rate, Postgres is checkpointed on a configurable interval, not
 * written every tick — writing every tick at any real entity count is not
 * viable. The runtime is responsible for calling `checkpoint()` on that
 * interval, immediately before flushing the same tick's events (see
 * PrismaEventLogPort) so the `event_log.creature_id` foreign key is always
 * satisfied.
 *
 * Also upserts `world_chunks` rows for any chunk id it encounters —
 * `creatures.chunk_id` is a real foreign key too, and nothing else in the
 * system creates chunk rows yet (procedural chunk generation is future
 * work per Simulation & World Design §5).
 *
 * Death handling: LifecycleSystem destroys a creature from the in-memory
 * World in the same tick it dies (Simulation & World Design — death is
 * permanent), so a naive "checkpoint whatever's currently in World" never
 * observes `lifecycleState: 'dead'` — the entity is simply gone by the next
 * checkpoint. So this class also diffs against the previous checkpoint's id
 * set: anything that disappeared gets one final `lifecycle_state = 'dead'`
 * update, which fires the death-memorial trigger (migration
 * `add_death_memorial_trigger_and_partial_index`). That trigger inserts its
 * own generic (tick=0, source=db_trigger) memorial row even though the
 * accurate CreatureDied event (real tick, full payload) is *also* flushed
 * through the normal PrismaEventLogPort path — a deliberate, accepted, minor
 * duplication rather than building session-flag suppression between the two
 * independent safety mechanisms for what is otherwise an extra audit trail
 * entry, not a correctness bug.
 */
export class PrismaCreatureCheckpoint {
  private readonly knownChunkIds = new Set<number>();
  private previouslyCheckpointedIds = new Set<EntityId>();

  constructor(private readonly prisma: PrismaClient) {}

  async checkpoint(world: World): Promise<number> {
    const ids = world.query([
      ComponentType.Transform,
      ComponentType.Personality,
      ComponentType.Genetics,
      ComponentType.Lifecycle,
      ComponentType.Ownership,
    ]);
    const currentIds = new Set(ids);

    for (const id of ids) {
      const transform = world.requireComponent<Transform>(id, ComponentType.Transform);
      await this.ensureChunkExists(transform.chunkId);
    }

    for (const id of ids) {
      const transform = world.requireComponent<Transform>(id, ComponentType.Transform);
      const personality = world.requireComponent<Personality>(id, ComponentType.Personality);
      const genetics = world.requireComponent<Genetics>(id, ComponentType.Genetics);
      const lifecycle = world.requireComponent<Lifecycle>(id, ComponentType.Lifecycle);
      const ownership = world.requireComponent<Ownership>(id, ComponentType.Ownership);

      await this.prisma.creature.upsert({
        where: { id },
        create: {
          id,
          ownerId: ownership.ownerUserId,
          species: "snake",
          chunkId: transform.chunkId,
          personalityTraits: personality as unknown as Prisma.InputJsonValue,
          genetics: genetics as unknown as Prisma.InputJsonValue,
          lifecycleState: lifecycle.state,
        },
        update: {
          ownerId: ownership.ownerUserId,
          chunkId: transform.chunkId,
          lifecycleState: lifecycle.state,
        },
      });
    }

    for (const id of this.previouslyCheckpointedIds) {
      if (currentIds.has(id)) continue;
      await this.prisma.creature.updateMany({
        where: { id, lifecycleState: { not: "dead" } },
        data: { lifecycleState: "dead" },
      });
    }

    this.previouslyCheckpointedIds = currentIds;
    return ids.length;
  }

  private async ensureChunkExists(chunkId: number): Promise<void> {
    if (this.knownChunkIds.has(chunkId)) return;

    await this.prisma.worldChunk.upsert({
      where: { id: chunkId },
      create: { id: chunkId, x: chunkId, y: 0, biome: "unknown" },
      update: {},
    });
    this.knownChunkIds.add(chunkId);
  }
}
