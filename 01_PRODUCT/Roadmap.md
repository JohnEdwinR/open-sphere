# Roadmap

Status: Draft v0.1 · Owner: Product/Engineering

This roadmap sequences work so that every phase produces something independently testable and de-risks the highest-uncertainty piece (the simulation) first. Dates are intentionally omitted (effort-sized instead) since team size/velocity are not yet fixed — see each phase's Development Effort in its future module design doc for detail.

## Phase 1 — Simulation Engine (Core Risk Reduction)

**Goal:** Prove the tick-based, entity-driven simulation is fun to *observe* and technically sound, before any networking/mobile investment.

- Entity-Component-style simulation core (see [Simulation & World Design](../02_GAME_DESIGN/Simulation.md)).
- Snake entity: movement, hunger, growth, death.
- Food entity + spawn logic.
- Personality-trait-driven decision loop (utility AI, minimal Behavior Tree).
- Deterministic, configurable tick rate; headless (no UI) — validated via logs/tests + a debug visualizer, not the real client.
- Exit criteria: simulation runs unattended for 72h without crash/leak/divergence; a debug observer can watch believable emergent behavior.

## Phase 2 — World Viewer (Prove Observability)

**Goal:** Prove the world is worth watching before building the full mobile app around it.

- Minimal read-only renderer (web or bare RN screen) subscribed to simulation state via WebSocket.
- Chunk-based world rendering, camera pan/zoom.
- No auth, no persistence yet — a "fishbowl" client.
- Exit criteria: internal playtesters can watch the world and describe an emergent "story" (a snake's day) without developer narration.

## Phase 3 — Backend & Persistence

**Goal:** Make the world real and durable.

- PostgreSQL schema + Prisma models ([Database Design](../04_DATABASE/DatabaseDesign.md)).
- Redis for hot simulation state / pub-sub / caching.
- BullMQ for async jobs (notifications, analytics rollups, scheduled events).
- Fastify REST + Socket.IO gateway ([API Specification](../05_API/APISpecification.md)).
- Auth (JWT + OAuth), user accounts, creature ownership.
- Rolling-upgrade-capable deployment (no full-world-pause deploys) — required to satisfy BR-3 in the [Business Requirements Specification](./BusinessRequirements.md).
- Exit criteria: world state survives a server restart with zero data loss; a user's creature persists across sessions and continues evolving while the user is offline.

## Phase 4 — Mobile App

**Goal:** Ship the real client.

- React Native + Expo app: auth, world viewer, creature detail, inventory, notifications, profile, friends.
- Offline-tolerant UI (cached last-known state via MMKV, React Query for sync).
- Push notifications (creature events, social events).
- Exit criteria: closed alpha on Android with real users observing and interacting with their own creature across multiple sessions/days.

## Phase 5 — Premium & AI

**Goal:** Monetization and differentiated narrative features, without violating BR-1 (no pay-to-win).

- Subscription billing integration (Google Play Billing, Apple StoreKit), tiers (monthly/quarterly/yearly).
- Cosmetics store, exclusive animations, badges, additional creature slots, replay history, historical analytics.
- AI narrative layer: snake diary / daily summaries / event explanations — template-based first, hybrid local+cloud LLM second (see [Simulation & World Design §7](../02_GAME_DESIGN/Simulation.md)).
- Admin panel v1 (ops, moderation, event triggering).
- Exit criteria: premium purchase flow passes store review; AI narrative ships behind a feature flag with cost controls.

## Phase 6 — Public Beta

**Goal:** Validate business success criteria under real load.

- Open beta on Android (iOS beta gated on Android stability).
- Load testing to the entity-count target for the next scaling phase (not yet millions — validated increment, e.g. 10k–100k concurrent entities).
- Observability stack live in production (Prometheus/Grafana/Loki/Sentry).
- Exit criteria: [Business Requirements §7 success criteria](./BusinessRequirements.md#7-success-criteria-business-level-acceptance) tracked and reviewed at end of beta.

## Post-MVP (Not Sequenced Yet)

Explicitly deferred, architected-for-but-not-built in MVP: additional creature species, world sharding/multi-region, guild wars/social competition depth, marketplace real-money-adjacent features, full on-device LLM narrative, desktop client.
