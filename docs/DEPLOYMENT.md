# ScanIt — Deployment Guide

This guide covers deploying the ScanIt backend to production using **Railway** (recommended for beginners) or any cloud platform that runs Docker/JAR.

---

## Option A: Deploy to Railway (Recommended)

Railway auto-detects Spring Boot projects and provisions PostgreSQL.

### Step 1 — Create a Railway project

1. Go to [railway.app](https://railway.app) and sign in
2. Click **New Project → Deploy from GitHub**
3. Select the `CodeQuest-Group-86/ScanIt` repository
4. Set the **Root Directory** to `backend`

### Step 2 — Add a PostgreSQL database

1. In your Railway project, click **+ New**
2. Select **Database → PostgreSQL**
3. Railway will inject `DATABASE_URL` into your service automatically

### Step 3 — Set environment variables

In your Railway service, go to **Variables** and add:

| Variable | Value |
|----------|-------|
| `SPRING_PROFILES_ACTIVE` | `prod` |
| `DATABASE_URL` | *(set automatically by Railway)* |
| `DATABASE_USERNAME` | *(set automatically by Railway)* |
| `DATABASE_PASSWORD` | *(set automatically by Railway)* |
| `JWT_SECRET` | *(generate below)* |
| `MAIL_HOST` | `smtp.gmail.com` |
| `MAIL_PORT` | `587` |
| `MAIL_USERNAME` | `your-email@gmail.com` |
| `MAIL_PASSWORD` | *(Gmail App Password — see below)* |
| `FRONTEND_URL` | `https://your-expo-app.com` |

### Generate a JWT Secret

```bash
openssl rand -base64 32
```

Paste the output as the value of `JWT_SECRET`.

### Step 4 — Deploy

Push to `main` — Railway will build and deploy automatically.

Your backend will be live at:
```
https://your-service.railway.app/api/v1
```

---

## Option B: Deploy with Docker

### Step 1 — Build the JAR

```bash
cd backend
./mvnw clean package -DskipTests
```

### Step 2 — Create a Dockerfile

```dockerfile
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY target/scanit-backend-1.0.0.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

### Step 3 — Build and push the image

```bash
docker build -t ghcr.io/codequest-group-86/scanit-backend:latest .
docker push ghcr.io/codequest-group-86/scanit-backend:latest
```

### Step 4 — Run on any server

```bash
docker run -d \
  -p 8080:8080 \
  -e SPRING_PROFILES_ACTIVE=prod \
  -e DATABASE_URL=jdbc:postgresql://your-db-host:5432/scanitdb \
  -e DATABASE_USERNAME=postgres \
  -e DATABASE_PASSWORD=yourpassword \
  -e JWT_SECRET=your-256-bit-base64-secret \
  ghcr.io/codequest-group-86/scanit-backend:latest
```

---

## Option C: Deploy to Render

1. Go to [render.com](https://render.com) → **New Web Service**
2. Connect the `CodeQuest-Group-86/ScanIt` repo
3. Set **Root Directory** to `backend`
4. Set **Build Command**: `./mvnw clean package -DskipTests`
5. Set **Start Command**: `java -jar target/scanit-backend-1.0.0.jar`
6. Add all environment variables from the table in Option A
7. Create a **PostgreSQL** database on Render and link it

---

## Gmail App Password Setup

If you use Gmail for the email service:

1. Enable 2-Factor Authentication on your Google Account
2. Go to **Google Account → Security → App Passwords**
3. Generate a password for "Mail"
4. Use that 16-character password as `MAIL_PASSWORD`

---

## Production Checklist

- [ ] `JWT_SECRET` is a random 256-bit base64 string (never commit it)
- [ ] `SPRING_PROFILES_ACTIVE=prod`
- [ ] PostgreSQL is provisioned and `DATABASE_URL` is set
- [ ] `ddl-auto: update` (in `application-prod.yml`) — tables are created/migrated automatically
- [ ] HTTPS is enabled on your domain (Railway/Render do this automatically)
- [ ] CORS `allowed-origins` is restricted to your Expo app's domain (optional but good practice)
- [ ] Email credentials are set (or forgot-password will silently log the error)
- [ ] First-run seed data is loaded by `DataSeeder` on startup

---

## Updating the Production App

### Push a new version

```bash
git add .
git commit -m "feat: your change"
git push origin main
```

Railway/Render will auto-deploy on every push to `main`.

### Database migrations

The backend uses `ddl-auto: update` in production, which means Hibernate automatically adds new columns and tables. It never drops existing data.

For schema changes that require renaming or dropping columns, write a manual SQL migration and run it against the production database before deploying.

---

## Monitoring

After deploying, verify the backend is healthy:

```bash
curl https://your-service.railway.app/api/v1/products
```

You should receive a JSON array of seeded products.
