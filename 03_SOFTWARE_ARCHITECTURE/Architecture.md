# System & Technical Architecture

Status: Draft v0.1 · Owner: Engineering · Traces: [Software Requirements Specification](./SoftwareRequirements.md)

## 1. Architectural Style

Clean Architecture / Hexagonal (ports & adapters) per service, Domain-Driven Design for bounded contexts, event-driven integration between contexts, CQRS-ready (read models may diverge from write models once query load demands it — not required at MVP scale). Microservice-*ready*, not microservice-*mandatory* at MVP: the backend ships as a modular monolith with enforced module boundaries so it can be split into services later without a redesign, avoiding premature distributed-systems tax at current scale.

## 2. Bounded Contexts

| Context | Owns | Notes |
| --- | --- | --- |
| Simulation | Entities, ticks, AI decisions, world state | The core domain; highest isolation, no framework dependencies in domain layer |
| Identity | Users, auth, sessions | Standard auth domain |
| Social | Friends, guilds, chat, activity feed | Depends on Identity |
| Economy | Currencies, marketplace, inventory, rewards | Depends on Identity; reads Simulation events, never writes simulation state |
| Notifications | Push delivery, preferences | Consumes domain events from all contexts |
| Billing | Subscriptions, entitlements | Source of truth for premium gating; integrates platform billing webhooks |
| Narrative/AI | Diary/summary generation | Read-only consumer of Simulation event log; never writes back |
| Admin/Ops | Moderation, event triggering, world monitoring | Cross-cutting, elevated permissions |

Each context exposes a well-defined internal API (application services) and communicates cross-context via an **event bus** (in-process pub/sub at MVP, backed by Redis; swappable for a message broker like NATS/Kafka once split into real services) rather than direct database access across contexts — this is the load-bearing decision that keeps the modular monolith splittable later.

## 3. System Diagram

```text
                     +----------------------+
                     |   Mobile (RN/Expo)   |
                     +----------+-----------+
                                |  REST (Fastify) + WebSocket (Socket.IO)
                                v
                     +----------------------+        +----------------------+
                     |    Backend API       |<------>|   Admin Web (React)  |
                     |  (Fastify, modular   |  REST  +----------------------+
                     |   monolith, DDD      |
                     |   bounded contexts)  |
                     +----+------+------+---+
                          |      |      |
              +-----------+  +---+--+  +---------------+
              |              |      |                  |
        +-----v-----+  +-----v---+ +v----------+  +-----v------+
        | Simulation|  | Postgres| |   Redis    |  |   BullMQ   |
        |  Engine   |  | (Prisma)| | (cache, pub/sub, hot state)| (async jobs:
        | (tick loop)|  +--------+ +------------+  | notifications,
        +-----------+                              | rollups, events)
                                                     +------------+
```

## 4. Layering (per bounded context / eventual service)

```text
domain/        <- entities, value objects, domain events, pure business rules (no framework imports)
application/   <- use cases / application services, orchestrate domain + ports
infrastructure/<- Prisma repositories, Redis adapters, Socket.IO adapters, external SDKs
interface/     <- Fastify route handlers, WebSocket event handlers, DTO <-> domain mapping
```

Dependency rule: outer layers depend inward only. `domain/` has zero dependency on Fastify/Prisma/Socket.IO, which is what makes the simulation core portable (e.g., extractable into a dedicated worker/service without touching business logic) and independently unit-testable.

## 5. Simulation Engine Placement

The simulation tick loop runs as its own long-lived process (not inside an HTTP request/response cycle), owning in-memory authoritative state for the chunks it's responsible for, checkpointing to PostgreSQL on a configurable interval and publishing deltas to Redis pub/sub for the API/gateway layer to fan out over Socket.IO. This separation is what allows Phase-1 (headless simulation) to be built and validated before any networking layer exists, and is the seam along which future chunk-sharded simulation workers will split.

## 6. Client Architecture (Mobile)

- **State:** Zustand for local/UI state, React Query for server-state caching/sync, MMKV for persisted offline cache — chosen so the client never invents authoritative state; React Query's cache is explicitly treated as "last known," not "current truth."
- **Rendering:** React Native Skia + Reanimated for world/creature rendering and smooth animation without bridging cost per frame.
- **Realtime:** Socket.IO client subscribes to the user's relevant world channels (owned creature's chunk + social channels); REST is used for request/response actions (purchases, customization submissions, social actions).
- **Native modules:** reserved for on-device LLM inference (Phase 5) and any platform billing SDK integration.

## 7. Admin Web Architecture

React + Vite + TypeScript + Tailwind + Shadcn, talking to the same Backend API over REST with elevated-permission tokens (see [Security Specification](../06_SECURITY/SecuritySpecification.md)). No separate backend — the Admin context is a bounded context within the same API, not a parallel system, to avoid duplicated business logic/drift.

## 8. Infrastructure

- **Containerization:** Docker for all services (API, simulation worker, admin web, Postgres, Redis) with Docker Compose for local dev and a container-orchestration target (specific platform TBD — architecture assumes standard container orchestration semantics, not a specific vendor) for production.
- **CI/CD:** GitHub Actions — lint/typecheck/test on PR, build+push images on merge, deploy pipeline gated by health checks.
- **Edge/CDN:** Cloudflare for static asset delivery, DDoS mitigation, and TLS termination at the edge.
- **Observability:** Prometheus (metrics) + Grafana (dashboards) + Loki (logs) + Sentry (error tracking/crash reporting, mobile + backend).
- **Object storage:** MinIO (S3-compatible) for user-generated/cosmetic assets, replay data blobs.

## 9. Cross-Cutting Concerns

- **Event Bus:** domain events (e.g., `CreatureDied`, `SeasonChanged`, `SubscriptionRenewed`) are the integration mechanism between bounded contexts; consumers (Notifications, Narrative/AI, Economy) subscribe rather than being called synchronously, keeping contexts decoupled and making new consumers additive.
- **Dependency Injection:** application services receive infrastructure ports via constructor injection, enabling test doubles for Postgres/Redis/Socket.IO in unit tests without a running database.
- **Repository Pattern:** all persistence access goes through repository interfaces defined in `domain/`/`application/`, implemented in `infrastructure/` via Prisma — keeps domain logic testable and Prisma swappable in principle.
- **Versioned API:** REST routes are versioned (`/api/v1/...`); breaking changes ship as a new version rather than mutating existing contracts (mobile release lag makes this non-optional — see [API Specification](../05_API/APISpecification.md)).

## 10. Why a Modular Monolith, Not Microservices, at MVP

Given the target scale eventually is "millions of entities," it may seem microservices should be mandatory from day one. They are deliberately deferred because: (1) the team/traffic at MVP does not justify the operational cost (service discovery, distributed tracing, network-partition handling) that microservices impose; (2) the bounded-context + event-bus discipline described above means the *split points* are already correct — extracting a service later is a deployment change, not a redesign; (3) the one context most likely to need independent scaling early — Simulation — is already isolated as its own process (§5), so the highest-value split is available immediately without paying for the rest.

## 11. Related Documents

- [Software Requirements Specification](./SoftwareRequirements.md)
- [Database Design](../04_DATABASE/DatabaseDesign.md)
- [API Specification](../05_API/APISpecification.md)
- [Security Specification](../06_SECURITY/SecuritySpecification.md)
