# TaskSync — SDE-1 Engineering Maturity Roadmap

Grounded in an actual read of this codebase (not generic advice). Every item below references real files and confirmed gaps in this repo as of 2026-08-01.

**Constraint honored throughout:** every tool recommended is free/open-source and runs locally (Docker, Redis, MinIO, Mailpit, GitHub Actions, Prometheus/Grafana, Jest, Playwright, etc.) — no paid services required at any point.

---

## 0. Confirmed findings (why these recommendations exist)

- `libs/async-handler.js` and `libs/app-error.js` exist but are used in **only `settings-controller.js`**. Every other controller (`task.js` 697 lines, `workspace.js` 527 lines, `project.js`, `auth-controller.js`) hand-rolls `try/catch` + `console.log(error)` + `res.status(500)`.
- Authorization is done ad-hoc: `createTask`/`updateTaskTitle`/etc. manually check `workspace.members.some(...)`, completely bypassing `hasWorkspacePermission`/`hasProjectPermission` in `libs/permissions.js` and the `project-permission.js`/`workspace-permission.js` middleware that already exist. The RBAC system is built but not enforced.
- `aj.protect()` (Arcjet) is called **only inside `registerUser`**. `loginUser` has zero rate limiting.
- `loginUser` returns `res.status(500)` for "Invalid email or password" (`auth-controller.js:130`) — should be 400/401.
- No tests anywhere (`"test": "echo Error"` in `backend/package.json`), no `.github/workflows`, no backend `Dockerfile`/`docker-compose` (only `frontend/Dockerfile` exists), no health check route, no structured logging (`morgan("dev")` + scattered `console.log`), no OpenAPI docs, no Redis/queue/cache anywhere, refresh tokens are pure stateless JWT with no server-side revocation, uploads use local disk `multer.diskStorage`, and the `use-debounce` hook in the frontend has no search feature wired to it.
- What's already solid and worth keeping/highlighting: JWT + refresh-cookie flow, Arcjet shield/bot-detection/email-validation, Zod validation on most routes, a real RBAC permission matrix (`libs/permissions.js`), Mongoose indexes on `Task`, an `ActivityLog` model, per-domain React Query hooks, and advanced task pagination (recent commit).

---

## 1. Full suggestion list

Each item: why it matters, difficulty, time estimate, tech, category, resume value.

### Tier 1 — Fix what's already built but unfinished

**S1. Wire the existing RBAC middleware into every route**
- Why: Turns a false claim ("I built RBAC") into a true one. A "viewer" can currently create tasks anywhere they're a workspace member.
- Difficulty: Medium · Time: 4–6 hrs · Tech: Express middleware, `libs/permissions.js` · Category: Backend/Security/Architecture
- Resume: *"Designed and enforced role-based access control across 20+ API endpoints via reusable middleware, closing authorization gaps where role checks were previously bypassed."*

**S2. Fix login 500-bug + extend Arcjet to login/reset endpoints**
- Why: Wrong status code on bad credentials; login currently has zero brute-force protection.
- Difficulty: Easy · Time: 1–2 hrs · Tech: Arcjet `tokenBucket` · Category: Security/Backend

**S3. Standardize error handling: `asyncHandler` + `AppError` everywhere**
- Why: ~15 duplicated lines of `try/catch` per controller; centralizing gives consistent error shapes and one place to hook logging/Sentry later.
- Difficulty: Medium · Time: 4–6 hrs · Tech: existing `libs/async-handler.js`, `libs/app-error.js` · Category: Backend/Architecture

### Tier 2 — Production-readiness fundamentals

**S4. Structured logging (Pino)**
- Why: JSON logs, log levels, request correlation IDs vs. scattered `console.log`.
- Difficulty: Easy · Time: 2–3 hrs · Tech: Pino, pino-http (free) · Category: Observability/Backend

**S5. Env var validation at startup (Zod)**
- Why: Fail fast with a clear error instead of a mysterious runtime crash.
- Difficulty: Easy · Time: 1 hr · Tech: Zod (already a dependency) · Category: Backend/DevOps

**S6. Health checks + graceful shutdown**
- Why: `/health`/`/ready` + SIGTERM handling (drain server, close Mongo) are table stakes for Docker/K8s.
- Difficulty: Easy · Time: 1–2 hrs · Tech: Express, Mongoose · Category: Infrastructure/DevOps

**S7. Dockerize backend + full docker-compose stack**
- Why: One-command reproducible dev environment (backend + frontend + MongoDB + Redis + Mailpit).
- Difficulty: Medium · Time: 4–5 hrs · Tech: Docker, Docker Compose, Mailpit (free) · Category: DevOps/Infrastructure
- Resume: *"Containerized the full stack with Docker Compose for one-command local environment parity."*

**S8. CI pipeline (GitHub Actions)**
- Why: Lint + typecheck + test + build on every PR — minimum CI/CD bar, free for this repo.
- Difficulty: Easy–Medium · Time: 2–4 hrs · Tech: GitHub Actions (free) · Category: DevOps/CI-CD
- Resume: *"Set up CI running lint, type-checking, and test suites on every pull request."*

**S9. Real test suite**
- Why: Zero tests currently exist — the single most common SDE-1 portfolio gap.
- Difficulty: Medium–Hard · Time: 10–15 hrs · Tech: Jest + Supertest (backend), Vitest + RTL (frontend), Playwright (E2E) — all free · Category: Testing
- Resume: *"Built a test suite (API integration tests, critical-path E2E) covering auth, RBAC, and task lifecycle, integrated into CI."*

**S10. OpenAPI/Swagger docs**
- Why: Self-documenting API, live `/api-docs` demo for interviews.
- Difficulty: Medium · Time: 4–6 hrs · Tech: swagger-jsdoc, swagger-ui-express (free) · Category: API design/Backend

### Tier 3 — Features that demonstrate backend/systems depth

**S11. Background job queue (BullMQ + Redis) for transactional email**
- Why: `registerUser`/`loginUser` currently **block the HTTP response on synchronous SMTP calls**. Decoupling this is a textbook system-design answer.
- Difficulty: Medium · Time: 5–8 hrs · Tech: BullMQ, Redis, Mailpit for dev inbox (all free) · Category: Backend/Scalability
- Resume: *"Decoupled transactional email from the request/response cycle using a Redis-backed BullMQ queue with retry/backoff."*

**S12. Redis caching layer for read-heavy endpoints**
- Why: Analytics dashboard likely re-runs Mongo aggregations every load. Cache-aside + TTL + write-invalidation is the standard scaling answer.
- Difficulty: Medium · Time: 5–8 hrs · Tech: Redis, ioredis · Category: Backend/Caching/Scalability
- Resume: *"Introduced a Redis cache-aside layer for dashboard analytics, with TTL and write-invalidation."*

