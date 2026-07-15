# ScanIt

AI-powered product scanner for Ghana. Point your camera at any physical product to get instant price comparisons, authenticity verification, seller hotlines, and smart recommendations.

## Features

- **AI Product Recognition** — raw camera vision, no barcodes or QR codes
- **Price Comparison** — compare prices across vendors in Ghana Cedi (₵)
- **Authenticity Verification** — detect counterfeit and suspicious products
- **Seller Hotlines** — call, WhatsApp, or message sellers directly
- **Smart Recommendations** — find cheaper nearby alternatives
- **Saved Products** — bookmark products to track prices
- **Role-based Auth** — Consumer and Seller accounts

## Setup

### Prerequisites

- Node.js 18+
- Expo Go app on your phone (iOS or Android)

### Install & Run

```bash
cd scanit
npm install
npx expo start
```

Scan the QR code with Expo Go on your phone.

### Expo Go on a Physical Device — Fix "Not Connected to Backend"

If you see a "Backend offline" banner in the app, it's because `localhost` on your phone refers to the phone itself — not your computer. Fix it in `.env.local`:

```
# Find your computer's local IP:
#   Linux/Mac:  ip addr  (look for 192.168.x.x)
#   Windows:    ipconfig (look for IPv4 Address)

EXPO_PUBLIC_API_URL=http://192.168.1.42:8080/api/v1
```

Restart the Expo dev server after saving. Your phone and computer must be on the same Wi-Fi.

> The app still works offline — AI vision analyses photos even without the backend. You just won't see prices and seller info until the backend is reachable.

### OTP Authentication Setup

The app uses a 3-step OTP flow for sign-up verification and password resets:

1. `POST /auth/otp/send` — generates a 6-digit code and delivers it via SMS or email
2. `POST /auth/otp/verify` — validates the code; returns a `resetToken` for password-reset flows
3. `POST /auth/otp/reset-password` — sets the new password (bcrypt-hashed, saved to DB)

Two providers handle delivery. Configure at least one.

---

#### SMS OTP — Arkesel (Recommended — Ghana-native, free credits, no credit card)

Arkesel is a Ghanaian SMS gateway with free test credits and no credit card required to start.

