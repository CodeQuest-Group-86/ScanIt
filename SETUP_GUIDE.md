# ScanIt Setup Guide

Complete setup instructions for running ScanIt with all features enabled.

## Prerequisites

- Node.js 18+
- Java 17+ (for backend)
- Expo Go app on your phone (iOS or Android)
- Git

## Quick Start

### 1. Clone and Install

```bash
cd ScanIt
npm install
```

### 2. Configure Environment Variables

Create a `.env.local` file in the project root (copy from `.env.example`):

```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:

```env
# API Configuration
# For Android emulator:
EXPO_PUBLIC_API_URL=http://10.0.2.2:8080/api/v1
# For physical device (replace with your computer's IP):
# EXPO_PUBLIC_API_URL=http://192.168.1.XXX:8080/api/v1

# Gemini AI API Key (for product scanning)
# Get free key at: https://aistudio.google.com/app/apikey
EXPO_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here

# HuggingFace API Token (optional, for alternative AI models)
# Get free token at: https://huggingface.co/settings/tokens
EXPO_PUBLIC_HF_TOKEN=your_hf_token_here

# Paystack Configuration (for payments)
# Get keys at: https://dashboard.paystack.co/#/settings/keys
EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY=your_paystack_public_key_here
```

### 3. Start the Backend

```bash
cd backend
# Using Docker (recommended)
docker-compose up -d

# Or run directly (requires Java 17+)
./mvnw spring-boot:run
```

The backend will start on `http://localhost:8080/api/v1`

### 4. Start the Mobile App

```bash
# From project root
npx expo start
```

Scan the QR code with Expo Go on your phone.

## Feature Configuration

### OTP Authentication

The app supports OTP verification via SMS (Twilio) or Email (Resend).

#### SMS OTP (Twilio)

1. Sign up at [twilio.com](https://www.twilio.com/try-twilio)
2. Go to **Verify** → create a service → copy the **Service SID**
3. Copy your **Account SID** and **Auth Token** from the console
4. Add to backend `application-dev.yml`:

```yaml
twilio:
  account-sid: ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
  auth-token: your_auth_token
  verify:
    service-sid: VAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

#### Email OTP (Resend)

1. Sign up at [resend.com](https://resend.com)
2. Create an API key
3. Add to backend `application-dev.yml`:

```yaml
resend:
  api-key: re_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
  from: onboarding@resend.dev
```

**Note:** Without these configured, OTP will work in dev mode (code shown in UI).

### Payment Integration (Paystack)

1. Sign up at [paystack.co](https://paystack.co)
2. Go to Settings → API Keys
3. Copy your **Public Key**
4. Add to `.env.local`:

```env
EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

For backend payment processing, you'll need to add the **Secret Key** to the backend configuration.

### AI Scanning (Gemini)

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create an API key (free tier: 1,500 requests/day)
3. Add to `.env.local`:

```env
EXPO_PUBLIC_GEMINI_API_KEY=AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## Network Configuration

### Android Emulator

Use `10.0.2.2` as the host address:

```env
EXPO_PUBLIC_API_URL=http://10.0.2.2:8080/api/v1
```

### Physical Device on Same WiFi

1. Find your computer's IP address:
   - **Windows:** `ipconfig` (look for IPv4 Address)
   - **Mac/Linux:** `ip addr` (look for 192.168.x.x)
2. Update `.env.local`:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.XXX:8080/api/v1
```

### Production Deployment

For production, deploy the backend to a service like Render/Railway and update:

```env
EXPO_PUBLIC_API_URL=https://your-backend-url.com/api/v1
```

## Troubleshooting

### "Network request failed" Error

This usually means:
1. Backend is not running
2. Wrong API URL in `.env.local`
3. Device can't reach your computer (check WiFi)

**Solution:**
- Verify backend is running: `curl http://localhost:8080/api/v1/actuator/health`
- Check `.env.local` API_URL matches your setup
- Ensure device and computer are on same WiFi

### Scan Not Working

1. Check Gemini API key is set in `.env.local`
2. Verify backend has Gemini key configured in `application-dev.yml`
3. Check camera permissions are granted

### OTP Not Sending

1. Check Twilio/Resend credentials in backend config
2. Verify phone number format (include country code: +233...)
3. Check backend logs for errors

### Payment Not Working

1. Verify Paystack public key in `.env.local`
2. Check backend has Paystack secret key configured
3. Test in Paystack dashboard first

## Demo Accounts

For testing without full setup:

```
Email: ama.m@scanit.app
Password: password123
Role: Consumer
```

```
Email: kofi@scanit.app
Password: password123
Role: Seller
```

## Architecture Overview

### Frontend (React Native + Expo)
- **Framework:** Expo SDK 54 with Expo Router
- **State:** Zustand
- **Styling:** Custom theme with liquid glass design
- **AI:** Gemini Vision for product recognition
- **Payment:** Paystack integration

### Backend (Spring Boot)
- **Framework:** Spring Boot 3.x
- **Database:** H2 (dev) / PostgreSQL (prod)
- **Auth:** JWT with refresh tokens
- **OTP:** Twilio Verify (SMS) + Resend (Email)
- **AI:** Gemini Vision + DuckDuckGo search

### Key Services

- **Auth Service:** Authentication, OTP, password reset
- **Scan Service:** Product analysis, barcode scanning
- **Payment Service:** Paystack integration
- **AI Service:** Gemini Vision, DuckDuckGo search

## Development Tips

### Hot Reload

The frontend supports hot reload. Changes to `.env.local` require restarting the Expo server.

### Backend Debugging

Backend runs on port 8080. Access H2 console at:
```
http://localhost:8080/api/v1/h2-console
```

### Logs

- Frontend: Expo terminal
- Backend: Console or check `backend/logs/`

## Production Deployment

### Backend (Render/Railway)

1. Push code to GitHub
2. Connect repository to Render/Railway
3. Set environment variables:
   - `SPRING_PROFILES_ACTIVE=prod`
   - `DATABASE_URL` (PostgreSQL)
   - `JWT_SECRET` (generate with `openssl rand -hex 32`)
   - Twilio/Resend/Paystack keys

### Frontend (EAS Build)

```bash
npm install -g eas-cli
eas build:configure
eas build -p android --profile preview
```

## Support

For issues:
1. Check this guide's troubleshooting section
2. Review backend logs
3. Verify all environment variables are set
4. Ensure network connectivity between device and backend

## Security Notes

- Never commit `.env.local` or real API keys
- Use strong JWT secrets in production
- Enable HTTPS in production
- Rotate API keys regularly
- Keep dependencies updated