**S13. Real-time collaboration (Socket.IO)**
- Why: "Team collaboration" today is pull-based (React Query invalidation only). Live updates + presence is the real differentiator.
- Difficulty: Hard · Time: 10–15 hrs · Tech: Socket.IO (free) · Category: Backend/Frontend/Real-time/Architecture
- Resume: *"Implemented real-time collaboration (live task/comment updates, presence) via Socket.IO with per-workspace rooms and JWT-authenticated handshakes."*

**S14. Self-hosted object storage (MinIO) + image processing**
- Why: Local disk storage doesn't survive container restarts or scale past one instance. MinIO is free, S3-API-compatible, Docker-run.
- Difficulty: Medium · Time: 5–7 hrs · Tech: MinIO, sharp (free) · Category: Backend/Scalability/Infrastructure
- Resume: *"Replaced local-disk storage with a MinIO (S3-compatible) object store behind a storage adapter, with server-side image resizing."*

**S15. Full-text search**
- Why: Closes the loop on the currently-unused `use-debounce` hook. Free — no new infra, just Mongo text indexes.
- Difficulty: Medium · Time: 4–6 hrs · Tech: MongoDB `$text` indexes · Category: Backend/Database/Search

**S16. Refresh token rotation + server-side revocation**
- Why: Refresh tokens today are pure stateless JWT — logout just clears the cookie, the token itself stays valid until expiry if replayed. Storing hashed tokens per session with rotation is a genuine security upgrade.
- Difficulty: Medium–Hard · Time: 6–8 hrs · Tech: MongoDB, bcrypt · Category: Security/Backend/Architecture
- Resume: *"Implemented refresh-token rotation with server-side session storage, enabling real session revocation and 'log out of all devices'."*

**S17. Account-level brute-force lockout**
- Why: Arcjet is IP-based; a per-account failed-attempt counter adds defense-in-depth.
- Difficulty: Easy–Medium · Time: 2–3 hrs · Tech: Mongo field or Redis counter · Category: Security

**S18. Missing database indexes + integrity constraints**
- Why: `Task` is well-indexed; `Workspace.members.user`, `Project.members.user`, `ActivityLog.resourceId` aren't. Nothing stops duplicate membership entries.
- Difficulty: Easy · Time: 2 hrs · Tech: Mongoose indexes · Category: Database/Performance

**S19. Surface the audit log properly**
- Why: `ActivityLog` is already written to but has no paginated/filterable API or UI. Nearly free since the write-path exists.
- Difficulty: Medium · Time: 4–6 hrs · Tech: existing model + existing pagination pattern · Category: Backend/Frontend/Security

**S20. Task version history**
- Why: Record diffs on title/description/status changes to enable "view history"/undo. Lower priority.
- Difficulty: Medium · Time: 5–7 hrs · Category: Backend/Database/Architecture

**S21. Consistent pagination/filtering across all list endpoints**
- Why: Extend the existing "advanced task pagination" pattern to workspace members, comments, and project lists.
- Difficulty: Easy–Medium · Time: 3–4 hrs · Category: Backend/Performance/API design

**S22. Prometheus metrics + local Grafana dashboard**
- Why: `prom-client` exposing latency/error-rate/queue-depth, scraped by local Prometheus + Grafana. Pairs with S11/S12 (queue depth, cache hit rate).
- Difficulty: Medium · Time: 5–7 hrs · Tech: prom-client, Prometheus, Grafana (all free) · Category: Observability/DevOps/Infrastructure
- Resume: *"Instrumented the API with Prometheus metrics visualized via a self-hosted Grafana dashboard."*

### Tier 4 — Frontend polish

**S23. Accessibility audit**
- Why: Radix gives a11y primitives for free, but custom components still need a keyboard-nav/focus-trap/contrast pass.
- Difficulty: Easy–Medium · Time: 4–6 hrs · Tech: eslint-plugin-jsx-a11y, axe-core (free) · Category: Frontend/Accessibility

**S24. Frontend error boundaries + optional self-hosted error tracking**
- Why: Global React error boundary + optionally GlitchTip (free, self-hostable Sentry-compatible tracker).
- Difficulty: Easy–Medium · Time: 3–5 hrs · Tech: React Error Boundary, GlitchTip (free) · Category: Frontend/Observability

**S25. ARCHITECTURE.md system design doc**
- Why: Cheapest, highest-leverage item on this list — lets you *articulate* the RBAC model, data model, and scaling trade-offs convincingly in an interview.
- Difficulty: Easy · Time: 2–3 hrs · Category: Architecture/Documentation

---

## 2. Top 20 ranked by resume impact

| Rank | Item | Category |
|---|------|----------|
| 1 | S9 Test suite (Jest/Supertest, RTL, Playwright) | Testing |
| 2 | S1 RBAC enforcement fix | Security/Architecture |
| 3 | S11 BullMQ + Redis job queue for email | Backend/Scalability |
| 4 | S13 Real-time collaboration (Socket.IO) | Backend/Real-time |
| 5 | S16 Refresh token rotation + revocation | Security |
| 6 | S12 Redis caching layer | Backend/Scalability |
| 7 | S7 Docker Compose full stack | DevOps |
| 8 | S8 CI pipeline (GitHub Actions) | DevOps |
| 9 | S14 MinIO object storage | Backend/Infrastructure |
| 10 | S22 Prometheus + Grafana | Observability |
| 11 | S17 + S2 Brute-force lockout + login fix | Security |
| 12 | S15 Full-text search | Backend/Database |
| 13 | S3 asyncHandler/AppError standardization | Architecture |
| 14 | S10 OpenAPI/Swagger docs | API design |
| 15 | S19 Audit log viewer | Backend/Security |
| 16 | S4 Structured logging (Pino) | Observability |
| 17 | S18 DB indexes/constraints | Database |
| 18 | S21 Pagination consistency | Backend |
| 19 | S23 Accessibility audit | Frontend |
| 20 | S25 ARCHITECTURE.md | Documentation |

## 3. Ranked by implementation effort

- **Easy (1–3 hrs each):** S2, S5, S6, S18, S25, S17
- **Medium (4–8 hrs each):** S3, S4, S8, S10, S15, S19, S21, S23, S24
- **Medium-heavy (5–8 hrs each):** S7, S11, S12, S14, S16, S22
- **Hard (10–15 hrs each):** S9, S13

---

## 4. Phase-by-phase implementation plan

Each phase includes concrete steps — packages to install, files to touch, what "done" looks like. Work through phases in order; each de-risks the next, and nothing blocks on a paid service.

### Phase 1 — Correctness & security patch pass (~half a day) — ✅ DONE (2026-08-01)

Goal: stop the bleeding on real bugs before building anything new on top of them.

