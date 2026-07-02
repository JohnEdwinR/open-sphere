# Core Gameplay

Status: Draft v0.1 · Owner: Game Design

## 1. Core Loop

```text
Open app
  -> Observe world (creature + surrounding chunk state, rendered from server-authoritative snapshot)
  -> Receive updates (what happened since last session: events, growth, social)
  -> Collect rewards (daily/weekly/season rewards, event drops)
  -> Customize creature (cosmetics only — never stat-affecting)
  -> Interact with community (chat, guild, reactions, leaderboards)
  -> Leave
  -> World continues evolving (server keeps ticking; nothing pauses for the user)
  -> Receive notification (a significant event happened to your creature or world)
  -> Return later
```

The loop is intentionally not "session-gated" — there is no energy/stamina system forcing app closure. The pull to leave is that there is nothing left to *do* right now (everything meaningful already happened or is happening on its own), and the pull to return is genuine curiosity about what changed, reinforced by notifications.

## 2. Core Systems (Player-Facing Surface)

| System | Player-Facing Behavior | Authoritative Source |
| --- | --- | --- |
| Movement | Creature is shown moving/exploring the world in near-real-time or via snapshot replay | Simulation engine (server) |
| Food | Creature seeks/consumes food; hunger visibly affects behavior/appearance | Simulation engine |
| Growth | Creature size/stage changes over time based on simulated feeding history | Simulation engine |
| Weather | World-wide weather affects visuals and creature behavior | Simulation engine |
| Events | Time-boxed world events (see [Simulation & World Design §6](./Simulation.md)) | Event system (server) |
| Death | Permanent (with narrative weight) or "hibernation" depending on species rules — MVP snake death is permanent, generates a memorial/history entry | Simulation engine |
| History | Every significant action is recorded and viewable (diary, timeline, replay) | Event log / analytics store |

## 3. Session Design

- **Micro-session (30s–2min):** open app, glance at creature status, collect a reward, close. This is the *majority* expected session type and must be fast (cold start < 2s target, see [Software Requirements Specification](../03_SOFTWARE_ARCHITECTURE/SoftwareRequirements.md)).
- **Short session (2–5min):** the above plus one social/customization action (chat, cosmetic change, marketplace browse).
- **Long session (5min+):** world exploration, guild interaction, event participation — expected to be rarer, not the design target (long forced sessions are a UX smell for this product, per [Product Vision §5](../01_PRODUCT/Vision.md)).

## 4. What the Player Controls vs. What the World Controls

This boundary is the single most important design and engineering constraint in the product ([Business Requirements §4, BR-2](../01_PRODUCT/BusinessRequirements.md)):

**Player controls (intent only, submitted as requests, validated server-side):**

- Cosmetic customization of owned creature(s).
- Naming.
- Spending currency (marketplace, store).
- Social actions (chat, friend requests, guild actions, reactions, voting, predictions).
- Opt-in "nudges" in future phases (e.g., placing food in a claimed territory) — explicitly *not* direct movement/combat control in MVP, preserving the "observer/caretaker" framing.

**World controls (fully server-simulated, never player-writable):**

- All creature autonomous behavior (movement, hunger decisions, exploration, fights, escape, sleep).
- Growth, aging, death.
- Weather, seasons, natural disasters.
- Territory/migration outcomes.
- Genetics/reproduction outcomes.

## 5. Related Documents

- [Simulation & World Design](./Simulation.md)
- [Product Vision](../01_PRODUCT/Vision.md)
- [Software Requirements Specification](../03_SOFTWARE_ARCHITECTURE/SoftwareRequirements.md)
