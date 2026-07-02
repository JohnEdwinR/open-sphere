# Security Specification

Status: Draft v0.1 · Owner: Security Engineering · Traces: [Software Requirements Specification §4.4](../03_SOFTWARE_ARCHITECTURE/SoftwareRequirements.md), OWASP ASVS/Top 10

## 1. Threat Model Summary

| Asset | Primary Threats | Impact if Compromised |
| --- | --- | --- |
| Simulation authority/fairness | Client tampering, cheat clients, bots | Violates BR-1 (no pay-to-win), destroys trust/brand |
| User accounts/PII | Credential stuffing, phishing, token theft | Privacy/regulatory violation, reputational damage |
| Economy (wallets/marketplace) | Duplication exploits, fraud, bot farming | Inflation, unfair market, chargeback exposure |
| Billing/subscription | Receipt/entitlement forgery | Revenue loss, platform policy violation |
| Admin panel | Privilege escalation, insider misuse | Full world/user compromise |
| Chat/social | Abuse, harassment, spam, bot flooding | User trust, platform policy/store risk (esp. student segment) |

## 2. Authentication & Session Management

- Passwords hashed with Argon2id (never a fast hash); OAuth (Google/Apple) supported as an alternative, not a replacement, for password auth in MVP.
- JWT access tokens: short-lived (target 15 min), signed (RS256 preferred over HS256 so verification keys can be distributed to stateless API instances without sharing the signing secret).
- Refresh tokens: opaque, rotating, stored hashed server-side, revocable (supports "log out everywhere," required for account-compromise response).
- All admin/moderator sessions require re-authentication (step-up) for high-impact actions (ban, mass event trigger) — a valid low-privilege session token is not sufficient by itself.

## 3. Authorization (Role/Permission Matrix)

| Role | Read World | Own-Creature Actions | Social Actions | Moderation | World Event Trigger | Full Admin |
| --- | --- | --- | --- | --- | --- | --- |
| Free user | ✔ | ✔ | ✔ | – | – | – |
| Premium subscriber | ✔ | ✔ (+ extra slots, analytics) | ✔ | – | – | – |
| Guild officer | ✔ | ✔ | ✔ (+ guild mgmt) | guild-scope only | – | – |
| Moderator | ✔ | – | ✔ | ✔ | – | – |
| Admin/Ops | ✔ | – | ✔ | ✔ | ✔ | ✔ |

Enforced via a centralized authorization middleware/guard at the interface layer (Fastify route pre-handlers), never via ad hoc `if (user.isAdmin)` checks scattered in handlers — this is what keeps FR-ADM/NFR-SEC requirements auditable in one place (traces [Architecture §9 dependency injection](../03_SOFTWARE_ARCHITECTURE/Architecture.md)).

## 4. Server-Authoritative Enforcement (Anti-Cheat)

Given the product's core promise (BR-1: no pay-to-win, BR-2: server authoritative), cheat prevention is a first-class security concern, not an afterthought:

- Every client → server message (REST body or WebSocket event) is validated against a schema (zod/equivalent) **and** re-checked for business-rule validity server-side (e.g., a customization request is checked against the current entitlement, not trusted from the client's UI state).
- The simulation never accepts client-submitted position/state for a creature — creature state is 100% server-computed; the client can only submit *intent* (e.g., cosmetic change, social action), never *outcome*.
- Anomaly detection (Phase 3+): rate-of-request and pattern heuristics (e.g., impossible action frequency, scripted timing) feed a flagging queue for moderator review — automated soft-action (temporary rate-limit tightening) plus human-reviewed hard-action (ban), to avoid false-positive bans on legitimate power users.
- Marketplace/economy: every balance mutation is a single DB transaction pairing a ledger (`transactions`) insert with the `wallets` update (traces [Database Design §3.7](../04_DATABASE/DatabaseDesign.md)) — this closes the most common "duplicate currency via race condition" exploit class.

## 5. Input Validation & Injection Prevention

- Prisma parameterizes all queries by default — raw SQL is disallowed outside of reviewed, explicitly justified exceptions (e.g., a materialized view refresh).
- All REST/WebSocket payloads validated against strict schemas at the interface layer before reaching application services; unknown fields rejected (not silently dropped), preventing mass-assignment-style vulnerabilities.
- Output encoding for any user-generated content rendered in the mobile client or admin panel (chat, display names) to prevent injection into rendering contexts.

## 6. Rate Limiting & Abuse Prevention

Per [API Specification §4](../05_API/APISpecification.md): Redis-backed token-bucket rate limiting per user and per IP on all public endpoints, stricter limits on chat and purchase endpoints, and CAPTCHA/device-attestation considered for registration and marketplace endpoints if bot activity is observed post-launch (not built speculatively pre-launch).

## 7. Data Protection & Privacy

- TLS 1.2+ for all traffic (NFR-SEC-001); TLS termination at Cloudflare edge, re-encrypted or private-network to origin.
- PII encrypted at rest where the database provider doesn't already guarantee it (disk-level encryption assumed at minimum; column-level encryption considered for highly sensitive fields if added later).
- GDPR/CCPA: account deletion (`DELETE /users/me`) cascades to PII while preserving anonymized/aggregate data needed for world integrity (e.g., a deleted user's creature can remain in the world as "unowned" rather than being force-deleted, preserving other users' shared history) — exact anonymization behavior to be finalized with Legal before Phase 3 ships.
- Given the "students/office workers" audience skews toward including minors, age-appropriate data handling (minimal PII collection, no targeted ads to known-minor accounts) is a standing requirement, not a future add-on.

## 8. Admin Panel Security

- Separate, shorter-lived session policy than the mobile app.
- IP allowlisting or VPN-gating considered for production admin access (deployment-environment decision, not deferred indefinitely).
- Every mutating admin action writes to `admin_audit_log` in the same transaction as the action (traces [Database Design §3.10](../04_DATABASE/DatabaseDesign.md)) — audit log has no update/delete API surface at all.

## 9. Dependency & Supply Chain

- Automated dependency vulnerability scanning in CI (GitHub Actions) blocking merge on high/critical findings.
- Docker base images pinned and scanned; no `:latest` tags in production manifests.

## 10. Incident Response (Baseline)

- Sentry-based alerting for anomalous error rates; Prometheus/Grafana alerting for auth-failure spikes (credential stuffing signal) and economy-transaction-rate anomalies (exploit signal).
- Defined severity levels and on-call escalation path to be documented in the future Deployment/Runbook guide (not yet authored — see [Roadmap](../01_PRODUCT/Roadmap.md) Phase 6 observability line item).

## 11. Compliance Targets

OWASP ASVS Level 2 as the baseline bar for the backend API; OWASP Mobile ASVS considerations for the RN client (secure storage via MMKV encryption option, certificate pinning evaluated for Phase 4+); platform store policies (Google Play, Apple App Store) for subscriptions, data safety disclosures, and content rating compliance tracked as release-blocking checklist items, not optional.

## 12. Related Documents

- [Software Requirements Specification](../03_SOFTWARE_ARCHITECTURE/SoftwareRequirements.md)
- [Architecture](../03_SOFTWARE_ARCHITECTURE/Architecture.md)
- [Database Design](../04_DATABASE/DatabaseDesign.md)
- [API Specification](../05_API/APISpecification.md)
- [Business Requirements Specification](../01_PRODUCT/BusinessRequirements.md)
