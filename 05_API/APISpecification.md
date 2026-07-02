# API Specification

Status: Draft v0.1 · Owner: Backend Engineering · Style: REST (OpenAPI-documented) + WebSocket (Socket.IO) · Traces: [Software Requirements Specification](../03_SOFTWARE_ARCHITECTURE/SoftwareRequirements.md)

## 1. Conventions

- **Base path:** `/api/v1`. Breaking changes ship as `/api/v2`; additive changes (new optional fields, new endpoints) do not bump the version.
- **Auth:** `Authorization: Bearer <JWT>` on all endpoints except `POST /auth/register`, `POST /auth/login`, `POST /auth/oauth/:provider`, `POST /auth/refresh`.
- **Format:** JSON request/response bodies; snake_case on the wire, mapped to camelCase in TypeScript DTOs at the interface layer.
- **Pagination:** cursor-based (`?cursor=...&limit=...`) on all list endpoints — offset pagination is disallowed for any table that grows unbounded (`event_log`, `chat_messages`) to avoid deep-offset performance cliffs.
- **Errors:** RFC 7807-style problem responses: `{ "type", "title", "status", "detail", "instance" }`.
- **Idempotency:** all state-mutating endpoints that may be retried by the client (purchases, currency spends) require an `Idempotency-Key` header, deduplicated server-side for 24h.
- **Full contract:** authored and published as OpenAPI 3.1 (`openapi.yaml`, to be generated alongside implementation — this document is the human-readable index, not a substitute for the generated spec).

## 2. REST Endpoints (MVP Surface)

### 2.1 Auth & Identity

| Method | Path | Purpose | Auth |
| --- | --- | --- | --- |
| POST | `/auth/register` | Email/password registration | none |
| POST | `/auth/login` | Email/password login, issues JWT + refresh token | none |
| POST | `/auth/oauth/:provider` | OAuth login (google, apple) | none |
| POST | `/auth/refresh` | Exchange refresh token for new access token | refresh token |
| POST | `/auth/logout` | Revoke refresh token | user |
| DELETE | `/users/me` | Account deletion (GDPR/CCPA) | user |
| GET | `/users/me/export` | Data export request | user |

### 2.2 Users & Profiles

| Method | Path | Purpose | Auth |
| --- | --- | --- | --- |
| GET | `/users/me` | Current user profile | user |
| PATCH | `/users/me` | Update profile (display name, avatar, privacy settings) | user |
| GET | `/users/:id` | Public profile | user |
| GET | `/users/:id/creatures` | Creatures owned by user (respects privacy settings) | user |

### 2.3 Creatures

| Method | Path | Purpose | Auth |
| --- | --- | --- | --- |
| GET | `/creatures/:id` | Creature detail (server-computed current state snapshot) | user |
| GET | `/creatures/:id/history` | Paginated event-log/diary (FR-CRE-003) | user |
| PATCH | `/creatures/:id/customization` | Submit cosmetic customization/name change (server validates non-stat-affecting, FR-CRE-002) | owner |
| GET | `/creatures/:id/memorial` | Memorial record, if deceased (FR-CRE-004) | user |

### 2.4 World

| Method | Path | Purpose | Auth |
| --- | --- | --- | --- |
| GET | `/world/chunks/:id` | Chunk snapshot (entities, biome, weather) | user |
| GET | `/world/events` | Active/upcoming world events | user |

### 2.5 Social

| Method | Path | Purpose | Auth |
| --- | --- | --- | --- |
| POST | `/friends/requests` | Send friend request | user |
| POST | `/friends/requests/:id/accept` | Accept request | user |
| GET | `/friends` | Friend list | user |
| POST | `/guilds` | Create guild | user |
| POST | `/guilds/:id/join` | Join/request to join guild | user |
| GET | `/guilds/:id` | Guild detail | user |
| GET | `/leaderboards/:type` | Leaderboard read (backed by `v_leaderboard_snapshot`) | user |