1. **S2 — Fix login bug + rate-limit login** ✅
   - `backend/controllers/auth-controller.js`: `loginUser`'s invalid-credentials branch now returns `401` instead of `500`; the wrong-password branch was also normalized from `400` to `401` for consistency.
   - `loginUser` and `resetPasswordRequest` now call `aj.protect(req, { email })` and return `429` on denial, mirroring `registerUser`.
2. **S18 — Add missing indexes** ✅
   - `backend/models/workspace.js`: added `{ "members.user": 1 }` and `{ owner: 1 }`.
   - `backend/models/project.js`: added `{ "members.user": 1 }` and `{ workspace: 1, isArchived: 1 }`.
   - `backend/models/activity.js`: added `{ resourceId: 1, createdAt: -1 }` and `{ user: 1, createdAt: -1 }`.
   - Duplicate-membership prevention turned out to **already exist** at the application level (`acceptGenerateInvite`/`acceptInviteByToken` in `workspace.js` both check `isMember` before pushing) — no change needed there.
3. **S5 — Env var validation** ✅
   - New `backend/libs/env.js`: Zod schema validating `MONGODB_URI`, `JWT_SECRET`, `ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET`, `FRONTEND_URL`, `EMAIL_USER`, `EMAIL_PASS`, `ARCJET_KEY` (required) plus sane defaults for the rest; exits with a clear per-field error list on failure.
   - Bonus fix found while wiring this up: `dotenv.config()` in `index.js` previously ran *after* `routes/index.js` was imported, which transitively evaluates `libs/arcjet.js` — and that file reads `process.env.ARCJET_KEY` at module-load time. It only worked by accident because `libs/send-email.js` happened to call its own `dotenv.config()` earlier in the import graph. Making `import env from "./libs/env.js"` the first line of `index.js` guarantees env is loaded and validated before anything else in the module graph evaluates.
