# MUST KNOW — ScanIt Auth, Railway & Supabase

Everything you need to know to get authentication working end-to-end.  
Read this once before you touch any auth-related code or deploy anything.

---

## 1. How auth works in this project (the full picture)

```
Phone (Expo Go / APK)
  │
  │  POST /api/v1/auth/sign-up   (email + password)
  │  POST /api/v1/auth/sign-in
  │  POST /api/v1/auth/otp/send  (OTP delivery)
  │  POST /api/v1/auth/otp/verify
  │  POST /api/v1/auth/otp/reset-password
  │
  ▼
Spring Boot backend (Railway)
  │
  ├── issues JWT access token (1 hour) + refresh token (7 days)
  └── stores user in PostgreSQL (Supabase)
```

The mobile app never touches the database directly. Every auth operation goes through the Spring Boot API. JWTs are stored in `expo-secure-store` on the device — they survive app restarts.

**Auth flow summary:**

| Step | Endpoint | What happens |
|---|---|---|
| Sign up | `POST /auth/sign-up` | Creates user, returns JWT pair |
| Sign in | `POST /auth/sign-in` | Validates credentials, returns JWT pair |
| Google sign-in | `POST /auth/oauth/google` | Verifies Google ID token server-side, finds or creates user |
| Forgot password (OTP) | `POST /auth/otp/send` → `/otp/verify` → `/otp/reset-password` | 3-step flow |
| Refresh | `POST /auth/refresh-token` | Trades refresh token for a new access token |
| Get profile | `GET /auth/me` | Returns user from JWT (requires Bearer header) |

---

## 2. Demo / test accounts (seeded automatically on first boot)

```
Email:    ama.m@scanit.app
Password: password123
Role:     Consumer

Email:    kofi@scanit.app
Password: password123
Role:     Seller
```

These are created by the database seed on first launch. You can use any password ≥ 6 characters on the consumer account — the seed always re-hashes whatever is in `application-dev.yml`.

---

## 3. Railway — deploying the backend

Railway hosts the Spring Boot API. It auto-deploys from your GitHub repo on every push to `main`.

### 3a. First-time setup

