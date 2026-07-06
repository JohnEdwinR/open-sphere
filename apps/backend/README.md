# @open-sphere/backend

Phase 1 + Phase 2 status (see [Roadmap](../../01_PRODUCT/Roadmap.md)): the simulation engine, a WebSocket "fishbowl" viewer, and real Phase 3 groundwork — Postgres persistence (Prisma), a Fastify REST API with working registration/login/JWT auth, a Redis-backed Socket.IO adapter for horizontal scaling, and a BullMQ-scheduled world-event system. Not yet implemented: refresh-token rotation/logout, and the rest of the API surface (creatures, social, economy, admin).

## Layout

```text
src/
  contexts/
    simulation/
      domain/          # entities, components, systems, AI — zero framework imports
      application/       # SimulationClock, spawn use-cases, bootstrapSimulation() (orchestration)
      infrastructure/
        InMemoryEventLog.ts     # default EventLogPort adapter (fast, no external dependency)
        prisma/
          prismaClient.ts          # shared PrismaClient singleton
          PrismaEventLogPort.ts    # durable EventLogPort adapter — buffers, flushes to Postgres
          PrismaCreatureCheckpoint.ts # periodically upserts World creatures into Postgres
        jobs/
          WorldEventScheduler.ts   # BullMQ-scheduled world events (time-boxed EventSystem modifiers)
      interface/
        websocket/        # WorldGateway — translates World state to the API spec's chunk:snapshot/chunk:delta/world:event
    identity/
      domain/            # UserAccount, UserRepository port, PasswordHasherPort
      application/         # RegisterUser, AuthenticateUser use cases (+ in-memory test fakes)
      infrastructure/       # PrismaUserRepository, Argon2PasswordHasher, JWT RSA keypair loader
      interface/http/        # Fastify route handlers (/auth/register, /auth/login, /users/me)
  runtime/
    headless.ts         # Phase 1 entry point: runs the tick loop unattended, logs to stdout
    server.ts            # Phase 2/3 entry point: Fastify app — REST auth + WebSocket gateway + viewer
public/
  index.html              # Phase 2 "fishbowl" viewer — plain canvas + socket.io-client, no build step
prisma/
  schema.prisma             # translates 04_DATABASE/DatabaseDesign.md's ERD into a migratable schema
  migrations/                # first migration (init) + a hand-written one (death-memorial trigger, partial index)
```