### 2.6 Economy

| Method | Path | Purpose | Auth |
| --- | --- | --- | --- |
| GET | `/wallet` | Current currency balances | user |
| GET | `/marketplace/listings` | Browse cosmetic marketplace | user |
| POST | `/marketplace/listings/:id/purchase` | Purchase (idempotent, wallet-debiting) | user |
| GET | `/inventory` | Owned items | user |
| POST | `/rewards/daily/claim` | Claim daily reward | user |

### 2.7 Billing

| Method | Path | Purpose | Auth |
| --- | --- | --- | --- |
| GET | `/subscription` | Current subscription/entitlement status | user |
| POST | `/subscription/verify-purchase` | Client-initiated purchase verification (receipt validation) | user |
| POST | `/webhooks/billing/google` | Google Play RTDN webhook | platform signature |
| POST | `/webhooks/billing/apple` | Apple App Store Server Notification webhook | platform signature |

### 2.8 Admin (elevated permission required, see [Security Specification §3](../06_SECURITY/SecuritySpecification.md))

| Method | Path | Purpose | Auth |
| --- | --- | --- | --- |
| GET | `/admin/world/health` | Simulation health/metrics summary | admin |
| POST | `/admin/world/events` | Trigger/schedule a world event | admin |
| POST | `/admin/moderation/mute` | Mute a user | moderator |
| POST | `/admin/moderation/ban` | Ban a user | admin |
| GET | `/admin/audit-log` | Query audit log | admin |

## 3. WebSocket Events (Socket.IO)

Namespace: `/world`. Clients authenticate on connection via the same JWT (passed in the Socket.IO auth payload), then join rooms scoped to their owned creature's current chunk plus any social channels (guild, DM).

### 3.1 Server → Client

| Event | Payload (summary) | Purpose |
| --- | --- | --- |
| `chunk:snapshot` | full entity list for a chunk | Sent on room join |
| `chunk:delta` | entity add/update/remove diff | Per-tick-batch incremental update |
| `creature:event` | `{ creatureId, eventType, payload, occurredAt }` | Significant creature event (fed, fled, grew, died) for owned/followed creatures |
| `world:event` | `{ type, affectedChunks, startsAt, endsAt }` | Global/regional event start/end |
| `chat:message` | `{ scope, scopeId, senderId, body, sentAt }` | Chat delivery |
| `notification:push` | `{ type, payload }` | In-app real-time notification (in addition to platform push) |

### 3.2 Client → Server

| Event | Payload (summary) | Purpose |
| --- | --- | --- |
| `chunk:subscribe` | `{ chunkId }` | Join a chunk room (e.g., user pans the world viewer) |
| `chunk:unsubscribe` | `{ chunkId }` | Leave a chunk room |
| `chat:send` | `{ scope, scopeId, body }` | Send chat message (server re-validates rate limit + content policy regardless of client throttling) |

All client → server events are treated as **intent only**; the server re-validates authorization, rate limits, and content before any broadcast, per [Business Requirements BR-2](../01_PRODUCT/BusinessRequirements.md).

## 4. Rate Limiting

Per [SRS NFR-SEC-003](../03_SOFTWARE_ARCHITECTURE/SoftwareRequirements.md): default 100 req/min per authenticated user on REST, stricter limits on `chat:send` (e.g., 1 msg/2s) and purchase endpoints, enforced at the Fastify middleware layer backed by Redis token buckets — not per-instance in-memory counters, since the API is horizontally scaled (NFR-SCAL-002).

## 5. Related Documents

- [Software Requirements Specification](../03_SOFTWARE_ARCHITECTURE/SoftwareRequirements.md)
- [Architecture](../03_SOFTWARE_ARCHITECTURE/Architecture.md)
- [Database Design](../04_DATABASE/DatabaseDesign.md)
- [Security Specification](../06_SECURITY/SecuritySpecification.md)
