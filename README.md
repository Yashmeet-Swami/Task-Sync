# 🗂️ Project Manager

A modern, full-stack project and task management web app built with the MERN stack (MongoDB, Express.js, React, Node.js) and TypeScript.

---

## 🚀 Features

- 🧑‍💼 User authentication (Sign up, Login, Email verification)
- ✅ Protected routes using JWT
- 📧 Email verification using Nodemailer
- 🔐 Secure password hashing with bcrypt
- 🗃️ Project & task creation
- ⚡ Modern UI with TailwindCSS + ShadCN
- 📦 React Query for API caching and mutations

---

## 📂 Tech Stack

### Frontend 🖥️
- React.js + TypeScript
- React Router DOM
- React Query
- Zod + React Hook Form
- TailwindCSS + ShadCN UI

### Backend 🧠
- Node.js + Express.js
- MongoDB (Mongoose)
- JWT for authentication
- Nodemailer for emails

---

## 📸 Screenshots

> (Add screenshots later here)

---
Landing Page
<img width="1898" height="870" alt="Screenshot 2025-07-23 193457" src="https://github.com/user-attachments/assets/96ff8613-7049-4771-961d-6d19051253e0" />

Sign-in Page
<img width="1919" height="869" alt="image" src="https://github.com/user-attachments/assets/9436d777-bb7a-4c07-ad2b-6a7e903c9176" />



## 🐳 Running with Docker (recommended for local dev)

The full stack — backend, background email worker, frontend, MongoDB, Redis, a local email sandbox (Mailpit), and MinIO (S3-compatible object storage) — runs with one command, no cloud accounts, real SMTP credentials, or paid S3 bucket required:

```bash
docker compose up --build
```

This starts:

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:5000 |
| Backend health check | http://localhost:5000/health |
| Mailpit inbox (view verification/reset/invite emails here) | http://localhost:8025 |
| MinIO console (view uploaded profile photos) | http://localhost:9001 (user/pass: `minioadmin`/`minioadmin`) |
| MongoDB | localhost:27017 |
| Redis | localhost:6379 |
| Backend metrics (Prometheus scrape format) | http://localhost:5000/metrics |
| Prometheus | http://localhost:9090 |
| Grafana dashboard | http://localhost:3001 (anonymous viewer access; admin/admin to edit) |
| API docs (Swagger UI, 41 documented endpoints) | http://localhost:5000/api-docs |

Live updates (task changes, comments) sync across clients in real time via Socket.IO - no polling, no manual refresh. See `ARCHITECTURE.md` for the system diagram, data model, RBAC tables, and the reasoning behind the key design/scaling decisions.

The backend container loads secrets (`JWT_SECRET`, `ARCJET_KEY`, etc.) from `backend/.env`, but overrides `MONGODB_URI`, `SMTP_HOST`/`SMTP_PORT`/`SMTP_SECURE`, `REDIS_URL`, and `MINIO_*` to point at the local `mongo`, `mailpit`, `redis`, and `minio` containers instead of Atlas/Gmail/S3 — so signup, email verification, password reset, caching, and file uploads all work fully offline. A separate `worker` container processes queued emails (BullMQ + Redis) so the API never blocks on SMTP. Backend logs are structured JSON (Pino); request latency, cache hit rate, and email queue depth are all visible live on the pre-provisioned "TaskSync Overview" Grafana dashboard.

Stop the stack with `docker compose down` (add `-v` to also wipe the MongoDB and MinIO volumes).

## 🧪 Running the tests

```bash
cd backend && npm test    # 38 unit + integration tests (Vitest + Supertest + in-memory MongoDB)
cd frontend && npm test   # 9 component tests (Vitest + React Testing Library)
npx playwright test       # E2E golden path (requires `docker compose up` running first)
```

The backend and frontend suites are fully self-contained (no Docker required — the backend suite spins up its own in-memory MongoDB per test file). The Playwright suite drives a real browser against the actual running stack end-to-end (signup → email verification via Mailpit → login → workspace/project/task creation → logout), so it needs `docker compose up` running first.

## 📦 Installation

### 1. Clone the repo

```bash
git clone https://github.com/Yashmeet-Swami/Project-Manager.git
cd Project-Manager



