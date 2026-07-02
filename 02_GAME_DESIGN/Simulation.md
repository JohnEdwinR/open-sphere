# Simulation & World Design

Status: Draft v0.1 · Owner: Game Design / Simulation Engineering

## 1. Simulation Model

- **Authoritative, server-only.** The simulation is the single source of truth. Clients never compute gameplay-affecting state; they render snapshots/deltas pushed from the server ([Business Requirements BR-2](../01_PRODUCT/BusinessRequirements.md)).
- **Tick-based.** The world advances in discrete ticks. Tick rate is configurable per subsystem — e.g., fine-grained movement may tick every 1–2s, while weather/season state ticks every few minutes. Decoupling tick rates per subsystem avoids paying fine-grained cost for slow-changing systems.
- **Deterministic within a tick.** Given the same input state and RNG seed, a tick's outcome is reproducible — required for testing, replay, and eventual sharded consistency checks.
- **Entity-Component pattern.** See §2. Chosen specifically so new entity types (future species, objects, weather cells) require composing existing components rather than engine changes, satisfying the "future entities should require minimal engine changes" requirement.

## 2. Entity System

Every simulated object — Snake, Food, Tree, Rock, Water, Egg, Nest, Weather cell, Plant, future Animal species — is an **Entity**: an ID plus a set of **Components** (pure data) processed by stateless **Systems**.

### 2.1 Core Components (MVP)

| Component | Holds | Applies To |
| --- | --- | --- |
| `Transform` | position (chunk + local coords), facing/heading | all entities |
| `Vitality` | hunger, energy, health, age, growth stage | creatures |
| `Personality` | trait values (see §3) | creatures |
| `Perception` | senses radius, known-entity memory buffer | creatures |
| `Movement` | speed, current path/target, movement state | creatures |
| `Consumable` | nutrition value, decay timer | food/plants |
| `Lifecycle` | spawn tick, despawn/death conditions | all entities |
| `Ownership` | owning user ID (nullable — wild entities have none) | creatures |
| `Genetics` | trait inheritance data, mutation seed | creatures (reproduction-capable) |
| `Territory` | claimed chunk range, claim strength | creatures (later phase) |

### 2.2 Core Systems (MVP)

Processed in a fixed order each tick: `Perception -> Decision (AI) -> Movement -> Consumption -> Vitality -> Lifecycle -> Event`. Each system reads/writes only its relevant components, enabling systems to be added (e.g., `Disease`, `Reproduction`, `Migration`) without touching unrelated systems — this is the concrete mechanism behind "future entities require minimal engine changes."

### 2.3 Adding a New Entity Type (Design Contract)

To add a new entity type, a designer/engineer should only need to: (1) define which existing components it uses, (2) add any genuinely new components, (3) opt existing systems in via component presence (a system runs on an entity iff it has the required components — no special-casing by entity type name). This contract is a hard requirement for Phase 1 acceptance, since the entire "future species" roadmap item depends on it.

## 3. Creature AI

### 3.1 Personality Traits (MVP set)

