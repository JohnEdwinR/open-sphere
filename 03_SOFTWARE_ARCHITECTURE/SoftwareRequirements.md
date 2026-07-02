# Software Requirements Specification (SRS)

Status: Draft v0.1 · Owner: Engineering · Standard: IEEE 29148 structure (requirement ID, statement, rationale, verification)

## 1. Introduction

### 1.1 Purpose

Specifies the software-level functional and non-functional requirements for Open Sphere, tracing to the [Business Requirements Specification](../01_PRODUCT/BusinessRequirements.md). This is the contract Architecture, Database, API, and Security specs must satisfy.

### 1.2 Scope

Covers MVP through Phase 5 (Premium & AI) as sequenced in the [Roadmap](../01_PRODUCT/Roadmap.md). Excludes items listed as MVP out-of-scope in the BRS §5.

### 1.3 Requirement ID Convention

`FR-<area>-NNN` for functional, `NFR-<category>-NNN` for non-functional. Each requirement includes a verification method: **T** (automated test), **I** (inspection/review), **D** (demonstration), **A** (analysis/load test).

## 2. Overall Description

### 2.1 System Context

```text
[Mobile App (RN/Expo)]  [Admin Web (React)]
        |  REST + WebSocket        |  REST
        v                          v
              [Backend API (Fastify)]
                       |
        +--------------+--------------+
        |              |              |
   [Simulation]   [Postgres/Prisma] [Redis + BullMQ]
   Engine (tick loop, authoritative)
```

### 2.2 User Classes

Free user, Premium subscriber, Guild member/officer, Admin/Ops, Moderator, Support agent — see [Security Specification §3](../06_SECURITY/SecuritySpecification.md) for the full role/permission matrix.

### 2.3 Operating Constraints

- Server: containerized (Docker), Node.js/TypeScript, deployed behind NGINX.
- Mobile: Android API 24+ target (adjust to current Play requirements at build time), iOS 15+ secondary.
- Must degrade gracefully on intermittent mobile connectivity (§ NFR-REL).

## 3. Functional Requirements

### 3.1 Simulation & World (traces to [Simulation & World Design](../02_GAME_DESIGN/Simulation.md))

| ID | Requirement | Verification |
| --- | --- | --- |
| FR-SIM-001 | The system shall run the world simulation server-side only; no client shall compute authoritative gameplay state. | I |
| FR-SIM-002 | The system shall process the simulation in discrete, configurable-rate ticks per subsystem. | T |
| FR-SIM-003 | The system shall model entities via a component-based schema such that a new entity type can be added by composing existing components without modifying existing systems. | D |
| FR-SIM-004 | The system shall drive creature decisions from a documented personality-trait set (§ Simulation Design §3) via a swappable `DecisionStrategy` interface. | I |
| FR-SIM-005 | The system shall persist a durable, queryable event log entry for every significant creature action (fed, fled, explored, fought, grew, died). | T |
| FR-SIM-006 | On recovery from a simulation outage, the system shall either deterministically fast-forward missed ticks or explicitly record a "world paused" interval; it shall never silently diverge simulated time from wall-clock time. | T |
| FR-SIM-007 | The system shall support chunk-based spatial partitioning of the world sufficient for future horizontal sharding without a data-model rewrite. | I |

### 3.2 Account & Identity

| ID | Requirement | Verification |
| --- | --- | --- |
| FR-ID-001 | The system shall support registration/login via email+password and at least one OAuth provider. | T |
| FR-ID-002 | The system shall issue short-lived JWT access tokens plus rotating refresh tokens. | T |
| FR-ID-003 | The system shall support account deletion and data export in compliance with GDPR/CCPA data-subject rights. | T, I |

### 3.3 Creature Ownership & Interaction

| ID | Requirement | Verification |
| --- | --- | --- |
| FR-CRE-001 | A user shall be able to own one creature on the free tier and additional creature slots via premium entitlement. | T |
| FR-CRE-002 | A user shall be able to submit cosmetic customization and naming for an owned creature; the system shall reject any customization request that would alter simulation-affecting attributes. | T |
| FR-CRE-003 | A user shall be able to view a creature's history/diary derived from its event log. | T, D |
| FR-CRE-004 | On creature death, the system shall generate a permanent memorial record visible to the owner and (per privacy settings) other users. | T |

### 3.4 Social

| ID | Requirement | Verification |
| --- | --- | --- |
| FR-SOC-001 | The system shall support friend requests, following, and a per-user activity feed. | T |
| FR-SOC-002 | The system shall support guilds with membership roles (member/officer/leader) and guild chat. | T |
| FR-SOC-003 | The system shall support global and guild-scoped chat with rate limiting and moderation hooks (§ Security). | T |
| FR-SOC-004 | The system shall support leaderboards computed from server-authoritative stats, refreshed on a defined cadence. | T |

### 3.5 Economy

