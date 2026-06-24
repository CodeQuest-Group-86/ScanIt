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

### OTP Authentication Setup (Free Tiers)

The app sends verification codes on sign-up and for password resets. Two free-tier providers are supported:

#### SMS OTP — Twilio Verify (free trial ~$15 credit ≈ 150 SMS)

1. Sign up at [twilio.com](https://www.twilio.com/try-twilio)
2. Go to **Verify** → create a service → copy the **Service SID**
3. Copy your **Account SID** and **Auth Token** from the console
4. Add these to your **backend** `application.properties` (never in the mobile app):

```properties
twilio.account-sid=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
twilio.auth-token=your_auth_token
twilio.verify.service-sid=VAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

5. Your Spring Boot backend must expose:
   - `POST /api/v1/auth/otp/send` — calls Twilio Verify to send the code
   - `POST /api/v1/auth/otp/verify` — verifies the code, returns `{ resetToken }` for password resets
   - `POST /api/v1/auth/otp/reset-password` — sets the new password using the resetToken

#### Email OTP — Resend (free tier: 3,000 emails/month, no credit card)

1. Sign up at [resend.com](https://resend.com)
2. Create an API key
3. Add to your backend:

```properties
resend.api-key=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
resend.from=onboarding@resend.dev   # sandbox address for testing
```

#### Backend endpoint contract

All three endpoints follow this shape:

```
POST /auth/otp/send
{ "contact": "+233201234567", "channel": "sms", "purpose": "signup" | "reset-password" }
→ 200 OK

POST /auth/otp/verify
{ "contact": "+233201234567", "code": "123456", "purpose": "signup" | "reset-password" }
→ { "data": { "resetToken": "..." } }   // resetToken only returned for reset-password

POST /auth/otp/reset-password
{ "contact": "+233201234567", "resetToken": "...", "newPassword": "newpass123" }
→ 200 OK
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

- **Expo SDK 54** + Expo Router (file-based navigation)
- **React Native** + **TypeScript** (strict mode)
- **Zustand** — state management
- **expo-camera** — live camera feed
- **expo-secure-store** — JWT token storage
- **AsyncStorage** — onboarding flag, saved products cache
- **expo-image-picker** — gallery access
- **react-native-reanimated** — animations
- **react-native-gesture-handler** — gestures