`aggression, fear, curiosity, patience, greed, exploration, intelligence, memory, confidence, hunger`. Each is a normalized value (0.0–1.0), rolled at creature creation (influenced by [Genetics](#4-genetics--reproduction-future-phase-hooks)) and slowly mutable over the creature's life based on experience (e.g., repeated successful hunts increase confidence).

### 3.2 Decision Architecture

- **MVP:** Utility AI. Each candidate action (seek food, flee, explore, rest, approach another creature) gets a score computed from current Vitality + Personality + Perception state; highest-scoring action is chosen each decision tick. Utility AI is chosen for MVP over Behavior Trees because it produces smoother, less "obviously scripted" emergent behavior from a small trait set, and is simpler to tune/balance initially.
- **Future-ready:** the Decision system is defined behind an interface (`DecisionStrategy`) so a Behavior Tree or hybrid (Utility AI for low-level survival + Behavior Tree for scripted event responses) can be introduced per-species without changing the simulation loop contract.

### 3.3 Memory & Perception

Creatures retain a bounded recent-memory buffer (sized by the `memory` trait) of perceived entities/events (last-seen food location, last threat, other known creatures). This buffer is what turns personality traits into apparently-intentional behavior ("this snake avoids the spot where it was almost eaten") without scripting.

## 4. Genetics & Reproduction (Future-Phase Hooks)

Not in MVP gameplay-facing scope, but the `Genetics` component and trait-inheritance model must exist from Phase 1 so reproduction can be added later without a data migration on live creatures. Model: each personality trait + a small set of physical traits (size ceiling, coloration seed) are stored as an allele pair; offspring traits are sampled from parent alleles with a small mutation chance.

## 5. World Structure

- **Chunk-based**, infinite-expansion-ready. A chunk is a fixed-size grid region owning the entities currently within it; chunks are the unit of spatial partitioning for query performance and, later, for horizontal simulation sharding (a shard owns a contiguous set of chunks).
- **Procedural generation ready**: chunk terrain/biome is generated from a seeded noise function on first access, not hand-authored, so world expansion doesn't require content-team output.
- **Biomes (roadmap, not all MVP):** Forest, Desert, River, Lake, Mountain, Cave, Swamp, Snow, Volcano. MVP ships a reduced biome set (e.g., Forest + River + Desert) sufficient to make weather/food variation meaningful; the biome interface supports adding more without engine change (a biome is data: spawn tables, weather-modifier table, movement-cost modifiers).

## 6. Event System

| Cadence | Examples | Trigger |
| --- | --- | --- |
| Daily | Food shortage, local weather shift | Scheduled job (BullMQ) |
| Weekly | Migration wave, mutation window | Scheduled job |
| Monthly | Season change, community challenge | Scheduled job |
| Global/random | Meteor, storm, flood, heatwave, solar eclipse | Weighted random roll, ops-triggerable |
| Community | Voting-driven events, prediction outcomes | Player-driven aggregate action |

Events are implemented as time-boxed modifiers to system parameters (e.g., a heatwave raises hunger-drain rate and lowers water availability in affected chunks) rather than bespoke one-off code paths, so new events are primarily data/config plus a modifier function — keeping the event system extensible without proportional engineering cost per event.

## 7. AI-Generated Narrative (Diary / Summaries)

Every simulated action (fed, fled a threat, explored a new chunk, fought, grew, died) is appended to a per-creature **event log** (durable, queryable — see [Database Design](../04_DATABASE/DatabaseDesign.md)). Narrative features consume this log; they never influence simulation outcomes (a hard boundary, since narrative is a premium+free hybrid feature and must never touch BR-1/BR-2).

- **MVP:** template-based summarization ("Today, {name} caught 3 meals and explored the eastern riverbank.") — cheap, deterministic, no inference cost.
- **Phase 5:** hybrid AI — on-device local LLM (Gemma/Qwen/Llama via GGUF + llama.cpp or MLC LLM) for common summaries (cost-free, private, offline-capable), cloud LLM for premium/higher-quality narration and natural-language world queries. Local AI is explicitly never used for anything authoritative — it only reads the event log and produces text.

## 8. World Continuity Rules

Per [Business Requirements BR-3](../01_PRODUCT/BusinessRequirements.md), the simulation must not silently skip ticks. If the simulation process is unavailable for a period, on recovery it must either (a) fast-forward deterministically through the missed ticks if computationally feasible, or (b) explicitly log a "world paused" interval that is surfaced narratively rather than hidden. Silent divergence between wall-clock time and simulated world time is not acceptable.

## 9. Related Documents

- [Core Gameplay](./CoreGameplay.md)
- [Software Requirements Specification](../03_SOFTWARE_ARCHITECTURE/SoftwareRequirements.md)
- [Architecture](../03_SOFTWARE_ARCHITECTURE/Architecture.md)
- [Database Design](../04_DATABASE/DatabaseDesign.md)
