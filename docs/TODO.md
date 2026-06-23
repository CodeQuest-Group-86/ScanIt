# ScanIt — What To Do

Everything left to make this production-ready. Work top to bottom.

---

## 1. Run it locally right now

```bash
docker compose up -d          # starts Postgres + MailHog + Spring Boot backend
npx expo start --clear        # starts mobile app
```

Scan the QR with Expo Go on your phone. Demo accounts: `ama.m@scanit.app / password123` (consumer), `kofi@scanit.app / password123` (seller).

---

## 2. Wire up real AI models

Each model activates when you add its key/URL to `.env.local`. Without a key it falls back instantly.

---

### AI Model Cost Breakdown

| Model | Role | Cost | Notes |
|---|---|---|---|
| **Google Vision API** | Product recognition | **PAID** after 1,000 req/month | $1.50 per 1,000 units beyond free tier |
| **TensorFlow Lite** | On-device classification | **FREE** | Open source, runs on device, no API needed |
| **MobileNet** | On-device object classification | **FREE** | Open source, runs on device via TF.js |
| **CLIP** | Visual similarity matching | **FREE** (self-hosted) | OpenAI released weights publicly; you host it |
| **ResNet-50** | Counterfeit detection | **FREE** (self-hosted) | Open source model; you host it |
| **BERT / Sentence Transformers** | Semantic search | **FREE** (self-hosted) | HuggingFace open source; you host it |

**Summary:** Only Google Vision API costs money. Every other model is free — either on-device or self-hosted.

---

### Recommended Free Alternatives to Google Vision API

Replace `EXPO_PUBLIC_GOOGLE_VISION_KEY` with one of these — all have free tiers that are more than enough for development and early production.

#### Option 1 — Hugging Face Inference API (Best free pick)
- **Free tier:** ~30,000 requests/month on the free plan
- **Model to use:** `google/vit-base-patch16-224` (image classification) or `facebook/detr-resnet-50` (object detection)
- **How to set up:**
  1. Sign up at huggingface.co → Settings → Access Tokens → New token (read)
  2. Add to `.env.local`:
     ```
     EXPO_PUBLIC_HF_TOKEN=hf_...
     ```
  3. In `services/ai.ts`, replace the `googleVision()` adapter with:
     ```ts
     const r = await fetch(
       'https://api-inference.huggingface.co/models/google/vit-base-patch16-224',
       {
         method: 'POST',
         headers: { Authorization: `Bearer ${process.env.EXPO_PUBLIC_HF_TOKEN}` },
         body: imageBlob,
       }
     );
     const json = await r.json(); // [{ label, score }, ...]
     ```

#### Option 2 — Azure Computer Vision (Generous free tier)
- **Free tier:** 5,000 transactions/month (F0 tier) — no credit card needed
- **How to set up:**
  1. portal.azure.com → Create resource → Computer Vision → F0 tier
  2. Copy the endpoint + key
  3. Add to `.env.local`:
     ```
     EXPO_PUBLIC_AZURE_CV_KEY=...
     EXPO_PUBLIC_AZURE_CV_ENDPOINT=https://YOUR_REGION.api.cognitive.microsoft.com
     ```

#### Option 3 — Clarifai (Easiest to start)
- **Free tier:** 1,000 operations/month on the community plan
- **Model:** `general-image-recognition` (pre-trained on 11,000 concepts)
- **How to set up:**
  1. clarifai.com → Create account → Create app → copy PAT token
  2. Add to `.env.local`:
     ```
     EXPO_PUBLIC_CLARIFAI_PAT=...
     ```

**Recommendation for ScanIt:** Start with **Hugging Face** — it's the most generous free tier and has models specifically for product/object recognition. When you need higher accuracy for Ghanaian products, switch to Azure (5,000 free/month is enough for thousands of daily scans in early launch).

---

### TensorFlow Lite + MobileNet (on-device, no server needed) — FREE

1. `npm install react-native-fast-tflite`
2. Add a product classifier `.tflite` model to `assets/models/product_classifier.tflite` (train one or use a pre-trained MobileNetV2)
3. In `services/ai.ts`, replace the `tflite()` and `mobileNet()` functions with real inference:
   ```ts
   import { loadTensorflowModel } from 'react-native-fast-tflite';
   const model = await loadTensorflowModel(require('../assets/models/product_classifier.tflite'));
   const output = await model.run([imageTensor]);
   ```

### CLIP (visual similarity matching) — FREE, self-hosted

1. Deploy a CLIP server (Python, ~10 lines with FastAPI + openai/clip)
2. Add to `.env.local`:
   ```
   EXPO_PUBLIC_CLIP_API_URL=https://your-clip-server.com
   ```
   The server must expose `POST /embed` returning `{ score: 0.0–1.0 }`.
3. **Free hosting options:** Hugging Face Spaces (free GPU), Railway free tier, Render free tier

### ResNet-50 (counterfeit detection) — FREE, self-hosted

1. Fine-tune ResNet-50 on pairs of genuine/counterfeit Ghanaian products
2. Deploy the model as an API
3. Add to `.env.local`:
   ```
   EXPO_PUBLIC_RESNET_API_URL=https://your-resnet-server.com
   ```
   The server must expose `POST /authenticity` returning `{ authenticScore: 0–100 }`.

### BERT / Sentence Transformers (semantic search) — FREE, self-hosted

1. Deploy `sentence-transformers/all-MiniLM-L6-v2` (Python, FastAPI)
2. Add to `.env.local`:
   ```
   EXPO_PUBLIC_BERT_API_URL=https://your-bert-server.com
   ```
   The server must expose `POST /encode` returning `{ relevanceScore: 0–100 }`.