1. Go to [railway.app](https://railway.app) → **New Project**
2. **Add a service → GitHub Repo** → pick this repo
3. Railway finds `backend/Dockerfile` automatically — confirm it
4. The health check path is already set in `railway.toml`:
   ```
   healthcheckPath = "/api/v1/actuator/health"
   ```

### 3b. Required environment variables (set in Railway → Variables tab)

| Variable | Value | Notes |
|---|---|---|
| `SPRING_PROFILES_ACTIVE` | `prod` | Switches to PostgreSQL, disables H2 |
| `DATABASE_URL` | `jdbc:postgresql://HOST:PORT/DBNAME` | Convert from Supabase connection string — see §4 |
| `DATABASE_USERNAME` | Supabase DB user | |
| `DATABASE_PASSWORD` | Supabase DB password | |
| `JWT_SECRET` | 64-char random hex | Generate: `openssl rand -hex 32` |
| `PORT` | *(set automatically by Railway)* | Do not set manually |

### 3c. Optional variables (auth features)

| Variable | Purpose | Where to get it |
|---|---|---|
| `RESEND_API_KEY` | Email OTP delivery | [resend.com](https://resend.com) → API Keys |
| `RESEND_FROM` | Sender address | e.g. `ScanIt <onboarding@resend.dev>` |
| `TWILIO_ACCOUNT_SID` | SMS OTP delivery | [twilio.com](https://twilio.com) console |
| `TWILIO_AUTH_TOKEN` | SMS OTP delivery | Twilio console |
| `TWILIO_VERIFY_SERVICE_SID` | SMS OTP delivery | Twilio → Verify → Services |
| `GOOGLE_OAUTH_WEB_CLIENT_ID` | Google Sign-In | Google Cloud Console |
| `GOOGLE_OAUTH_IOS_CLIENT_ID` | Google Sign-In | Google Cloud Console |
| `GOOGLE_OAUTH_ANDROID_CLIENT_ID` | Google Sign-In | Google Cloud Console |
| `COMMUNITY_WHATSAPP_URL` | WhatsApp invite on sign-up | Your WhatsApp group invite link |
| `MAIL_HOST` | Password reset emails | `smtp.gmail.com` |
| `MAIL_PORT` | Password reset emails | `587` |
| `MAIL_USERNAME` | Password reset emails | Your Gmail address |
| `MAIL_PASSWORD` | Password reset emails | Gmail App Password (not your real password) |
| `FRONTEND_URL` | Reset email links | e.g. `https://scanit.app` |

> **Nothing crashes if these are missing.** The backend starts fine without them and falls back to dev-mode OTPs (code is returned in the API response, logged to console, and auto-filled in the app).

### 3d. After deploying — get your backend URL

Railway → your service → **Settings → Networking → Generate Domain**

You'll get something like:
```
https://scanit-backend-production.up.railway.app
```

Test it immediately:
```bash
curl https://scanit-backend-production.up.railway.app/api/v1/actuator/health
# Expected: {"status":"UP"}
```

### 3e. Point the mobile app at Railway

Edit `.env.local` in the project root:
```env
EXPO_PUBLIC_API_URL=https://scanit-backend-production.up.railway.app/api/v1
```

Restart Expo: `npx expo start --clear`

---

## 4. Supabase — the PostgreSQL database

Supabase provides a managed PostgreSQL instance. The Spring Boot backend connects to it as a standard Postgres database — Supabase's own auth system is **not used** at all.

### 4a. Create the database

1. Go to [supabase.com](https://supabase.com) → **New project**
2. Choose a region close to your Railway deployment (e.g. both on US East or EU West)
3. Set a strong database password — save it somewhere safe
4. Wait ~2 minutes for provisioning

### 4b. Get the connection string

In Supabase → your project → **Settings → Database → Connection string**

Select **URI** mode. It looks like:
```
postgresql://postgres.PROJECTREF:PASSWORD@aws-0-us-east-1.pooler.supabase.com:5432/postgres
```

For Railway you need to split this into parts:

| Railway variable | Derived from Supabase URI |
|---|---|
| `DATABASE_URL` | `jdbc:postgresql://HOST:PORT/DBNAME` (replace `postgresql://` with `jdbc:postgresql://`, remove the `user:pass@` part) |
| `DATABASE_USERNAME` | The username part (before `:` in the URI user section) — usually `postgres.PROJECTREF` |
| `DATABASE_PASSWORD` | The password you set when creating the project |

**Example conversion:**
```
Supabase gives:
  postgresql://postgres.abcxyz:mypassword@aws-0-us-east-1.pooler.supabase.com:5432/postgres

Railway variables:
  DATABASE_URL      = jdbc:postgresql://aws-0-us-east-1.pooler.supabase.com:5432/postgres
  DATABASE_USERNAME = postgres.abcxyz
  DATABASE_PASSWORD = mypassword
```

### 4c. Allow Railway to connect

Supabase → your project → **Settings → Database → Connection pooling** — Supabase allows all external connections by default via the pooler. You do not need to whitelist Railway's IP.

If you use the **Direct connection** (port 5432) instead of the pooler (port 6543), you may need to add Railway's static IP to Supabase's allowed list. Use the **Transaction pooler** (port 6543) to avoid this.

### 4d. Tables and schema

The backend uses Spring Boot JPA with `ddl-auto: update` — **all tables are created automatically on first boot**. You do not write any SQL migrations. After the first successful deploy you'll see tables like `users`, `products`, `scans`, `notifications`, etc. in the Supabase Table Editor.

---

## 5. OTP authentication — how it really works

The app uses a 3-step flow for both sign-up verification and password reset.

### Email OTP (Resend) — recommended for getting started free

```
1. App calls  POST /auth/otp/send   { contact: "user@email.com", channel: "email", purpose: "signup" }
2. Backend generates a 6-digit code, stores it on the user record (hashed), sends it via Resend
3. User types the code in the app
4. App calls  POST /auth/otp/verify { contact, code, purpose }
5. Backend validates → clears the code → returns { resetToken } (for password reset only)
6. (Password reset only) App calls POST /auth/otp/reset-password { contact, resetToken, newPassword }
```

**Dev mode (no Resend key set):** the backend returns `{ devCode: "123456" }` in the `/otp/send` response and the app auto-fills it. You can complete the full OTP flow without any email provider.

### SMS OTP (Twilio Verify) — for phone number sign-up

Same flow but `channel: "sms"` and `contact` is a phone number like `+233201234567`.  
Twilio's Verify service handles code generation and delivery — the backend never sees the actual code when Twilio is configured, just calls `Verification.creator(...)` and `VerificationCheck.creator(...)`.

**Dev mode (no Twilio keys set):** same as email — `devCode` returned in response, logged to backend console.

### OTP code storage (important to understand)

The OTP is stored on the `users` table in three columns:
- `otp_code` — the plain 6-digit code (or `"twilio"` when Twilio is handling it)
- `otp_expiry` — `Instant` 10 minutes from send time
- `otp_purpose` — `"signup"` or `"reset-password"`

All three are cleared after a successful verify. An expired code throws `"OTP has expired. Please request a new one."` — the user must call `/otp/send` again.

---

## 6. Google Sign-In — what you need to set up

Google Sign-In requires OAuth Client IDs from Google Cloud Console. Until they're set, the **"Continue with Google"** button is hidden in the app (not just broken — actually hidden).

### Steps

1. Go to [console.cloud.google.com](https://console.cloud.google.com) → your project → **APIs & Services → Credentials**
2. Create an **OAuth consent screen** (External, add your email as test user during development)
3. Create three **OAuth 2.0 Client IDs**:

| Type | Where it's used | Authorized redirect URI |
|---|---|---|
| **Web application** | Expo Go proxy flow + backend token verification | `https://auth.expo.io/@YOUR_EXPO_USERNAME/scanit` |
| **Android** | Standalone Android build | Your app's SHA-1 fingerprint |
| **iOS** | Standalone iOS build | Your bundle ID |

4. Set in `.env.local` (mobile):
   ```env
   EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=161201380753-xxxxxxx.apps.googleusercontent.com
   ```

5. Set in Railway Variables (backend — all three):
   ```
   GOOGLE_OAUTH_WEB_CLIENT_ID=161201380753-xxxxxxx.apps.googleusercontent.com
   GOOGLE_OAUTH_IOS_CLIENT_ID=161201380753-yyyyyyy.apps.googleusercontent.com
   GOOGLE_OAUTH_ANDROID_CLIENT_ID=161201380753-zzzzzzz.apps.googleusercontent.com
   ```

> The backend verifies Google ID tokens locally using `GoogleIdTokenVerifier` (checks signature + audience). It does **not** call Google's `tokeninfo` endpoint, so there's no rate limit issue.

---

## 7. JWT tokens — how they work in the app

- **Access token** — short-lived (1 hour). Sent as `Authorization: Bearer <token>` on every API call.
- **Refresh token** — long-lived (7 days). Used to get a new access token without re-login.
- Both are stored in `expo-secure-store` (encrypted, device-only, survives app restarts).
- On app launch, `useAuthStore.initialize()` reads both from secure storage and restores the session.
- The `api` utility in `utils/api.ts` auto-attaches the access token to every request that doesn't have `skipAuth: true`.

**Token refresh** is currently manual — if an API call returns `401`, you need to call `POST /auth/refresh-token` yourself and retry. This is not yet automated in the app.

---

## 8. Roles — Consumer vs Seller

| | Consumer | Seller |
|---|---|---|
| Can scan products | ✅ | ✅ |
| Has scan history | ✅ | ✅ |
| Can save products | ✅ | ✅ |
| Has seller inventory tab | ❌ | ✅ |
| Subscription required for full scans | ✅ | ❌ |

Role is set at sign-up and stored in the JWT. The mobile app reads `user.role` from the auth store to show/hide role-specific UI. The backend also checks the role via `@PreAuthorize` on seller-only endpoints.

---

## 9. Passwords

- Stored as BCrypt hashes in PostgreSQL — never in plain text, anywhere.
- Minimum 6 characters (enforced on both the mobile client and backend validation).
- Google Sign-In accounts get a random UUID as their BCrypt password hash — they cannot log in with email/password until they go through "forgot password" to set one.
- The JWT secret (`JWT_SECRET`) is completely separate from passwords. It's used to sign tokens, not to protect user passwords.

---

## 10. Common mistakes and how to avoid them

**"Backend offline" banner in the app**
→ Your phone is on mobile data or a different Wi-Fi than your laptop. Either connect to the same Wi-Fi, or deploy to Railway and use the Railway URL in `.env.local`.

**"Invalid or expired reset token" error**
→ The reset token from `/otp/verify` expires in 15 minutes. Restart the forgot-password flow.

**"An account with that email already exists" on sign-up**
→ You (or the OTP flow) already created a placeholder user for that email. Either sign in, or use forgot-password to recover.

**OTP always says "Invalid verification code"**
→ In dev mode, the code is always `123456`. In production, check that your Resend key and "from" address are set correctly, and that the Resend domain is verified.

**Google Sign-In button doesn't appear**
→ `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` is not set in `.env.local`. The button is intentionally hidden (not shown as broken) until a client ID is configured.

**Railway deploy fails at Maven build**
→ Check `backend/pom.xml` for Java version mismatch. The project requires Java 17. Railway's default Java is 17+, but double-check by looking at the build logs.

**Supabase connection refused from Railway**
→ Make sure you're using the **Transaction Pooler** URL (port 6543) not the Direct connection (port 5432), or add Railway's static outbound IP to Supabase's network allowlist.

**JWT_SECRET not set → app won't start**
→ `JWT_SECRET` is required with no default. The app will fail to boot with a clear error. Generate it with `openssl rand -hex 32` and add it to Railway variables.

---

## 11. Quick-start checklist

Use this when setting up from scratch:

- [ ] Push code to GitHub
- [ ] Create Railway project → add GitHub repo service
- [ ] Create Supabase project → copy connection details
- [ ] Add all required Railway variables (§3b)
- [ ] Add Supabase connection variables to Railway (§4b)
- [ ] Get Railway backend URL → paste into `.env.local` as `EXPO_PUBLIC_API_URL`
- [ ] Run `npx expo start --clear` → scan QR → test sign-up
- [ ] (Optional) Set `RESEND_API_KEY` for real email OTPs
- [ ] (Optional) Set Twilio vars for SMS OTPs
- [ ] (Optional) Set Google OAuth client IDs for "Continue with Google"
