# Open Sphere — Engineering Bible

*(Working title "Open Sphere"; internal codename "Project Serpent" — see [Vision §1](./01_PRODUCT/Vision.md) for naming guidance.)*

This repository is the single source of truth for Open Sphere: a persistent, server-authoritative living world where users own creatures (starting with snakes) that exist inside a shared simulation running 24/7/365.

## Goals

- Persistent living world
- Mobile-first PWA (Android primary, iOS secondary)
- Scalable, server-authoritative architecture
- AI-assisted experiences (never authoritative)
- Subscription-based, non-pay-to-win

## Implementation Status

This repo is docs-plus-code: the specs under `01_PRODUCT`–`06_SECURITY` describe the full target system; `apps/backend` is a real, running implementation of the early slice of it (Roadmap Phases 1–3). `apps/web` is the installable PWA client (auth, live world, my creatures; see its README). Not yet built: the admin web panel, and most of the REST API surface beyond auth (creatures, social, economy, billing). See [apps/backend/README.md](./apps/backend/README.md) for exactly what exists.

## Getting Started

Prerequisites: **Node 22+**, **pnpm** (`corepack enable` or `npm i -g pnpm`), **Docker Desktop** (for local Postgres/Redis/MinIO).

```bash
# 1. Install dependencies (monorepo-wide)
pnpm install

# 2. Start local infrastructure
docker compose -f infra/docker/docker-compose.yml up -d

# 3. Configure environment
cp apps/backend/.env.example apps/backend/.env

# 4. Apply database migrations
pnpm --filter @open-sphere/backend prisma:migrate

# 5. Run it
pnpm --filter @open-sphere/backend sim:headless   # headless simulation, logs to stdout
pnpm --filter @open-sphere/backend world:viewer    # web viewer + REST auth API, http://localhost:4000
```

Two known local-environment gotchas (already worked around in `.env.example`, but worth knowing about): Postgres is mapped to host port **5433** (not 5432) because some machines already run a native Postgres service there, and `REDIS_URL` must use **127.0.0.1**, not `localhost`, to avoid a Docker Desktop + WSL2 IPv6 resolution issue that silently breaks the connection. Full details, all env vars, and everything each entry point does are in [apps/backend/README.md](./apps/backend/README.md).

```bash
# Run tests / typecheck across the whole monorepo
pnpm run test
pnpm run typecheck
```

## Document Map

| Folder                                                    | Contents                                                                                                                          |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| [00_PROJECT_CONSTITUTION.md](./00_PROJECT_CONSTITUTION.md) | Non-negotiable principles                                                                                                         |
| [01_PRODUCT/](./01_PRODUCT/)                               | Vision, Business Requirements, Roadmap                                                                                            |
| [02_GAME_DESIGN/](./02_GAME_DESIGN/)                       | Core Gameplay, Simulation & World Design                                                                                          |
| [03_SOFTWARE_ARCHITECTURE/](./03_SOFTWARE_ARCHITECTURE/)   | Software Requirements Specification, System Architecture                                                                          |
| [04_DATABASE/](./04_DATABASE/)                             | Database Design (ERD, schema, sharding strategy)                                                                                  |
| [05_API/](./05_API/)                                       | REST + WebSocket API Specification                                                                                                |
| [06_SECURITY/](./06_SECURITY/)                             | Security Specification                                                                                                            |
| [apps/backend/](./apps/backend/)                           | The actual implementation (simulation engine, WebSocket viewer, REST auth API) — see its own README for setup/run/testing detail |
| [infra/docker/](./infra/docker/)                           | Local dev infrastructure (Postgres, Redis, MinIO) —`docker-compose.yml`                                                        |

Not yet authored (deferred until the corresponding implementation decisions exist — see [Roadmap](./01_PRODUCT/Roadmap.md)): UI Specification, Deployment Guide, Developer Guide, Admin Guide, User Manual. `apps/admin/` is a placeholder for the same reason — see each folder's README for which Roadmap phase fills them in.

## Reading Order (New Contributors)

1. [00_PROJECT_CONSTITUTION.md](./00_PROJECT_CONSTITUTION.md)
2. [01_PRODUCT/Vision.md](./01_PRODUCT/Vision.md) → [BusinessRequirements.md](./01_PRODUCT/BusinessRequirements.md) → [Roadmap.md](./01_PRODUCT/Roadmap.md)
3. [02_GAME_DESIGN/CoreGameplay.md](./02_GAME_DESIGN/CoreGameplay.md) → [Simulation.md](./02_GAME_DESIGN/Simulation.md)
4. [03_SOFTWARE_ARCHITECTURE/SoftwareRequirements.md](./03_SOFTWARE_ARCHITECTURE/SoftwareRequirements.md) → [Architecture.md](./03_SOFTWARE_ARCHITECTURE/Architecture.md)
5. [04_DATABASE/DatabaseDesign.md](./04_DATABASE/DatabaseDesign.md)
6. [05_API/APISpecification.md](./05_API/APISpecification.md)
7. [06_SECURITY/SecuritySpecification.md](./06_SECURITY/SecuritySpecification.md)
