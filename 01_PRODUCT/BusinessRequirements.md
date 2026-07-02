# Business Requirements Specification (BRS)

Status: Draft v0.1 · Owner: Product · Standard: informed by IEEE 29148 (Stakeholder Requirements)

## 1. Introduction

### 1.1 Purpose

Defines the business-level requirements for Open Sphere — the "why" that all downstream Software/System Requirements, Architecture, and Design documents must trace back to. This document does not specify implementation.

### 1.2 Scope

Covers the MVP business scope: a mobile (Android-first, iOS-secondary) freemium living-world application with a persistent server-side snake simulation, subscription monetization, and an admin web panel. Excludes desktop clients, blockchain/NFT integration, and any pay-to-win mechanic.

### 1.3 Definitions

| Term | Definition |
| --- | --- |
| World | The single persistent, shared simulation instance (sharded by region/chunk in later phases). |
| Tick | One discrete simulation step, server-authoritative. |
| Entity | Any simulated object in the world (creature, food, weather cell, etc.). |
| Creature | A user-owned entity capable of autonomous behavior (MVP: snake). |
| Caretaker | The product's term for a user in their primary relationship to a creature (not "player"). |
| Premium | Paid subscription tier (monthly/quarterly/yearly). |

## 2. Business Objectives

| ID | Objective | Rationale |
| --- | --- | --- |
| BO-1 | Launch a mobile app with a genuinely persistent, server-simulated world by MVP | Core differentiator vs. fake-idle competitors |
| BO-2 | Reach D30 retention ≥ 12% and DAU/MAU ≥ 20% within 2 quarters of public beta | Validates the "living world" thesis drives habitual use |
| BO-3 | Convert 3–5% of MAU to paid subscription without any pay-to-win mechanic | Sustainable, ethical monetization; protects long-term trust/brand |
| BO-4 | Architect the simulation and backend to scale toward millions of concurrent entities without a rewrite | Avoid the common idle-game failure of a v1 architecture that can't survive success |
| BO-5 | Support continuous live-ops (events, seasons, new species) without app store resubmission for content changes | Content velocity as a retention lever |

## 3. Stakeholders

| Stakeholder | Interest |
| --- | --- |
| End users (caretakers) | A trustworthy, fair, relaxing, evolving world worth returning to |
| Product/Business owner | Retention, conversion, LTV, brand trust (no pay-to-win) |
| Engineering | A maintainable, scalable, secure system that doesn't accrue unmanageable technical debt |
| Platform holders (Google Play / Apple App Store) | Policy compliance (subscriptions, data privacy, content rating) |
| Regulators / privacy authorities | GDPR/CCPA compliance, data minimization, child-safety (COPPA-adjacent, given student segment) |

## 4. Business Rules

- **BR-1 — No pay-to-win.** No purchasable item, subscription tier, or currency may alter simulation outcomes (creature stats, survival odds, combat results, growth rate caps beyond what is achievable for free via play). Premium purchases are limited to: cosmetics, statistics/analytics, historical data & replay, AI/narrative features, additional creature slots, notification speed/frequency, exclusive (visual-only) animations, and badges.
- **BR-2 — Server authority.** All state that affects fairness, economy, or simulation outcome must be computed and validated server-side. Client-submitted state is never trusted for anything beyond input intent.
- **BR-3 — World continuity.** The simulation must not pause for maintenance windows longer than a defined SLA (target: ≤ 15 min/month planned downtime, rolling-upgrade architecture from Phase 3 onward); any unavoidable pause must be narratively/mechanically accounted for (e.g., "hibernation" in-world explanation), never silently skip ticks without record.
- **BR-4 — Subscription transparency.** Pricing, renewal terms, and cancellation must comply with Apple/Google subscription policy and be presented before purchase; no dark patterns.
- **BR-5 — Data minimization.** Collect only data necessary for gameplay, analytics, and abuse prevention; no sale of personal data to third parties.
- **BR-6 — Fair economy.** In-game marketplace and currency systems must include anti-fraud and anti-bot controls before any real-money-adjacent feature (currency purchase) ships.

## 5. Scope Boundaries (MVP)

**In scope:**
- Android + iOS mobile client, single shared world (single shard acceptable for MVP, architecture must not preclude sharding later).
- Snake as the sole creature species.
- Core simulation systems: movement, food, growth, weather, death, basic events, personality-driven AI.
- Authentication, profile, friends, guilds (basic), leaderboards, notifications, inventory, cosmetics store.
- Freemium subscription (3 billing cycles) via platform billing (Google Play Billing / Apple StoreKit).
- Admin web panel for ops (world monitoring, event triggering, moderation, user support).

**Out of scope (MVP):**
- Desktop client.
- Additional creature species beyond snake.
- Real-time PvP combat with skill-based matchmaking.
- Third-party marketplace / real-money trading.
- Fully generative (cloud LLM) AI features — MVP ships with template-based narrative; on-device/cloud LLM narrative is a Phase 5 feature.
- Multi-region world sharding (single-shard world is acceptable; the architecture must be shard-ready, not shard-complete).

## 6. Assumptions & Constraints

- Assumes managed cloud infrastructure (containerized deployment; specific cloud provider TBD, architecture is provider-agnostic via Docker).
- Assumes App Store / Play Store review cycles (~1–7 days) are accounted for in release cadence.
- Assumes initial team size supports one shared PostgreSQL instance and Redis cluster; horizontal scaling is deferred until real load data exists (avoid premature infra spend).
- Constraint: no gameplay-critical logic may ship client-side, even under time pressure — this is a standing architectural constraint, not a per-feature decision.

## 7. Success Criteria (Business-Level Acceptance)

The MVP is considered a business success if, within 2 quarters of public beta:
1. D1 retention ≥ 40%, D30 ≥ 12%.
2. Zero confirmed pay-to-win incidents (tracked via community/security audit).
3. Subscription conversion ≥ 3% of MAU.
4. Platform policy compliance maintained (no store suspension/strike).
5. Simulation uptime ≥ 99.5% (excluding planned maintenance within SLA).

## 8. Related Documents

- [Product Vision](./Vision.md)
- [Roadmap](./Roadmap.md)
- [Software Requirements Specification](../03_SOFTWARE_ARCHITECTURE/SoftwareRequirements.md)
- [Security Specification](../06_SECURITY/SecuritySpecification.md)
