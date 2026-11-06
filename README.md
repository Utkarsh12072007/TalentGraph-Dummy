# TalentGraph

A two-sided recruitment platform with a built-in Applicant Tracking System (ATS).
Candidates discover jobs and track their applications; companies run their whole
hiring process — jobs, pipeline, interviews, decisions — in one workspace.

Built as a real full-stack product: **React + Vite** frontend, **Express** REST API,
**PostgreSQL + Prisma**, **JWT auth in HTTP-only cookies**. JavaScript everywhere
(no TypeScript), by design.

---

## 1. Quick start

```bash
# 0) Prereqs: Node 20+, npm.

# 1) Install dependencies
npm install

# 2) Database — two options:
#    a) This repo ships portable PostgreSQL 16 binaries (.pg/) so it can run
#       without a system install and without root:
npm run db:init        # first time only: initdb + create `talentgraph` database
#    b) Or point .env DATABASE_URL at your own PostgreSQL and skip pg scripts.

# 3) Create .env (copy the example) and set JWT_SECRET
cp .env.example .env   # then edit

# 4) Push the Prisma schema and seed development demo data
npm run db:push
npm run db:seed

# 5) Run everything (Postgres if needed + API on :4000 + web on :3000)
npm run dev
```

Open **http://localhost:3000**. The API is reachable through the same origin
(`/api/...` is proxied by Vite), and Swagger docs live at **/api/docs**.

### Demo accounts (development seed only)

| Role            | Email                    | Password          |
| --------------- | ------------------------ | ----------------- |
| Platform admin  | `admin@talentgraph.local`| `Admin@TalentGraph1` (from `.env`) |
| Recruiter (admin of company) | `recruiter@demo.dev` | `Recruiter@1` |
| Interviewer     | `interviewer@demo.dev`   | `Interviewer@1`   |
| Candidate       | `candidate@demo.dev`     | `Candidate@1`     |
| Candidate 2     | `candidate2@demo.dev`    | `Candidate@1`     |

The seed script refuses to run when `NODE_ENV=production` and only touches
`@demo.dev` accounts, so it is always clearly separated from real data.

### Scripts

| Command           | What it does                                              |
| ----------------- | --------------------------------------------------------- |
| `npm run dev`     | Postgres (if needed) + API (`node --watch`) + Vite (HMR)  |
| `npm run db:init` | First-time portable-Postgres init + database creation     |
| `npm run db:push` | Ensure Postgres is up, then `prisma db push`              |
| `npm run db:seed` | Development demo data (idempotent, demo-marked)           |
| `npm test`        | Vitest + Supertest integration tests (uses `talentgraph_test` DB) |
| `npm run lint`    | ESLint                                                    |

---

## 2. Architecture

```
├── client/                     React SPA (Vite + Tailwind + shadcn-style UI kit)
│   └── src/
│       ├── lib/                api.js (fetch wrapper), auth.jsx (context), hooks.js
│       ├── components/ui/      hand-written shadcn-style components (CVA + CSS vars)
│       ├── components/layout/  public shell + shared app shell (role-based nav)
│       └── pages/              public/ candidate/ recruiter/ admin/
├── server/
│   └── src/
│       ├── config/env.js       env loading, fail-fast validation
│       ├── lib/prisma.js       single PrismaClient instance
│       ├── middleware/         auth (JWT cookie), company isolation, zod validation, errors
│       ├── modules/            auth users companies candidates jobs applications
│       │                       resumes interviews notifications analytics admin
│       │   └── (each)          routes.js controller.js service.js schemas.js
│       ├── utils/              ApiError, storage (multer), transitions, audit, notify
│       ├── docs/openapi.js     OpenAPI 3 document served at /api/docs
│       ├── app.js              express wiring (no business logic)
│       └── server.js           listen + graceful shutdown
├── prisma/schema.prisma        20-model PostgreSQL schema
├── scripts/                    dev.js launcher, pg.js, seed.js, db.js
├── server/tests/               Vitest + Supertest integration suites
├── Dockerfile.server / Dockerfile.client / docker-compose.yml
```

