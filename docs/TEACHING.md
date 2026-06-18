# ScanIt — Full Project Teaching Guide

This document explains the entire ScanIt project — what it is, how it is built, why each technology was chosen, and how all the pieces fit together. Written for students and junior developers joining the project.

---

## Table of Contents

1. [What is ScanIt?](#1-what-is-scanit)
2. [System Architecture](#2-system-architecture)
3. [Frontend (React Native / Expo)](#3-frontend-react-native--expo)
4. [Backend (Spring Boot)](#4-backend-spring-boot)
5. [Authentication Deep Dive](#5-authentication-deep-dive)
6. [Data Model](#6-data-model)
7. [API Design](#7-api-design)
8. [Ghana-Specific Context](#8-ghana-specific-context)
9. [Key Design Decisions](#9-key-design-decisions)
10. [How the Pieces Connect](#10-how-the-pieces-connect)
11. [Glossary](#11-glossary)

---

## 1. What is ScanIt?

ScanIt is a mobile application for Ghanaian consumers that lets them:

- **Scan** a product (via camera) to identify it
- **Verify authenticity** — is this product real or counterfeit?
- **Compare prices** — see what the same product costs at different nearby sellers
- **Contact sellers** directly via phone or WhatsApp
- **Save** products for later and track price drops

Counterfeit goods are a real problem in Ghana's markets. ScanIt addresses this by maintaining a verified product database and using image recognition to flag suspicious or fake products.

---

## 2. System Architecture

```
┌─────────────────────────────────────────┐
│           Mobile App (Expo)             │
│  React Native · TypeScript · Zustand    │
│  Screens: Auth, Scan, Explore, Profile  │
└───────────────┬─────────────────────────┘
                │  HTTPS / REST API
                │  Authorization: Bearer <JWT>
                ▼
┌─────────────────────────────────────────┐
│        Spring Boot Backend              │
│  REST Controllers → Services → JPA      │
│  Spring Security (JWT filter)           │
└───────────────┬─────────────────────────┘
                │  JPA / JDBC
                ▼
┌─────────────────────────────────────────┐
│            Database                     │
│  H2 (development)  /  PostgreSQL (prod) │
└─────────────────────────────────────────┘
```

The frontend (mobile app) talks to the backend over HTTP. Every request to a protected endpoint must include a JWT access token in the `Authorization` header.

---

## 3. Frontend (React Native / Expo)

### Technology choices

| Tool | Why |
|------|-----|
| **Expo SDK 54** | Managed workflow — no native code to maintain |
| **Expo Router** | File-based routing (like Next.js but for mobile) |
| **TypeScript** | Type safety across the codebase |
| **Zustand** | Simple, boilerplate-free global state |
| **expo-camera** | Camera access for product scanning |
| **expo-secure-store** | Encrypted storage for JWT tokens |
| **AsyncStorage** | Non-sensitive storage (onboarding flags, saved products) |

### Screen structure

```
app/
├── index.tsx              → Entry: routes to onboarding / auth / tabs
├── (onboarding)/          → 3-slide intro (shown once, flagged in AsyncStorage)
├── (auth)/
│   ├── sign-in.tsx
│   ├── sign-up.tsx
│   └── forgot-password.tsx
├── (tabs)/
│   ├── explore.tsx        → Home/feed
│   ├── search.tsx         → Product search
│   ├── scan.tsx           → Full-screen camera (dark UI)
│   ├── saved.tsx          → Bookmarked products
│   └── profile.tsx        → User stats + settings
├── scan-result.tsx        → Bottom sheet after scan
├── product-detail.tsx     → Full product page
├── recommendations.tsx    → Best deals for a product
└── scan-history.tsx       → Past scans
```

### State management

The app uses four Zustand stores:

| Store | What it holds |
|-------|---------------|
| `authStore` | Logged-in user, JWT tokens, login/logout actions |
| `scanStore` | Current scan result, scan history, session limit counter |
| `productsStore` | Search results, selected product, recommendations, notifications |
| `savedStore` | Locally bookmarked products (synced from backend) |

---

## 4. Backend (Spring Boot)

### Technology choices

| Tool | Why |
|------|-----|
| **Spring Boot 3.2** | Industry-standard Java web framework |
| **Spring Security 6** | JWT authentication + role-based access control |
| **Spring Data JPA** | Object-relational mapping with minimal boilerplate |
| **H2** | In-memory database for development — zero setup |
| **PostgreSQL** | Production database — reliable, widely used |
| **jjwt 0.12.x** | Generate and validate JWT tokens |
| **Lombok** | Eliminates repetitive Java boilerplate (`@Getter`, `@Builder`, etc.) |

### Package structure

```
com.scanit.backend/
├── config/         Security configuration, CORS
├── controller/     REST endpoints (HTTP layer only — no business logic)
├── dto/            Data Transfer Objects (request/response shapes)
│   ├── auth/       Auth-specific DTOs
│   └── request/    Generic request bodies
├── entity/         JPA entities (database tables)
├── enums/          UserRole, AuthenticityStatus, NotificationType
├── exception/      Custom exceptions + global error handler
├── repository/     Spring Data JPA interfaces
├── security/       JWT filter, JWT service, UserDetailsService
├── seed/           DataSeeder — populates DB on first start
├── service/        Business logic layer
└── util/           MapToJsonConverter (stores product specs as JSON)
```

### Layered architecture

The backend follows a strict 3-layer architecture:

```
HTTP Request
     ↓
Controller  (validates input, calls service, returns response)
     ↓
Service     (business logic, calls repositories, maps entities to DTOs)
     ↓
Repository  (Spring Data JPA — generates SQL automatically)
     ↓
Database
```

No business logic lives in controllers. No database queries live in services (they go through repositories). This separation makes the code easy to test and maintain.

---

## 5. Authentication Deep Dive

ScanIt uses **JWT (JSON Web Token)** authentication — a stateless, industry-standard approach.

### What is a JWT?

A JWT is a base64-encoded string divided into three parts:

```
header.payload.signature
```

- **Header** — algorithm used (HS256)
- **Payload** — claims: who the user is (`sub: email`), when it was issued, when it expires
- **Signature** — HMAC-SHA256 hash of the header + payload, signed with the server's secret key

The server never stores tokens. It just validates the signature on every request.

### The sign-up / sign-in flow

```
1. User submits email + password
2. Backend validates credentials (bcrypt password check)
3. Backend generates two tokens:
   - accessToken  (expires in 1 hour)
   - refreshToken (expires in 7 days)
4. Tokens are returned to the mobile app
5. App stores them in expo-secure-store (hardware-encrypted storage)
```

### How protected endpoints work

```
1. App sends: Authorization: Bearer <accessToken>
2. JwtAuthFilter intercepts the request BEFORE it reaches the controller
3. Filter extracts the token, validates the signature, checks expiry
4. If valid → sets the authenticated user in the SecurityContext
5. Controller receives the request with authentication.getName() = user's email
6. If invalid → request proceeds unauthenticated → Spring returns 401
```

### Token refresh

When the access token expires (1 hour), the app calls:

```
POST /auth/refresh-token
Body: { "refreshToken": "..." }
```

The backend validates the refresh token and returns a new access + refresh token pair.

### Password reset flow

```
1. User submits email to POST /auth/forgot-password
2. Backend generates a random UUID token, stores it in the user record
3. Backend emails a reset link to the user
4. User clicks the link → app sends token + new password to POST /auth/reset-password
5. Backend validates the token (must not be expired) and updates the password
```

### Role-based access control

Users have one of two roles: `CONSUMER` or `SELLER`.

The backend enforces roles using `@PreAuthorize`:

```java
@PreAuthorize("hasRole('SELLER')")
public ResponseEntity<...> getInventory(...) { ... }
```

Only users with `role = SELLER` can manage inventory. Everyone else gets a 403 Forbidden.

---

## 6. Data Model

### Entities and relationships

```
User ──────────────────────────────────────────────────┐
 ├── many ScanResults                                   │
 ├── many Notifications                                 │
 ├── many SavedProducts (→ Product)                    │
 ├── many PriceAlerts (→ Product)                      │
 └── one Seller profile (if role = SELLER)             │
                                                        │
Seller ─────────────────────────────────────────────── ┤
 └── many InventoryItems (→ Product + price + stock)   │
                                                        │
Product ────────────────────────────────────────────── ┘
 ├── name, brand, category, price (GHS)
 ├── specs: Map<String, String>  (stored as JSON)
 ├── authenticity: AUTHENTIC | SUSPICIOUS | COUNTERFEIT
 └── available from multiple Sellers via InventoryItem
```

### The InventoryItem join table

`InventoryItem` is the key linking entity. It connects a `Seller` to a `Product` with:
- `price` — what the seller charges for the product
- `stock` — how many units available
- `listed` — whether it's visible to buyers

This is how the app shows "Tropical Juice is ₵2.90 at Makola Market, ₵3.20 at Accra Mall."

### Product specs as JSON

Products have different specifications per category:
- Drinks: Volume, Sugar, pH Level, Shelf Life
- Snacks: Weight, Cocoa Content, Calories
- Care: Volume, Type, Ingredients

Rather than creating separate database columns for every possible spec, the `specs` field is stored as a JSON string using `MapToJsonConverter`. This gives full flexibility without schema changes.

---

## 7. API Design

### Response envelope

Every response wraps the data in a consistent envelope:

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { ... },
    "accessToken": "...",
    "refreshToken": "...",
    "expiresAt": 1718900000000
  }
}
```

On error:

```json
{
  "success": false,
  "message": "Invalid email or password",
  "data": null
}
```

This is implemented by the `ApiResponse<T>` generic wrapper class.

### Validation

Request body validation uses Jakarta Bean Validation annotations:

```java
@NotBlank(message = "Email is required")
@Email(message = "Invalid email format")
private String email;
```

If validation fails, Spring automatically returns a 400 with a map of field → error message, handled by `GlobalExceptionHandler`.

### Error handling

All exceptions are caught by `GlobalExceptionHandler`:

| Exception | HTTP Status |
|-----------|-------------|
| `ResourceNotFoundException` | 404 |
| `BadRequestException` | 400 |
| `BadCredentialsException` | 401 |
| `AccessDeniedException` | 403 |
| `MethodArgumentNotValidException` | 400 (with field errors) |
| Any other `Exception` | 500 |

---

## 8. Ghana-Specific Context

### Currency

All prices are in **GHS (Ghana Cedis)**, displayed with the ₵ symbol. The `currency` field defaults to `"GHS"` on all products.

### Seller contact

In Ghana's market culture, buyers contact sellers directly via phone and WhatsApp. Every `Seller` has:
- `phone` — Ghana format: `+233XXXXXXXXX`
- `whatsapp` — same number, used for direct chat

### Authenticity verification

Counterfeit products are a serious issue in Ghanaian markets. The `AuthenticityStatus` enum (`AUTHENTIC`, `SUSPICIOUS`, `COUNTERFEIT`) on both `Product` and `ScanResult` is central to the app's value proposition.

Products flagged as `SUSPICIOUS` (like the seeded Shea Butter Cream) are shown with a warning in the UI.

### Local markets

The seed data includes real Accra market locations:
- **Makola Market** — largest open-air market in Accra
- **Accra Mall** — major shopping mall
- **Kaneshie Market** — west Accra wholesale market
- **Osu / Oxford Street** — upscale retail area

---

## 9. Key Design Decisions

### Why Spring Boot?

Spring Boot is the most widely used Java web framework in enterprise and startup environments. It provides:
- Dependency injection (less coupling between components)
- Auto-configuration (zero XML, convention over configuration)
- Built-in security framework
- Production-ready features (health checks, metrics)

### Why JWT instead of sessions?

Sessions require the server to store state (usually in a database or Redis). JWTs are **stateless** — the server just validates the signature. This makes the API easy to scale horizontally (add more servers without sharing session state).

### Why H2 in development?

H2 is an in-memory SQL database that starts with the application. No Docker, no installation, no setup. Perfect for development and teaching. The schema is re-created from scratch on every restart (`ddl-auto: create-drop`).

### Why Lombok?

Java is verbose. A `User` class without Lombok would require ~100 lines of getters, setters, constructors, and builder methods. With `@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor`, it takes 5 annotations.

### Why DataSeeder?

The seeder runs on startup and checks `if (userRepository.count() > 0) return`. This means:
- In development with H2: seeds fresh data on every restart
- In production with PostgreSQL: seeds once, then skips forever

This gives developers a working app from the first run without any manual SQL.

---

## 10. How the Pieces Connect

### Complete flow: scanning a product

```
1. User taps "Scan" in the mobile app
2. expo-camera opens, user points at a product
3. App captures the frame and calls:
   POST /api/v1/scans/analyze
   Authorization: Bearer <accessToken>
   Body: { "imageUri": "file:///..." }

4. JwtAuthFilter validates the token → extracts email
5. ScanController.analyze() calls ScanService.analyzeImage()
6. ScanService:
   - Fetches user from UserRepository by email
   - Fetches all products from ProductRepository
   - Picks a random match (simulates AI — swap for real vision model)
   - Generates a confidence score (84–99%)
   - Saves a ScanResult to the database
   - Increments user.scansCount
7. Returns ScanResultDto with:
   - Matched product details + sellers + prices
   - Confidence score
   - Authenticity status (AUTHENTIC / SUSPICIOUS / COUNTERFEIT)

8. Mobile app receives the result
9. scan-result.tsx shows a bottom sheet with:
   - Product name, image, price
   - Authenticity badge (green/yellow/red)
   - List of sellers sorted by price
   - "WhatsApp" / "Call" buttons for each seller
```

### Complete flow: user registration

```
1. User fills in sign-up form (name, email, password, role)
2. App calls POST /auth/sign-up
3. AuthController.signUp() → AuthService.signUp()
4. AuthService:
   - Checks userRepository.existsByEmail() → 400 if duplicate
   - Hashes password with BCryptPasswordEncoder
   - Saves User to database
   - Generates accessToken + refreshToken via JwtService
5. Returns AuthResponse { user, accessToken, refreshToken, expiresAt }
6. App stores tokens in expo-secure-store
7. App updates authStore with the user object
8. App navigates to the main tab screen
```

---

## 11. Glossary

| Term | Meaning |
|------|---------|
| **JWT** | JSON Web Token — a signed token that proves who a user is |
| **Bearer token** | A JWT sent in the `Authorization: Bearer <token>` HTTP header |
| **BCrypt** | A password hashing algorithm — never store plain-text passwords |
| **JPA** | Java Persistence API — maps Java objects to database tables |
| **Entity** | A Java class annotated with `@Entity` — represents a database table |
| **Repository** | An interface extending `JpaRepository` — Spring generates SQL automatically |
| **DTO** | Data Transfer Object — a class used only to carry data between layers |
| **Service** | Business logic layer — sits between controllers and repositories |
| **CORS** | Cross-Origin Resource Sharing — allows the app to call the API from a different domain |
| **Seed data** | Sample data loaded into the database automatically for development |
| **GHS** | Ghana Cedi (₵) — the currency of Ghana |
| **Authenticity status** | Whether a product is `AUTHENTIC`, `SUSPICIOUS`, or `COUNTERFEIT` |
| **InventoryItem** | The join between a Seller and a Product, with price and stock |
| **Expo SecureStore** | Hardware-backed encrypted storage on iOS and Android |
| **H2** | In-memory SQL database used during development |
| **ddl-auto** | Controls whether Hibernate creates/updates/drops tables on startup |
