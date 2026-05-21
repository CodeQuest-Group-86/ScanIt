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
