# ScanIt — Deployment Guide

Goal: anyone with the Expo app can create an account and use the real backend.

> **`alternate_2` branch:** this branch hosts the backend on **Render** instead of
> Railway, with Resend (email OTP), Gemini (product ID), SerpAPI (price comparison),
> and Cloudinary (image storage) — all free tier. Quick path:
> 1. Push this branch to GitHub.
> 2. Render dashboard → **New → Blueprint** → select the repo/branch → it reads
>    [`render.yaml`](../render.yaml) and provisions the web service + free Postgres.
> 3. In the service's **Environment** tab, fill in the keys marked `sync: false`
>    in `render.yaml`: `RESEND_API_KEY`, `GEMINI_API_KEY`, `SERPAPI_API_KEY`,
>    `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`,
>    and `PAYSTACK_SECRET_KEY` if you use payments.
> 4. Render builds `backend/Dockerfile` and gives you a URL like
>    `https://scanit-backend.onrender.com` — put that (+ `/api/v1`) in
>    `EXPO_PUBLIC_API_URL`.
>
> Free-tier notes: the web service spins down after 15 minutes idle (first request
> after that takes ~30-60s to wake up), and the free Postgres instance expires after
> 90 days unless upgraded. The rest of this doc (Railway) describes the `main` branch.

---

## Architecture

```
Phone (Expo Go / standalone APK)
        │  HTTPS
        ▼
Railway — Spring Boot API   ←→   Railway PostgreSQL
        │
        └── /api/v1/auth/sign-up   ← public registration
            /api/v1/auth/sign-in
            /api/v1/products
            /api/v1/scans/analyze
            ...
```

Railway gives you a public HTTPS URL like `https://scanit-backend.up.railway.app`.  
You paste that into the mobile app's `.env.local` and every user on any phone can register and use the real backend.

---

## Step 1 — Push the code to GitHub

```bash
git init          # if not already a git repo
git add .
git commit -m "initial"
gh repo create scanit --public --source=. --push
# or: git remote add origin https://github.com/YOUR_NAME/scanit.git && git push -u origin main
```

---

## Step 2 — Deploy PostgreSQL on Railway

1. Go to [railway.app](https://railway.app) → **New Project**
2. Click **Add a service → Database → PostgreSQL**
3. Railway creates the DB instantly. Click it and copy the **DATABASE_URL** from the Variables tab — looks like:
   ```
   postgresql://postgres:abc123@containers-us-west-99.railway.app:5432/railway
   ```
4. Note also `PGUSER`, `PGPASSWORD`, `PGDATABASE` from that same tab.

---

## Step 3 — Deploy the Spring Boot backend on Railway

1. In the same Railway project, click **Add a service → GitHub Repo**
2. Select your `scanit` repo
3. Railway auto-detects the `backend/Dockerfile` — confirm it
4. Go to the service **Variables** tab and add these:

| Variable | Value |
|---|---|
| `SPRING_PROFILES_ACTIVE` | `prod` |
| `DATABASE_URL` | `jdbc:postgresql://HOST:PORT/DBNAME` (convert from the Postgres URL above — see note) |
| `DATABASE_USERNAME` | value of `PGUSER` from the DB service |
| `DATABASE_PASSWORD` | value of `PGPASSWORD` from the DB service |
| `JWT_SECRET` | any 64-char random string — generate with: `openssl rand -hex 32` |
| `MAIL_HOST` | `smtp.gmail.com` (or leave blank — password reset still works, just won't send email) |
| `MAIL_PORT` | `587` |
| `MAIL_USERNAME` | your Gmail address (needs App Password, not regular password) |
| `MAIL_PASSWORD` | your Gmail App Password |
| `FRONTEND_URL` | `https://scanit.app` (or anything, used only in reset email links) |

> **Converting the DATABASE_URL:** Railway gives `postgresql://user:pass@host:port/db`.  
> For Spring Boot you need `jdbc:postgresql://host:port/db` as the URL, with user/pass as separate vars.

5. Click **Deploy**. First deploy takes ~3 minutes (Maven build). Check logs — you should see:
   ```
   ScanIt database seeded successfully!
   Consumer: ama.m@scanit.app / password123
   Seller:   kofi@scanit.app  / password123
   ```
6. Go to **Settings → Networking → Generate Domain** — you get a URL like:
   ```
   https://scanit-backend-production.up.railway.app
   ```
7. Test it:
   ```bash
   curl https://scanit-backend-production.up.railway.app/api/v1/actuator/health
   # → {"status":"UP"}
   ```

---

## Step 4 — Point the mobile app at the live backend

Edit `.env.local` in the repo root:

```env
EXPO_PUBLIC_API_URL=https://scanit-backend-production.up.railway.app/api/v1
```

Then restart the Expo bundler:
```bash
npx expo start --clear
```

Any phone that scans your QR code in Expo Go will now talk to the live backend. Users can register real accounts, scan products, and see real data.

---

## Step 5 — Build a standalone app (so users don't need Expo Go)

For a proper app anyone can install without Expo Go:

```bash
npm install -g eas-cli
eas login
eas build:configure   # creates eas.json

# Android APK (for direct install / Play Store)
eas build -p android --profile preview

# iOS (requires Apple Developer account)
eas build -p ios --profile preview
```

EAS Build runs in the cloud. When done it gives you a download link. Share the `.apk` directly or submit to stores.

For the env var to be baked into the build, add it to `eas.json`:

```json
{
  "build": {
    "preview": {
      "env": {
        "EXPO_PUBLIC_API_URL": "https://scanit-backend-production.up.railway.app/api/v1"
      }
    }
  }
}
```

---

## Auto-deploy on every push

Railway automatically redeploys whenever you push to the `main` branch. No extra CI setup needed.

If you want GitHub Actions for tests before deploy, add `.github/workflows/ci.yml`:

```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with: { java-version: '17', distribution: 'temurin' }
      - run: mvn -q test
        working-directory: backend
```

---

## Cost

| Service | Free tier |
|---|---|
| Railway Postgres | 1 GB storage, 100 hrs/month free |
| Railway backend | $5/month Hobby plan (free trial available) |
| EAS Build | Free for personal projects |
| Expo Go (dev) | Free — no build needed |

For a real launch, the Railway Hobby plan ($5/month) gives unlimited hours and keeps the DB always on.

---

## Environment variable reference (production)

| Variable | Required | Notes |
|---|---|---|
| `SPRING_PROFILES_ACTIVE` | ✅ | Must be `prod` |
| `DATABASE_URL` | ✅ | `jdbc:postgresql://...` format |
| `DATABASE_USERNAME` | ✅ | |
| `DATABASE_PASSWORD` | ✅ | |
| `JWT_SECRET` | ✅ | 32+ byte random hex |
| `PORT` | auto | Railway sets this automatically |
| `MAIL_HOST` | optional | Only needed for password reset emails |
| `MAIL_PORT` | optional | |
| `MAIL_USERNAME` | optional | |
| `MAIL_PASSWORD` | optional | |
| `FRONTEND_URL` | optional | Used in reset email links |

---

## Public registration

Registration is open by default — `POST /api/v1/auth/sign-up` is a public endpoint (no JWT needed). Anyone with the app can create a Consumer or Seller account. The backend stores their hashed password in PostgreSQL and returns JWT tokens immediately.

To restrict registration (invite-only), add an `ALLOW_REGISTRATION=false` env var and a check in `AuthService.signUp()`.
