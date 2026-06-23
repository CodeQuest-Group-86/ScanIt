# ScanIt — AI Architecture

ScanIt uses a multi-model AI pipeline to deliver product recognition, similarity matching, counterfeit detection, recommendation generation, and semantic search. This document explains every model in the pipeline, how each function is implemented, how the pieces connect together, and what is needed to move from the current simulated layer to real production models.

---

## Models at a Glance

| Model | Role | Where it runs |
|---|---|---|
| Google Vision API | Primary product recognition | Cloud (Google API) |
| TensorFlow Lite | On-device fast classification | On-device |
| MobileNet | Object / product-class classification | On-device or lightweight server |
| CLIP | Visual similarity matching | Server (embedding index) |
| ResNet-50 | Counterfeit / authenticity detection | Server |
| BERT / Sentence Transformers | Semantic search and spec retrieval | Server (or on-device quantised) |

---

## How Each Model Works

### 1. Google Vision API — Product Recognition

**What it does:** Sends the captured image to Google Cloud Vision and receives structured product labels, object localisation, and web entity detection.

**Production endpoint:**
```
POST https://vision.googleapis.com/v1/images:annotate?key=API_KEY
{
  "requests": [{
    "image": { "content": "<base64>" },
    "features": [
      { "type": "LABEL_DETECTION", "maxResults": 10 },
      { "type": "PRODUCT_SEARCH" },
      { "type": "WEB_DETECTION" }
    ]
  }]
}
```

**In ScanIt:** `services/ai.ts → googleVisionRecognize(imageUri)` — currently simulated. In production, capture the photo, convert to base64, POST to Vision, and return the top label + confidence.

**Confidence contribution:** 50% weight in the combined recognition score.

---

### 2. TensorFlow Lite — On-device Image Recognition

**What it does:** Runs a quantised product classifier model directly on the device — no network call required. Provides the fastest initial result and acts as a fallback when offline.

**Production setup:**
```ts
// react-native-fast-tflite or expo-modules TFLite plugin
import { loadTensorflowModel } from 'react-native-fast-tflite';

const model = await loadTensorflowModel(
  require('../assets/models/product_classifier.tflite')
);
const result = await model.run([imageTensor]); // returns Float32Array
```

**Model file:** A MobileNetV2-backbone `.tflite` file fine-tuned on Ghanaian product images (target ~4 MB, INT8 quantised). Ship with the app bundle.

**In ScanIt:** `services/ai.ts → tfliteClassify(imageUri)` — simulated. In production, resize image to 224×224, normalise to [0,1], run inference.

**Confidence contribution:** 25% weight in the combined recognition score.

---

### 3. MobileNet — Object Classification

**What it does:** MobileNetV3-Large provides a broader set of object classes and is especially good at distinguishing product categories (beverages, personal care, snacks, etc.).

**Production setup:**
```ts
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-react-native';
import * as mobilenet from '@tensorflow-models/mobilenet';

const model = await mobilenet.load({ version: 2, alpha: 1.0 });
const predictions = await model.classify(imageTensor);
// [{ className: 'water bottle', probability: 0.92 }, ...]
```

**In ScanIt:** `services/ai.ts → mobileNetClassify(imageUri)` — simulated. In production, run on-device after TFLite for a second opinion on the product class.

**Confidence contribution:** 25% weight in the combined recognition score.

---

### 4. CLIP — Visual Similarity Matching

**What it does:** OpenAI CLIP (Contrastive Language-Image Pre-training) converts images and text descriptions into a shared 512-dimensional embedding space. To find visually similar products, ScanIt encodes the scanned image and performs approximate nearest-neighbour (ANN) search against a pre-built product embedding index.

**Production flow:**
```
User scans image
        │
        ▼
POST /api/ai/clip/embed   { imageUri }
        │  returns { embedding: number[512] }
        ▼
ANN search (FAISS / pgvector) against product_embeddings table
        │  returns [{ productId, cosineSimilarity }]
        ▼
Return top-K products ordered by similarity score
```

**In ScanIt:** `services/ai.ts → clipSimilarity(imageUri)` and `aiService.findSimilar(imageUri, products)`. The scan pipeline calls `findSimilar` to pick the most visually similar product from the catalogue.

