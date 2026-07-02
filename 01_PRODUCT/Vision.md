# Product Vision

## 1. Purpose

Open Sphere is a persistent, server-authoritative living world in which users own digital creatures (initial species: snakes) that exist, act, and evolve inside a single shared simulation that runs continuously — 24/7/365 — independent of whether any given user is connected. The mobile application is a *window into the world*, not the world itself. Users are caretakers, collectors, strategists, and community members rather than players executing a fixed win condition.

Working title: **Open Sphere**. Internal engineering codename: **Project Serpent**. "Open Sphere" is used in all external/product-facing material; "Project Serpent" may persist in historical commit/doc references but should not appear in new user-facing copy.

## 2. Problem Statement

Idle/incremental and pet-simulation mobile games typically fall into one of two failure modes:

1. **Fake persistence** — the world only advances via client-side math extrapolated from "time since last opened," producing no real shared state and no emergent stories.
2. **Shallow retention loops** — engagement is driven by timers and push notifications rather than genuine curiosity about a living system.

Open Sphere's differentiator is a real, shared, tick-based simulation with authoritative server state, personality-driven AI, and systemic emergent narrative (a creature's "diary" is a byproduct of actual simulated events, not generated flavor text). This is closer to an MMO-lite ecosystem than a traditional idle game.

## 3. Target Users

| Segment                    | Motivation                         | Primary Value                                |
| --------------------------- | ----------------------------------- | ---------------------------------------------- |
| Idle/incremental players   | Progression without twitch input   | Passive growth, collection, rewards          |
| Collectors                 | Acquisition, rarity, completeness  | Cosmetics, genetics, marketplace             |
| Community/social users     | Belonging, competition, cooperation | Guilds, chat, leaderboards, events           |
| Relaxation seekers         | Low-stakes ambient entertainment   | World viewer, ambient sound/animation        |
| Students / office workers  | Short, frequent check-ins          | Fast mobile-first sessions, notifications    |

## 4. Product Pillars

1. **The world is the product.** All investment goes into simulation depth and world coherence before UI polish.
2. **Server authoritative, always.** No gameplay-critical logic ever executes on-device. Clients render server-computed state.
3. **Never pay-to-win.** Monetization is strictly cosmetic, informational (analytics/history), or convenience (slots, notification speed) — never simulation advantage.
4. **Mobile-first, not mobile-only-eventually.** Every design decision (payload size, animation cost, battery, offline tolerance) is made for Android/iOS first; desktop is out of scope for MVP.
5. **Systemic emergence over scripted content.** Stories, events, and personality-driven behavior emerge from simulation rules, not hand-authored scripts, so the world scales in richness without linear content-team cost.

## 5. Success Metrics

Primary (drive product decisions):

- **D1 / D7 / D30 retention** — target D1 ≥ 40%, D30 ≥ 12% at steady state (industry benchmark for idle/collector hybrids).
- **DAU/MAU ratio** ("stickiness") — target ≥ 20%, reflecting habitual daily check-ins rather than one-off installs.
- **Average session length and sessions/day** — expect short (2–5 min), frequent (3+/day) sessions; long session length is a *warning sign* of UI friction, not engagement.
- **Free → paid subscription conversion rate** — target 3–5% of MAU, benchmarked against premium-cosmetic mobile subscriptions.
- **Subscriber churn (monthly)** — target < 6%/month for the yearly-eligible cohort.

Secondary (diagnose the above):

- Push notification opt-in rate and CTR (proxy for "world pulls users back").
- Marketplace/economy transaction volume (proxy for engagement depth).
- Social graph density (friends/guild membership per active user).
- Crash-free session rate ≥ 99.5%, p95 API latency < 200ms (quality gates, not growth metrics, but retention-blocking if violated).

## 6. Non-Goals (MVP)

- No desktop client.
- No pay-to-win mechanics of any kind (stat boosts, exclusive power items, matchmaking advantages).
- No user-generated simulation content (custom scripting) in MVP — future extensibility is architected for, not shipped.
- No real-money trading / NFT / blockchain integration.
- No PvP combat with direct stat-based win/lose outcomes tied to spend.

## 7. Related Documents

- [Business Requirements Specification](./BusinessRequirements.md)
- [Roadmap](./Roadmap.md)
- [Core Gameplay](../02_GAME_DESIGN/CoreGameplay.md)
- [Simulation & World Design](../02_GAME_DESIGN/Simulation.md)
- [Software Requirements Specification](../03_SOFTWARE_ARCHITECTURE/SoftwareRequirements.md)
- [Architecture](../03_SOFTWARE_ARCHITECTURE/Architecture.md)