**Request flow:** Vite (:3000) serves the SPA and proxies `/api` + `/uploads`
to Express (:4000) — one origin in development, so HTTP-only cookies "just work"
and there is no CORS logic to maintain.

**Backend layering:** routes only wire HTTP to controllers; services hold the
business logic and throw `ApiError`; the central error handler converts
everything to `{ error: { code, message, details } }`. Zod schemas validate every
request body/query before controllers run.

---

## 3. Database design (the important decisions)

20 models. The reasoning behind the non-obvious ones:

1. **Two-level roles.** `User.role` is the *platform* role
   (`CANDIDATE | RECRUITER | PLATFORM_ADMIN`). The *company* role
   (`ADMIN | RECRUITER | INTERVIEWER`) lives on `CompanyMember`, because "admin"
   is a property of a membership, not of a human being globally.
2. **One company per user.** `CompanyMember.userId` is `@unique`. This keeps
   company-scoped authorization provable with a single query (`requireCompanyMember`
   middleware) and matches the product flow. Multiple memberships would only add
   UI complexity at this stage.
3. **Duplicate applications are impossible at the database level.**
   `Application @@unique([jobId, candidateProfileId])` — the API maps the Prisma
   `P2002` error to HTTP 409, but even a race condition cannot create a duplicate.
4. **`ApplicationStatusHistory` is an append-only ledger.** Every change stores
   `previousStatus`, `newStatus`, `changedById` and a timestamp. Candidates see
   this ledger; it is the candidate-facing timeline.
5. **`RecruiterNote` is a separate table that is never joined into
   candidate-facing queries.** The candidate detail endpoint constructs its
   response from an allow-list; notes are only returned by company-scoped
   endpoints. This is the strongest possible separation of private notes.
6. **`InterviewFeedback` is protected twice**: authorization (assigned interviewer
   or company admin) and `@@unique([interviewId, interviewerId])` (one feedback
   per author per interview, upsert = edit). Candidates never receive feedback —
   the candidate view strips it before responding.
7. **Resume files live on disk, metadata in the DB.** Stored under a random name;
   downloads go through `GET /api/resumes/:id/download`, which authorizes the
   owner or a company that received an application from that candidate. Nothing
   under `uploads/resumes/` is served statically.
8. **Deletion behavior.** Company → jobs → applications → history/notes/interviews
   all cascade (deleting a company cleans its world). Resumes attached to
   applications cannot be deleted (`SetNull` would orphan the recruiter's view;
   we reject with 409 instead).
9. **Statuses are state machines, validated server-side.**
   `APPLIED → IN_REVIEW → SHORTLISTED → INTERVIEW → OFFERED` (+ `REJECTED`
   possible at every stage, `WITHDRAWN` by the candidate). See
   `server/src/utils/transitions.js` — the frontend only mirrors this map to
   show buttons.

---

## 4. Authentication & security

- **bcrypt password hashing** (via `bcryptjs`, a pure-JS implementation of the
  same algorithm — chosen so no native build tools are needed).
- **JWT in an HTTP-only cookie** (`tg_token`): unreadable from JavaScript,
  `SameSite=Lax`, `Secure` in production, 7-day expiry.
- **Session revocation:** the JWT embeds `tokenVersion`; logout (and password
  change, and admin suspension) increments it, instantly invalidating every
  previously issued token.
- **Company isolation:** every company-scoped route goes through
  `requireCompanyMember` / `attachMyCompany` middleware, which loads the caller's
  membership from the DB — never from the request. All subsequent queries filter
  by `req.companyId`. Cross-company access by manipulating IDs returns 403
  (covered by tests).
