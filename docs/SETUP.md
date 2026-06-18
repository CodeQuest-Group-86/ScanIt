# ScanIt — Local Development Setup

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Java JDK | 17+ | Run Spring Boot backend |
| Maven | 3.9+ | Build backend |
| Node.js | 18+ | Run Expo frontend |
| Expo CLI | Latest | Mobile app tooling |
| Git | Any | Version control |

Optional (for email testing):
- **Docker** — to run MailHog (local email catcher)

---

## 1. Clone the repository

```bash
git clone https://github.com/CodeQuest-Group-86/ScanIt.git
cd ScanIt
```

---

## 2. Start the Backend

### 2a. Navigate to the backend directory

```bash
cd backend
```

### 2b. Run with Maven

```bash
./mvnw spring-boot:run
```

Or on Windows:

```bash
mvnw.cmd spring-boot:run
```

The backend starts on **http://localhost:8080/api/v1**

On first start, Spring Boot will:
- Create an in-memory H2 database
- Auto-create all tables (`ddl-auto: create-drop`)
- Run the `DataSeeder` to populate Ghana market data
- Print demo credentials to the console:
  ```
  Consumer: ama.m@scanit.app / password123
  Seller:   kofi@scanit.app  / password123
  ```

### 2c. Browse the H2 database (optional)

Visit **http://localhost:8080/api/v1/h2-console**

| Field | Value |
|-------|-------|
| JDBC URL | `jdbc:h2:mem:scanitdb` |
| Username | `sa` |
| Password | `password` |

---

## 3. Start the Frontend

Open a second terminal in the project root:

```bash
npm install
npx expo start
```

Then press:
- **`i`** — open iOS simulator
- **`a`** — open Android emulator
- **Scan QR code** — open on a physical device with Expo Go

### Point the frontend at your local backend

Edit `services/` to replace mock URLs with:

```
http://localhost:8080/api/v1
```

Or set `BASE_URL` in your environment config.

---

## 4. Optional: Email Testing with MailHog

The forgot-password flow sends emails. To catch them locally:

```bash
docker run -p 1025:1025 -p 8025:8025 mailhog/mailhog
```

Then open **http://localhost:8025** to see all sent emails.

The dev config (`application-dev.yml`) already points at `localhost:1025`.

---

## 5. API Quick Reference

All endpoints are prefixed with `/api/v1`

### Authentication (no JWT needed)

| Method | Endpoint | Body |
|--------|----------|------|
| POST | `/auth/sign-up` | `{ name, email, password, role }` |
| POST | `/auth/sign-in` | `{ email, password }` |
| POST | `/auth/forgot-password` | `{ email }` |
| POST | `/auth/reset-password` | `{ token, newPassword }` |
| POST | `/auth/refresh-token` | `{ refreshToken }` |
| GET  | `/auth/me` | — (requires JWT) |

### Products (public GET, JWT required for writes)

| Method | Endpoint |
|--------|----------|
| GET | `/products?query=&category=` |
| GET | `/products/{id}` |
| GET | `/products/{id}/recommendations` |

### Scans (JWT required)

| Method | Endpoint | Body |
|--------|----------|------|
| POST | `/scans/analyze` | `{ imageUri }` |
| GET  | `/scans/history` | — |

### Sellers (public GET)

| Method | Endpoint |
|--------|----------|
| GET | `/sellers` |
| GET | `/sellers/{id}` |
| GET | `/sellers/{id}/products` |

### Seller Inventory (JWT + SELLER role)

| Method | Endpoint |
|--------|----------|
| GET    | `/sellers/inventory` |
| POST   | `/sellers/inventory` |
| PUT    | `/sellers/inventory/{itemId}` |
| DELETE | `/sellers/inventory/{itemId}` |

### Notifications (JWT required)

| Method | Endpoint |
|--------|----------|
| GET  | `/notifications` |
| GET  | `/notifications/unread-count` |
| POST | `/notifications/{id}/read` |
| GET  | `/notifications/price-alerts` |

### User Profile (JWT required)

| Method | Endpoint |
|--------|----------|
| GET    | `/users/me` |
| PUT    | `/users/me` |
| GET    | `/users/me/saved-products` |
| POST   | `/users/me/saved-products` |
| DELETE | `/users/me/saved-products/{productId}` |

---

## 6. JWT Authentication Flow

1. Call `POST /auth/sign-in` → receive `accessToken` + `refreshToken`
2. Attach the access token to every protected request:
   ```
   Authorization: Bearer <accessToken>
   ```
3. Access tokens expire in **1 hour**
4. Use `POST /auth/refresh-token` with the `refreshToken` to get a new pair
5. Tokens are stored in `expo-secure-store` on the mobile app (AES-256 encrypted)

---

## 7. Environment Variables

For development, all defaults are set in `application.yml` and `application-dev.yml`.

No `.env` file is needed to run locally.

---

## 8. Switching to PostgreSQL locally

Change the active profile to `prod` and set the following env vars:

```bash
export SPRING_PROFILES_ACTIVE=prod
export DATABASE_URL=jdbc:postgresql://localhost:5432/scanitdb
export DATABASE_USERNAME=postgres
export DATABASE_PASSWORD=yourpassword
export JWT_SECRET=your-256-bit-base64-secret
```

Or start PostgreSQL with Docker:

```bash
docker run --name scanit-db \
  -e POSTGRES_DB=scanitdb \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 -d postgres:15
```