**Use cases in ScanIt:**
- Picking the best product match during scanning
- "Similar Products" in the scan result sheet (future tab)

---

### 5. ResNet-50 — Counterfeit Detection

**What it does:** A ResNet-50 network fine-tuned on pairs of (genuine, counterfeit) product images learns texture patterns, logo geometry, print sharpness, and packaging quality indicators that are invisible to generic classifiers. It returns an authenticity probability (0–100, where 100 = definitely genuine).

**Production endpoint:**
```
POST /api/ai/resnet/authenticity
{ "imageUri": "..." }

→ {
    "authenticScore": 84,
    "flags": ["logo_geometry_ok", "print_quality_high"],
    "riskLevel": "low"
  }
```

**In ScanIt:** `services/ai.ts → resNet50Authenticity(imageUri)`. The score maps directly to `AuthenticityStatus`:

| Score | Status |
|---|---|
| ≥ 80 | `authentic` |
| 55–79 | `suspicious` |
| < 55 | `counterfeit` |

**In ScanIt:** `services/scan.ts` reads `aiAnalysis.authenticity.confidence` to set `authenticityStatus` on every `ScanResult`.

---

### 6. BERT / Sentence Transformers — Semantic Search

**What it does:** BERT (Bidirectional Encoder Representations from Transformers) encodes text into dense vectors that capture meaning, not just keywords. A user typing "something to quench thirst on a hot day" correctly surfaces "Tropical Juice 500ml" and "Coral Mineral Water 1.5L" even though neither phrase matches word-for-word.

**Production endpoint:**
```
POST /api/ai/bert/encode
{ "text": "something to quench thirst on a hot day" }

→ { "embedding": number[768], "relevanceScore": 92 }
```

Then ANN search against pre-computed product description embeddings (stored in pgvector).

**In ScanIt:** `services/ai.ts → bertEncode(text)` and `aiService.semanticSearch(query, products)`. The search screen has a **BERT Semantic Search** toggle button. When active:
- The placeholder changes to "Describe a product…"
- Results are ranked by `semanticScore` (0–100)
- Each card shows the semantic relevance percentage
- `stores/products.ts → semanticSearch()` calls `productService.semanticSearch()` which calls `aiService.semanticSearch()`

---

## Feature → Model Mapping

| Feature | Models Used |
|---|---|
| **Product Recognition** | Google Vision API (50%) + TFLite (25%) + MobileNet (25%) |
| **Similar Product Matching** | CLIP |
| **Counterfeit Detection** | ResNet-50 |
| **Recommendation Generation** | CLIP (visual similarity) + existing price/seller data |
| **Semantic Search** | BERT / Sentence Transformers |

---

## Pipeline Flow

```
User taps shutter
        │
        ▼
 scanStore.analyze(imageUri)
        │
        ├─ sets analyzingStage labels in 420ms steps:
        │   "Google Vision API…"
        │   "TensorFlow Lite…"
        │   "MobileNet classification…"
        │   "CLIP similarity…"
        │   "ResNet-50 counterfeit check…"
        │
        ▼
 scanService.analyzeImage(imageUri)
        │
        ├── aiService.analyzeImage(imageUri)   [parallel]
        │       ├── googleVisionRecognize()
        │       ├── tfliteClassify()
        │       ├── mobileNetClassify()
        │       ├── clipSimilarity()
        │       └── resNet50Authenticity()
        │       → merges → AIAnalysisResult
        │
        └── aiService.findSimilar(imageUri, MOCK_PRODUCTS)
                → picks best product match (CLIP-ranked)
        │
        ▼
 Builds ScanResult {
   product,                  ← top CLIP match
   confidence,               ← AIAnalysisResult.overallConfidence
   authenticityStatus,       ← derived from ResNet-50 score
   aiAnalysis,               ← full per-model breakdown
 }
        │
        ▼
 scanStore.currentResult set → scan-result.tsx opens
        │
        ▼
 AIBreakdown panel shows:
   • Recognition row  (Google Vision API, confidence %)
   • Similarity row   (CLIP, confidence %)
   • Authenticity row (ResNet-50, confidence %)
   • Overall score badge
```

