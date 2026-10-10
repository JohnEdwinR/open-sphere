# @open-sphere/web — Night Wizard

An installable **PWA** pixel-art shooter (React + Vite + TypeScript, Canvas 2D). It replaces the earlier persistent-world client.

## Game

A wizard stands on a hill under a night sky. Bats and wraiths fly in and home on him; blast them with the staff's glowing orb. The timer starts when you press Start and runs until you lose all 3 lives. Difficulty (spawn rate, speed, tougher wraiths) ramps with time. Score: bat 10, wraith 25 (2 hits).

| Input | Move | Aim | Shoot |
|---|---|---|---|
| Touch | drag on the left half | touch position on the right half | hold on the right half |
| Keyboard + mouse | A/D or ←/→ | mouse (or Q/E) | click or Space |

`P`/`Esc` pauses; the game also auto-pauses when the tab is hidden.

## Architecture

- `src/game/sprites.ts` — pixel art as character grids (Piskel-style), rendered once to offscreen canvases.
- `src/game/engine.ts` — framework-free `Game` class: simulation + rendering at 180×320 logical pixels, scaled up with `image-rendering: pixelated`. The sky animates (twinkling stars, parallax hills, drifting clouds, meteors) even on the menu.
- `src/game/results.ts` — in-game state lives only in memory; when a run ends, **only the final result** (time, score, kills) is written to IndexedDB with `synced: false`, ready for a later "send final results to the database" step.
- `src/screens/GameScreen.tsx` — input (pointer/keyboard), HUD, overlays.
- PWA: manifest, Workbox service worker (everything precached, so it plays offline), prompt-to-update, install banner.

## Run

```bash
pnpm --filter @open-sphere/web dev                 # http://localhost:5173
pnpm --filter @open-sphere/web build && pnpm --filter @open-sphere/web preview   # test install/offline
```

The service worker only registers in a production build. Installing on a phone needs HTTPS (or localhost). Regenerate icons with `pnpm --filter @open-sphere/web icons` (icons still show the old ring art).

## Not yet done

Final-result upload/leaderboards (would need a hosted service; deliberately none for now), tests, new app icons.
