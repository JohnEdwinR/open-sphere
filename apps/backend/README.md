# @open-sphere/backend

Phase 1 + Phase 2 status (see [Roadmap](../../01_PRODUCT/Roadmap.md)): the simulation engine plus a WebSocket "fishbowl" viewer. Still no Fastify REST API, auth, or database — those land in Phase 3; introducing them earlier would mean coding against a contract that hasn't been validated by watching the simulation run.

## Layout

```text
src/
  contexts/simulation/
    domain/          # entities, components, systems, AI — zero framework imports
    application/       # SimulationClock, spawn use-cases, bootstrapSimulation() (orchestration)
    infrastructure/    # InMemoryEventLog (Phase 1) — swapped for Postgres in Phase 3
    interface/
      websocket/        # WorldGateway — translates World state to the API spec's chunk:snapshot/chunk:delta
  runtime/
    headless.ts         # Phase 1 entry point: runs the tick loop unattended, logs to stdout
    server.ts            # Phase 2 entry point: serves the viewer + broadcasts world state over WebSocket
public/
  index.html              # Phase 2 "fishbowl" viewer — plain canvas + socket.io-client, no build step
```

This mirrors the layering in [Architecture §4](../../03_SOFTWARE_ARCHITECTURE/Architecture.md#4-layering-per-bounded-context--eventual-service): `domain/` never imports Fastify/Prisma/Socket.IO, which is what keeps the simulation core unit-testable and portable to its own worker process later. `interface/websocket/` is the only place that knows about Socket.IO — swapping transports later (or adding the Phase 3 REST layer) doesn't touch domain or application code.

## Running

```bash
pnpm install
pnpm --filter @open-sphere/backend sim:headless   # Phase 1: headless, logs to stdout
pnpm --filter @open-sphere/backend world:viewer    # Phase 2: serves http://localhost:4000
```

`sim:headless` runs the simulation forever at a configurable tick rate, printing significant events (spawn/feed/death) live and a population summary every N ticks. Stop with Ctrl+C — it prints a final summary before exiting.

`world:viewer` starts an HTTP server that serves the static viewer page and broadcasts world state over Socket.IO (`chunk:snapshot` on connect, `chunk:delta` per tick, per [API Specification §3](../../05_API/APISpecification.md#3-websocket-events-socketio)). Open the printed URL in a browser: drag to pan, scroll to zoom. No auth, no persistence — restarting the server resets the world, matching the Roadmap's explicit Phase 2 scope ("fishbowl" client).

Env vars: `SIM_SEED`, `SIM_TICK_INTERVAL_MS`, `SIM_INITIAL_SNAKES`, `SIM_INITIAL_FOOD`, `SIM_SUMMARY_INTERVAL` (headless only), `SIM_SERVER_PORT` (server only, default 4000).

## Testing

```bash
pnpm --filter @open-sphere/backend test
```

Includes unit tests (ECS `World`, `UtilityAI` decision scoring, `VitalitySystem`) and an integration test that runs the full system pipeline for thousands of ticks asserting: no exceptions, all Vitality values stay within valid bounds, every creature that stops existing has a corresponding `CreatureDied` memorial event, and two runs with the same seed produce an identical event sequence (determinism, per [Simulation & World Design §1](../../02_GAME_DESIGN/Simulation.md#1-simulation-model)).

This is the automated proxy for the Phase 1 exit criteria ("simulation runs unattended for 72h without crash/leak/divergence") — the integration test can't run 72h in CI, so it validates the same invariants (no crash, bounded state, deterministic) over a few thousand ticks instead. `WorldGateway` (Phase 2) was verified manually against a real `socket.io-client` rather than via an automated test, since it's a thin, mostly I/O-shaped adapter; an automated WebSocket-contract test is worth adding once Phase 3 introduces a proper API test harness.
