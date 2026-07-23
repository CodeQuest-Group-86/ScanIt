# Update — Price Alerts, Offline Barcode Cache, Community Counterfeit Reporting (2026-07-23)

Three features added on top of everything below: live price-drop notifications,
an offline-first barcode cache, and community counterfeit reporting. This
section covers all three; the 2026-07-21 report further down is unchanged
history.

---

## 1. Price-drop alerts

The schema already had a `PriceAlert` entity and a working `GET
/notifications/price-alerts` endpoint, and `notifications.tsx` already had
icon/color mappings for a `price_alert` notification type — none of it was
ever wired up. Nothing in the codebase ever created a `PriceAlert` row or a
`price_alert`-typed `Notification`.

**What I added:**
- `SavedProductRepository.findByProduct(Product)` — needed to find who to
  notify; didn't exist before (only the reverse lookup, by user, existed).
- New `PriceAlertService.checkAndNotify(product, oldPrice, newPrice)` — for
  every user who has the product saved, records a `PriceAlert` row (drop
  amount + percent) and sends a real notification via
  `NotificationService.notify(...)` (in-app + push, reusing the pipeline from
  the previous session's work).
- Wired into `ScanService.analyzeImage`: prices now refresh on **every** scan
  (previously only when the stored price was exactly 0), and if the fresh
  price is a genuine drop from the last known price, `PriceAlertService` fires.
  A first-time price (`oldPrice == 0`) or a price increase never counts as a
  "drop."
- No frontend work was needed — `notifications.tsx` already renders
  `price_alert` notifications correctly; they just never existed before.

## 2. Offline-first barcode cache

`services/scan.ts`'s `analyzeImage` (photo) path already had an on-device
Gemini fallback for when the backend is unreachable; `scanBarcode` had no
fallback of any kind — a cold backend meant an outright failure.

I deliberately did **not** pre-seed this with a fabricated barcode-to-product
database — inventing barcode mappings I can't verify would be worse than no
offline support, since a wrong mapping is actively misleading. Instead:

**What I added:**
- New `services/barcodeCache.ts` — an `AsyncStorage`-backed cache, keyed by
  barcode, capped at 500 entries (oldest evicted first).
- `scanService.scanBarcode`: every successful backend lookup gets cached
  locally (best-effort, never blocks the response). On a backend failure
  (network error, cold-start timeout), it now checks this cache before giving
  up — a barcode this device has looked up successfully before (by this user,
  in an earlier session) resolves instantly from cache instead of failing.
- The cache only ever grows from real, previously-successful lookups — first
  scan of any given barcode still needs the backend (or Open Food Facts,
  which the backend already falls back to for unknown barcodes).

## 3. Community counterfeit reporting

New crowdsourced trust signal — the honest alternative to the fabricated
review/rating data flagged in the previous round of fixes. Real user reports
instead of invented star ratings.

**What I added (backend):**
- New `CounterfeitReport` entity (`user`, `product`, optional `sellerName`,
  optional `reason`, timestamp) + `CounterfeitReportRepository`
  (`countByProduct`, `existsByUserAndProduct` — one report per user per
  product; resubmitting confirms rather than inflating the count).
- `ProductDto.reportCount` — added to both places a `ProductDto` gets built
  (`ProductService.toDto` and the ad-hoc one in `ScanService.toDto`'s research
  branch, which previously would have silently dropped it).
- `ProductService.reportCounterfeit(userEmail, productId, request)` +
  `POST /products/{id}/report-counterfeit` on `ProductController` — requires
  sign-in (JWT), same as everything else not explicitly `permitAll`'d.

**What I added (app):**
- `scan-result.tsx`: a "Report as counterfeit" action at the bottom of the
  sheet, open to every user (not premium-gated — broad participation is what
  makes the signal useful). Confirms via `Alert`, submits with no required
  free-text (keeps it to one tap), shows "Reported — thank you" after. If the
  product already has reports, shows "N users have flagged this as possibly
  counterfeit" above the button.
- `services/products.ts`: `reportCounterfeit(productId, sellerName?, reason?)`.
- `types/index.ts`: `Product.reportCount?: number`.

---

## Files changed (this round)

**Price alerts (backend)**
- `backend/.../repository/SavedProductRepository.java` — `findByProduct`
- `backend/.../service/PriceAlertService.java` — new
- `backend/.../service/ScanService.java` — price refresh + alert hook

**Offline barcode cache (app)**
- `services/barcodeCache.ts` — new
- `services/scan.ts` — cache read/write around `scanBarcode`

**Counterfeit reporting (backend)**
- `backend/.../entity/CounterfeitReport.java` — new
- `backend/.../repository/CounterfeitReportRepository.java` — new
- `backend/.../dto/request/ReportCounterfeitRequest.java` — new
- `backend/.../dto/ProductDto.java` — `reportCount`
- `backend/.../service/ProductService.java` — `reportCounterfeit`, count in `toDto`
- `backend/.../controller/ProductController.java` — `POST /{id}/report-counterfeit`

**Counterfeit reporting (app)**
- `app/scan-result.tsx` — report button + count display
- `services/products.ts` — `reportCounterfeit`
- `types/index.ts` — `Product.reportCount`

---
---

# Update — Network, Payments, Authenticity & OTP (2026-07-21)

This documents everything changed in response to: the built APK failing with
"network request failed" everywhere, wanting an in-app Paystack payment
experience instead of a website redirect, product prices not being fetched,
authenticity always showing 92%, and getting OTP working.

**Read the "What you still need to do" section below — several fixes need an
action from you (rotating a leaked key, setting environment variables on your
backend host) that I can't do from inside the code.**

---

## 1. Why the APK said "network request failed" everywhere

**Root cause:** `.env.local` had `EXPO_PUBLIC_API_URL` pointing at
`http://10.163.88.135:8080/api/v1` — your laptop's LAN IP. Expo bakes
`EXPO_PUBLIC_*` variables into the JS bundle at **build time**, not runtime, so
whatever URL was active when you ran `eas build` got permanently compiled into
the APK. A phone off your WiFi (or with your laptop's backend not running)
can never reach that address — hence every request failing, not just sign-in.

There was also no `eas.json`, so there was no reliable, explicit way to pin a
real backend URL to a build profile.

On top of that, I found the backend you're pointed at in production docs
(`https://scanit-raij.onrender.com`) currently **does not respond at all** —
not just "asleep," it times out after 90+ seconds across multiple attempts.
Render free-tier services sleep after 15 min idle and normally wake in
30-50s; this looks like the service itself is down/suspended, not just cold.
**I can't fix this part — I don't have access to your Render dashboard.** See
"What you still need to do" below.

**What I changed:**
- `.env.production` now points at the real backend URL instead of an emulator/LAN address.
- Added `eas.json` with `development`/`preview`/`production` build profiles, each explicitly setting `EXPO_PUBLIC_API_URL` — so the build no longer depends on which `.env` file happened to be active.
- `utils/api.ts`: requests now use a 45s timeout (Render cold-starts can take 30-50s) instead of hanging indefinitely or failing fast, and raw fetch errors are turned into a message you can act on ("Can't reach the ScanIt server, check your connection" vs. a generic `TypeError: Network request failed`).
- `app/_layout.tsx`: calls `warmUpBackend()` on app launch (fire-and-forget) so the Render instance is waking up in the background before the user even reaches sign-in.

---

## 2. Paystack — in-app payment UI + a critical security fix

### Security issue found (please act on this first)

Your Paystack **live secret key** (`sk_live_...`) was:
- Hardcoded as a fallback in `services/payment.ts`
- Committed in `.env.example` and `docs/PAYSTACK INTEGRATION.md`, both tracked by git and pushed to `github.com/CodeQuest-Group-86/ScanIt`
- Bundled into the APK itself, because it was read from an `EXPO_PUBLIC_*` variable — anything with that prefix ships inside the app bundle and can be extracted from the APK by anyone

With the secret key, anyone can charge cards, issue refunds, or read every
transaction on your Paystack account. **This needs to be rotated on the
Paystack dashboard regardless of the code fix** — the old key remains in this
repo's git history and must be treated as compromised.

**What I changed:**
- `services/payment.ts` no longer references a secret key at all, and no longer calls Paystack's API directly from the client.
- All Paystack-secret-requiring calls (initializing/verifying transactions) now happen on the **backend**, which reads `PAYSTACK_SECRET_KEY` from a server-only environment variable — new `PaymentController.java` + `PaymentService.java`.
- Scrubbed the real key values out of `.env.example` and `docs/PAYSTACK INTEGRATION.md` (replaced with placeholders + an explanation).

### In-app payment UI (no more browser redirect)

Previously, `PaymentModal.tsx` called `WebBrowser.openBrowserAsync(authorizationUrl)`,
which opened Paystack's hosted checkout in the device's browser — you'd leave
the app to pay.

**What I changed:**
- Added `react-native-paystack-webview` (+ its `react-native-webview` peer dependency), which renders Paystack's checkout as a WebView **inside a modal your app owns** — the user never leaves ScanIt or sees a browser. Card entry itself is still rendered by Paystack (required for PCI compliance — a fully custom card-number/CVV form built by us would require PCI-DSS SAQ-D compliance and is not something to take on lightly), but the surrounding experience — plan picker, branding, header, success animation — is all yours.
- `app/_layout.tsx` now wraps the app in `<PaystackProvider>` (needed once, globally) using your public key and `currency="GHS"`.
- `PaymentModal.tsx` rewritten: plan selection is unchanged (still the nice card-based picker), but "Subscribe" now opens the in-app checkout via `usePaystack().popup.checkout(...)`, and on success shows a short animated "You're Premium!" confirmation instead of bouncing you out to a browser and back.
- **Important — the client's "success" callback is never trusted by itself.** After Paystack reports success, the app calls the new backend endpoint `POST /payments/verify`, which independently re-verifies the transaction with Paystack using the secret key (checking amount, currency, and that the paying email matches the signed-in user) before activating the subscription. This closes the hole where a modified/rooted client could just claim "success" locally.

### New backend pieces
- `User.java`: added `subscriptionPlan`, `subscriptionActive`, `subscriptionExpiresAt`, `lastPaymentReference` fields (auto-created as new DB columns — `ddl-auto: update` handles it, no manual migration needed).
- `PaymentService.java`: verifies transactions against Paystack, checks the amount matches the plan (GHS 15/month or GHS 150/year — must stay in sync with `PAYSTACK_PLANS` in `services/payment.ts`), activates/expires subscriptions.
- `PaymentController.java`: `POST /payments/verify`, `GET /payments/subscription`, `POST /payments/cancel-subscription` — all require a signed-in user (same JWT auth as everything else).

---

## 3. Authenticity always showing 92%, confidence not varying

**Root cause:** `ScanService.java` line 98 had `double confidence = 92.0;`
hardcoded for every single scan, and every auto-created product defaulted to
`AuthenticityStatus.AUTHENTIC` with nothing ever reassessing it per scan.
That 92% is what showed up as "XX% match" in scan history and drove the
authenticity badge.

**What I changed — made both genuinely vary based on the actual image, not
cosmetic randomization:**
- Extended the Gemini Vision prompt (`GeminiService.java` → `IDENTIFY_PROMPT`) to ask Gemini to also assess, from the photo itself:
  - **confidence** (50-99): how clearly the product is identifiable — sharp, well-lit, clear branding scores high; blurry/ambiguous scores lower.
  - **authenticity** (`authentic` / `suspicious` / `counterfeit`): based on visible packaging quality, print sharpness, logo accuracy, spelling — defaulting to `authentic` unless there's a concrete visual reason not to (no guessing "counterfeit" without cause).
- `ScanService.java` now uses Gemini's real confidence/authenticity read per scan instead of the constant. If Gemini doesn't return a usable value (e.g. the OpenRouter fallback model doesn't comply with the JSON schema), it falls back to a reasoned default — 90% for a match against an existing catalog product, 78% for a freshly auto-created one — rather than a single magic number.
- The per-scan authenticity result is now separate from the product's long-term stored authenticity — one blurry photo won't retroactively downgrade a catalog product's authenticity for every other user; it only affects that scan's result.
- Barcode scans (95%/99%) were left as-is — those are exact database/Open Food Facts matches, so a high fixed confidence there is accurate, not a bug.

*(2026-07-23 update: the same hardcoded-confidence bug existed independently
in the on-device Gemini fallback, `services/gemini.ts`/`services/scan.ts` —
`confidence: 88` for every single fallback scan. Fixed the same way — see the
top of this file.)*

---

## 4. Prices not being fetched

I could not find a code bug here — `DuckDuckGoService.java` (scrapes DuckDuckGo
for sellers/prices) and `GeminiService.researchProduct`/`researchFromSnippets`
(asks Gemini, with Google Search grounding, for real Ghana retail prices)
both look correct. The overwhelmingly likely explanation is the same root
cause as issue #1: the app couldn't reach the backend at all, so the entire
price-research pipeline (which only runs server-side) never ran, and the app
silently fell back to offline mode with no prices.

Once the backend is reachable again (see below) this should resolve itself.
If prices are still missing after that, the next thing to check is whether
`GEMINI_API_KEY` (and optionally `OPENROUTER_API_KEY` as a fallback) is
actually set in your backend's production environment — without it, Gemini
research silently returns nothing (by design, so a scan doesn't hard-fail).

*(2026-07-23 update: there were two real bugs here after all, found once the
backend was reachable again — `DuckDuckGoService`'s price regex used a raw
cedi-sign character with no UTF-8 source encoding declared, silently mangled
at compile time; and the research prompt hardcoded Jumia's price to `0`
regardless of what was actually found. Both fixed — see the top of this file.)*

---

## 5. OTP

The backend (`OtpService.java`) already fully implements OTP delivery via
Resend (email) and Twilio Verify (SMS) — no bug found there. Your local dev
setup (`backend/run-local.ps1`, gitignored) already has a working
`RESEND_API_KEY`. The reason it "doesn't work" in the built app is, again,
almost certainly issue #1 — when the backend is unreachable, `services/auth.ts`
silently falls back to a mock OTP (`123456`) that isn't actually sent anywhere,
by design, so development isn't blocked.

**No code change needed** — just make sure `RESEND_API_KEY` is set in your
backend's **production** environment (see below), separate from your local key.

---

## What you still need to do

These all require access I don't have (your Paystack/Render/GitHub accounts):

1. **Rotate your Paystack secret key now** — https://dashboard.paystack.co/#/settings/keys → regenerate the live secret key. The old one is compromised (in git history) regardless of the code fix above.
2. **Check your Render dashboard** for the `scanit-raij` service — see why it's not responding (crashed, suspended for inactivity/billing, or deleted). Restart or redeploy it.
3. **Set these environment variables on Render** (Web Service → Environment):
   - `PAYSTACK_SECRET_KEY` — your new, rotated secret key
   - `RESEND_API_KEY` — for real OTP emails in production (can reuse the one in `run-local.ps1`, or issue a fresh one)
   - Confirm `GEMINI_API_KEY`, `JWT_SECRET`, `DATABASE_URL` etc. are still set (these should already be there if the service was working before)
4. **Update `EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY`** in `.env.local`/`.env.production` if you generate new Paystack keys (public key is safe to keep as-is, only the secret needed rotating).
5. **Rebuild the APK**: `eas build -p android --profile preview` (or `production`) now that `eas.json` pins a real backend URL — the old APK on any test device still has the broken LAN IP baked in and needs to be reinstalled.
6. **Test the payment flow once for real** — you chose to keep live Paystack keys rather than switch to test mode, which means the first test subscription will be a real charge. If you'd rather verify the flow risk-free first, you can switch `EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY`/`PAYSTACK_SECRET_KEY` to `pk_test_.../sk_test_...` temporarily — no code change needed, just env values — then switch back.
7. Install the two new native-ish dependencies before your next build (already added to `package.json`, but if anyone else pulls this branch): `npm install`.

---

## Files changed

**Security / payments (backend)**
- `backend/.../entity/User.java` — subscription fields
- `backend/.../service/PaymentService.java` — new
- `backend/.../controller/PaymentController.java` — new
- `backend/.../dto/payment/*.java` — new
- `backend/src/main/resources/application.yml` — `paystack.secret-key` config

**Authenticity / confidence (backend)**
- `backend/.../service/GeminiService.java` — prompt + parsing for confidence/authenticity
- `backend/.../service/ScanService.java` — dynamic confidence + per-scan authenticity

**Payments (app)**
- `services/payment.ts` — no more secret key, backend-verified flow
- `components/PaymentModal.tsx` — in-app Paystack checkout
- `app/_layout.tsx` — `PaystackProvider`, backend warm-up call
- `package.json` — `react-native-paystack-webview`, `react-native-webview`

**Networking (app)**
- `utils/api.ts` — timeout + friendly error messages
- `.env.local`, `.env.production` — corrected API URLs, removed secret key
- `eas.json` — new, pins backend URL per build profile

**Docs / secrets cleanup**
- `.env.example` — secret key removed
- `docs/PAYSTACK INTEGRATION.md` — rewritten, no real keys, explains the key-handling rules
- `UPDATE.md` — this file
