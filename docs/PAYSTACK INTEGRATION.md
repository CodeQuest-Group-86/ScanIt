# Paystack Integration

The Paystack **secret** key must never be committed to this repo or placed in any
`EXPO_PUBLIC_*` environment variable — both end up either in git history or bundled
directly into the APK, where anyone can extract it and use it to charge cards, issue
refunds, or read every transaction on the account.

> A live secret key was previously committed to this file and to `.env.example`. If you
> haven't already, rotate it now at https://dashboard.paystack.co/#/settings/keys — the
> old key must be treated as compromised regardless of any code changes here, since it
> remains in this repo's git history.

## Where each key goes

| Key | Where it lives | Why |
|---|---|---|
| `pk_live_...` / `pk_test_...` (public) | `.env.local` / `.env.production` as `EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY`, and in EAS build env | Safe to ship — it can only *start* a checkout, not move money on its own. |
| `sk_live_...` / `sk_test_...` (secret) | Backend only, as the `PAYSTACK_SECRET_KEY` environment variable (Render/Railway dashboard) | Verifies transactions and can issue refunds — must never leave the server. |

## How payment flows through the app

1. The app opens Paystack's checkout **inside** the app (a WebView modal via
   `react-native-paystack-webview`, wrapped in `PaystackProvider` in `app/_layout.tsx`) —
   no external browser, no separate website. See `components/PaymentModal.tsx`.
2. Paystack reports success/cancel back to the client.
3. The client never trusts that alone — it calls `POST /payments/verify` on the backend
   with the transaction reference (`services/payment.ts` → `PaymentController.java`).
4. The backend (`PaymentService.java`) calls Paystack's `GET /transaction/verify/:reference`
   using the secret key, checks the amount/currency/customer email actually match, and only
   then activates the subscription on the `User` record.

## Setting it up

1. Get your keys from https://dashboard.paystack.co/#/settings/keys (use `pk_test_...` /
   `sk_test_...` while developing — no real money moves in test mode).
2. Add to `.env.local` / `.env.production`:
   ```
   EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_xxxxx
   ```
3. Add to the backend's environment (Render/Railway dashboard, or `backend/run-local.ps1` for local dev — that file is gitignored):
   ```
   PAYSTACK_SECRET_KEY=sk_test_xxxxx
   ```
4. Plan pricing is defined in two places that must stay in sync: `services/payment.ts`
   (`PAYSTACK_PLANS`, in GHS) and `PaymentService.java` (`PLANS`, in pesewas = GHS × 100).