This mirrors the layering in [Architecture §4](../../03_SOFTWARE_ARCHITECTURE/Architecture.md#4-layering-per-bounded-context--eventual-service): `domain/` never imports Fastify/Prisma/Socket.IO in either context, which is what keeps business logic unit-testable without a running server or database (Identity's use cases are tested against an in-memory `UserRepository` fake, same pattern as Simulation). `interface/`/`infrastructure/` are the only places that know about Fastify/Socket.IO/Prisma respectively — swapping any of them doesn't touch domain or application code.

## Local infrastructure (Postgres, Redis, MinIO)

```bash
docker compose -f ../../infra/docker/docker-compose.yml up -d
```

**Port note:** Postgres is mapped to host port **5433**, not 5432 — some machines already run a native Postgres service on 5432, which silently wins connections over the container. `apps/backend/.env.example` already points at 5433; copy it to `.env` for local dev.

**Redis host note:** use `127.0.0.1`, not `localhost`, in `REDIS_URL`. On Docker Desktop + WSL2, Node's IPv6-first resolution of "localhost" can route through a stale `wslrelay.exe` forward that TCP-connects successfully but never actually reaches the container — ioredis reports itself connected while Redis sees zero clients, so nothing errors and nothing works. Forcing IPv4 avoids the ambiguity; `.env.example` already does this.

## Database (Prisma)

```bash
pnpm --filter @open-sphere/backend prisma:generate   # regenerate the client after a schema change
pnpm --filter @open-sphere/backend prisma:migrate    # create + apply a new migration
pnpm --filter @open-sphere/backend prisma:studio     # browse the database in a GUI
```

Two migrations exist: `init` (the full declarative schema) and `add_death_memorial_trigger_and_partial_index` (hand-written raw SQL — Prisma's schema DSL can't express partial indexes or triggers). Deliberately **not** implemented yet, per the comment at the top of `schema.prisma`: `event_log` range partitioning (no real write volume to justify the operational complexity yet) and the two views from Database Design §4 (the leaderboard view specifically needs a ranking metric Product hasn't decided on).

## Running

```bash
pnpm install
pnpm --filter @open-sphere/backend sim:headless                    # Phase 1: headless, in-memory, logs to stdout
SIM_PERSIST=true pnpm --filter @open-sphere/backend sim:headless     # same, but checkpoints to Postgres
pnpm --filter @open-sphere/backend world:viewer                      # Phase 2: serves http://localhost:4000
```

`sim:headless` runs the simulation forever at a configurable tick rate, printing significant events (spawn/feed/death) live and a population summary every N ticks. Stop with Ctrl+C — it prints a final summary before exiting.

With `SIM_PERSIST=true`, every `SIM_CHECKPOINT_INTERVAL` ticks (default 20) it checkpoints all live creatures into the `creatures` table (upserting `world_chunks` rows as needed) and flushes buffered creature-scoped events into `event_log`, in that order — `event_log.creature_id` is a real foreign key, so the creature must be checkpointed first. Creatures that die are removed from the in-memory World immediately (death is permanent), so the checkpoint diffs against the previous tick's id set and issues one final `lifecycle_state = 'dead'` update for anything that disappeared — which fires the death-memorial trigger. That trigger's own generic memorial row (tick 0, `source: db_trigger`) is intentionally left alongside the accurate one already flushed from the application (real tick, cause, age) — a deliberate, documented duplication rather than building suppression between two independent safety nets, since it's an extra audit-trail row, not a correctness bug.

`world:viewer` starts a Fastify app serving three things on one port: the static viewer page, the WebSocket world gateway (`chunk:snapshot`/`chunk:delta`, per [API Specification §3](../../05_API/APISpecification.md#3-websocket-events-socketio)), and the REST auth API under `/api/v1`. Open the printed URL in a browser for the viewer; hit the API directly for auth:

```bash
curl -X POST http://localhost:4000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"correct horse battery staple","displayName":"Alice"}'

curl http://localhost:4000/api/v1/users/me -H "Authorization: Bearer <accessToken from above>"
```

JWTs are RS256-signed (Security Specification §2); the keypair is auto-generated on first run into `apps/backend/.keys/` (gitignored) and reused across restarts — a dev-mode convenience only, not how production keys should be provisioned. Passwords are hashed with Argon2id via `@node-rs/argon2` (prebuilt native bindings, no local compiler needed). Add `SIM_PERSIST=true` to also checkpoint the simulation to Postgres exactly as described above for `sim:headless`.

**Redis Socket.IO adapter** (`SIM_REDIS_ADAPTER=true`): makes `io.emit()` fan out across every API instance sharing that Redis, not just sockets connected to this one process (Architecture §9 / NFR-SCAL-002). With a single instance it's a no-op in practice — wiring it now avoids a broadcast-layer rewrite once the backend actually scales horizontally.

**BullMQ world events** (`SIM_WORLD_EVENTS=true`): a repeatable BullMQ job (default every 60s, `SIM_WORLD_EVENT_INTERVAL_MS` to change it) fires a random world event (`FoodBloom` or `FoodShortage`), applying a time-boxed multiplier to `EventSystem`'s food spawn rate and broadcasting `world:event` over the gateway — the concrete mechanism Simulation & World Design §6 describes ("Events are implemented as time-boxed modifiers to system parameters... Scheduled job (BullMQ)"). `start()` clears any previously-registered repeatable schedule before adding a new one, since BullMQ keys a repeatable job by its repeat options (including the interval) — without that, restarting with a different interval would leave the old schedule running forever alongside the new one, which is exactly what happened during manual testing before this fix.

Env vars: `SIM_SEED`, `SIM_TICK_INTERVAL_MS`, `SIM_INITIAL_SNAKES`, `SIM_INITIAL_FOOD`, `SIM_SUMMARY_INTERVAL`, `SIM_PERSIST`, `SIM_CHECKPOINT_INTERVAL` (headless only), `SIM_SERVER_PORT`, `SIM_REDIS_ADAPTER`, `SIM_WORLD_EVENTS`, `SIM_WORLD_EVENT_INTERVAL_MS` (server only, default port 4000), plus `DATABASE_URL`/`REDIS_URL` from `.env`.

**Not yet implemented** (flagged rather than silently skipped): refresh-token rotation and logout (FR-ID-002 calls for rotating refresh tokens; only a 15-minute access token exists so far), and every other REST resource in [API Specification §2](../../05_API/APISpecification.md#2-rest-endpoints-mvp-surface) beyond auth (creatures, world, social, economy, billing, admin).

## Testing

```bash
pnpm --filter @open-sphere/backend test
```

Includes unit tests (ECS `World`, `UtilityAI` decision scoring, `VitalitySystem`, `RegisterUser`/`AuthenticateUser` against an in-memory `UserRepository` fake) and an integration test that runs the full system pipeline for thousands of ticks asserting: no exceptions, all Vitality values stay within valid bounds, every creature that stops existing has a corresponding `CreatureDied` memorial event, and two runs with the same seed produce an identical event sequence (determinism, per [Simulation & World Design §1](../../02_GAME_DESIGN/Simulation.md#1-simulation-model)).

This is the automated proxy for the Phase 1 exit criteria ("simulation runs unattended for 72h without crash/leak/divergence") — the integration test can't run 72h in CI, so it validates the same invariants (no crash, bounded state, deterministic) over a few thousand ticks instead. `WorldGateway`, the Prisma adapters, the full Fastify auth flow (register/duplicate-email/login/wrong-password/protected-route with no-token/valid-token/invalid-token, plus a direct check that the stored hash is real Argon2id), the Redis Socket.IO adapter (confirmed via raw `CLIENT LIST` that the pub/sub clients are actively `publish`/`subscribe`-ing, not just TCP-connected), and the BullMQ world-event scheduler (confirmed real `world:event` broadcasts on schedule, and that restarting with a different interval doesn't leave the old schedule running) were all verified manually against the real docker-compose stack rather than via automated tests, since CI doesn't provision these services yet and they're thin, mostly I/O-shaped adapters; an automated HTTP/WebSocket/queue test harness is worth adding once there's enough surface to justify it.