| ID | Requirement | Verification |
| --- | --- | --- |
| FR-ECO-001 | The system shall maintain at least two currency types (soft: Coins/Seeds; hard: Gems) with server-authoritative balances. | T |
| FR-ECO-002 | The system shall support a marketplace for cosmetic items with fraud/bot-abuse controls prior to enabling any real-money currency purchase path. | T, A |
| FR-ECO-003 | The system shall grant daily, weekly, and seasonal rewards according to configurable, server-defined schedules. | T |

### 3.6 Notifications

| ID | Requirement | Verification |
| --- | --- | --- |
| FR-NOT-001 | The system shall push a notification for significant creature/world/social events the user has opted into. | T |
| FR-NOT-002 | Premium users shall receive materially faster notification delivery than free users, without altering simulation fairness (BR-1 compliance). | T, I |

### 3.7 Premium & Billing

| ID | Requirement | Verification |
| --- | --- | --- |
| FR-PAY-001 | The system shall integrate Google Play Billing and Apple StoreKit for monthly/quarterly/yearly subscription tiers. | T |
| FR-PAY-002 | The system shall gate premium-only features (cosmetics, analytics, replay, extra slots, exclusive animations, badges) strictly behind entitlement checks that never touch simulation-affecting state. | T, I |
| FR-PAY-003 | The system shall reconcile subscription state via platform server-to-server notifications (webhooks), not client-reported state alone. | T |

### 3.8 Admin

| ID | Requirement | Verification |
| --- | --- | --- |
| FR-ADM-001 | The admin panel shall allow authorized ops staff to monitor world/simulation health in near-real-time. | D |
| FR-ADM-002 | The admin panel shall allow authorized staff to trigger/schedule world events within defined safety bounds. | T |
| FR-ADM-003 | The admin panel shall provide moderation tools (mute, ban, content removal) with a full audit trail. | T, I |

## 4. Non-Functional Requirements

### 4.1 Performance

| ID | Requirement | Verification |
| --- | --- | --- |
| NFR-PERF-001 | p95 REST API latency shall be < 200ms under target load (excludes AI-narrative endpoints). | A |
| NFR-PERF-002 | Mobile app cold start shall be < 2s on a mid-tier Android device (target device class TBD by Product). | A |
| NFR-PERF-003 | The simulation tick loop shall complete each configured tick within its budget at the current entity-count target, with headroom logged/alerted before saturation. | A |

### 4.2 Scalability

| ID | Requirement | Verification |
| --- | --- | --- |
| NFR-SCAL-001 | The data model and simulation architecture shall support horizontal scaling toward millions of entities via chunk-based sharding without a breaking schema migration. | I |
| NFR-SCAL-002 | Stateless API/gateway services shall scale horizontally behind a load balancer with no sticky-session requirement beyond WebSocket connection affinity. | I, A |

### 4.3 Reliability & Availability

| ID | Requirement | Verification |
| --- | --- | --- |
| NFR-REL-001 | Simulation uptime shall be ≥ 99.5% excluding planned maintenance within SLA (BRS §7). | A |
| NFR-REL-002 | Planned deployments shall not require a full world pause (rolling upgrade capable) from Phase 3 onward. | D |
| NFR-REL-003 | The mobile client shall tolerate intermittent connectivity, showing last-known cached state (via MMKV) and reconnecting/syncing (via React Query) without data loss of user-submitted actions. | T |

### 4.4 Security

See [Security Specification](../06_SECURITY/SecuritySpecification.md) for full detail; summary requirements:

| ID | Requirement | Verification |
| --- | --- | --- |
| NFR-SEC-001 | All client-server traffic shall be encrypted in transit (TLS 1.2+). | I |
| NFR-SEC-002 | All write endpoints shall perform server-side input validation and authorization checks independent of client-side validation. | T |
| NFR-SEC-003 | The system shall implement rate limiting per user/IP on all public endpoints. | T |
| NFR-SEC-004 | The system shall maintain audit logs for all admin/moderation actions. | I |

### 4.5 Maintainability & Extensibility

| ID | Requirement | Verification |
| --- | --- | --- |
| NFR-MAINT-001 | Backend code shall follow Clean Architecture / DDD layering (domain isolated from framework/infrastructure). | I |
| NFR-MAINT-002 | New entity types and events shall be addable primarily via data/config rather than core-engine modification (traces FR-SIM-003). | I, D |

### 4.6 Usability & Accessibility

| ID | Requirement | Verification |
| --- | --- | --- |
| NFR-UX-001 | The mobile app shall support dark mode as the default/first-class theme. | D |
| NFR-UX-002 | The mobile app shall meet WCAG 2.1 AA-equivalent contrast and touch-target guidance where platform-applicable. | I |

## 5. Constraints

- No pay-to-win: no functional requirement may be implemented in a way that grants simulation advantage for payment (hard constraint, traces BR-1).
- Client never authoritative: every functional requirement touching creature/world state must specify server-side validation (traces BR-2).

## 6. Traceability Summary

Business objectives (BRS §2) → this SRS → [Architecture](./Architecture.md), [Database Design](../04_DATABASE/DatabaseDesign.md), [API Specification](../05_API/APISpecification.md), [Security Specification](../06_SECURITY/SecuritySpecification.md). Each downstream document should reference the FR/NFR IDs it implements.
