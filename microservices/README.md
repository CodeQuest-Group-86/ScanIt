# ScanIt Microservices

This directory contains the decomposed microservices architecture for the ScanIt backend.
Each service is an independent Spring Boot application with its own database schema and pom.xml.

## Services

| Service               | Port | Responsibility |
|-----------------------|------|----------------|
| `api-gateway`         | 8080 | Single entry point — routes all mobile traffic, handles CORS |
| `auth-service`        | 8081 | Sign-up, sign-in, JWT, OTP (Termii SMS + Resend email), password reset |
| `product-service`     | 8082 | Product catalogue, prices (GHS), sellers, saved products |
| `scan-service`        | 8083 | AI product recognition (Gemini Vision), scan history, DuckDuckGo enrichment |
| `notification-service`| 8084 | SMS via Termii, email via Resend, in-app notifications |

The mobile app talks exclusively to **port 8080** (the gateway). All routing is transparent.

## Quick Start (Docker)

```bash
cd microservices

# Copy and fill in your secrets
cp ../.env.local .env

# Build and start everything (PostgreSQL + all 5 services)
docker-compose up --build
```

The mobile app's `EXPO_PUBLIC_API_URL` should point to `http://<your-ip>:8080/api/v1`.

## Quick Start (Individual Dev Mode — no Docker)

Each service runs standalone with H2 in dev mode. No external DB needed.

```bash
# Terminal 1 — Auth Service
cd auth-service
JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64 mvn spring-boot:run

# Terminal 2 — Product Service
cd product-service
JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64 mvn spring-boot:run

# etc...
```

Or build all modules from the parent:

```bash
cd microservices
JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64 mvn compile
```

## SMS OTP — Termii (Free, No Credit Card)

1. Sign up free at https://app.termii.com/register
2. Dashboard → Settings → API Key → copy your key
3. Set `TERMII_API_KEY` in your `.env` / environment variables

The OTP flow in `auth-service`:

```
POST /api/v1/auth/otp/send    { contact, channel: "sms", purpose: "signup"|"reset-password" }
POST /api/v1/auth/otp/verify  { contact, code, purpose }   → returns resetToken for password reset
POST /api/v1/auth/otp/reset-password  { contact, resetToken, newPassword }  → saves to DB
```

Without `TERMII_API_KEY`, the backend returns `{ "devCode": "123456" }` in the response
so the app pre-fills the OTP field — perfect for local testing.

## Environment Variables

| Variable | Service | Description |
|---|---|---|
| `JWT_SECRET` | api-gateway, auth-service | HS256 secret (min 32 chars) |
| `DATABASE_URL` | all except gateway | JDBC connection string |
| `TERMII_API_KEY` | auth-service, notification-service | Termii API key for SMS |
| `TERMII_SENDER_ID` | same | Sender name (max 11 chars) |
| `TERMII_CHANNEL` | same | `generic` or `dnd` |
| `RESEND_API_KEY` | auth-service, notification-service | Resend API key for email |
| `GEMINI_API_KEY` | scan-service | Google Gemini Vision API key |

## Architecture Notes

- The monolith in `/backend` remains fully functional — use it for rapid development.
- Microservices share the same PostgreSQL instance in this setup for simplicity.
  In production each service would have its own database.
- Service-to-service calls use direct HTTP (RestTemplate / WebClient).
  A message broker (Kafka/RabbitMQ) can be added later for async events.
