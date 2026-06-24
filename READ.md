# ScanIt — Complete Beginner's Guide

This document explains **every single file** in the ScanIt project from scratch.
No prior experience with mobile apps or backend servers is assumed.

---

## Table of Contents

1. [What ScanIt Does](#1-what-scanit-does)
2. [The Big Picture — How Everything Connects](#2-the-big-picture)
3. [The Three Layers](#3-the-three-layers)
4. [Backend — Spring Boot (The Server)](#4-backend--spring-boot)
5. [Frontend — Expo + React Native (The App)](#5-frontend--expo--react-native)
6. [AI Models — How Product Detection Works](#6-ai-models)
7. [How a Scan Works End-to-End](#7-how-a-scan-works-end-to-end)
8. [How Authentication Works](#8-how-authentication-works)
9. [The Database — What Gets Stored](#9-the-database)
10. [How to Run the App](#10-how-to-run-the-app)
11. [Fixing the "Offline" Error](#11-fixing-the-offline-error)
12. [Free AI Models — What They Can and Cannot Do](#12-free-ai-models)
13. [Every File Explained](#13-every-file-explained)

---

## 1. What ScanIt Does

ScanIt is a mobile app for Ghana. When you scan a product (using barcode or camera photo), it tells you:

1. **The real name** of the product (what it actually is)
2. **Where to get it** (sellers near you — Makola Market, Accra Mall, etc.)
3. **The price** (what each seller charges, so you can find the cheapest)
4. **Whether it's authentic** (AI checks if the product might be counterfeit)

---

## 2. The Big Picture

```
┌─────────────────────────────────────────────────────────┐
│                    YOUR PHONE                           │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │           Expo App (React Native)               │   │
│  │                                                 │   │
│  │  Camera → AI Models → Show result               │   │
│  └──────────────────────┬──────────────────────────┘   │
│                         │ HTTP requests                 │
└─────────────────────────┼───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│              SPRING BOOT BACKEND (Server)               │
│                                                         │
│  Receive requests → Look up product → Return answer     │
│                           │                             │
│                           ▼                             │
│                     ┌──────────┐                        │
│                     │ Database │                        │
│                     │(Products,│                        │
│                     │ Sellers, │                        │
│                     │ Users)   │                        │
│                     └──────────┘                        │
└─────────────────────────────────────────────────────────┘
```

The mobile app **never talks to the database directly**. It always goes through the Spring Boot server. This is a security design — the server controls who can access what.

---

## 3. The Three Layers

Think of the app in three layers:

| Layer | Technology | What it does |
|-------|-----------|--------------|
| **Presentation** | React Native + Expo | What you see on screen (buttons, text, images) |
| **Business Logic** | Spring Boot (Java) | Rules and processing (auth, product search, scan analysis) |
| **Data** | PostgreSQL (H2 for dev) | Stores everything permanently (users, products, scan history) |

---

## 4. Backend — Spring Boot

### What is Spring Boot?

Spring Boot is a Java framework for building web servers. When you run the backend, it:
- Starts a web server on port 8080
- Listens for HTTP requests from the mobile app
- Processes those requests (e.g. "find product by barcode")
- Queries the database
- Returns a JSON response

### Backend File Structure

```
backend/
├── pom.xml                          # Project definition + dependencies
├── Dockerfile                       # How to build a Docker container
└── src/main/java/com/scanit/backend/
    ├── ScanItApplication.java       # Entry point — starts the server
    ├── config/
    │   └── SecurityConfig.java      # Security rules (who can access what)
    ├── controller/                  # Handle HTTP requests
    │   ├── AuthController.java      # Login, signup, logout
    │   ├── ProductController.java   # Search products, get product details
    │   ├── ScanController.java      # Analyze scans, barcode lookup
    │   ├── SellerController.java    # Seller info, inventory
    │   ├── UserController.java      # User profile
    │   └── NotificationController.java
    ├── service/                     # Business logic (the "brains")
    │   ├── AuthService.java         # Login logic, token generation
    │   ├── ProductService.java      # Product search, mapping to DTOs
    │   ├── ScanService.java         # Match scanned image to product
    │   ├── SellerService.java       # Seller data queries
    │   ├── UserService.java         # Profile updates
    │   └── NotificationService.java
    ├── entity/                      # Database table definitions
    │   ├── User.java                # users table
    │   ├── Product.java             # products table
    │   ├── ScanResult.java          # scan_results table
    │   ├── Seller.java              # sellers table
    │   ├── InventoryItem.java       # inventory_items table (product at seller)
    │   ├── Notification.java        # notifications table
    │   ├── PriceAlert.java          # price_alerts table
    │   └── SavedProduct.java        # saved_products table
    ├── repository/                  # Database query interfaces
    │   ├── UserRepository.java
    │   ├── ProductRepository.java
    │   └── ... (one per entity)
    ├── security/                    # JWT token handling
    │   ├── JwtService.java          # Create and validate tokens
    │   ├── JwtAuthFilter.java       # Check token on every request
    │   └── UserDetailsServiceImpl.java
    ├── dto/                         # Data shapes for requests/responses
    │   ├── ApiResponse.java         # Standard response wrapper { success, data, message }
    │   ├── ProductDto.java          # Product data for sending to app
    │   ├── ScanResultDto.java       # Scan result for sending to app
    │   ├── SellerDto.java           # Seller data
    │   ├── UserDto.java             # User profile data
    │   └── auth/                   # Login/signup request shapes
    ├── exception/                   # Error handling
    │   ├── GlobalExceptionHandler.java  # Catches all errors, returns clean JSON
    │   ├── BadRequestException.java     # 400 errors
    │   └── ResourceNotFoundException.java  # 404 errors
    ├── enums/
    │   ├── UserRole.java            # CONSUMER or SELLER
    │   ├── AuthenticityStatus.java  # AUTHENTIC, SUSPICIOUS, COUNTERFEIT
    │   └── NotificationType.java    # SYSTEM, PRICE_ALERT, NEW_SELLER
    ├── seed/
    │   └── DataSeeder.java          # Creates demo data on first start
    └── util/
        └── MapToJsonConverter.java  # Converts Map<String,String> to JSON for storage
```

### Detailed File Explanations

---

#### `pom.xml` — The Project Recipe

This file tells Maven (the build tool) what libraries to download and how to build the project. Think of it like `package.json` in Node.js.

Key dependencies:
- `spring-boot-starter-web` — makes it a web server
- `spring-boot-starter-security` — adds authentication features
- `spring-boot-starter-data-jpa` — lets us talk to the database using Java objects
- `spring-boot-starter-mail` — lets us send emails (for forgot-password)
- `postgresql` — the database driver for production
- `h2` — a lightweight in-memory database for development (no setup needed)
- `jjwt` — creates and validates JWT tokens
- `lombok` — generates boilerplate Java code automatically (`@Getter`, `@Builder`, etc.)

---

#### `ScanItApplication.java` — The Start Button

```java
@SpringBootApplication
public class ScanItApplication {
    public static void main(String[] args) {
        SpringApplication.run(ScanItApplication.class, args);
    }
}
```

This is literally where the program starts. When you run `java -jar scanit-backend.jar`, this file runs first. Spring Boot then scans all the other files and wires everything together automatically.

---

#### `config/SecurityConfig.java` — The Bouncer

This file decides **which API endpoints are public** and which require a login token.

```
Public (anyone can access):
  POST /auth/sign-up          ← Register new account
  POST /auth/sign-in          ← Login
  POST /auth/refresh-token    ← Get new token when old one expires
  POST /auth/forgot-password  ← Request password reset
  POST /auth/reset-password   ← Set new password
  GET  /actuator/health       ← Health check (Railway uses this)
  GET  /products/**           ← Browse products (public)
  GET  /sellers/**            ← Browse sellers (public)

Protected (must send JWT token):
  POST /scans/analyze         ← Scan a product
  GET  /scans/barcode/{code}  ← Barcode lookup
  GET  /scans/history         ← Your scan history
  GET  /users/me              ← Your profile
  PUT  /users/me              ← Update your profile
  GET  /notifications         ← Your notifications
```

CORS (Cross-Origin Resource Sharing) is also configured here to allow the mobile app to make requests.

---

#### `controller/AuthController.java` — Login & Signup Handler

Controllers receive HTTP requests and return responses. They're like receptionists — they receive your request and pass it to the service team.

```
POST /auth/sign-up     → AuthService.signUp()     → return tokens + user
POST /auth/sign-in     → AuthService.signIn()     → return tokens + user
POST /auth/refresh-token → AuthService.refreshToken() → return new access token
POST /auth/forgot-password → AuthService.forgotPassword() → send email
POST /auth/reset-password  → AuthService.resetPassword()  → update password
GET  /auth/me          → returns current user from JWT
```

---

#### `service/AuthService.java` — Login Logic

This is where the actual login logic lives:

1. **Sign up**: Check email is unique → hash password with BCrypt → save user → generate JWT tokens
2. **Sign in**: Check email/password → if correct, generate JWT tokens
3. **Refresh token**: Validate refresh token → issue new access token (so users stay logged in)
4. **Forgot password**: Generate reset token → save to user → send email
5. **Reset password**: Validate reset token → hash new password → save

**What is BCrypt?** It's a one-way hashing algorithm. When you set password "hello123", BCrypt turns it into something like "$2a$10$xK8...". You can never recover the original password. When you login, BCrypt checks if "hello123" matches the stored hash — without knowing what "hello123" originally was.

**What is a JWT token?** It's a string like `eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyQGVtYWlsLmNvbSJ9.abc123`. It's sent with every request so the server knows who you are without needing a session.

---

#### `controller/ScanController.java` — Scan Handler

```
POST /scans/analyze           → Takes image URI + AI label → returns matched product
GET  /scans/barcode/{code}    → Takes barcode → returns exact product (99% accurate)
GET  /scans/history           → Returns user's past scans
```

---

#### `service/ScanService.java` — The Product Matcher

This is the brain of scanning. When the mobile app sends a scan request:

```
1. Find the user from their email (from JWT)
2. Get the AI label detected on the phone (e.g. "chocolate sauce")
3. Search products: does any product name or brand contain that word?
4. If found → return that product + sellers + prices
5. If not found → deterministic fallback (same image always gives same product)
6. Save the scan to history
7. Increment user's scan count
```

For barcode scans:
```
1. Find product with that exact barcode
2. Return product with 99.0% confidence
3. Save to history
```

---

#### `entity/` — Database Table Definitions

Each file here represents one database table. This is called ORM (Object-Relational Mapping) — it lets us work with Java objects instead of writing SQL.

**`User.java`**
```java
@Entity
@Table(name = "users")
public class User implements UserDetails {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    private String name;
    private String email;      // must be unique
    private String password;   // BCrypt hash
    @Enumerated(EnumType.STRING)
    private UserRole role;     // CONSUMER or SELLER
    private int scansCount;
    // ...
}
```
`@Entity` tells Spring Boot this class maps to a database table.
`@Id` marks the primary key.
`@GeneratedValue(UUID)` means the ID is auto-generated as a UUID.

**`Product.java`**
Stores: name, brand, category, description, image URL, price, currency (GHS), origin, specs (as JSON), barcode, authenticity status.

**`Seller.java`**
Stores: name, location, phone, WhatsApp number, rating, verified status, coordinates.

**`InventoryItem.java`**
This is the link between a Product and a Seller. It says "Makola Market sells Tropical Juice for ₵2.90 with 50 in stock". Without this table, we'd have to store seller info inside the product, which would be messy.

**`ScanResult.java`**
Every time someone scans a product, we save: which user, which product, when, confidence score, whether it was authentic.

**`Notification.java`**
App notifications: price drops, new sellers, system messages.

**`PriceAlert.java`**
When a price drops, record: old price, new price, percentage drop.

**`SavedProduct.java`**
When a user bookmarks a product for future reference.

---

#### `repository/` — Database Queries

Repositories are interfaces that Spring Data JPA turns into database queries automatically.

```java
public interface ProductRepository extends JpaRepository<Product, String> {
    // Spring generates the SQL: SELECT * FROM products WHERE name LIKE ? OR brand LIKE ?
    List<Product> findByNameContainingIgnoreCaseOrBrandContainingIgnoreCase(String name, String brand);
    // SELECT * FROM products WHERE category = ?
    List<Product> findByCategoryIgnoreCase(String category);
    // SELECT * FROM products WHERE barcode = ?
    List<Product> findByBarcode(String barcode);
}
```

You never write SQL — you just describe the query in the method name. Spring figures out the SQL.

---

#### `security/JwtService.java` — Token Factory

Creates and validates JWT tokens.

- `generateAccessToken(user)` → creates a token that expires in 1 hour
- `generateRefreshToken(user)` → creates a token that expires in 7 days
- `extractUsername(token)` → reads the email address from inside the token
- `isTokenValid(token, user)` → checks if token is not expired and matches the user

---

#### `security/JwtAuthFilter.java` — The Token Checker

This runs on **every single request** before it reaches any controller. It:

1. Reads the `Authorization: Bearer <token>` header
2. Extracts the email from the token
3. Loads the user from the database
4. If the token is valid → marks the request as authenticated
5. If no token or invalid token → continues without authentication (request will fail if the endpoint requires auth)

---

#### `dto/` — Data Transfer Objects

DTOs are simple data containers for sending and receiving data. They're separate from Entities because:
- You don't want to expose internal fields (like the hashed password)
- The API response shape might differ from the database shape

**`ApiResponse.java`** — every response is wrapped in this:
```json
{ "success": true, "data": { ... }, "message": null }
```

**`ProductDto.java`** — what the app receives when it asks for a product:
```json
{
  "id": "abc123",
  "name": "Tropical Juice 500ml",
  "brand": "TropicFresh",
  "price": 3.40,
  "currency": "GHS",
  "sellers": [
    { "name": "Makola Market", "price": 2.90, "location": "Makola" }
  ]
}
```

---

#### `seed/DataSeeder.java` — Demo Data Creator

When the server starts for the first time, this file automatically creates:
- 2 users: `ama.m@scanit.app` (consumer) and `kofi@scanit.app` (seller) — password: `password123`
- 4 sellers: Makola Market, Accra Mall, Kaneshie Market, Oxford Street Shop
- 6 products: Tropical Juice, Spring Water, Cocoa Spread, Shea Butter Cream, Pepper Chips, Ghana Rice
- Inventory listings: who sells what at what price
- Demo notifications and price alerts

It only runs once (checks `if (userRepository.count() > 0) return`).

---

#### `exception/GlobalExceptionHandler.java` — Error Formatter

When anything goes wrong (product not found, bad password, etc.), this class catches the exception and returns a clean JSON response instead of a Java stack trace:

```json
{ "success": false, "data": null, "message": "No product found with barcode: 1234567890" }
```

---

#### `resources/application.yml` — Server Configuration

Global settings that apply to all environments:
- Server port: 8080
- All endpoints start with `/api/v1`
- JWT secret key and expiration times
- Email sender address

**`application-dev.yml`** — Development overrides:
- Use H2 in-memory database (no PostgreSQL needed)
- Enable H2 web console at `/h2-console`
- Show SQL queries in logs

**`application-prod.yml`** — Production overrides:
- Use PostgreSQL (set via DATABASE_URL env variable)
- Don't show SQL queries

---

## 5. Frontend — Expo + React Native

### What is Expo?

Expo is a framework that lets you write **one codebase in JavaScript/TypeScript** that runs on both Android and iOS. React Native is the underlying technology; Expo adds tools and APIs on top.

### What is Expo Router?

Expo Router is a file-based navigation system. The folder structure under `app/` directly becomes the navigation structure. For example:
- `app/(auth)/sign-in.tsx` → the sign-in screen
- `app/(tabs)/scan.tsx` → the scan tab
- `app/scan-result.tsx` → the result screen

No manual navigation setup needed — just create a file and it becomes a screen.

### Frontend File Structure

```
(root)/
├── app/                      # All screens (Expo Router)
│   ├── _layout.tsx           # Root layout (wraps everything)
│   ├── index.tsx             # Entry point — decides where to go on launch
│   ├── scan-result.tsx       # Result shown after scanning
│   ├── product-detail.tsx    # Full product detail page
│   ├── recommendations.tsx   # Cheaper alternatives
│   ├── scan-history.tsx      # Past scans list
│   ├── notifications.tsx     # Notifications center
│   ├── edit-profile.tsx      # Edit your name/avatar
│   ├── settings.tsx          # App settings
│   ├── help.tsx              # FAQ/help page
│   ├── seller-inventory.tsx  # Seller inventory management
│   ├── (auth)/               # Auth screens (not tabs)
│   │   ├── _layout.tsx       # Auth stack layout
│   │   ├── sign-in.tsx       # Login screen
│   │   ├── sign-up.tsx       # Registration screen
│   │   └── forgot-password.tsx
│   ├── (onboarding)/         # First-launch slides
│   │   ├── _layout.tsx
│   │   └── index.tsx         # 3 onboarding slides
│   └── (tabs)/               # Main tab bar screens
│       ├── _layout.tsx       # Tab bar configuration (5 tabs)
│       ├── explore.tsx       # Home/dashboard
│       ├── scan.tsx          # Camera scanner ← THE MAIN SCREEN
│       ├── history.tsx       # Scan history tab
│       ├── saved.tsx         # Saved products tab
│       └── profile.tsx       # User profile tab
├── components/               # Reusable UI pieces
│   ├── Button.tsx            # Styled button
│   ├── Input.tsx             # Styled text input
│   ├── Badge.tsx             # Authenticity badge (green/yellow/red)
│   ├── Card.tsx              # Product card
│   ├── Chip.tsx              # Small label tag
│   ├── ProductCard.tsx       # Full product card with image
│   ├── EmptyState.tsx        # "Nothing here yet" placeholder
│   └── ScanBracket.tsx       # The corner brackets on the scan screen
├── services/                 # API calls and AI calls
│   ├── ai.ts                 # 6 AI model adapters
│   ├── scan.ts               # Orchestrates AI + backend for scanning
│   ├── auth.ts               # Login/signup API calls
│   └── products.ts           # Product search, notifications, inventory
├── stores/                   # App state (Zustand)
│   ├── auth.ts               # Who is logged in, tokens
│   ├── scan.ts               # Current scan result, history
│   ├── products.ts           # Search results, recommendations
│   └── saved.ts              # Bookmarked products
├── types/                    # TypeScript type definitions
│   └── index.ts              # All interfaces: User, Product, ScanResult, etc.
├── utils/
│   ├── api.ts                # HTTP client (adds Bearer token to requests)
│   └── format.ts             # Formatting helpers (₵3.40, "Very High")
├── hooks/
│   ├── use-color-scheme.ts   # Light/dark mode detection
│   ├── useOnboarding.ts      # Has user seen onboarding?
│   └── use-theme-color.ts    # Color token lookup
├── theme/
│   └── index.ts              # Colors, fonts, spacing, shadows
├── constants/
│   └── theme.ts              # Re-exported theme (Colors, Typography, etc.)
├── assets/
│   ├── images/               # App icon, splash screen
│   └── models/               # TensorFlow Lite model (14MB) + ImageNet labels
├── .env.local                # API URL, HuggingFace token (DO NOT COMMIT)
├── app.json                  # Expo app configuration
├── package.json              # npm dependencies
├── metro.config.js           # Metro bundler config (supports .tflite files)
└── tsconfig.json             # TypeScript configuration
```

### Detailed Frontend File Explanations

---

#### `app/index.tsx` — The Router

This screen runs first. It decides where to send the user:

```
Has user seen onboarding?
  NO  → go to onboarding
  YES → Is user logged in?
          YES → go to (tabs)/explore (home)
          NO  → go to (auth)/sign-in
```

---

#### `app/(tabs)/scan.tsx` — The Scanner Screen

This is the most important screen. It does two things:

**Barcode mode** (default — active when you open the screen):
- The camera continuously scans for barcodes
- When a barcode is detected, it automatically calls the backend's `/scans/barcode/{code}` endpoint
- No button press needed — instant product lookup

**Photo mode** (switch with the icon in the bottom right):
- Press the white shutter button to take a photo
- The AI models analyse the photo (HuggingFace Vision, MobileNet, etc.)
- The AI's detected label (e.g. "chocolate sauce") is sent to the backend
- The backend keyword-searches the product database for a match

The scan line animation is just visual decoration — the `Animated.loop` creates the bouncing effect.

---

#### `app/scan-result.tsx` — The Result Bottom Sheet

After scanning, this screen slides up from the bottom showing:
- Product name and brand
- Authenticity badge (authentic/suspicious/counterfeit)
- Current price vs. best nearby price
- AI model breakdown (confidence scores from each model)
- "See Recommendations" button → navigate to cheaper alternatives

The slide-up animation uses `Animated.spring` for the sheet and `Animated.timing` for the dark overlay behind it.

---

#### `services/ai.ts` — The AI Brain

This file contains 6 AI model integrations. All are free:

| Model | Purpose | API |
|-------|---------|-----|
| `hfVision()` | Identify what the image shows | HuggingFace `google/vit-base-patch16-224` |
| `tflite()` | On-device classification (faster, offline) | Bundled `.tflite` file |
| `mobileNet()` | Secondary image classification | HuggingFace `google/mobilenet_v2_1.0_224` |
| `clip()` | Visual similarity matching | HuggingFace `openai/clip-vit-base-patch32` |
| `resNet50()` | Counterfeit detection | HuggingFace `microsoft/resnet-50` |
| `bert()` | Semantic search (understands meaning) | HuggingFace `sentence-transformers/all-MiniLM-L6-v2` |

**How they work together:**
```
Recognition confidence = Vision(50%) + TFLite(25%) + MobileNet(25%)
Overall confidence     = Recognition(40%) + CLIP(25%) + ResNet-50(20%) + TFLite(15%)
```

**If no HuggingFace token** (`EXPO_PUBLIC_HF_TOKEN` is blank):
- Models return stable fake data (same image always gives same fake confidence)
- The product detection still works, just the AI labels say "Add EXPO_PUBLIC_HF_TOKEN..."

**If token is set but API fails** (e.g. no internet):
- Models fall back to the same stable fake data
- App still shows a result

---

#### `services/scan.ts` — Scan Orchestrator

This service coordinates the entire scan flow:

```
1. Run AI analysis in parallel (all 5 models at once)
2. Extract the best label from the AI results (e.g. "chocolate sauce")
3. Send to backend: POST /scans/analyze { imageUri, imageLabel }
4. Backend searches DB by keyword → returns matching product + sellers + prices
5. Merge: AI confidence scores + backend product data = final result

If backend is OFFLINE:
  → Return AI label as product name with empty sellers/price
  → Set offlineMode=true so UI shows "start backend to see prices"
```

---

#### `utils/api.ts` — The HTTP Client

Every request to the backend goes through this file. It automatically:
- Adds `Authorization: Bearer <token>` header to every request
- On 401 (token expired) → silently refreshes the token and retries
- If refresh also fails → return the 401 (user needs to log in again)
- Unwraps `{ success, data, message }` from every response → returns just `data`

The base URL comes from `EXPO_PUBLIC_API_URL` in `.env.local`.

---

#### `stores/` — State Management (Zustand)

Zustand is a state management library. Think of a store as a global variable that any screen can read or update. When the variable changes, all screens using it automatically re-render.

**`stores/auth.ts`** — Manages: current user, access token, refresh token
- `login(email, password)` → calls backend, saves tokens to SecureStore
- `logout()` → clears tokens from SecureStore
- `signUp(...)` → creates account, saves tokens

**`stores/scan.ts`** — Manages: current scan result, scan history, loading state
- `analyze(imageUri)` → triggers the full scan pipeline
- `analyzeBarcode(code)` → triggers barcode lookup
- `offlineMode` → true when backend was unreachable during scan

**`stores/products.ts`** — Manages: search results, selected product, recommendations
- `search(query)` → keyword search via backend
- `semanticSearch(query)` → AI-powered search using BERT
- `loadRecommendations(productId)` → fetch cheaper alternatives

**`stores/saved.ts`** — Manages: user's saved/bookmarked products
- `save(product)` → adds to saved list
- `remove(productId)` → removes from saved list
- `isSaved(productId)` → returns true/false

---

#### `types/index.ts` — Type Definitions

TypeScript interfaces that define the shape of data throughout the app:

```typescript
interface Product {
  id: string;
  name: string;          // "Tropical Juice 500ml"
  brand: string;         // "TropicFresh"
  category: string;      // "Drinks"
  price: number;         // 3.40
  currency: string;      // "GHS"
  sellers: Seller[];     // who sells it and at what price
  authenticity: 'authentic' | 'suspicious' | 'counterfeit';
}

interface Seller {
  id: string;
  name: string;          // "Makola Market Store"
  location: string;      // "Makola"
  price?: number;        // price of THIS product at THIS seller (₵2.90)
  phone: string;
  whatsapp: string;
  verified: boolean;
  rating: number;        // 4.5 stars
}

interface ScanResult {
  id: string;
  product: Product;
  confidence: number;    // 0-100 (how sure the AI is)
  authenticityStatus: 'authentic' | 'suspicious' | 'counterfeit';
  aiAnalysis?: AIAnalysisResult;   // breakdown from each AI model
  offlineMode?: boolean;           // true if backend was unreachable
}
```

---

#### `theme/index.ts` — Design Tokens

All colors, sizes, and fonts in one place:

```typescript
Colors.primary = '#E76F2E'   // Orange — main brand color
Colors.accent  = '#2FA4D7'   // Blue — scan line, links
Colors.text    = '#3E2C23'   // Dark brown — body text
Colors.surface = '#F5E9D8'   // Warm off-white — backgrounds
Colors.warning = '#F39C12'   // Orange — suspicious warnings
Colors.danger  = '#E74C3C'   // Red — counterfeit warnings
Colors.success = '#2ECC71'   // Green — authentic badge
```

By using tokens instead of hardcoded colors, changing the brand color means changing one line.

---

#### `.env.local` — Environment Variables

This file stores configuration that changes between environments. It is NEVER committed to git.

```env
EXPO_PUBLIC_API_URL=http://10.0.2.2:8080/api/v1   # Where the backend is
EXPO_PUBLIC_HF_TOKEN=hf_xxxxx                       # HuggingFace API token
```

Any variable starting with `EXPO_PUBLIC_` is embedded into the app at build time and accessible as `process.env.EXPO_PUBLIC_API_URL`.

---

## 6. AI Models

### What the Free Models Can Do

| Model | What it identifies |
|-------|------------------|
| ViT (Vision Transformer) | "coffee mug", "chocolate sauce", "water bottle" |
| MobileNet | Same as ViT — general object categories |
| TFLite (MobileNet v2) | Same, runs on your phone (no internet needed) |
| CLIP | Whether two images look similar |
| ResNet-50 | General image features (used for authenticity proxy) |
| BERT | Semantic meaning of text (used for search) |

### What They CANNOT Do (Important!)

These free models are trained on general internet images, NOT on Ghanaian market products. They will say "chocolate sauce" not "Milo cocoa drink". This is why:

1. **Barcode scanning is more reliable** — exact match, always correct
2. **The keyword search** — even if AI says "chocolate", the backend searches products for "chocolate" and finds the closest match
3. **Manual product database** — the real names come from the Spring Boot database which you control

### Suggested Upgrade Path (Still Free)

For better product identification:
- **Open Food Facts API** (completely free) — covers many products sold in Africa with barcodes
- **Google Cloud Vision** (1,000 free scans/month) — much more accurate than HuggingFace ViT
- **Custom fine-tuned model** — train HuggingFace on photos of Ghanaian products

The architecture already supports swapping models — just update `services/ai.ts`.

---

## 7. How a Scan Works End-to-End

Here is the complete flow from pressing the shutter button to seeing the result:

### Step 1: Camera Capture

```
User presses shutter button in app/(tabs)/scan.tsx
        ↓
cameraRef.current.takePictureAsync({ quality: 0.7 })
        ↓
Returns photo.uri = "file:///data/user/0/.../Camera/photo.jpg"
        ↓
Calls: scanStore.analyze(photo.uri)
```

### Step 2: Store Triggers Service

```
stores/scan.ts — analyze(imageUri)
        ↓
Set state: { isAnalyzing: true, analyzingStage: "HuggingFace Vision…" }
        ↓
Calls: scanService.analyzeImage(imageUri)
```

### Step 3: AI Analysis (Parallel)

```
services/scan.ts — analyzeImage()
        ↓
aiService.analyzeImage(imageUri)
        ├── hfVision(imageUri)   → POST https://api-inference.huggingface.co/models/google/vit-base-patch16-224
        ├── tflite(imageUri)     → runs on device (or HuggingFace fallback)
        ├── mobileNet(imageUri)  → POST https://api-inference.huggingface.co/models/google/mobilenet_v2_1.0_224
        ├── clip(imageUri)       → POST https://api-inference.huggingface.co/models/openai/clip-vit-base-patch32
        └── resNet50(imageUri)   → POST https://api-inference.huggingface.co/models/microsoft/resnet-50
        ↓
Returns: { recognition: {label: "chocolate sauce", confidence: 88}, overallConfidence: 85, ... }
```

### Step 4: Backend Lookup

```
services/scan.ts
        ↓
api.post('/scans/analyze', { imageUri, imageLabel: "chocolate sauce" })
        ↓
HTTP POST → http://10.0.2.2:8080/api/v1/scans/analyze
  Headers: { Authorization: "Bearer eyJhbGci..." }
  Body: { "imageUri": "file:///...", "imageLabel": "chocolate sauce" }
```

### Step 5: Backend Processes

```
ScanController.java — analyze()
        ↓
ScanService.java — analyzeImage("ama.m@scanit.app", imageUri, "chocolate sauce")
        ↓
ProductRepository.findByNameContaining("chocolate") → [Ghana Cocoa Spread 100g]
        ↓
ProductService.toDto(product) → includes sellers + prices
        ↓
ScanResult saved to database (scan_results table)
        ↓
Returns: {
  "id": "scan-uuid",
  "product": {
    "name": "Ghana Cocoa Spread 100g",
    "price": 8.00,
    "sellers": [
      { "name": "Oxford Street Shop", "price": 6.50, "location": "Osu" },
      { "name": "Accra Mall Store",   "price": 7.50, "location": "Accra Mall" }
    ]
  },
  "confidence": 88.0,
  "authenticityStatus": "authentic"
}
```

### Step 6: Frontend Shows Result

```
services/scan.ts — merges backend result + AI analysis
        ↓
stores/scan.ts — sets currentResult + history
        ↓
app/(tabs)/scan.tsx — useEffect sees currentResult is not null
        ↓
router.push('/scan-result')
        ↓
app/scan-result.tsx — shows:
  ✓ Product name: "Ghana Cocoa Spread 100g"
  ✓ Best price: ₵6.50 at Oxford Street Shop
  ✓ AI breakdown: 88% overall confidence
  ✓ Authentic badge (green)
  ✓ "See Recommendations" → cheaper options
```

---

## 8. How Authentication Works

### Registration

```
1. User fills in name, email, password, role in sign-up.tsx
2. Calls: authStore.signUp("Ama Mensah", "ama@email.com", "pass123", "consumer")
3. services/auth.ts → POST /auth/sign-up
4. Backend: hash password → save user → generate tokens
5. Response: { user: {...}, accessToken: "eyJ...", refreshToken: "eyJ..." }
6. App saves tokens to SecureStore (encrypted storage on the phone)
7. User lands on home screen
```

### Every Subsequent Request

```
1. User opens scan history
2. api.ts → reads accessToken from SecureStore
3. Sends: GET /scans/history   Authorization: Bearer eyJhbGci...
4. Backend JwtAuthFilter reads the token, extracts email, loads user
5. Returns data for that user only
```

### Token Expiry (After 1 Hour)

```
1. App sends request with expired token
2. Backend returns 401 Unauthorized
3. api.ts auto-detects 401 → calls POST /auth/refresh-token with refresh token
4. Backend validates refresh token → issues new access token
5. App retries the original request with new token
6. User never sees any interruption
```

### Why Two Tokens?

- **Access token** (1 hour) — short-lived, used on every request. Even if stolen, only valid for 1 hour.
- **Refresh token** (7 days) — long-lived, stored more securely. Used only to get new access tokens.

---

## 9. The Database

### Tables

```
users             → one row per registered user
products          → one row per product (Milo, Coca-Cola, etc.)
sellers           → one row per seller (Makola Market, Accra Mall, etc.)
inventory_items   → who sells what at what price (many-to-many join)
scan_results      → every scan ever performed
notifications     → in-app notifications for each user
price_alerts      → when prices drop
saved_products    → user's bookmarked products
```

### How Products and Sellers Are Linked

```
Product: "Tropical Juice 500ml"  price=₵3.40
    │
    ├── InventoryItem: Makola sells it at ₵2.90 (50 in stock)
    ├── InventoryItem: Accra Mall sells it at ₵3.20 (30 in stock)
    └── InventoryItem: Kaneshie sells it at ₵2.70 (100 in stock)
```

When the app asks for a product, the backend fetches all inventory items for that product and includes them as the `sellers` array.

### Development Database (H2)

In development mode (default), the app uses H2 — an in-memory database. This means:
- No PostgreSQL installation needed
- Data is lost when you stop the server
- It resets and re-seeds every time you restart
- Great for development, terrible for production

### Production Database (PostgreSQL)

On Railway/Render, use PostgreSQL. Set the `DATABASE_URL` environment variable, and `SPRING_PROFILES_ACTIVE=prod`. The schema is auto-created by Hibernate (`ddl-auto: update`).

---

## 10. How to Run the App

### What You Need

- Node.js 20+ (`node --version`)
- Java 17+ (`java -version`)
- Maven 3.8+ (`mvn --version`)
- Expo Go app on your phone OR Android emulator
- Git

### Start the Backend

```bash
# Navigate to backend folder
cd scanit/backend

# Build the JAR (compiles Java code)
JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64 mvn clean package -DskipTests

# Run the server (uses H2 in-memory DB by default)
JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64 java -jar target/scanit-backend-1.0.0.jar

# You should see:
# Tomcat started on port(s): 8080
# ScanIt database seeded successfully!
# Demo accounts: ama.m@scanit.app / password123
```

### Configure the App URL

Edit `.env.local` and set the right URL for your situation:

```bash
# Android emulator
EXPO_PUBLIC_API_URL=http://10.0.2.2:8080/api/v1

# Physical device (find your IP with: ip addr show | grep 192.168)
EXPO_PUBLIC_API_URL=http://192.168.1.100:8080/api/v1
```

### Start the Mobile App

```bash
# Install dependencies (only needed once)
npm install

# Start Expo development server
npx expo start

# Open Expo Go on your phone and scan the QR code
# OR press 'a' to open on Android emulator
```

### Get a Free HuggingFace Token

1. Go to https://huggingface.co/settings/tokens
2. Click "New token" → Access type: Read
3. Copy the token (starts with `hf_`)
4. Paste into `.env.local`: `EXPO_PUBLIC_HF_TOKEN=hf_yourtoken`
5. Restart Expo: `npx expo start`

Now the AI models will use real image recognition instead of fake labels.

### Test with Demo Accounts

```
Consumer account: ama.m@scanit.app / password123
Seller account:   kofi@scanit.app  / password123
```

---

## 11. Fixing the "Offline" Error

When you scan and see "backend offline" or "network request failed", it means the app can't reach the Spring Boot server.

### Why This Happens

On a **physical phone**, `localhost` means the phone itself — not your computer. The Spring Boot server is on your computer, not on the phone.

### How to Fix It

**Option 1 — Android Emulator:**
```
EXPO_PUBLIC_API_URL=http://10.0.2.2:8080/api/v1
```
Android emulators use `10.0.2.2` as the address for the host computer.

**Option 2 — Physical device on same Wi-Fi:**
1. Find your computer's IP address:
   - Linux/Mac: `ip addr show | grep "192.168"`
   - Windows: open Command Prompt → type `ipconfig` → find IPv4 Address
2. Update `.env.local`:
   ```
   EXPO_PUBLIC_API_URL=http://192.168.1.XXX:8080/api/v1
   ```
   (Replace XXX with your actual IP)

**Option 3 — Deploy backend online:**
Deploy to Railway or Render (free tier available) and get a public URL like `https://scanit-backend.up.railway.app`. See `docs/DEPLOYMENT.md` for step-by-step instructions.

### Even Without the Backend

The app is designed to work in "offline mode":
- AI analysis still runs (on HuggingFace)
- You'll see the AI-detected label as the product name
- No price or seller info will appear
- A grey banner will tell you to start the backend

---

## 12. Free AI Models

### What's Already Integrated (All Free)

| Model | HuggingFace ID | Free Limit |
|-------|----------------|-----------|
| ViT (Vision Transformer) | `google/vit-base-patch16-224` | 30k requests/month |
| MobileNet v2 | `google/mobilenet_v2_1.0_224` | 30k requests/month |
| CLIP | `openai/clip-vit-base-patch32` | 30k requests/month |
| ResNet-50 | `microsoft/resnet-50` | 30k requests/month |
| Sentence BERT | `sentence-transformers/all-MiniLM-L6-v2` | 30k requests/month |
| TFLite MobileNet | Bundled in app | Unlimited (on-device) |

### Limitation

These models can say "this is a tin can" or "this looks like a drink bottle" but NOT "this is Milo 400g from Nestlé Ghana". That level of product identification requires:

1. **Training your own model** on photos of Ghanaian products (advanced)
2. **Google Cloud Vision Product Search** (paid, very accurate)
3. **Barcode database** (free, very accurate for packaged goods)

For now: the AI tells you the category, and the backend matches it to the closest product. As you add more products to the database and use more specific names, the matching gets better.

### Adding More Products

To add a product to the database, either:
1. Add it to `DataSeeder.java` and restart the server
2. Connect to the H2 console at `http://localhost:8080/api/v1/h2-console` and run SQL
3. Build an admin API endpoint for adding products

---

## 13. Every File Explained

Here is a one-line description of every file in the project:

### Backend

| File | What it does |
|------|-------------|
| `pom.xml` | Maven project definition — lists all Java libraries |
| `Dockerfile` | Recipe for building a Docker container of the backend |
| `ScanItApplication.java` | The main() entry point — starts Spring Boot |
| `SecurityConfig.java` | Defines which endpoints need auth, sets up CORS and JWT filter |
| `AuthController.java` | HTTP endpoints for login, signup, token refresh, password reset |
| `ProductController.java` | HTTP endpoints for product search, details, recommendations |
| `ScanController.java` | HTTP endpoints for image scan, barcode scan, history |
| `SellerController.java` | HTTP endpoints for seller info and inventory management |
| `UserController.java` | HTTP endpoints for user profile and saved products |
| `NotificationController.java` | HTTP endpoints for reading notifications |
| `AuthService.java` | Login logic: BCrypt, JWT generation, email sending |
| `ProductService.java` | Product search logic, maps Entity to DTO |
| `ScanService.java` | Matches AI label to product, handles barcode lookup |
| `SellerService.java` | Seller queries and inventory updates |
| `UserService.java` | Profile updates, saved products management |
| `NotificationService.java` | Notification queries |
| `User.java` | JPA entity = users database table |
| `Product.java` | JPA entity = products database table |
| `ScanResult.java` | JPA entity = scan_results database table |
| `Seller.java` | JPA entity = sellers database table |
| `InventoryItem.java` | JPA entity = inventory_items table (product ↔ seller link) |
| `Notification.java` | JPA entity = notifications table |
| `PriceAlert.java` | JPA entity = price_alerts table |
| `SavedProduct.java` | JPA entity = saved_products table |
| `UserRepository.java` | Database queries for users |
| `ProductRepository.java` | Database queries for products (search by name, barcode, category) |
| `ScanResultRepository.java` | Database queries for scan history |
| `SellerRepository.java` | Database queries for sellers |
| `InventoryItemRepository.java` | Database queries for inventory listings |
| `NotificationRepository.java` | Database queries for notifications |
| `PriceAlertRepository.java` | Database queries for price alerts |
| `SavedProductRepository.java` | Database queries for saved products |
| `JwtService.java` | Creates and validates JWT tokens |
| `JwtAuthFilter.java` | Intercepts every request to check the JWT |
| `UserDetailsServiceImpl.java` | Loads user by email for Spring Security |
| `ApiResponse.java` | Wrapper DTO: `{ success, data, message }` |
| `ProductDto.java` | Product shape for API responses |
| `ScanResultDto.java` | Scan result shape for API responses |
| `SellerDto.java` | Seller shape (includes per-product price) |
| `UserDto.java` | User profile shape for API responses |
| `RecommendationDto.java` | Cheaper alternative shape for API responses |
| `NotificationDto.java` | Notification shape for API responses |
| `AuthResponse.java` | Login response: user + accessToken + refreshToken |
| `SignUpRequest.java` | Expected body for POST /auth/sign-up |
| `SignInRequest.java` | Expected body for POST /auth/sign-in |
| `ForgotPasswordRequest.java` | Expected body for POST /auth/forgot-password |
| `ResetPasswordRequest.java` | Expected body for POST /auth/reset-password |
| `RefreshTokenRequest.java` | Expected body for POST /auth/refresh-token |
| `UpdateProfileRequest.java` | Expected body for PUT /users/me |
| `GlobalExceptionHandler.java` | Catches all errors, returns clean JSON instead of stack trace |
| `BadRequestException.java` | 400 error — invalid input |
| `ResourceNotFoundException.java` | 404 error — item not found |
| `UserRole.java` | Enum: CONSUMER or SELLER |
| `AuthenticityStatus.java` | Enum: AUTHENTIC, SUSPICIOUS, COUNTERFEIT |
| `NotificationType.java` | Enum: SYSTEM, PRICE_ALERT, NEW_SELLER |
| `DataSeeder.java` | Creates demo users, products, sellers on first startup |
| `MapToJsonConverter.java` | Converts Java Map to/from JSON string for the `specs` column |
| `application.yml` | Base configuration (port, JWT secret, email sender) |
| `application-dev.yml` | Dev config: H2 database, show SQL, MailHog |
| `application-prod.yml` | Prod config: PostgreSQL, no debug logs |

### Frontend

| File | What it does |
|------|-------------|
| `app/_layout.tsx` | Root layout — wraps entire app with providers |
| `app/index.tsx` | Entry point — routes to onboarding, auth, or home |
| `app/scan-result.tsx` | Bottom sheet showing scan result with product + AI breakdown |
| `app/product-detail.tsx` | Full product detail page (all specs, all sellers) |
| `app/recommendations.tsx` | List of cheaper alternatives for scanned product |
| `app/scan-history.tsx` | Past scans list |
| `app/notifications.tsx` | In-app notification center |
| `app/edit-profile.tsx` | Edit name, avatar URL |
| `app/settings.tsx` | App settings (notifications, language, etc.) |
| `app/help.tsx` | FAQ and help articles |
| `app/seller-inventory.tsx` | Seller-specific: manage listed products |
| `app/(auth)/_layout.tsx` | Stack navigator for auth screens |
| `app/(auth)/sign-in.tsx` | Login screen |
| `app/(auth)/sign-up.tsx` | Registration screen |
| `app/(auth)/forgot-password.tsx` | Forgot password flow |
| `app/(onboarding)/_layout.tsx` | Full-screen layout for onboarding |
| `app/(onboarding)/index.tsx` | 3 onboarding slides (shown on first launch) |
| `app/(tabs)/_layout.tsx` | Bottom tab bar (5 tabs) |
| `app/(tabs)/explore.tsx` | Home tab — featured products, search bar |
| `app/(tabs)/scan.tsx` | Camera tab — barcode + photo scanning |
| `app/(tabs)/history.tsx` | History tab — recent scans |
| `app/(tabs)/saved.tsx` | Saved tab — bookmarked products |
| `app/(tabs)/profile.tsx` | Profile tab — user info, stats, settings |
| `components/Button.tsx` | Reusable styled button |
| `components/Input.tsx` | Reusable styled text input |
| `components/Badge.tsx` | Authenticity badge (green/yellow/red) |
| `components/Card.tsx` | Generic card container |
| `components/Chip.tsx` | Small label/tag |
| `components/ProductCard.tsx` | Product card with image, name, price |
| `components/EmptyState.tsx` | "Nothing here yet" placeholder with icon |
| `components/ScanBracket.tsx` | Corner brackets drawn around the scan area |
| `services/ai.ts` | 6 AI model adapters (HuggingFace + TFLite) |
| `services/scan.ts` | Orchestrates AI + backend for a complete scan |
| `services/auth.ts` | Auth API calls (login, signup, refresh) |
| `services/products.ts` | Product search, notification, inventory API calls |
| `stores/auth.ts` | Zustand store — user session, tokens |
| `stores/scan.ts` | Zustand store — current scan, history, loading state |
| `stores/products.ts` | Zustand store — search results, recommendations |
| `stores/saved.ts` | Zustand store — bookmarked products |
| `types/index.ts` | All TypeScript interfaces (User, Product, ScanResult, etc.) |
| `utils/api.ts` | Authenticated HTTP client with auto token refresh |
| `utils/format.ts` | Format helpers: ₵3.40, "Very High Confidence" |
| `hooks/use-color-scheme.ts` | Detect if device is in dark mode |
| `hooks/useOnboarding.ts` | Track whether user has seen onboarding |
| `hooks/use-theme-color.ts` | Look up color tokens by name |
| `theme/index.ts` | Design tokens: Colors, Typography, Spacing, Radii, Shadows |
| `constants/theme.ts` | Re-exports from theme/ for compatibility |
| `assets/images/` | App icon, splash screen, adaptive icon |
| `assets/models/mobilenet_v2.tflite` | MobileNet v2 model for on-device classification (14MB) |
| `assets/models/imagenet_labels.json` | 1001 class labels for the TFLite model |
| `.env.local` | API URL + HuggingFace token (not committed to git) |
| `app.json` | Expo config: app name, icons, permissions, plugins |
| `package.json` | npm dependencies and scripts |
| `metro.config.js` | Metro bundler config (enables .tflite file loading) |
| `tsconfig.json` | TypeScript compiler options (strict mode) |
| `docker-compose.yml` | Starts PostgreSQL + MailHog + Spring Boot together |
| `railway.toml` | Railway deployment configuration |
| `docs/SETUP.md` | Local development setup guide |
| `docs/DEPLOYMENT.md` | Deploy to Railway/Render |
| `docs/AI_ARCHITECTURE.md` | AI pipeline deep dive |
| `docs/TODO.md` | Production checklist |

---

## Summary

You now understand every file and every concept in this project.

The core idea:
1. **Phone scans** → AI identifies what it sees
2. **Backend matches** the AI label to a product in the database
3. **Database returns** the product name, which sellers have it, and their prices
4. **App shows** the result cleanly on screen

To make it work for real products in Ghana, you need to:
1. Add more products to the database (with their barcodes!)
2. Add more sellers with real locations
3. Get a HuggingFace token (free) for better AI accuracy
4. Deploy the backend online (Railway has a free tier)

Good luck building with ScanIt!
