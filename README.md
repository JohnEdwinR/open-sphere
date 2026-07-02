# Open Sphere — Engineering Bible

*(Working title "Open Sphere"; internal codename "Project Serpent" — see [Vision §1](./01_PRODUCT/Vision.md) for naming guidance.)*

This repository is the single source of truth for Open Sphere: a persistent, server-authoritative living world where users own creatures (starting with snakes) that exist inside a shared simulation running 24/7/365.

## Goals

- Persistent living world
- Mobile-first (Android primary, iOS secondary)
- Scalable, server-authoritative architecture
- AI-assisted experiences (never authoritative)
- Subscription-based, non-pay-to-win

## Document Map

| Folder | Contents |
| --- | --- |
| [00_PROJECT_CONSTITUTION.md](./00_PROJECT_CONSTITUTION.md) | Non-negotiable principles |
| [01_PRODUCT/](./01_PRODUCT/) | Vision, Business Requirements, Roadmap |
| [02_GAME_DESIGN/](./02_GAME_DESIGN/) | Core Gameplay, Simulation & World Design |
| [03_SOFTWARE_ARCHITECTURE/](./03_SOFTWARE_ARCHITECTURE/) | Software Requirements Specification, System Architecture |
| [04_DATABASE/](./04_DATABASE/) | Database Design (ERD, schema, sharding strategy) |
| [05_API/](./05_API/) | REST + WebSocket API Specification |
| [06_SECURITY/](./06_SECURITY/) | Security Specification |

Not yet authored (deferred until the corresponding implementation decisions exist — see [Roadmap](./01_PRODUCT/Roadmap.md)): UI Specification, Deployment Guide, Developer Guide, Admin Guide, User Manual.

## Reading Order (New Contributors)

1. [00_PROJECT_CONSTITUTION.md](./00_PROJECT_CONSTITUTION.md)
2. [01_PRODUCT/Vision.md](./01_PRODUCT/Vision.md) → [BusinessRequirements.md](./01_PRODUCT/BusinessRequirements.md) → [Roadmap.md](./01_PRODUCT/Roadmap.md)
3. [02_GAME_DESIGN/CoreGameplay.md](./02_GAME_DESIGN/CoreGameplay.md) → [Simulation.md](./02_GAME_DESIGN/Simulation.md)
4. [03_SOFTWARE_ARCHITECTURE/SoftwareRequirements.md](./03_SOFTWARE_ARCHITECTURE/SoftwareRequirements.md) → [Architecture.md](./03_SOFTWARE_ARCHITECTURE/Architecture.md)
5. [04_DATABASE/DatabaseDesign.md](./04_DATABASE/DatabaseDesign.md)
6. [05_API/APISpecification.md](./05_API/APISpecification.md)
7. [06_SECURITY/SecuritySpecification.md](./06_SECURITY/SecuritySpecification.md)
