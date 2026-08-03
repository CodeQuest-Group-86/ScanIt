# Running ScanIt

Everything you need to get the app up and running after pulling the repo.

---

## Prerequisites

- **Node.js 18+** — [nodejs.org](https://nodejs.org)
- **Expo Go** — install on your phone from the App Store or Google Play

---

## 1. Install Dependencies

```bash
cd scanit
npm install
```

---

## 2. Start the Dev Server

```bash
npx expo start
```

Scan the QR code shown in the terminal with the **Expo Go** app on your phone.

---

## 3. Fix "Backend Offline" (Phone on Same Wi-Fi)

The AI scanning feature works without a backend. However, prices and seller info require the backend to be reachable.

**Find your PC's local IP on Windows:**

```bash
ipconfig
# Look for: IPv4 Address . . . . . . . . . . : 192.168.x.x
```

**Create a `.env.local` file inside the `scanit/` folder:**

```bash
# scanit/.env.local
EXPO_PUBLIC_API_URL=http://YOUR_IP_HERE:8080/api/v1
```

Replace `YOUR_IP_HERE` with your actual IPv4 address. Your phone and PC must be on the same Wi-Fi. Restart the Expo dev server after saving.

---

## 4. OTP Setup (Sign-up & Password Reset)

OTP credentials go in the **backend's** `application.properties` — never in the mobile app.

### Option A — SMS via Twilio Verify (free trial ~150 SMS)

1. Sign up at [twilio.com](https://www.twilio.com/try-twilio)
2. Go to **Verify** → create a service → copy the **Service SID**
3. Copy your **Account SID** and **Auth Token**
4. Add to `application.properties`:

```properties
twilio.account-sid=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
twilio.auth-token=your_auth_token
twilio.verify.service-sid=VAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Option B — Email via Resend (free: 3,000 emails/month, no card)

1. Sign up at [resend.com](https://resend.com)
2. Create an API key
3. Add to `application.properties`:

```properties
resend.api-key=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
resend.from=onboarding@resend.dev
```

---

## 5. Quick Test — Demo Account

Skip OTP setup and log in immediately with:

```
Email:    ama.m@scanit.app
Password: password123   (any 6+ characters works)
```

---

## Backend Endpoints Reference

The Spring Boot backend must expose these three endpoints for OTP to work:

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/v1/auth/otp/send` | Send OTP via SMS or email |
| POST | `/api/v1/auth/otp/verify` | Verify OTP code |
| POST | `/api/v1/auth/otp/reset-password` | Set new password |

---

## Summary of Commands

```bash
# 1. Move into the project
cd scanit

# 2. Install packages
npm install

# 3. Start Expo dev server
npx expo start

# 4. Find your local IP (Windows)
ipconfig
```