- **Validation:** Zod on every request; Prisma parameterized queries everywhere.
- **Uploads:** MIME allow-list (pdf/doc/docx for resumes, images for logos),
  5 MB / 2 MB size caps, random stored filenames.
- **Audit log:** admin actions, job publishing, status changes, interview
  scheduling and feedback are recorded with actor + metadata.
- **Platform admin** is never creatable via public registration — the seed
  creates the initial admin from `.env`.

---

## 5. API

Interactive docs: **`/api/docs`** (Swagger UI), raw spec: **`/api/openapi.json`**.

Groups: `/api/auth`, `/api/users`, `/api/companies`, `/api/candidates`,
`/api/jobs`, `/api/applications`, `/api/resumes`, `/api/interviews`,
`/api/notifications`, `/api/analytics`, `/api/admin`.

Conventions: success = `{ data }`, error = `{ error: { code, message, details? } }`,
pagination = `?page&limit` → `{ items, meta: { total, page, limit, totalPages } }`.

---

## 6. Tests

```bash
npm test
```

27 integration tests (Vitest + Supertest) run against a dedicated
`talentgraph_test` database (created automatically) and truncate between tests:

- **auth** — registration, login, 409 duplicates, logout revocation, suspension.
- **isolation** — cross-company access by ID → 403; candidate A cannot open
  candidate B's application; notes never reach candidates; resume download
  authorization matrix.
- **jobs** — draft invisibility, publish lifecycle, illegal transitions, search
  filters, expired deadlines excluded, validation errors.
- **applications** — duplicate prevention (DB constraint), closed/draft/expired
  rules, transition validation + history + notifications, withdrawal, resume
  delete protection.
- **resumes** — type/size restrictions, default switching, delete rules.
- **interviews** — member-only interviewers, pipeline auto-move, feedback
  permissions (assigned/admin), candidate never sees feedback, cancel notification.

---

## 7. Deployment (prepared, not exercised here)

- **Docker:** `docker compose up --build` runs Postgres + API + nginx-served SPA
  (nginx proxies `/api` to the API container).
- **Render (backend):** create a Web Service from the repo root —
  build `npm ci && npx prisma generate`, start `node server/src/server.js`,
  env vars `DATABASE_URL` (Render PostgreSQL), `JWT_SECRET`, `NODE_ENV=production`.
- **Vercel (frontend):** import the repo with root `client/`, framework Vite,
  build `npx vite build`, output `client/dist`; add a rewrite so `/api/*` and
  `/uploads/*` proxy to the Render URL (or use a custom nginx/gateway).

> ⚠️ **Local file storage limitation (known, deliberate):** resumes and logos are
> stored on the local filesystem (`server/uploads/`). Render's disk is **ephemeral**
> — files disappear on every deploy/restart unless you mount a persistent disk
> (paid feature) or switch to an object store (S3/R2/UploadThing). This project
> keeps local storage for development as selected; moving to a provider is a
> deliberate, separate decision. The upload layer (`server/src/utils/storage.js`)
> is the single place to change.

---

## 8. What is intentionally NOT here (yet)

- No email delivery (no verification/reset emails) — no provider configured.
  Membership invitations happen by adding already-registered users by email.
- No AI features of any kind — deliberately postponed until after the
  full-stack fundamentals (per project scope).
- No real-time websockets — notifications are in-app with 30 s polling.

## 9. Learning notes (for explaining this project)

- *Why a modular monolith?* One deployable unit, clear module boundaries
  (`modules/<domain>/`), easy for a small team to reason about. Microservices
  would add infra cost without benefit here.
- *Why services throw, routes don't catch?* Express 5 forwards rejected promises
  to the central error handler — no `try/catch` noise in controllers.
- *Why is the status map server-side?* The client can only mirror it. If the map
  changes, the server is the single source of truth; stale clients fail with a
  clear 400 rather than corrupting the pipeline.
- *Why does the apply endpoint rely on the DB constraint?* Application code can
  be raced by two simultaneous requests; the unique index cannot.