1. Sign up at [account.arkesel.com/signup](https://account.arkesel.com/signup)
2. Go to **API Keys** in your dashboard and copy your key
3. Add to your backend environment (or `application.yml`):

```properties
arkesel.api-key=your_arkesel_api_key
arkesel.sender-id=ScanIt        # max 11 characters; requires approval for production
```

Or via environment variables (recommended for production):
```
ARKESEL_API_KEY=your_arkesel_api_key
ARKESEL_SENDER_ID=ScanIt
```

> **Pricing**: GHS 0.035 per verification (~$0.002). Pay-as-you-go, no monthly fees.
> Free test credits are added on sign-up for sandbox testing.

---

#### SMS OTP — Twilio Verify (Fallback — global, free trial ~$15 credit)

Only used when `ARKESEL_API_KEY` is not set. Requires a credit/debit card to verify non-US numbers.

1. Sign up at [twilio.com/try-twilio](https://www.twilio.com/try-twilio)
2. Go to **Verify** → create a service → copy the **Service SID**
3. Copy your **Account SID** and **Auth Token** from the console
4. Add to your backend:

```properties
twilio.account-sid=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
twilio.auth-token=your_auth_token
twilio.verify.service-sid=VAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

#### Email OTP — Resend (free tier: 3,000 emails/month, no credit card)

1. Sign up at [resend.com](https://resend.com)
2. Create an API key
3. Add to your backend:

```properties
resend.api-key=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
resend.from=ScanIt <onboarding@resend.dev>   # sandbox address for testing
```

> The Resend API key is already in `.env.local` for local development.

---

#### Dev mode (no provider configured)

When neither `ARKESEL_API_KEY` nor Twilio credentials are set, the backend returns the
generated code in the API response as `{ "devCode": "123456" }` and the app pre-fills
the OTP field automatically. No SMS is sent in this mode — ideal for local testing.

---

#### Backend endpoint contract

```
POST /auth/otp/send
{ "contact": "+233201234567", "channel": "sms", "purpose": "signup" | "reset-password" }
→ 200 OK  (+ { "devCode": "..." } in dev mode)

POST /auth/otp/verify
{ "contact": "+233201234567", "code": "123456", "purpose": "signup" | "reset-password" }
→ { "data": { "resetToken": "..." } }   // resetToken only for reset-password

POST /auth/otp/reset-password
{ "contact": "+233201234567", "resetToken": "...", "newPassword": "newpass123" }
→ 200 OK  (password bcrypt-hashed and saved to PostgreSQL)
```

### Demo Account

```
Email: ama.m@scanit.app
Password: any 6+ characters (e.g. "password123")
```

## Project Structure

```
scanit/
├── app/                    # Expo Router file-based routes
│   ├── index.tsx           # Entry point & routing logic
│   ├── _layout.tsx         # Root layout
│   ├── (onboarding)/       # Onboarding flow (3 slides)
│   ├── (auth)/             # Sign In, Sign Up, Forgot Password
│   ├── (tabs)/             # Bottom tab navigator
│   │   ├── explore.tsx     # Home dashboard
│   │   ├── search.tsx      # Search & browse
│   │   ├── scan.tsx        # Camera scanner (dark theme)
│   │   ├── saved.tsx       # Saved products
│   │   └── profile.tsx     # Profile & account
│   ├── scan-result.tsx     # Bottom sheet scan result
│   ├── recommendations.tsx # Cheaper alternatives list
│   ├── product-detail.tsx  # Full product detail + specs
│   ├── scan-history.tsx    # Past scans
│   ├── notifications.tsx   # Notifications
│   ├── edit-profile.tsx    # Edit profile
│   ├── settings.tsx        # App settings
│   ├── help.tsx            # Help & support / FAQ
│   └── seller-inventory.tsx # Seller inventory management
├── components/             # Reusable UI components
├── services/               # Mock API layer (swap for real endpoints)
├── stores/                 # Zustand state management
├── types/                  # Centralized TypeScript types
├── theme/                  # Design tokens
├── hooks/                  # Custom hooks
└── utils/                  # Utility functions
```

## Design System

| Token | Value | Usage |
|-------|-------|-------|
| Primary | `#E76F2E` | CTAs, scan button, active states |
| Accent | `#2FA4D7` | Scan line, verified badges, links |
| Text | `#3E2C23` | Headings, body text |
| Surface | `#F5E9D8` | App background, cards |
| Near-Black | `#1A1512` | Scanner screen background |

## Swapping Mock Services for Real APIs

All API calls live in `/services/`. Each function returns a typed `ApiResponse<T>`. Replace mock implementations with real `fetch`/`axios` calls — the interface stays the same.

## Tech Stack

### Mobile (React Native)
- **Expo SDK 54** + Expo Router (file-based navigation)
- **React Native** + **TypeScript** (strict mode)
- **Zustand** — state management
- **expo-camera** — live camera feed
- **expo-secure-store** — JWT token storage
- **AsyncStorage** — onboarding flag, saved products cache
- **expo-image-picker** — gallery access
- **react-native-reanimated** — animations
- **react-native-gesture-handler** — gestures

### Backend (Java / Spring Boot)
- **Java 17** + **Spring Boot 3.2.5**
- **Spring Security** + **JWT** (jjwt 0.12.3) — authentication & authorisation
- **Spring Data JPA** + **Hibernate** — ORM
- **PostgreSQL** — production database
- **H2** — in-memory/file DB for local development
- **Arkesel** — SMS OTP (Ghana-native, free test credits, GHS 0.035/SMS)
- **Twilio Verify** — SMS OTP fallback (global)
- **Resend** — email OTP (3,000 free emails/month)
- **OkHttp** — HTTP client for Arkesel & Resend APIs
- **Lombok** — boilerplate reduction
- **Docker** + **Railway** — containerised deployment
