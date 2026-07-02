# Project Constitution

Project: Open Sphere (working title) / "Project Serpent" (engineering codename). See [Document Map](./README.md#document-map) for the full spec set.

## Vision

Build a persistent online ecosystem where creatures continuously live, evolve, and create stories. Full detail: [Product Vision](./01_PRODUCT/Vision.md).

## Principles

These are standing constraints on every design/implementation decision, not preferences to be traded off under deadline pressure:

- **World first, UI second.** The mobile app renders the world; it is not the world.
- **Server authoritative.** No gameplay-critical logic ever executes client-side. See [Business Requirements BR-2](./01_PRODUCT/BusinessRequirements.md#4-business-rules).
- **Mobile-first.** Android primary, iOS secondary, no desktop at MVP.
- **Clean Architecture.** Domain logic isolated from framework/infrastructure in every service. See [Architecture](./03_SOFTWARE_ARCHITECTURE/Architecture.md#4-layering-per-bounded-context--eventual-service).
- **Security by design.** See [Security Specification](./06_SECURITY/SecuritySpecification.md).
- **Non pay-to-win.** No purchase may ever alter simulation outcomes. See [Business Requirements BR-1](./01_PRODUCT/BusinessRequirements.md#4-business-rules).
- **Modular and scalable.** Bounded contexts + event bus from day one so the system can split into services without a redesign. See [Architecture §10](./03_SOFTWARE_ARCHITECTURE/Architecture.md#10-why-a-modular-monolith-not-microservices-at-mvp).