3. **Free hosting:** Hugging Face Inference API already hosts `all-MiniLM-L6-v2` — no need to self-host for dev.

---

## 3. Deploy the backend so anyone can use the app (Render — free)

Render's free tier gives you a web service + PostgreSQL database, both free. The only downside is the service sleeps after 15 minutes of inactivity (first request after sleep takes ~30 seconds to wake up). Fine for development and early users.

```bash
# 1. Push your code to GitHub
git add . && git commit -m "ready" && git push

# 2. Go to render.com → Sign up (free, no credit card needed)

# 3. Create a PostgreSQL database
#    Dashboard → New → PostgreSQL
#    Name: scanit-db  |  Plan: Free
#    Copy the "Internal Database URL" — you'll need it in step 5

# 4. Create a Web Service
#    Dashboard → New → Web Service → connect your GitHub repo
#    Settings:
#      Name:         scanit-backend
#      Root Dir:     backend
#      Runtime:      Docker  (Render auto-detects the Dockerfile)
#      Plan:         Free
#      Branch:       main

# 5. Set environment variables in Render (Web Service → Environment):
#    SPRING_PROFILES_ACTIVE = prod
#    DATABASE_URL            = (paste Internal Database URL from step 3)
#    DATABASE_USERNAME       = (from Render Postgres dashboard → Username)
#    DATABASE_PASSWORD       = (from Render Postgres dashboard → Password)
#    JWT_SECRET              = (run locally: openssl rand -hex 32)
#    MAIL_HOST               = smtp.gmail.com   (optional — for password reset)
#    MAIL_USERNAME           = your@gmail.com   (optional)
#    MAIL_PASSWORD           = your-app-password (optional)

# 6. Click "Deploy" — Render builds the Docker image and gives you a URL like:
#    https://scanit-backend.onrender.com

# 7. Update .env.local:
#    EXPO_PUBLIC_API_URL=https://scanit-backend.onrender.com/api/v1
```

Anyone with Expo Go and your QR code can now register a real account.

---

## 4. Build a standalone app (no Expo Go needed)

```bash
npm install -g eas-cli
eas login
eas build:configure

# Android APK
eas build -p android --profile preview
```

Add your live API URL to `eas.json` so it's baked into the build:

```json
{
  "build": {
    "preview": {
      "env": {
        "EXPO_PUBLIC_API_URL": "https://scanit-backend-production.up.railway.app/api/v1"
      }
    }
  }
}
```

EAS builds in the cloud and gives you a download link for the APK. Share it directly or upload to the Play Store.

---

## 5. Add real product data

The seeder adds 6 demo products. To add real Ghanaian market products:

**Option A — via the API (recommended)**
```bash
curl -X POST https://YOUR_BACKEND/api/v1/products \
  -H "Authorization: Bearer SELLER_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Milo 400g",
    "brand": "Nestlé",
    "category": "Drinks",
    "description": "Chocolate malt drink powder",
    "price": 22.50,
    "origin": "Ghana",
    "barcode": "6001000375038",
    "specs": { "Weight": "400g", "Calories": "370kcal per 100g" }
  }'
```

**Option B — directly in the seeder**
Add more `productRepository.save(Product.builder()...)` blocks in `backend/src/main/java/com/scanit/backend/seed/DataSeeder.java` following the existing pattern.

---

## 6. Email for password reset (optional)

Without email config, forgot-password still works — it just doesn't send an email. To enable:

1. Go to your Google account → Security → App Passwords → create one for "ScanIt"
2. Set in Railway environment variables:
   ```
   MAIL_HOST     = smtp.gmail.com
   MAIL_PORT     = 587
   MAIL_USERNAME = you@gmail.com
   MAIL_PASSWORD = xxxx xxxx xxxx xxxx   (the app password, not your login password)
   ```

---

## 7. Production checklist before going live

- [ ] Replace `JWT_SECRET` with a strong random value (`openssl rand -hex 32`)
- [ ] Set `SPRING_PROFILES_ACTIVE=prod` in Render environment variables
- [ ] Add a real domain (Render → Settings → Custom Domain — free with your own domain)
- [ ] Update `EXPO_PUBLIC_API_URL` in `eas.json` to your Render URL
- [ ] Submit APK to Google Play Store
- [ ] Add more products to the database (see step 5)
- [ ] Add `EXPO_PUBLIC_HF_TOKEN` to `.env.local` for real AI model results (see step 2)
- [ ] Test registration flow end-to-end on a physical Android device

---

## File map (what does what)

| File | Purpose |
|---|---|
| `services/ai.ts` | All AI model adapters — edit here to wire real APIs |
| `services/scan.ts` | Scan pipeline — parallel backend + AI call |
| `services/auth.ts` | Auth API calls |
| `services/products.ts` | Product/notification/inventory API calls |
| `utils/api.ts` | HTTP client — reads `EXPO_PUBLIC_API_URL`, handles JWT refresh |
| `.env.local` | All env vars — API URL, AI keys |
| `backend/src/.../service/ScanService.java` | Product matching logic — replace hash with Vision labels here |
| `backend/src/.../seed/DataSeeder.java` | Adds demo data on first boot — add real products here |
| `backend/src/.../config/SecurityConfig.java` | Which endpoints are public vs require JWT |
| `docker-compose.yml` | Local dev stack |
| `railway.toml` | Railway deployment config |
| `docs/DEPLOYMENT.md` | Full deploy guide |
| `docs/AI_ARCHITECTURE.md` | How each AI model works and how to swap in real ones |
| `docs/SETUP.md` | Local setup guide |
