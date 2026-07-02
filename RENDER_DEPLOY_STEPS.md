# 🚀 Deploy Interview Copilot AI to Render (with PostgreSQL)

## Overview

This guide walks you through deploying the full app (backend + frontend) on Render using Docker. The database will be **PostgreSQL** (not SQLite), so your data persists permanently.

---

## ✅ Prerequisites

- A **GitHub account** with this repo pushed to it
- A **Render account** (free tier works): https://render.com
- (Optional) A **Neon** or **Supabase** free PostgreSQL database — or you can use Render's built-in managed PostgreSQL

---

## Step 1: Push Code to GitHub

Make sure everything is committed and pushed:

```bash
git add .
git commit -m "ready for deployment with PostgreSQL"
git push origin main
```

---

## Step 2: Create a PostgreSQL Database

You have two options. Pick ONE.

### Option A: Render Managed PostgreSQL (easiest)

1. In Render Dashboard → **New +** → **PostgreSQL**
2. Choose free tier (1 GB storage)
3. Name it `interview-copilot-db`
4. After creation, copy the **Internal Database URL** — it looks like:
   ```
   postgresql://user:password@host:5432/dbname
   ```
   ⚠️ Use the **Internal** URL if your web service is on Render too (same region)
5. Keep this URL, you'll use it as `DATABASE_URL`

### Option B: Neon (free, fast) ✅ Already Have One

Your Neon connection string:
```
postgresql://neondb_owner:npg_FM2z7eWEXbyV@ep-empty-glitter-atnmae0b.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require
```
Keep this handy — you'll paste it as `DATABASE_URL` in the next step.

---

## Step 3: Create the Web Service on Render

1. Go to **Render Dashboard** → **New +** → **Web Service**
2. Click **Connect your GitHub repo** → select `interview-copilot-ai`
3. Render will detect the `Dockerfile` automatically
4. Fill in:

| Field | Value |
|-------|-------|
| Name | `interview-copilot-ai` |
| Region | Choose the closest to your users (e.g. `Singapore` or `Mumbai`) |
| Branch | `main` |
| Root Directory | (leave blank — Dockerfile is in root) |
| Runtime | **Docker** (auto-detected) |
| Plan | **Free** (or paid if you need more) |

### ⚠️ Important: **Add Environment Variables**

Click **Advanced** → **Add Environment Variable** — add these **exact** values:

```
NODE_ENV=production
HOST=0.0.0.0
PORT=4000
JWT_SECRET=<generate-a-long-random-secret-here>
CORS_ORIGIN=https://interview-copilot-ai.onrender.com
DATABASE_URL=<paste-your-postgresql-connection-string-from-step-2>
GEMINI_API_KEY=<your-gemini-api-key-if-you-have-one>
GEMINI_MODEL=gemini-2.0-flash
```

💡 **Generate a strong JWT_SECRET**: run this in your terminal:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Step 4: Deploy

1. Click **Create Web Service**
2. Render will:
   - Build the Docker image (takes 3–5 minutes)
   - Start the container
   - Auto-migrate the database (tables are created on first boot via `initializeDatabase()`)
   - Seed initial data (admin user, question bank, daily tips)

3. Watch the **Logs** tab for progress. You should see:
   ```
   Interview Copilot API v2
   Server:    http://localhost:4000
   Database: postgres
   ```

---

## Step 5: Verify Deployment

Once the service shows **Live** (green dot):

### Health check
Open in browser or use curl:
```
GET https://interview-copilot-ai.onrender.com/api/health
```

Expected response:
```json
{
  "status": "ok",
  "message": "Interview Copilot API is live",
  "geminiEnabled": false,
  "database": "postgres",
  "version": "2.0.0",
  "uptime": 12.34
}
```

### Frontend
Visit `https://interview-copilot-ai.onrender.com` — you should see the full app UI.

### Sign in
Use the seeded admin account to test:
- **Email:** `admin@interviewcopilot.com`
- **Password:** `admin123`

---

## 🔐 Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | Yes | Must be `4000` |
| `HOST` | Yes | Must be `0.0.0.0` |
| `JWT_SECRET` | **Yes** | Random 64-char hex string for auth tokens |
| `DATABASE_URL` | **Yes** | PostgreSQL connection string (enables Postgres mode) |
| `CORS_ORIGIN` | No | Comma-separated allowed origins, e.g. `https://your-app.onrender.com` |
| `GEMINI_API_KEY` | No | Google Gemini API key for AI features |
| `GEMINI_MODEL` | No | Defaults to `gemini-2.0-flash` |
| `LOG_LEVEL` | No | `info` (default), `debug`, `error` |
| `RATE_LIMIT_MAX` | No | API rate limit, default 200 per 15 min |

---

## 🔄 Redeploying After Changes

After you push new code:

```bash
git add .
git commit -m "new feature"
git push origin main
```

Render will **auto-deploy** the new commit. You can also click **Manual Deploy** → **Deploy latest commit** in the Render dashboard.

---

## 🧪 Troubleshooting

| Problem | Likely cause | Fix |
|---------|-------------|-----|
| `500 error` on health check | Missing `JWT_SECRET` | Add `JWT_SECRET` env var |
| `DATABASE_URL is not set` | No Postgres connection | Add `DATABASE_URL` env var |
| `ECONNREFUSED` to database | Wrong host/port in `DATABASE_URL` | Double-check the connection string |
| Frontend shows blank page | CORS misconfigured | Set `CORS_ORIGIN` to your Render URL |
| `sqlite3` build error in Docker | Missing build tools | Already handled in Dockerfile (`apk add python3 make g++`) |
| Port already in use | Another process on 4000 | Not an issue on Render — container is isolated |

---

## 📦 Database Migrations

The app auto-creates all required tables on first boot. No manual migration needed.

If you need to reset the database:

```sql
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
```

Then restart the Render service — it will re-create everything.

---

## 🧹 Cleanup (if you want to delete)

- Render: Delete the web service and PostgreSQL from Dashboard
- Neon/Supabase: Delete the project from their console
- GitHub: No cleanup needed
