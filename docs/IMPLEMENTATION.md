# ScanIt — Implementation Roadmap

> Architecture review, SWOT analysis, free-tier stack, improvements, and Khaya AI integration plan.  
> Last updated: June 2026

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [SWOT Analysis](#swot-analysis)
3. [Improvements (Prioritized)](#improvements-prioritized)
4. [Free Tiers Catalog](#free-tiers-catalog)
5. [Khaya AI Integration](#khaya-ai-integration)
6. [Cost Strategy](#cost-strategy)
7. [Rollout Phases](#rollout-phases)

---

## Architecture Overview

### System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    Mobile App (Expo 54 / RN 0.81)                 │
│                                                                 │
│  Expo Router          Zustand Stores         Services           │
│  ├─ (onboarding)      ├─ auth.ts             ├─ auth.ts         │
│  ├─ (auth)            ├─ scan.ts             ├─ scan.ts         │
│  ├─ (tabs)            ├─ saved.ts            ├─ products.ts     │
│  └─ modal screens     └─ products.ts         └─ ai.ts           │
│                                                                 │
│  Local Storage: SecureStore (JWT) + AsyncStorage (cache)        │
│  API Client: utils/api.ts (auto-refresh, warmUpBackend)         │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS + JWT
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              Spring Boot 3.2 Backend (/api/v1)                  │
│                                                                 │
│  Controllers: Auth, Scan, Product, Seller, User, Notification    │
│  Services:    AuthService, ScanService, GeminiService, ...      │
│  Security:    JWT + BCrypt + OTP (Twilio / Resend)              │
│  Database:    H2 (dev) · PostgreSQL (prod)                      │
└────────┬──────────────────┬──────────────────┬──────────────────┘
         │                  │                  │
         ▼                  ▼                  ▼
   Google Gemini      OpenRouter         Open Food Facts
   (vision + search)  (fallback)         (barcode lookup)
```

### Mobile Layers

| Layer | Technology | Role |
|-------|------------|------|
| **Routing** | Expo Router (file-based) | `(onboarding)` → `(auth)` → `(tabs)` + modal screens |
| **State** | Zustand | `auth`, `scan`, `saved`, `products` |
| **API** | `utils/api.ts` | JWT in SecureStore, auto-refresh on 401, `warmUpBackend()` for cold starts |
| **Offline** | AsyncStorage | Scan history, saved products, daily quota cache |
| **UI** | Custom theme + Reanimated + expo-blur | Glass tab bar (iOS), animated auth backgrounds |

### Backend Layers

| Layer | Technology | Role |
|-------|------------|------|
| **API** | Spring Boot REST | `/auth`, `/scans`, `/products`, `/sellers`, `/notifications` |
| **Security** | JWT + BCrypt + stateless sessions | OTP via Twilio Verify / Resend |
| **AI** | `GeminiService` | Vision identify → Google Search grounding for Ghana prices/sellers |
| **Data** | JPA/Hibernate | Products, scans, sellers, saved items, inventory |
| **Deploy** | Render (live) / Railway (docs) | Docker, PostgreSQL prod, H2 dev |

### Core Scan Flow

**Photo mode**
```
Camera → FormData multipart → POST /scans/analyze
  → Gemini vision (identify product)
  → Gemini grounded search (Ghana prices + sellers)
  → DB match or auto-create product
  → ScanResult returned to app
```

**Barcode mode**
```
expo-camera auto-detect → GET /scans/barcode/{code}
  → Local DB lookup
  → Open Food Facts fallback (if not in DB)
  → Gemini research (optional)
  → ScanResult returned to app
```

**Client AI (`services/ai.ts`)**
- Hugging Face models for semantic search / image similarity
- Used by `productService.semanticSearch()` and `findSimilarByImage()`
- **Not** wired into the main scan path (backend Gemini handles that)

### Key Files

| File | Purpose |
|------|---------|
| `app/_layout.tsx` | Root layout, store initialization |
| `app/index.tsx` | Entry routing + backend warm-up |
| `utils/api.ts` | Authenticated HTTP client |
| `stores/scan.ts` | Scan state, quota, history |
| `services/scan.ts` | Image/barcode scan API calls |
| `backend/.../GeminiService.java` | Vision + grounded price research |
| `backend/.../ScanService.java` | Scan orchestration |
| `backend/.../SecurityConfig.java` | JWT + public endpoint rules |

---

## SWOT Analysis

### Strengths

| Area | Detail |
|------|--------|
| **Clear separation of concerns** | Screens → Zustand → services → API client. Easy to follow and extend. |
| **Modern mobile stack** | Expo 54, React 19, New Architecture enabled, typed routes, SecureStore for tokens. |
| **Solid backend foundation** | Spring Security, JWT refresh, global exception handler, actuator health checks, seeded demo data. |
| **Smart AI architecture** | Two-step pipeline: vision identify → grounded search for real Ghana marketplace prices (Jumia, Tonaton, Kikuu, local markets). OpenRouter fallback. |
| **Offline resilience** | Cached history/saved products, graceful degradation when backend is down, backend warm-up on app launch. |
| **Ghana-specific positioning** | GHS pricing, local sellers/markets, consumer + seller roles, WhatsApp/call seller links. |
| **Monetization groundwork** | 5 free scans/day, paywall UI, premium flag in store — freemium model is sketched out. |
| **Free-tier friendly** | Most external deps have generous free plans (see [Free Tiers Catalog](#free-tiers-catalog)). |

### Weaknesses

| Area | Detail |
|------|--------|
| **Scan quota is client-only** | `FREE_SCANS_PER_DAY` lives in AsyncStorage — trivially bypassable. No server-side enforcement. |
| **Paywall not connected** | `PaywallModal` opens a URL; no Stripe, RevenueCat, or App Store billing. |
| **AI pipeline split / stale** | `services/ai.ts` describes a 6-model on-device pipeline, but `scanService.analyzeImage` only hits the backend. Docs (`AI_ARCHITECTURE.md`, `READ.md`) are partly out of date. |
| **HF token exposed client-side** | `EXPO_PUBLIC_HF_TOKEN` is bundled into the app — anyone can extract and abuse it. AI calls should be backend-only. |
| **Almost no tests** | Backend: one `contextLoads` test. Mobile: zero test setup. |
| **Production DB schema risk** | `ddl-auto: update` in prod — risky for real launches; prefer Flyway/Liquibase migrations. |
| **Location permission unused** | `NSLocationWhenInUseUsageDescription` is declared, settings has a toggle, but `expo-location` isn't installed — "nearby sellers" isn't GPS-based. |
| **Render cold starts** | Free tier sleeps after ~15 min; first request can take ~30s even with `warmUpBackend()`. |
| **CORS locked to localhost** | Fine for native apps, but blocks any web deployment without config changes. |
| **Duplicate components** | `AnimatedAuthBackground.tsx` and `AuthMotionBackground.tsx` — merge candidate. |
| **No `eas.json`** | Production builds (APK/IPA) aren't configured yet despite TFLite dev-build notes in `ai.ts`. |

### Opportunities

| Area | Detail |
|------|--------|
| **Ghana market gap** | No strong local product-scan + price-compare app — first-mover potential. |
| **Seller marketplace** | Seller role + inventory already exist; could become a two-sided platform. |
| **On-device TFLite** | `mobilenet_v2.tflite` is bundled; EAS dev build would cut API costs and improve offline scans. |
| **Push notifications** | Price alerts entity exists; adding Expo Notifications + backend cron would unlock retention. |
| **Barcode expansion** | Open Food Facts is free; adding UPC/EAN APIs or a local Ghana product DB would improve coverage. |
| **RevenueCat freemium** | Free tier up to $2.5k MTR; fits the existing paywall UI. |
| **Caching layer** | Redis (Upstash free tier) for scan results / product research would cut Gemini costs and latency. |
| **Analytics** | PostHog or Expo Insights (free tiers) to track scan success rate, drop-off, paywall conversion. |
| **Khaya AI localization** | Ghana-built language tech — Twi/Ga/Ewe UI, voice search, accessibility TTS. Strong differentiator. |

### Threats

| Area | Detail |
|------|--------|
| **AI API cost / quota** | Gemini free tier: ~1,500 req/day. Each photo scan = 2 calls (vision + research). ~750 scans/day max before paid. |
| **AI hallucinated prices** | Grounded search helps, but prices can still be wrong — trust/reputation risk in a price-comparison app. |
| **Render free tier limits** | 750 hrs/month, sleeps on idle, limited RAM — bad UX at scale. |
| **Competition** | Google Lens, Amazon product search, Jumia's own app — need a clear Ghana-local edge. |
| **Security** | Client-side quota bypass, exposed HF token, JWT secret management on Render — all need hardening before public launch. |
| **App store rejection risk** | Location permission without real use, incomplete IAP if paywall goes live without proper billing. |
| **Dependency on third-party AI** | Gemini/OpenRouter/Khaya policy or pricing changes could break core functionality overnight. |

---

## Improvements (Prioritized)

### Critical — before real users

| # | Task | Details |
|---|------|---------|
| 1 | **Server-side scan quota** | Track scans per user per day in backend; reject over-limit with HTTP 429. `User.scansCount` field already exists. |
| 2 | **Move all AI keys to backend** | Remove `EXPO_PUBLIC_HF_TOKEN`; route HF/OpenRouter/Gemini calls only through Spring Boot. |
| 3 | **Fix cold-start UX** | Show "Waking up server…" on auth/scan screens; consider UptimeRobot (free) to ping Render every 14 min, or upgrade to Railway Hobby ($5/mo, always-on). |
| 4 | **DB migrations** | Replace `ddl-auto: update` with Flyway for prod. |

### High value — stability & polish

| # | Task | Details |
|---|------|---------|
| 5 | **Wire payments** | RevenueCat (free until $2.5k revenue) + existing `PaywallModal` + `isPremium` in scan store. |
| 6 | **Push notifications** | Expo Notifications + backend price-alert job. |
| 7 | **Real location** | Add `expo-location`, sort sellers by distance, or remove the unused permission. |
| 8 | **Error boundaries + Sentry** | Sentry free tier: 5k errors/month. |
| 9 | **Consolidate AI docs & code** | Either re-integrate client `aiService` into scan for offline mode, or remove dead code and update docs. |
| 10 | **Add `eas.json`** | Enable dev/production builds for TFLite and store submission. |

### Nice to have

| # | Task | Details |
|---|------|---------|
| 11 | **Image CDN** | Cloudinary free tier (25 credits/mo) for scan thumbnails instead of storing `"upload"` strings. |
| 12 | **Request caching** | Cache Gemini research by product name hash (Redis/Upstash). |
| 13 | **Offline scan queue** | Queue scans when offline, sync when backend returns. |
| 14 | **React Query** | Better cache invalidation than manual AsyncStorage merges. |
| 15 | **E2E tests** | Maestro (free) for auth + scan smoke tests. |

---

## Free Tiers Catalog

### Currently Used

| Service | Free Tier | Used For | Env Var |
|---------|-----------|----------|---------|
| **Google Gemini API** | ~1,500 requests/day (Flash) | Product vision + grounded price research | `GEMINI_API_KEY` |
| **OpenRouter** | Free models (`gemini-2.5-flash:free`, `gemini-2.0-flash-lite:free`) | Fallback when Gemini quota hit | `OPENROUTER_API_KEY` |
| **Hugging Face Inference** | Free with rate limits | Client semantic search *(move server-side)* | `EXPO_PUBLIC_HF_TOKEN` |
| **Open Food Facts** | Unlimited, free | Barcode product lookup | — |
| **Resend** | 3,000 emails/month | Email OTP | `RESEND_API_KEY` |
| **Twilio Verify** | ~$15 trial credit (~150 SMS) | SMS OTP | `TWILIO_*` |
| **Render** | 750 hrs/month web + free Postgres | Current backend host | — |

### Available But Not Yet Used

| Service | Free Tier | Potential Use |
|---------|-----------|---------------|
| **Khaya AI** | 100 calls/month (Developer) | Twi/Ga/Ewe translation, ASR, TTS |
| **Railway** | $5 trial credit; Postgres 1GB free | Alternative backend (docs already written) |
| **Expo / EAS** | Free dev builds; limited free cloud builds | App distribution |
| **RevenueCat** | Free until $2.5k MTR | In-app subscriptions |
| **Sentry** | 5k errors/month | Crash reporting |
| **PostHog** | 1M events/month | Product analytics |
| **Upstash Redis** | 10k commands/day | Scan/product cache |
| **UptimeRobot** | 50 monitors, 5-min interval | Keep Render awake |
| **Cloudinary** | 25 credits/month | Image hosting |
| **Supabase** | 500MB DB, 50k MAU | Alternative to Render Postgres |

### Gemini Cost Math

Each photo scan ≈ **2 API calls** (identify + research):

| Scale | Daily scans | Gemini calls/day | Fits free tier? |
|-------|-------------|------------------|-----------------|
| Dev/testing | 10 | 20 | Yes |
| Early beta (100 DAU × 5 scans) | 500 | 1,000 | Yes (barely) |
| Growth (1,000 DAU × 5 scans) | 5,000 | 10,000 | No — need paid plan or aggressive caching |

---

## Khaya AI Integration

### What Khaya Does (and Doesn't)

Khaya AI ([khaya.ai](https://www.khaya.ai)) by GhanaNLP is an **African language NLP platform**. It does **not** do product image recognition.

| Capability | API | ScanIt Use Case |
|------------|-----|-----------------|
| **Translation** | `POST /v1/translate` | Localize scan results, UI, help text |
| **ASR** | `POST /asr/v1/transcribe` | Voice search, voice product queries |
| **TTS** | `POST /tts/v1/tts` | Accessibility — "read result aloud" |

**Gemini** = identify products + research Ghana prices  
**Khaya** = make ScanIt work in local languages  
They complement each other.

### Khaya Pricing

| Plan | Price | Monthly Quota | APIs Included |
|------|-------|---------------|---------------|
| **Developer (Free)** | $0 | 100 calls | Testing only |
| **Basic** | $14.95 | 3,000 calls | Translation + ASR |
| **Standard** | $89.95 | 20,000 calls | Translation + ASR v2 + TTS |
| **Enterprise** | $749 | 200,000 calls | Large-scale |

**Activation:**
1. Sign up at [translation.ghananlp.org](https://translation.ghananlp.org/)
2. Subscribe to Developer plan (credit card required for activation, no charge)
3. No card? Email **subscriptions@khaya.ai** for manual activation
4. Copy API key from portal → set as `KHAYA_API_KEY` on backend

### API Reference

**Base URL:** `https://translation-api.ghananlp.org`  
**Auth header:** `Ocp-Apim-Subscription-Key: YOUR_KEY`  
**Official SDK:** [github.com/Khaya-AI/khaya-sdk](https://github.com/Khaya-AI/khaya-sdk) (Python — wrap in Java/OkHttp for ScanIt)

#### Translation

```http
POST https://translation-api.ghananlp.org/v1/translate
Ocp-Apim-Subscription-Key: YOUR_KEY
Content-Type: application/json

{ "in": "Samsung Galaxy A54", "lang": "en-tw" }
```

Response: translated string (plain JSON text).

#### Speech Recognition (ASR)

```http
POST https://translation-api.ghananlp.org/asr/v1/transcribe?language=tw
Ocp-Apim-Subscription-Key: YOUR_KEY
Content-Type: audio/wav

<raw audio bytes>
```

Response: transcribed text.

#### Text-to-Speech (TTS) — Standard plan only

```http
POST https://translation-api.ghananlp.org/tts/v1/tts
Ocp-Apim-Subscription-Key: YOUR_KEY
Content-Type: application/json

{ "text": "Me ho yɛ", "language": "twi", "speaker": "female" }
```

Response: audio bytes (MP3).

#### Supported Ghanaian Languages

| Code | Language | Translation | ASR | TTS |
|------|----------|-------------|-----|-----|
| `tw` / `twi` | Twi (Asante) | ✓ | ✓ | ✓ |
| `atw` | Akuapem Twi | — | ✓ | ✓ |
| `gaa` | Ga | ✓ | ✓ | ✓ |
| `ee` / `ewe` | Ewe | ✓ | ✓ | ✓ |
| `dag` | Dagbani | ✓ | ✓ | ✓ |
| `fat` | Fante | ✓ | ✓ | ✓ |
| `dga` | Dagaare | — | ✓ | ✓ |
| `gur` | Gurene | ✓ | ✓ | ✓ |
| `nzi` | Nzema | — | ✓ | ✓ |
| `kpo` / `pcm` | Ghanaian Pidgin | ✓ | ✓ | ✓ |
| `yo` / `yor` | Yoruba | ✓ | ✓ | ✓ |

Language pair format for translation: `"en-tw"`, `"tw-en"`, `"en-gaa"`, etc.

### Where Khaya Fits in ScanIt

```
┌──────────────────────────────────────────────────────────┐
│  EXISTING — keep as-is                                   │
│  Camera → Gemini Vision → Grounded price research        │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│  NEW — Khaya localization layer                          │
│                                                          │
│  Scan result (EN) ──→ Khaya translate en→tw ──→ UI       │
│  Mic button ──→ Khaya ASR tw→text ──→ product search   │
│  Scan result (EN) ──→ Khaya TTS ──→ "read aloud"         │
│  Onboarding slides ──→ Khaya translate (cache forever)   │
└──────────────────────────────────────────────────────────┘
```

#### Feature Priority (by impact vs. quota cost)

| Priority | Feature | Khaya calls per use | Cacheable? |
|----------|---------|---------------------|------------|
| 1 | Language setting in Profile/Settings | 0 | — |
| 2 | Localized scan results (name, description, specs) | 1–5 per unique product | Yes |
| 3 | Voice search on Explore tab | 1 per utterance | Partially |
| 4 | Onboarding in Twi | ~10 one-time | Yes (forever) |
| 5 | TTS "read result" (premium/accessibility) | 1 per read | Yes |

#### What NOT to use Khaya for

- Product image recognition → Gemini
- Barcode lookup → Open Food Facts + local DB
- Price research → Gemini grounded search

### Backend Implementation

#### 1. Configuration

```yaml
# backend/src/main/resources/application.yml
khaya:
  api-key: ${KHAYA_API_KEY:}
  base-url: https://translation-api.ghananlp.org
```

```bash
# Render / Railway environment
KHAYA_API_KEY=your_subscription_key_here
```

#### 2. KhayaService.java

Create `backend/src/main/java/com/scanit/backend/service/KhayaService.java` following the same OkHttp pattern as `GeminiService.java`:

```java
@Service
@Slf4j
public class KhayaService {

    @Value("${khaya.api-key:}") private String apiKey;
    @Value("${khaya.base-url}") private String baseUrl;

    private final OkHttpClient http = new OkHttpClient.Builder()
            .callTimeout(30, TimeUnit.SECONDS).build();
    private final ObjectMapper mapper = new ObjectMapper();
    private final TranslationCacheRepository cacheRepo;

    public String translate(String text, String languagePair) {
        // 1. Check cache
        String cached = cacheRepo.find(text, languagePair);
        if (cached != null) return cached;

        // 2. Call Khaya API
        String body = mapper.writeValueAsString(Map.of("in", text, "lang", languagePair));
        Request req = new Request.Builder()
                .url(baseUrl + "/v1/translate")
                .addHeader("Ocp-Apim-Subscription-Key", apiKey)
                .post(RequestBody.create(body, MediaType.get("application/json")))
                .build();

        try (Response resp = http.newCall(req).execute()) {
            if (!resp.isSuccessful()) throw new BadRequestException("Translation failed");
            String translated = resp.body().string();
            cacheRepo.save(text, languagePair, translated);
            return translated;
        }
    }

    public String transcribe(byte[] audioBytes, String language) { /* ASR endpoint */ }
    public byte[] synthesize(String text, String language) { /* TTS endpoint */ }
}
```

#### 3. Translation Cache Table

```sql
CREATE TABLE translation_cache (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_hash   VARCHAR(64) NOT NULL,   -- SHA-256 of source text
    source_text   TEXT NOT NULL,
    language_pair VARCHAR(10) NOT NULL,   -- e.g. "en-tw"
    translated    TEXT NOT NULL,
    created_at    TIMESTAMP DEFAULT NOW(),
    UNIQUE(source_hash, language_pair)
);
```

Entity: `TranslationCache.java` + `TranslationCacheRepository.java`

#### 4. New API Endpoints

```
GET  /api/v1/localization/languages
     → { languages: [{ code: "tw", name: "Twi" }, ...] }

POST /api/v1/localization/translate
     → { text: "Samsung Galaxy A54", targetLang: "tw" }
     ← { text: "Samsung Galaxy A54", translated: "...", lang: "tw" }

POST /api/v1/localization/transcribe
     → multipart audio file + language param
     ← { text: "transcribed query" }

POST /api/v1/localization/speak
     → { text: "...", language: "tw" }
     ← audio/mpeg bytes (Standard plan only)
```

Controller: `LocalizationController.java`  
Wire through `KhayaService` with cache lookup before every external call.

#### 5. Quota Guard

Track monthly Khaya usage in DB or Redis:

```java
if (khayaUsageRepo.monthlyCount() >= monthlyLimit) {
    // Serve cached translations only; return English fallback for uncached
    log.warn("Khaya monthly quota reached — cache-only mode");
}
```

Increment counter only on cache misses (actual API calls).

### Mobile Implementation

#### 1. Types

```typescript
// types/index.ts
export type AppLanguage = 'en' | 'tw' | 'gaa' | 'ee' | 'dag' | 'fat' | 'kpo';

export interface User {
  // ...existing fields
  preferredLanguage?: AppLanguage;
}
```

#### 2. Localization Service

```typescript
// services/localization.ts
import { api } from '@/utils/api';

export const localizationService = {
  async getLanguages() {
    return api.get<{ code: string; name: string }[]>('/localization/languages');
  },

  async translate(text: string, targetLang: string) {
    return api.post<{ translated: string }>('/localization/translate', { text, targetLang });
  },

  async transcribe(audioUri: string, language: string) {
    const formData = new FormData();
    formData.append('audio', { uri: audioUri, name: 'audio.wav', type: 'audio/wav' } as any);
    formData.append('language', language);
    return api.postForm<{ text: string }>('/localization/transcribe', formData);
  },
};
```

#### 3. Settings — Language Picker

Update `app/settings.tsx`:

```typescript
const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'tw', label: 'Twi' },
  { code: 'gaa', label: 'Ga' },
  { code: 'ee', label: 'Ewe' },
  { code: 'fat', label: 'Fante' },
  { code: 'kpo', label: 'Pidgin' },
];
```

Save `preferredLanguage` to user profile via `PUT /users/me`.

#### 4. Localized Scan Results

Update `app/scan-result.tsx`:

```typescript
const { user } = useAuthStore();
const lang = user?.preferredLanguage ?? 'en';

useEffect(() => {
  if (lang === 'en' || !result) return;
  localizationService.translate(result.product.name, lang)
    .then(r => setLocalizedName(r.translated));
  // Batch: translate description + specs in one backend call if possible
}, [result, lang]);
```

Show localized text with a small language badge; fall back to English on error.

#### 5. Voice Search (Phase 2)

Add mic button to `app/(tabs)/explore.tsx`:

```typescript
import { Audio } from 'expo-av';

async function handleVoiceSearch() {
  const recording = await Audio.Recording.createAsync(/* ... */);
  // ... stop recording, get URI
  const { text } = await localizationService.transcribe(uri, user.preferredLanguage);
  productService.semanticSearch(text); // existing BERT/HF search
}
```

Requires `expo-av` package.

### Quota Math With Caching

**Without cache (bad):**
```
100 users × 5 scans/day × 5 strings/scan = 2,500 Khaya calls/day
→ Basic plan ($15) exhausted in 1 day
```

**With cache (good):**
```
~500 unique product names × 1 call × 3 languages = 1,500 calls (one-time)
~200 UI strings × 3 languages = 600 calls (one-time)
Voice search: 1 call per unique utterance
→ Basic plan ($15/mo) supports a real beta
```

---

## Cost Strategy

### Current Stack (Free)

```
Render (backend + Postgres)     $0
Gemini API (1,500 req/day)      $0
OpenRouter (fallback)           $0
Resend (3,000 emails/mo)        $0
Open Food Facts                 $0
Hugging Face Inference          $0
─────────────────────────────────
Total                           $0/month
```

### Recommended Upgrade Path

| Stage | Services | Monthly Cost |
|-------|----------|--------------|
| **Dev / demo** (now) | Render free + Gemini free + Khaya Developer free | $0 |
| **Private beta** (~50 users) | Railway Hobby ($5) + Khaya Basic ($15) + UptimeRobot | ~$20 |
| **Public launch** | Railway + Khaya Basic + Sentry + PostHog | ~$25–35 |
| **Growth** | Paid Gemini + Khaya Standard (TTS) + Redis cache + CDN | ~$100–150 |

### Partnership Opportunity

Khaya AI is based in **Cape Coast, Ghana**. ScanIt is a Ghana-focused product scanner. Worth reaching out to **info@khaya.ai** or **subscriptions@khaya.ai** for:
- Education/startup quota beyond free tier
- Co-marketing ("ScanIt powered by Khaya AI")
- Early access to new languages (Frafra, Buli, etc.)

---

## Rollout Phases

### Phase 0 — Hardening (before any new features)

- [ ] Server-side scan quota enforcement
- [ ] Move `EXPO_PUBLIC_HF_TOKEN` to backend
- [ ] Flyway DB migrations for prod
- [ ] Cold-start UX ("Waking up server…")
- [ ] Remove or use location permission

**Khaya plan needed:** None  
**Estimated effort:** 3–5 days

### Phase 1 — Khaya Translation (localization MVP)

- [ ] Sign up for Khaya Developer free tier
- [ ] `KhayaService.java` + `TranslationCache` entity
- [ ] `LocalizationController` endpoints
- [ ] Language picker in Settings
- [ ] Localized scan results on `scan-result.tsx`
- [ ] Translate onboarding slides (cache forever)

**Khaya plan needed:** Developer Free (100 calls — dev only)  
**Estimated effort:** 4–6 days

### Phase 2 — Voice & Payments

- [ ] Voice search via Khaya ASR on Explore tab
- [ ] Upgrade to Khaya Basic ($15/mo)
- [ ] RevenueCat integration + wire `PaywallModal`
- [ ] Server-side premium flag (`isPremium` on User entity)
- [ ] Push notifications for price alerts

**Khaya plan needed:** Basic ($14.95/mo)  
**Estimated effort:** 5–7 days

### Phase 3 — Production Launch

- [ ] `eas.json` + production APK/IPA builds
- [ ] Sentry crash reporting
- [ ] PostHog analytics
- [ ] Khaya TTS "read result aloud" (Standard plan)
- [ ] Redis cache for Gemini research results
- [ ] App Store / Play Store submission

**Khaya plan needed:** Standard ($89.95/mo) for TTS  
**Estimated effort:** 7–10 days

### Phase 4 — Scale & Marketplace

- [ ] On-device TFLite inference (EAS dev build)
- [ ] Seller marketplace features (inventory, verified sellers)
- [ ] Local Ghana product database (beyond Open Food Facts)
- [ ] Offline scan queue + sync
- [ ] Maestro E2E test suite

**Estimated effort:** Ongoing

---

## Quick Reference

### Environment Variables (Backend)

```bash
# Existing
JWT_SECRET=...
GEMINI_API_KEY=...
OPENROUTER_API_KEY=...
DATABASE_URL=...
RESEND_API_KEY=...
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_VERIFY_SERVICE_SID=...

# New (Khaya)
KHAYA_API_KEY=...
```

### Environment Variables (Mobile)

```bash
# Existing
EXPO_PUBLIC_API_URL=https://scanit-raij.onrender.com/api/v1

# Remove (move to backend)
# EXPO_PUBLIC_HF_TOKEN=...  ← DELETE after Phase 0
```

### Key Contacts

| Service | Contact | Purpose |
|---------|---------|---------|
| Khaya AI | info@khaya.ai | Partnership, support |
| Khaya AI | subscriptions@khaya.ai | Manual free-tier activation (no card) |
| Khaya AI Portal | translation.ghananlp.org | API keys, usage reports |

### Related Docs

| File | Contents |
|------|----------|
| `docs/DEPLOYMENT.md` | Railway/Render deployment guide |
| `docs/AI_ARCHITECTURE.md` | AI model pipeline (partially outdated) |
| `docs/TODO.md` | Feature backlog and API alternatives |
| `docs/SETUP.md` | Local dev setup |
| `README.md` | Quick start + OTP setup |

---

*This document should be updated as phases are completed. Check off items in [Rollout Phases](#rollout-phases) and adjust cost estimates based on actual usage.*
