# @open-sphere/backend

Phase 1 status: headless simulation engine only (see [Roadmap — Phase 1](../../01_PRODUCT/Roadmap.md)). No Fastify API, no database, no networking yet — those land in Phase 3 per the roadmap; building them earlier would mean coding against a contract that hasn't been validated by watching the simulation run.

## Layout

```text
src/
  contexts/simulation/
    domain/          # entities, components, systems, AI — zero framework imports
    application/      # SimulationClock, spawn use-cases (orchestration)
    infrastructure/    # InMemoryEventLog (Phase 1) — swapped for Postgres in Phase 3
  runtime/
    headless.ts        # entry point: runs the tick loop unattended, logs to stdout
```

This mirrors the layering in [Architecture §4](../../03_SOFTWARE_ARCHITECTURE/Architecture.md#4-layering-per-bounded-context--eventual-service): `domain/` never imports Fastify/Prisma/Socket.IO, which is what keeps the simulation core unit-testable and portable to its own worker process later.

## Running

```bash
pnpm install
pnpm --filter @open-sphere/backend sim:headless
```

Runs the simulation forever at a configurable tick rate, printing significant events (spawn/death) live and a population summary every N ticks. Stop with Ctrl+C — it prints a final summary before exiting.

Env vars: `SIM_SEED`, `SIM_TICK_INTERVAL_MS`, `SIM_INITIAL_SNAKES`, `SIM_INITIAL_FOOD`, `SIM_SUMMARY_INTERVAL`.

## Testing

```bash
pnpm --filter @open-sphere/backend test
```

Includes unit tests (ECS `World`, `UtilityAI` decision scoring, `VitalitySystem`) and an integration test that runs the full system pipeline for thousands of ticks asserting: no exceptions, all Vitality values stay within valid bounds, every creature that stops existing has a corresponding `CreatureDied` memorial event, and two runs with the same seed produce an identical event sequence (determinism, per [Simulation & World Design §1](../../02_GAME_DESIGN/Simulation.md#1-simulation-model)).

This is the automated proxy for the Phase 1 exit criteria ("simulation runs unattended for 72h without crash/leak/divergence") — the integration test can't run 72h in CI, so it validates the same invariants (no crash, bounded state, deterministic) over a few thousand ticks instead.