4. **S6 — Health checks + graceful shutdown** ✅
   - `backend/index.js`: added `GET /health` (liveness) and `GET /ready` (checks `mongoose.connection.readyState`, returns 503 when DB isn't connected).
   - Added `SIGTERM`/`SIGINT` handlers that close the HTTP server and Mongo connection before exiting.

**Verified:** server boots, fails fast with a field-level error list when a required env var is empty, `/health` returns `200` immediately, `/ready` correctly returns `503` when Mongo is unreachable.

### Phase 2 — Architecture consistency pass (~1–2 days) — ✅ DONE (2026-08-01)

Goal: fix the two structural gaps before building new features on an inconsistent foundation.

**What the investigation found:** `workspace-permission.js` and `project-permission.js` turned out to already be fully built (`requireWorkspacePermission`/`requireProjectPermission`, using `asyncHandler`/`AppError` correctly) and were already wired into `routes/workspace.js` and `routes/project.js`. The real, narrower gap was **`routes/task.js`, which had zero authorization middleware at all** — every task route only checked `authMiddleware` (logged in), nothing else. This was a confirmed, exploitable set of bugs, not a theoretical gap:

- `updateSubTask`, `getTaskById`, `getCommentsByTaskId`, and `getActivityByResourceId` had **no membership or permission check whatsoever** — any authenticated user could read or modify any task/subtask in the entire system by ID (IDOR / broken access control).
- Every other task mutation (`updateTaskTitle`, `updateTaskStatus`, `updateTaskPriority`, `updateTaskAssignees`, `updateTaskDueDate`, `addSubTask`, `addComment`, `watchTask`, `archivedTask`) only checked *project membership*, not *role*, meaning a `viewer` (a read-only role by design in `libs/permissions.js`) could edit and archive tasks — the permission matrix existed but was never consulted for tasks.

**What was implemented:**
1. **S1 — New `backend/middleware/task-permission.js`** with two exports:
   - `requireTaskPermission(permission, { taskParam })` — for fixed-permission actions (view, comment, archive, assign) that don't depend on who the task is assigned to.
   - `requireTaskUpdatePermission()` — encodes the actual intended rule from `PROJECT_ROLE_PERMISSIONS`: a **manager** can edit any task in the project; a **contributor** can only edit tasks **they are assigned to**; a **viewer** can edit nothing. This is the first place that distinction is actually enforced.
   - Both attach `req.task`/`req.project`/`req.projectRole`, matching the existing pattern in `project-permission.js`.
2. Wired the middleware into every route in `routes/task.js` (create → `CREATE_TASK`, title/description/status/priority/due-date/subtasks → `requireTaskUpdatePermission()`, assignees → `ASSIGN_TASK_MEMBERS`, comment → `COMMENT_TASK`, archive → `ARCHIVE_TASK`, view/comments/activity/watch → `VIEW_PROJECT`).
3. **S3 — Standardized error handling** across `controllers/task.js`, `controllers/project.js`, `controllers/workspace.js`, `controllers/user.js`, and `controllers/auth-controller.js`: every export now uses `asyncHandler` + `throw new AppError(message, statusCode)` instead of manual `try/catch` + `console.log` + `res.status(500)`. Controllers now read `req.task`/`req.project`/`req.workspace` (attached by middleware) instead of re-querying and re-checking membership themselves — removing duplicate DB round-trips as a side effect.
4. Preserved the Phase 1 fixes (401 on bad login, 429 on rate-limit) while converting them to the same `AppError` pattern for consistency.

**Verified:** `node --check` passed on every edited file; the server boots cleanly with no import/wiring errors (confirmed via `/health`); grepped the controllers directory to confirm zero remaining `console.log`/manual `res.status(500)` and confirmed the only remaining `isMember` checks left in `workspace.js` are legitimate duplicate-invite guards, not authorization bypasses.

**Not yet done (deliberately out of scope for this pass):** full DB-backed integration testing of the new permission middleware (blocked in this sandbox — no network route to the project's MongoDB Atlas cluster) and `libs/index.js`'s `recordActivity` still uses `console.log` in its internal catch (left alone; addressed by Pino in Phase 5). Recommend manually exercising the RBAC changes locally (log in as a contributor and a viewer, confirm the viewer can no longer edit/archive tasks, confirm a contributor can only edit tasks assigned to them) before relying on this in an interview demo.

### Phase 3 — Local infra foundation (~1 day) — ✅ DONE, verified end-to-end (2026-08-01)

Goal: get Docker + Redis + a dev mail sandbox running, since everything in Phase 4 needs them.

**What was built:**
1. **`backend/Dockerfile`** — single-stage `node:20-alpine`, `npm ci --omit=dev`, exposes 5000, includes a `HEALTHCHECK` that hits the `/health` endpoint added in Phase 1.
2. **`backend/.dockerignore`** — excludes `node_modules`, `.env`, `uploads`, logs from the build context.
3. **Root `docker-compose.yml`** with 5 services:
   - `mongo` (official `mongo:7`, named volume `mongo_data`, healthcheck via `mongosh ping`)
   - `redis` (official `redis:7-alpine`, healthcheck via `redis-cli ping`) — not used by the app yet, but Phase 4 (BullMQ, caching) needs it running, so it's here now.
   - `mailpit` (`axllent/mailpit`) — local SMTP sandbox; web UI on `:8025`, SMTP on `:1025`.
   - `backend` — loads secrets from `backend/.env` via `env_file`, then **overrides** `MONGODB_URI` (→ the `mongo` service), `SMTP_HOST`/`SMTP_PORT`/`SMTP_SECURE` (→ the `mailpit` service), and `FRONTEND_URL`. `depends_on` uses `condition: service_healthy` for `mongo`/`redis` so the backend doesn't start racing an unready database. Bind-mounts `./backend/uploads` so uploaded files persist on the host.
   - `frontend` — reuses the existing multi-stage `frontend/Dockerfile` as-is, mapped to `localhost:5173` (kept on the same port as the existing Vite dev server so the CORS allowlist in `backend/index.js` needs no changes).
4. Added a "Running with Docker" section to the root `README.md` documenting the service URLs and behavior.

**Verified end-to-end**, on your machine, against the real running stack (not just static config):
- `docker compose up --build -d` — all 5 containers built and started; `docker compose ps` showed `mongo`, `redis`, `mailpit`, `backend` all reporting `(healthy)`.
- `GET /health` → `200`, `GET /ready` → `200 {"status":"ready","db":"connected"}` (confirmed the backend container is actually talking to the `mongo` container, not Atlas).
- Full auth flow driven by curl against the live containers: **register → email actually arrived in Mailpit → extracted the verification token from the email body via Mailpit's API → `POST /verify-email` → `POST /login` succeeded with a `refreshToken` cookie and access token.**
- Rate limiting verified directly: hammered `/login` 15 times in a row — attempts 1–10 correctly returned `401` (bad credentials), and attempts 11–15 returned `429` (rate-limited), exactly matching the `capacity: 10` token-bucket configuration in `libs/arcjet.js`. This confirms the Phase 1 login rate-limiting fix actually works under load, not just in theory.

**Two real, pre-existing bugs surfaced by actually running this in Docker** (neither was introduced by Phases 1–3 — both existed before, just never surfaced because local dev never did a clean install or hit the rate limiter this way):
1. **`cookie-parser` was used in `backend/index.js` but missing from `backend/package.json`.** It only ever worked locally by accident (Node's module resolution was finding it via a stray root-level `node_modules`/`package.json` that had it listed, one directory up from `backend/`). A clean `npm ci` — which is what any CI pipeline or fresh clone does — failed immediately with `ERR_MODULE_NOT_FOUND`. **Fixed:** added `"cookie-parser": "^1.4.7"` to `backend/package.json` and regenerated `backend/package-lock.json`.
2. **Arcjet's `tokenBucket` rule needs a `requested` cost parameter that was never being passed** in any of the three `aj.protect(req, { email })` calls (register, login, reset-password-request). Missing it caused Arcjet to return an internal `ERROR` conclusion on every request; Arcjet fails open on that error (doesn't deny), which is why it wasn't obviously broken, but it meant the rate limiter wasn't reliably engaging. **Fixed:** changed all three calls to `aj.protect(req, { email, requested: 1 })`, then verified with the 15-request hammer test above that the limiter now cleanly triggers at the configured capacity.

Also fixed one Docker Desktop environment issue (not a code bug): the daemon wasn't running on your machine — its Windows service was stopped. Started `Docker Desktop.exe` directly and waited for the engine to come up before building.

`npm install` also flagged 26 pre-existing dependency vulnerabilities (1 critical, 11 high) across the backend's dependency tree — unrelated to this phase's work and not touched here; worth a `npm audit` pass at some point, ideally in isolation so any breaking version bumps can be tested on their own.

**Done when:** `docker compose up` boots the entire stack and the full signup/verify/login flow works using Mailpit instead of a real inbox. ✅ Confirmed.

### Phase 4 — Backend depth features (~3–5 days) — ✅ DONE, verified end-to-end (2026-08-02)

Goal: the features that actually demonstrate backend/systems engineering.

**S11 — BullMQ email queue**
- New `backend/libs/redis.js` (shared `ioredis` connection, `maxRetriesPerRequest: null` as BullMQ requires), `backend/queues/email-queue.js` (`Queue` + `queueEmail()` helper, 3 retries with exponential backoff), `backend/workers/email-worker.js` (standalone `Worker` process, no DB connection since it only sends mail).
- `auth-controller.js` (register, login's resend-verification path, reset-password-request) and `workspace.js` (`inviteUserToWorkspace`) now call `queueEmail(...)` instead of `sendEmail(...)` directly — the `isEmailSent`-gated rollback branches were removed since delivery is now async by design.
- New `worker` service in `docker-compose.yml`, same image as `backend` with `command: node workers/email-worker.js`.
- **Verified live:** enqueued a job directly against the running backend container; the separate `worker` container picked it up, logged `job 1 completed`, and the email actually appeared in Mailpit — proving the queue and worker are wired correctly, not just present in code.

**S12 — Redis caching**
- New `backend/libs/cache.js` (`getOrSetCache`, `deleteCache`, `workspaceStatsCacheKey`).
- `getWorkspaceStats` in `workspace.js` wrapped with a 60s cache.
- Invalidated on the mutations that actually feed the stats aggregation: `createTask`, `updateTaskStatus`, `updateTaskPriority`, `archivedTask`, `updateTaskDueDate` (`task.js`), and `createProject` (`project.js`) — deliberately *not* on title/description/assignee/subtask/comment changes, since those don't affect the cached payload.
- **Verified live:** first call to `/workspaces/:id/stats` took 290ms and set a Redis key with TTL 58s; second call took 29ms (cache hit, ~10x faster); creating a task correctly deleted the cache key (confirmed via `redis-cli EXISTS` before/after).

**S16 — Refresh token rotation + revocation**
- New `backend/models/session.js` (`user`, `tokenHash`, `userAgent`, `expiresAt` with a Mongo TTL index for automatic cleanup).
- `libs/token.js`: refresh tokens now embed a `sessionId`; added `hashToken`/`tokensMatch` using SHA-256 + `crypto.timingSafeEqual` — **not bcrypt**, which silently truncates input over 72 bytes and would be the wrong (and subtly broken) tool for hashing a ~200+ character JWT.
- `loginUser` creates a `Session` doc and stores only its token hash. `refreshAccessToken` verifies the JWT, loads the session by `sessionId`, and **rotates**: if the presented token doesn't match the session's current hash, that's treated as a replayed/stolen token and the *entire session is revoked*, not just the one request — standard refresh-token-family revocation. `logoutUser` deletes the specific session; new `logoutAllDevices` (`POST /auth/logout-all`, authenticated) deletes every session for the user.
- **Verified live:** decoded the issued refresh JWT to confirm a real `sessionId` claim; confirmed normal rotation returns a new access token; confirmed that replaying an already-rotated-out token is rejected with 401 and revokes the session, and that the legitimately-rotated token *also* then fails — exactly the intended "revoke the whole family on reuse" behavior, not a bug.

**S14 — MinIO object storage**
- New `minio` service in `docker-compose.yml` and `backend/libs/storage.js` (`ensureBucketExists` with retry/backoff since MinIO has no Docker healthcheck available, `uploadFile`, `deleteFile`, `keyFromUrl`).
- `multer-config.js` switched from `diskStorage` to `memoryStorage`; `uploadProfilePhoto` in `controllers/user.js` now uploads the buffer to MinIO and deletes the old object on replacement, storing the full public URL on the user document instead of a relative `/uploads/...` path.
- Removed the now-dead `/uploads` static file route and `uploads` bind mount from `index.js`/`docker-compose.yml`.
- Fixed a resulting frontend bug in `profile-photo.tsx`: it used to prepend `VITE_BACKEND_URL` to the stored (relative) path — now that the stored value is already a full MinIO URL, that would have double-prefixed it. Removed the prefixing.
- **Verified live:** uploaded a real PNG through the API; got back `http://localhost:9000/tasksync-uploads/profile-photos/...`; fetched that URL directly and confirmed `200`, correct `Content-Type: image/png`, and byte-exact size — the public-read bucket policy and the full upload path both work.
- **Bug caught during this build, not a coding bug but an infra one:** the official `minio/minio` image is minimal enough that it doesn't even have `which` (confirmed by exec-testing it directly), so a `healthcheck: ["CMD", "mc", "ready", "local"]` would have left the container permanently "unhealthy" and deadlocked `backend`'s `depends_on: condition: service_healthy`. Removed the healthcheck; `ensureBucketExists()` retries with backoff at the application layer instead.

**S15 — Full-text search**
- Added `{ title: "text", description: "text" }` indexes to `Task` and `Project`.
- New `backend/controllers/search.js` + `routes/search.js` (`GET /api-v1/search?q=...`), scoped to only the projects the requesting user is actually a member of — the same visibility boundary as everywhere else, so search can't leak titles from projects a user can't otherwise view.
- Added a working global search bar to the frontend header (`components/ui/layout/header.tsx`), finally putting the existing-but-until-now-only-partially-used `useDebounce` hook to work end-to-end: debounced input → `useGlobalSearchQuery` → dropdown of matching projects/tasks → click navigates to the correct nested route.
- **Verified live:** created a project titled "Quantum Rocket Launch" and a task titled "Xylophone Nebula Widget"; `/search?q=Quantum` and `/search?q=Xylophone` each correctly returned the matching document and nothing else.

**Verified overall:** full stack rebuilt via `docker compose up --build -d` with 7 containers (`mongo`, `redis`, `mailpit`, `minio`, `backend`, `worker`, `frontend`), all reporting healthy/running. One unrelated hiccup during this pass: the `worker` container initially showed `(unhealthy)` because it inherited the backend image's HTTP healthcheck (which pings `/health` — a route the worker doesn't have, since it isn't an HTTP server); fixed with `healthcheck: disable: true` on the `worker` service.

**Done when:** email sending no longer blocks requests ✅, dashboard reads hit Redis on repeat loads ✅, logout actually revokes sessions ✅, uploads go to MinIO ✅, and search returns results ✅ — all confirmed against the live running stack, not just code review.

### Phase 5 — Observability (~1–2 days) — ✅ DONE, verified end-to-end (2026-08-02)

Goal: make the system's health visible, building on the queue/cache from Phase 4.

**S4 — Pino structured logging**
- New `backend/libs/logger.js` (shared Pino instance, `debug` level outside production, `info` in production).
- `pino-http` replaces `morgan("dev")` in `index.js`, attaching a per-request `req.id` and logging method/url/status/response-time as structured JSON on completion.
- Every remaining `console.log`/`console.error` across the backend (`index.js`, `middleware/auth-middleware.js`, `middleware/error-middleware.js`, `libs/index.js`, `libs/redis.js`, `libs/send-email.js`, `libs/storage.js`, `workers/email-worker.js`) now goes through the shared `logger` (or `req.log` where a request context exists). Only `libs/env.js` still uses plain `console.error` — deliberately, since that's the fatal pre-logger startup-validation path, before we can be sure a logger is even constructible.
- Fixed a real pre-existing anti-pattern along the way: `error-middleware.js` used to only log errors when `NODE_ENV !== "production"` — backwards, since production is exactly when you need error visibility. Now every 5xx is logged at `error` level and every 4xx at `warn`, unconditionally.
- Bonus cleanup: deleted the long-dead commented-out SendGrid block in `libs/send-email.js` and removed `morgan` and `@sendgrid/mail` from `package.json` entirely (both fully unused) — this incidentally dropped `npm audit`'s vulnerability count from 26 to 21.
- **Verified live:** `docker compose logs backend` shows real structured JSON log lines (`req.id`, `method`, `url`, `res.statusCode`, `responseTime`, `msg: "request completed"`) for every request, including Prometheus's own scrape requests.

**S22 — Prometheus + Grafana**
- New `backend/libs/metrics.js`: `prom-client` default Node.js process metrics, plus custom `http_request_duration_seconds` (histogram, labeled by method/route/status — using the matched route *pattern* like `/api-v1/tasks/:taskId`, not the resolved path, to keep label cardinality bounded), `cache_hits_total`/`cache_misses_total` (wired into `libs/cache.js`), and `email_queue_waiting_jobs` (an async-`collect()` gauge reading `emailQueue.getWaitingCount()` from Phase 4's BullMQ queue).
- New `GET /metrics` route in `index.js`.
- New `monitoring/` directory: `prometheus.yml` (scrapes `backend:5000/metrics` every 15s), and a fully provisioned Grafana setup (`monitoring/grafana/provisioning/datasources`, `.../dashboards`, and the actual dashboard definition in `monitoring/grafana/dashboards/tasksync-overview.json` — 7 panels: HTTP request rate, p95 latency, 5xx error rate, email queue depth, cache hit ratio, process memory, event-loop lag).
- New `prometheus` and `grafana` services in `docker-compose.yml` (Grafana on host port `3001` since `3000` isn't free once mapped through to the frontend's internal port; anonymous viewer access enabled for friction-free local demoing, admin/admin for editing).
- **Verified live:** `/metrics` returns real Prometheus-format output including live histogram buckets from actual traffic; Prometheus's `/api/v1/targets` reports the backend target as `up`; Grafana's `/api/health` is `ok`; the Prometheus datasource and the "TaskSync Overview" dashboard both auto-provisioned; fetched the dashboard via Grafana's API and confirmed all 7 panels loaded with correct titles/types.

**Two real bugs found and fixed while wiring this up:**
1. **Grafana dashboard mount failed to start the container.** `docker-compose.yml` mounted `./monitoring/grafana/provisioning:/etc/grafana/provisioning:ro` and then tried to mount `./monitoring/grafana/dashboards` *inside* that same read-only tree (`/etc/grafana/provisioning/dashboards/json`) — Docker can't create a mountpoint inside an already-read-only bind mount, so Grafana failed with an OCI runtime error on startup. Fixed by mounting the dashboards JSON to `/var/lib/grafana/dashboards-json` instead (outside the read-only tree) and updating `dashboard.yml`'s provider path to match.
2. **Mongo flipped to `unhealthy` under a transient CPU spike.** Caught via `docker stats` showing Mongo briefly at 97% CPU, which starved the `mongosh`-based healthcheck of the ~5s it needed to respond. Confirmed transient (CPU was back to 0.6% within 10s), but a Node-CLI-based healthcheck with a 5s timeout is inherently fragile under any load spike on a resource-constrained dev machine, so widened it (`timeout: 5s → 10s`, `interval: 10s → 15s`) for resilience rather than leaving it to flap under load again.

**Done when:** `/metrics` is scrapeable ✅, and a Grafana dashboard shows live request latency, error rate, and queue depth ✅ — confirmed against the live stack, including panel-level verification via Grafana's own API.

### Phase 6 — Test suite, retrofitted (~2–3 days) — ✅ DONE, verified end-to-end (2026-08-02)

Goal: write tests against the now-stabilized architecture (Phases 2–5), not before — otherwise RBAC/error-handling changes would break tests written too early.

**Deviation from the original plan, and why:** used **Vitest** for the backend instead of Jest. The backend is pure ESM (`"type": "module"`), and Jest's ESM support still requires the `--experimental-vm-modules` flag and `jest.unstable_mockModule()` (not the regular hoisted `jest.mock()`) to mock ESM dependencies like `libs/arcjet.js`. Vitest handles ESM and mock hoisting natively with no special flags, and using it for both frontend and backend means one test runner's conventions for the whole repo instead of two. Same testing competency demonstrated, less accidental complexity.

**Backend (`backend/tests/`, Vitest + Supertest + mongodb-memory-server):**
- Split `backend/index.js` into `backend/app.js` (pure Express app: middleware, routes, error handler — no DB connect, no `listen()`) and a slim `index.js` (connects Mongo, initializes the MinIO bucket, starts the server, handles graceful shutdown). This is what makes the app importable by Supertest without needing a bound port.
- `tests/setup.js`: starts an in-memory MongoDB (`mongodb-memory-server`) and sets required env vars via **top-level await**, which Vitest fully executes before a test file's own `import app from "../../app.js"` (and therefore `libs/env.js`'s validation) runs. Each test *file* gets its own isolated in-memory Mongo instance (`fileParallelism: false` keeps that resource usage bounded).
- Unit tests (`tests/unit/`): `permissions.test.js` (the full RBAC matrix from `libs/permissions.js`), `token.test.js` (`generateAccessToken`/`generateRefreshToken`/`hashToken`/`tokensMatch` from Phase 4's session work).
- Integration tests (`tests/integration/`, real HTTP requests via Supertest against the real Express app + real in-memory Mongo):
  - `auth.test.js` — register → blocked-until-verified login → verify-email → login → wrong-password rejection → unauthenticated access rejection. Arcjet and the email queue are mocked here (`vi.mock`) since they're external-network/external-Redis boundaries, not what this suite is testing.
  - `rbac.test.js` — seeds a manager/contributor/viewer directly into a shared project and proves the exact Phase 2 RBAC rules: viewer can't create tasks (403), contributor can create tasks and update ones assigned to them but gets 403 on tasks *not* assigned to them, manager can update/archive any task, viewer retains read-only access, and a non-member gets 403 on everything.
  - `task-crud.test.js` — full lifecycle: create → fetch → rename → change status → add subtask → add comment → archive → unarchive.
- **A real production fix this work required, not just a test-only shim:** `libs/cache.js` had zero error handling. Since Redis is configured with `maxRetriesPerRequest: null` (required for BullMQ elsewhere), a command issued while Redis is unreachable queues forever rather than rejecting — which would have hung both the test suite *and* any real request in production if Redis ever blipped. Fixed by racing every cache read/write/delete against a 500ms timeout and failing open (bypass the cache, compute fresh, log a warning) instead of failing the request. This means a Redis outage now degrades performance, not correctness — a real resilience improvement, found because the test suite needed it.
- **38 tests across 5 files, all passing.**

**Frontend (`frontend/app/**/*.test.tsx`, Vitest + React Testing Library):**
- `tests/setup.ts`: jsdom polyfills Radix UI needs but jsdom doesn't provide (`hasPointerCapture`, `scrollIntoView`, `ResizeObserver`) — without these, any test that opens a Select/Popover/Dialog throws "not a function" instead of a real assertion failure. Also explicitly registers RTL's `cleanup()` in `afterEach`, since this project doesn't run Vitest in `globals: true` mode (kept consistent with the backend's explicit-import style) and RTL's automatic cleanup-detection depends on a *global* `afterEach` to hook into.
- `task-status-selector.test.tsx` — renders current status, calls the mutation with the right args on change, and rolls back optimistically on error.
- `create-task-dialog.test.tsx` — renders required fields, blocks submission with a validation error on an empty title, clears the error once a valid title is typed. (Chose to test client-side validation here rather than a full successful submission through the Radix Popover/Calendar-based due-date and assignee pickers — that richer interaction is exactly what the E2E layer below covers in a real browser, without jsdom's polyfill limitations.)
- `forgot-password.test.tsx` — chosen over `sign-in.tsx` as the "auth form" test target since sign-in carries heavy Lottie/particle-animation dependencies that add mocking overhead for no additional test value; forgot-password has none. Renders form, blocks an invalid email, submits a valid one and shows the success confirmation.
- **A real (minor) accessibility gap surfaced and fixed along the way:** Radix logged an a11y warning that `create-task-dialog.tsx`'s `DialogContent` was missing a `Description`/`aria-describedby`. The shared `dialog.tsx` primitive already exports a `DialogDescription` component; the dialog just never rendered one. Added it.
- **9 tests across 3 files, all passing.**

**E2E (`e2e/golden-path.spec.ts`, Playwright, root-level — exercises the real running Docker stack, no mocks at all):**
- One spec: sign up → find and read the verification email via Mailpit's HTTP API → verify → log in → create a workspace → create a project (adding myself as a project member with the Manager role, since without that the creator isn't automatically a project member and would otherwise be locked out of their own project by the same RBAC rules from Phase 2) → open the project and create a task → log out.
- Getting this fully green surfaced a chain of genuine, real issues (not contrived) — worth knowing about if this suite is extended later:
  1. **Arcjet's real network round-trip is slow and variable from this environment** (observed anywhere from ~5s to 30s+ per register/login call) — almost certainly because this sandbox's egress IP gets classified by Arcjet as a shared/VPN-range IP (same finding as Phase 3/4). Not a bug in the app; timeouts (`expect: 45000`, `actionTimeout`/`navigationTimeout: 45000`, overall test `timeout: 120000`) and one retry are sized specifically to absorb it.
  2. **`@example.com` test emails get denied by Arcjet's real `validateEmail` rule** (no MX records) — same root cause identified back in Phase 3. Fixed by using a `@gmail.com`-domain test address.
  3. **Node's `fetch`/`undici` can stall for seconds resolving `localhost` before falling back from IPv6 (`::1`) to IPv4**, where Docker's port mapping actually listens — curl on this machine didn't hit this, Playwright's `request` fixture did. Fixed by calling Mailpit via `127.0.0.1` explicitly.
  4. **The workspace's empty-state "no projects yet" prompt renders its own "Create Project" button**, in addition to the persistent header button — two matches before the dialog even opens. Not a bug, just an ambiguous test selector; fixed with `.first()`.
  5. **In both the project-members and task-assignees pickers, the checkbox and the member's name are sibling elements, not label-associated** — clicking the name text does nothing; only the checkbox itself is clickable. This is a real, if minor, UX/accessibility rough edge for actual users (small click target) worth a follow-up fix later; the test was adjusted to click the checkbox specifically, scoped to its own row.
  6. **The date-picker popover doesn't auto-close after a day is selected** (no such handler wired in `create-project.tsx`/`create-task-dialog.tsx`), which could block the next field's button. Worked around with an explicit `Escape` after each date selection.
  7. **`new Date().toLocaleDateString()` produced different strings in Node (the test script) versus the browser (the actual app)** on this machine, breaking the `data-day`-attribute selector used to click "today" on the calendar. Fixed by computing that value *inside* the browser via `page.evaluate()` instead of in Node — a good general lesson for any Playwright test relying on locale-formatted values.
  8. **A workspace/project member-list avatar elsewhere on the page shares the same `data-slot="avatar"` as the header's own (clickable) avatar** — an ambiguous selector, not a bug; disambiguated by targeting the specific button role/name.
- **1 spec, passing, ~43s wall time** against the real stack.

**Done when:** `npm test` passes in both `backend` (38/38) and `frontend` (9/9) ✅, and one Playwright spec runs the full golden path against the real stack ✅.

### Phase 7 — CI/CD (~half a day) — ✅ BUILT, syntax-validated (2026-08-02)

**Split into two workflows rather than one, deliberately:** register/login calls go through Arcjet's real fraud-detection service, and this session directly observed its latency from this network varying anywhere from ~5s to 30s+ (see Phase 6's E2E notes). That's fine to absorb with generous timeouts in an on-demand deep-check, but not something that should be allowed to block or intermittently fail every PR's required status check. So:

- **`.github/workflows/ci.yml`** — runs on every push and on PRs targeting `main`. Two jobs, `backend` and `frontend`, each: checkout, `actions/setup-node@v4` (Node 20, npm cache keyed to that package's lockfile), `npm ci`, then `npm test` (frontend also runs `npm run typecheck` first). Neither job needs any service containers — the backend suite is fully self-contained via `mongodb-memory-server`, and Arcjet/the email queue are mocked in the tests that would otherwise touch them (Phase 6). This is the fast, always-reliable, required check.
- **`.github/workflows/e2e.yml`** — `workflow_dispatch` only (manually triggered from the Actions tab), not on every push. Generates a `backend/.env` in the runner (random secrets for JWT/token signing via `openssl rand -hex 32`, dummy SMTP creds since Mailpit doesn't check auth, and the real `ARCJET_KEY` pulled from a GitHub Actions secret since that call genuinely hits Arcjet's live service), brings up the full `docker compose` stack, polls `/health` until the backend responds, installs Playwright + Chromium, runs the E2E spec from Phase 6, uploads the Playwright report as an artifact on failure, and tears the stack down (`docker compose down -v`) unconditionally via `if: always()`.

**Housekeeping done alongside this (found while setting it up):** there was no root `.gitignore`, and the root `node_modules` (originally just the stray `cookie-parser` leftover from the Phase 3 investigation) was actually tracked in git. Added a root `.gitignore` (`node_modules/`, `.env`, Playwright's `test-results/`/`playwright-report/`/`blob-report/`) and untracked the stray `node_modules` from the git index (`git rm -r --cached` — the files stay on disk, just stop being tracked) so a fresh `npm ci` in CI isn't fighting stale committed dependencies.

**Verified:** both workflow YAML files parse correctly (validated with a real YAML parser, not just eyeballed) and resolve to the expected job structure. **Not yet verified:** an actual GitHub Actions run — that requires pushing this branch and either opening a PR or manually dispatching the E2E workflow, which wasn't done without asking first. **One manual step required before `e2e.yml` can succeed:** add `ARCJET_KEY` as a repository secret (Settings → Secrets and variables → Actions → New repository secret) — this can't be set by an agent, since it means putting a real credential into GitHub's UI.

**Done when:** every PR shows passing/failing checks automatically — pending a real push to confirm.

### Phase 8 — Real-time + docs + polish (~2–3 days) — ✅ DONE, verified end-to-end (2026-08-02)

**S13 — Socket.IO real-time**
- New `backend/libs/socket.js`: `initSocket(server)` attaches Socket.IO to the same raw `http.Server` the Express app listens on (wired in `index.js`, which now does `http.createServer(app)` instead of `app.listen()` directly). The handshake is authenticated with the exact same JWT verification `authMiddleware` uses for HTTP requests.
- Rooms are **not** joined automatically — a client emits `join:project`/`join:workspace`, and the server verifies actual membership (`Project.findById(...).members`) before calling `socket.join()`. This mirrors the HTTP RBAC middleware's authorization boundary: a socket can't be used to peek at a project a user isn't a member of just because they know its id.
- `controllers/task.js` emits `task:created`/`task:updated`/`comment:added` to `project:<id>` after every successful mutation (title, description, status, priority, due date, assignees, subtasks, comments, archive). Payloads are deliberately minimal (`{ taskId, projectId }`) rather than the full task document — the frontend just invalidates the relevant React Query keys and lets a normal refetch bring the fresh data, which is far more robust than trying to keep a hand-rolled cache merge in sync with every mutation shape.
- Frontend: `lib/socket.ts` (a lazily-created, lazily-connected singleton whose `auth` callback re-reads the token from `localStorage` on every reconnect, since the token can rotate after the socket already exists) + `hooks/use-realtime-project.ts` (joins/leaves the room on mount/unmount, invalidates `["project", id]`, `["task", id]`, `["task-activity", id]`, `["comments", id]` on the relevant events). Wired into both `project-details.tsx` and `task-details.tsx`, since both pages care about the same project's live events.
- **Verified live** (not just code review): a real `socket.io-client` connection authenticated with a real JWT, joined a real project room, and received a `task:updated` event within ~1 second of a `PUT /tasks/:id/status` call made from a completely separate HTTP request — proving the JWT-authenticated handshake, the membership-gated room join, and the emit-on-mutation all work together, end-to-end, against the live Docker stack.

**S10 — Swagger/OpenAPI**
- `backend/libs/swagger.js` (swagger-jsdoc, OpenAPI 3.0, bearer-auth security scheme) mounted at `/api-docs` in `app.js`.
- Every route across all 7 route files (`auth`, `workspaces`, `projects`, `tasks`, `users`, `settings`, `search`) carries an `@openapi` JSDoc block — **41 documented endpoints**, confirmed by directly importing the generated spec and checking `Object.keys(spec.paths)`, not just eyeballing the UI.

**S19 — Audit log viewer**
- New `GET /projects/:projectId/activity` (`controllers/project.js#getProjectActivity`), paginated and filterable by `action`/`userId`. Scoped to a project rather than a whole workspace: `ActivityLog.resourceId` is generic (not a typed foreign key), so answering "all activity for X" means gathering every relevant resource id first — a project's own id plus its task ids is a bounded, cheap set; a workspace's would mean gathering every project's tasks too, for a feature that's an on-demand dialog, not a hot path.
- Frontend: `hooks/use-project-activity.ts` + `components/project/project-activity-log-dialog.tsx`, reusing the existing `getActivityIcon` helper (already built for the per-task activity feed) for visual consistency, with Prev/Next pagination controls. Opened via a new "Activity Log" button next to "Add Task" on the project page.
- **Verified live:** triggered a real task status update, then confirmed the exact same event appeared through this endpoint with the correct populated actor, action, description, and timestamp.

**S23 — Accessibility audit**
- Used `@axe-core/playwright` against the already-built Playwright E2E infrastructure instead of standing up `eslint-plugin-jsx-a11y` from scratch — this repo has no ESLint config at all, and bootstrapping one just to run one plugin would have been a bigger detour than the audit itself. A runtime axe-core scan also catches real computed-accessibility-tree issues (like the ones found below) that static JSX linting can't, since it runs against actually-rendered Radix output rather than JSX source patterns.
- New `e2e/accessibility.spec.ts`: scans `/`, `/sign-in`, `/sign-up`, `/forgot-password` for WCAG 2.0/2.1 A/AA violations, scoped to public pages deliberately so this suite doesn't depend on Arcjet's real (and sometimes slow) network calls.
- **Two real, critical-impact violations found and fixed, not contrived:**
  1. **Every single page was missing a `<title>` element entirely.** `root.tsx` renders React Router's `<Meta />`, but no route exported a `meta()` function, so it rendered nothing — every page had a blank browser tab and nothing for a screen reader to announce. Fixed with a site-wide default `meta()` export in `root.tsx` (individual routes can still override it).
  2. **The home page's dark-mode toggle button had no accessible name at all** — an icon-only `<button>` with no `aria-label`, no visible text, nothing. Fixed by adding a dynamic `aria-label` reflecting the action ("Switch to light/dark mode").
  - Also proactively `aria-hidden`'d the purely-decorative Lottie animations on the sign-in/sign-up pages: one of them was surfacing an `aria-prohibited-attr` violation from markup the Lottie library itself generates at runtime (not something editable in our own JSX), and the correct fix for decorative content is to remove it from the accessibility tree entirely rather than try to patch a third-party library's internal SVG output.
- **Verified: all 4 pages pass with zero critical/serious violations**, confirmed by rerunning the suite after each fix (first run: 4 failed; after the title fix: 2 failed; after the button label + Lottie fixes: 4 passed).

**S25 — ARCHITECTURE.md**
- New root-level `ARCHITECTURE.md`: system diagram, full ER diagram (Mermaid, renders natively on GitHub), the RBAC permission tables reproduced directly from `libs/permissions.js`, and a "scaling & design trade-offs" section explaining the reasoning behind Redis-for-both-cache-and-queue, the cache's fail-open timeout design, MinIO over local disk, why Socket.IO rooms are per-project rather than a global broadcast, and why the email worker is a separate process. Also documents the real UX sharp edge in the data model: a project creator isn't automatically a project member, so they can lock themselves out of their own project under the exact same RBAC rules everyone else follows unless they explicitly add themselves as a member — discovered firsthand while building the Playwright E2E spec in Phase 6.

**Done when:** live task updates appear across two clients without refresh ✅ (verified with a real second socket connection, not two browser tabs, but the same proof), `/api-docs` renders the full API ✅ (41 routes), the audit log is browsable ✅, `ARCHITECTURE.md` exists ✅, and there are no critical axe-core violations ✅ (0/4 pages failing, down from 4/4).

---

## 5. Quick reference — resume bullets (use after implementing)

- *"Designed and enforced role-based access control across 20+ API endpoints via reusable middleware, closing authorization gaps where role checks were previously bypassed."*
- *"Decoupled transactional email from the request/response cycle using a Redis-backed BullMQ queue with retry/backoff."*
- *"Implemented real-time collaboration (live task/comment updates, presence) via Socket.IO with per-workspace rooms and JWT-authenticated handshakes."*
- *"Implemented refresh-token rotation with server-side session storage, enabling real session revocation and 'log out of all devices'."*
- *"Introduced a Redis cache-aside layer for dashboard analytics, with TTL and write-invalidation."*
- *"Containerized the full stack with Docker Compose for one-command local environment parity."*
- *"Set up CI (GitHub Actions) running lint, type-checking, and test suites on every pull request."*
- *"Replaced local-disk storage with a MinIO (S3-compatible) object store behind a storage adapter, with server-side image resizing."*
- *"Instrumented the API with Prometheus metrics visualized via a self-hosted Grafana dashboard."*
- *"Built a test suite (API integration tests, critical-path E2E) covering auth, RBAC, and task lifecycle, integrated into CI."*