---

## Semantic Search Flow

```
User types in search.tsx
        │
        ├── [keyword mode]  → productService.getProducts()     (plain filter)
        └── [semantic mode] → productService.semanticSearch()
                                  → aiService.semanticSearch(query, products)
                                        → bertEncode(query)
                                        → score each product by embedding similarity
                                        → sort descending by semanticScore
                                        → return ScoredProduct[]
        │
        ▼
FlatList renders results with semanticScore badge under each card
```

---

## Data Structures

### `AIModelResult`
```ts
{
  model: AIModelName;   // 'Google Vision API' | 'TFLite' | 'MobileNet' | 'CLIP' | 'ResNet-50' | 'BERT'
  confidence: number;   // 0–100
  label: string;        // human-readable result description
}
```

### `AIAnalysisResult`
```ts
{
  recognition:       AIModelResult;  // Vision API weighted result
  similarity:        AIModelResult;  // CLIP
  authenticity:      AIModelResult;  // ResNet-50
  semantic:          AIModelResult;  // BERT (populated by semantic search)
  overallConfidence: number;         // weighted blend
}
```

### `ScanResult` (extended)
```ts
{
  // ...existing fields...
  aiAnalysis?: AIAnalysisResult;
}
```

---

## File Map

```
services/ai.ts          ← all model adapters + pipeline orchestration
services/scan.ts        ← calls aiService.analyzeImage + findSimilar
services/products.ts    ← calls aiService.semanticSearch + findSimilarByImage
stores/scan.ts          ← analyzingStage, aiAnalysis state
stores/products.ts      ← isSemanticMode, semanticResults, semanticSearch action
types/index.ts          ← AIModelName, AIModelResult, AIAnalysisResult
app/(tabs)/scan.tsx     ← live pipeline stage pill
app/(tabs)/search.tsx   ← BERT mode toggle + score display
app/scan-result.tsx     ← AIBreakdown panel
```

---

## Replacing Simulated Models with Real APIs

Every adapter in `services/ai.ts` has a comment block describing the exact production call. The changes needed per model:

| Model | What to replace |
|---|---|
| Google Vision API | Add `EXPO_PUBLIC_GOOGLE_VISION_KEY` to `.env.local`; replace `delay()` stub with `fetch()` to Vision API |
| TFLite | Install `react-native-fast-tflite`; add `.tflite` model to `assets/models/`; replace stub with model inference |
| MobileNet | Install `@tensorflow/tfjs-react-native` + `@tensorflow-models/mobilenet`; replace stub with `model.classify()` |
| CLIP | Deploy CLIP embedding server (Python/FastAPI + `openai/clip`); replace stub with `fetch('/api/ai/clip/embed')` |
| ResNet-50 | Deploy ResNet-50 fine-tuned on counterfeit data; replace stub with `fetch('/api/ai/resnet/authenticity')` |
| BERT | Deploy Sentence Transformers server (`all-MiniLM-L6-v2`); replace stub with `fetch('/api/ai/bert/encode')` |

All adapters have the same signature (`(input: string) => Promise<AIModelResult>`) so swapping them in does not affect any other layer.

---

## Confidence Score Interpretation

| Range | Meaning |
|---|---|
| 90–100% | Very high confidence — model is strongly certain |
| 75–89% | Good confidence — reliable result |
| 55–74% | Moderate — present to user with a caveat |
| < 55% | Low — flag for manual review or re-scan |

For **ResNet-50 authenticity**, the score direction is: higher = more authentic. Scores below 55 trigger a counterfeit warning in the UI.

---

## Future Enhancements

- **Recommendation Generation:** Feed CLIP similarity scores + user purchase history to a collaborative-filtering model to surface personalised "cheaper nearby alternatives".
- **Offline mode:** Ship quantised BERT (DistilBERT INT8, ~65 MB) on-device so semantic search works without a network connection.
- **Barcode fusion:** Merge barcode scan result with Vision API recognition for higher accuracy on packaged goods.
- **Active learning:** Log low-confidence scans (< 70%) to a labelling queue so the TFLite / ResNet-50 models can be continuously fine-tuned on real Ghanaian market data.
