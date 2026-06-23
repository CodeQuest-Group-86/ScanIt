# ScanIt — Setup Guide

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node.js | 20 LTS | `node --version` |
| Docker Desktop | latest | Includes Docker Compose v2 |
| Java JDK | 17 | Only needed for local backend dev (not Docker) |
| Maven | 3.9+ | Only needed for local backend dev |
| Expo Go | latest | Install on iOS / Android phone |

---

## Architecture

```
scanit/
├── apps/mobile (React Native + Expo)
│   └── talks to → backend via HTTP
├── backend/     (Spring Boot + PostgreSQL)
│   └── served at http://localhost:8080/api/v1
└── docker-compose.yml  (postgres + mailhog + backend)
```

Backend endpoints:

| Domain | Base path |
|---|---|
| Auth | `POST /api/v1/auth/sign-up` `POST /api/v1/auth/sign-in` `POST /api/v1/auth/refresh-token` `POST /api/v1/auth/forgot-password` `POST /api/v1/auth/reset-password` `GET /api/v1/auth/me` |
| Products | `GET /api/v1/products` `GET /api/v1/products/:id` `GET /api/v1/products/:id/recommendations` |
| Scans | `POST /api/v1/scans/analyze` `GET /api/v1/scans/history` |
| Sellers | `GET /api/v1/sellers` `GET /api/v1/sellers/:id` `GET /api/v1/sellers/inventory` (seller role) |
| Notifications | `GET /api/v1/notifications` `GET /api/v1/notifications/price-alerts` `POST /api/v1/notifications/:id/read` |
| Users | `GET /api/v1/users/me` `PUT /api/v1/users/me` `GET /api/v1/users/me/saved-products` |

---

## Option A — Full Stack with Docker (recommended)

Starts PostgreSQL, MailHog, and the Spring Boot backend in one command.

```bash
# 1. Clone the repo
git clone https://github.com/your-org/scanit.git
cd scanit

# 2. Start all backend services
docker compose up -d

# 3. Verify the backend is healthy (takes ~60 s on first boot)
curl http://localhost:8080/api/v1/auth/me    # expects 401, not 404
```

Preview emails (password reset, etc.) at http://localhost:8025 (MailHog).

---

## Option B — Local Backend (no Docker)

Run PostgreSQL and the Spring Boot app directly on your machine.

```bash
# Requires: Java 17, Maven, PostgreSQL running on port 5432

cd backend
mvn spring-boot:run -Dspring-boot.run.profiles=dev
# Dev profile uses H2 in-memory DB — no Postgres needed
```

---

## Mobile App

```bash
cd scanit          # repo root (package.json is here)

npm install

# Configure the backend URL
# Edit .env.local — set EXPO_PUBLIC_API_URL to match your setup:
#   Same machine (iOS Simulator / web):    http://localhost:8080/api/v1
#   Android Emulator:                      http://10.0.2.2:8080/api/v1
#   Physical device (find your LAN IP):    http://192.168.X.X:8080/api/v1

npx expo start
```

Scan the QR code with Expo Go on your phone (iOS or Android).

---

## Demo Account

The backend seeds these accounts on first boot:

```
Consumer
  Email:    ama.m@scanit.app
  Password: password123

Seller
  Email:    kofi@scanit.app
  Password: password123
```

> If the backend is not running, the app falls back to these same mock accounts automatically.

---

## Environment Variables

All mobile config lives in `.env.local` at the repo root.

| Variable | Default | Purpose |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | `http://localhost:8080/api/v1` | Backend base URL |
| `EXPO_PUBLIC_APP_ENV` | `development` | Used for feature flags |
| `EXPO_PUBLIC_GOOGLE_VISION_KEY` | _(blank)_ | Enable real Google Vision API |
| `EXPO_PUBLIC_CLIP_API_URL` | _(blank)_ | CLIP inference server |
| `EXPO_PUBLIC_RESNET_API_URL` | _(blank)_ | ResNet-50 counterfeit server |
| `EXPO_PUBLIC_BERT_API_URL` | _(blank)_ | BERT semantic search server |

AI features work in simulated mode when API keys/URLs are blank.

---

## AI Features

See [AI_ARCHITECTURE.md](./AI_ARCHITECTURE.md) for the full pipeline doc.

| Feature | Model | Status |
|---|---|---|
| Product Recognition | Google Vision API + TFLite + MobileNet | Simulated (swap in `services/ai.ts`) |
| Visual Similarity Matching | CLIP | Simulated |
| Counterfeit Detection | ResNet-50 | Simulated |
| Semantic Search | BERT / Sentence Transformers | Simulated |
| Recommendation Generation | CLIP + price data | Live (uses real DB data) |

---

## Common Issues

**Android emulator can't reach backend**  
Use `http://10.0.2.2:8080/api/v1` instead of `localhost`.

**`docker compose up` fails on port 5432**  
Another PostgreSQL instance is running. Stop it or change the host port in `docker-compose.yml`.

**Backend takes too long to start**  
First build downloads Maven dependencies (~2 min). Subsequent starts are fast.

**App shows mock data even with backend running**  
Check `EXPO_PUBLIC_API_URL` in `.env.local` and restart the Expo bundler after changing it (`npx expo start --clear`).
