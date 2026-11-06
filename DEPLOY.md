# Deploying TalentGraph

This app deploys as **one web service**: the Express API serves the built React
SPA from the same origin (see `server/src/app.js`), so one URL runs the whole
product — no CORS, no cookie configuration, no separate frontend hosting.

Recommended free setup: **GitHub + Render (app) + Neon (PostgreSQL)**.
Total cost: ₹0. First load after ~15 min idle takes ~30–60 s (free tier sleeps).

---

## Step 0 — Get the code onto GitHub

You received `talentgraph-source.zip` (this project without secrets — `.env`,
database files and `node_modules` are excluded).

```bash
unzip talentgraph-source.zip && cd my-project
git init && git add -A && git commit -m "TalentGraph"
git branch -M main
git remote add origin https://github.com/<your-username>/talentgraph.git
git push -u origin main
```

(Or create the repo on github.com and upload the folder with the web UI —
"uploading an existing folder".)

## Step 1 — Create the database (Neon, free, does not expire)

1. Sign up at **neon.tech** → **Create project** (pick a region near you).
2. Copy the **connection string** — it looks like
   `postgresql://user:password@ep-xyz.aws.neon.tech/neondb?sslmode=require`
3. Keep it; you'll paste it into Render next.

## Step 2 — Deploy on Render

1. Sign in at **render.com** with your GitHub account.
2. **New + → Blueprint** → select the `talentgraph` repo → **Apply**.
   Render reads `render.yaml` and pre-fills everything: build command, start
   command, health check (`/api/health`), and a generated `JWT_SECRET`.
3. When prompted, paste the **Neon connection string** as `DATABASE_URL`.
4. Wait for the first deploy (npm ci + Prisma schema push + Vite build ≈ 3–5 min).
5. Your URL: `https://talentgraph-xxxx.onrender.com` — share it with your friends.

That's it. Every later `git push` to `main` redeploys automatically.

## Step 3 — Create your accounts on the live site

**Your platform admin** (for the `/admin` console):

1. Render Dashboard → your service → **Shell** tab, then run:
   ```bash
   ALLOW_DEMO_SEED=1 ADMIN_EMAIL="you@example.com" ADMIN_PASSWORD="YourStr0ng!Pass" node scripts/seed.js
   ```
   This creates your admin **and** the demo accounts/jobs (only `@demo.dev`
   accounts are touched — re-running is safe). Sign in as `you@example.com`.
2. Then open your site → **Sign Up** → create your own recruiter and candidate
   accounts like any normal user.

## What works, what to know

| Topic | Reality on the free tier |
| --- | --- |
| Cold starts | Instance sleeps after ~15 min idle; next visitor waits ~30–60 s. |
| Uploaded resumes & logos | Stored on the instance disk — **files vanish on every redeploy/restart**. A demo is fine; for real usage attach a Render persistent disk (paid) or move `server/src/utils/storage.js` to S3/R2. |
| Database | Neon free tier persists; Render's own free Postgres **expires after 30 days** — only use it for a short-lived demo. |
| HTTPS | Automatic (`https://…onrender.com`). The auth cookie is `Secure` in production — it needs HTTPS, which Render provides. |
| Schema changes | Every deploy runs `prisma db push` during the build. |

## Alternatives

- **Render PostgreSQL instead of Neon** — one platform, one signup; create a
  Render Postgres, paste its *Internal Database URL* as `DATABASE_URL`. Remember
  the 30-day free expiry.
- **Railway / Fly.io** — same repo deploys as-is (Railway: `railway up`; Fly:
  the provided `Dockerfile.server` + a Postgres addon). Both need a payment
  method after trial credit.
- **Any VPS with Docker** — `docker compose up --build` runs Postgres + API +
  nginx-served SPA (files in `Dockerfile.server`, `Dockerfile.client`,
  `docker-compose.yml`; untested in this sandbox — Docker was unavailable).
- **Split hosting (Vercel + separate API)** — possible but *not recommended*:
  cross-domain auth cookies need `SameSite=None` + CORS credentials, which adds
  real security complexity for zero benefit over single-origin.
