# Downloads — what these files are and how to use them

This folder holds the deliverables generated for the TalentGraph project.

## `talentgraph-source.zip` — the complete project source (~260 KB)

A snapshot of the full TalentGraph codebase: a two-sided recruitment platform
(job board + built-in applicant tracking system) built with React + Vite +
Tailwind on the front end and Node + Express + Prisma + PostgreSQL on the back end.

### What's inside

```
client/            React SPA (pages for candidates, recruiters, admins, public site)
server/            Express API (modules: auth, users, companies, jobs,
                   applications, resumes, interviews, notifications, analytics, admin)
prisma/            Database schema (20 models) and migrations config
scripts/           Dev tooling, Postgres helpers, demo seed script
server/tests/      Vitest + Supertest API test suite (27 tests)
render.yaml        One-click Render deployment blueprint
DEPLOY.md          Step-by-step deployment guide (Render + Neon Postgres)
docker-compose.yml Local production-like stack (Postgres + API + nginx)
README.md          Project overview, setup and scripts
```

Excluded on purpose: `node_modules`, `.env` (secrets), the local Postgres data
directory, uploaded resumes/logos and build output.

### How to use it

1. **Unzip** it anywhere: `unzip talentgraph-source.zip -d talentgraph && cd talentgraph`
2. **Install and run locally** (needs Node 20+):
   ```bash
   npm install
   npm run dev          # starts API on :4000 and the web app on :3000
   ```
   The first run boots a bundled local PostgreSQL automatically — no manual
   database setup required.
3. **Sign in with the demo accounts** (seeded on first start):
   | Role | Email | Password |
   |---|---|---|
   | Recruiter (company admin) | `recruiter@demo.dev` | `Recruiter@1` |
   | Interviewer | `interviewer@demo.dev` | `Interviewer@1` |
   | Candidate | `candidate@demo.dev` | `Candidate@1` |
4. **Run the API tests**: `npm test`
5. **Deploy it for real**: follow `DEPLOY.md` inside the zip — it walks through
   pushing to GitHub, creating a free Postgres on Neon and deploying the whole
   app (API + website in one service) on Render via the included `render.yaml`.
6. **Alternative**: `docker compose up --build` runs the production-like stack
   locally (requires `JWT_SECRET` to be set — see the comment in `docker-compose.yml`).

## `README.md` (this file)

Self-describing index of this folder. If new deliverables (reports, exports,
diagrams) are generated for the project later, they will appear here together
with usage instructions.
