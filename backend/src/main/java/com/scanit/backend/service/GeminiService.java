package com.scanit.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import okhttp3.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * Two capabilities:
 *
 *  1. identifyProduct — Gemini Vision (or OpenRouter) reads the image and returns
 *     product name / brand / category.
 *
 *  2. researchProduct — single Gemini call with Google Search grounding enabled,
 *     so Gemini searches Jumia Ghana, Tonaton, Kikuu, etc. in real-time and
 *     returns actual current prices + where to buy.
 *     Falls back to OpenRouter (training-data prices) if Gemini is unavailable.
 */
@Service
@Slf4j
public class GeminiService {

    @Value("${gemini.api-key:}")      private String geminiKey;
    @Value("${openrouter.api-key:}")  private String openRouterKey;

    private static final String GEMINI_URL =
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
    private static final String OPENROUTER_URL =
        "https://openrouter.ai/api/v1/chat/completions";

    // Longer timeout: grounded search can take up to ~20s
    private final OkHttpClient http = new OkHttpClient.Builder()
            .callTimeout(60, TimeUnit.SECONDS).build();
    private final ObjectMapper mapper = new ObjectMapper();

    // ── Public records ────────────────────────────────────────────────────────

    public record ProductInfo(String name, String brand, String category, String description,
                               int confidence, String authenticity) {}

    public record ResearchSeller(String name, String url, String location, double price,
                                  String phone, String whatsapp) {
        /** Convenience constructor for callers that don't have contact info (DDG hits,
         *  CompuGhana's own API response — neither exposes a phone number). */
        public ResearchSeller(String name, String url, String location, double price) {
            this(name, url, location, price, "", "");
        }
    }

    public record ProductResearch(
        Map<String, String> specs,
        double priceMin,
        double priceMax,
        double priceTypical,
        List<ResearchSeller> sellers
    ) {}

    // ── 1. Vision: identify product from image ────────────────────────────────

    public ProductInfo identifyProduct(byte[] imageBytes, String mimeType) {
        boolean hasGemini = geminiKey != null && !geminiKey.isBlank();
        boolean hasOpenRouter = openRouterKey != null && !openRouterKey.isBlank();

        if (!hasGemini && !hasOpenRouter) {
            throw new com.scanit.backend.exception.BadRequestException(
                "AI vision not configured. Set gemini.api-key or openrouter.api-key.");
        }

        if (hasGemini) {
            try {
                ProductInfo result = callGeminiVision(imageBytes, mimeType);
                if (result != null) return result;
            } catch (QuotaExceededException e) {
                log.warn("Gemini quota exceeded — {}", hasOpenRouter ? "falling back to OpenRouter" : "no fallback");
            } catch (RuntimeException e) {
                throw e;
            } catch (Exception e) {
                log.warn("Gemini vision failed: {} — {}", e.getMessage(), hasOpenRouter ? "trying OpenRouter" : "no fallback");
            }
        }

        if (hasOpenRouter) {
            return callOpenRouterVision(imageBytes, mimeType);
        }

        return null;
    }

    // ── 2. Research: real prices & where to buy via Google Search grounding ───

    /**
     * Uses Gemini with Google Search grounding enabled so it queries Jumia Ghana,
     * Tonaton, Kikuu, and local markets in real-time.
     * Falls back to OpenRouter (offline training-data prices) if Gemini unavailable.
     */
    public ProductResearch researchProduct(String name, String brand, String category) {
        boolean hasGemini = geminiKey != null && !geminiKey.isBlank();
        boolean hasOpenRouter = openRouterKey != null && !openRouterKey.isBlank();

        if (hasGemini) {
            try {
                ProductResearch result = callGeminiResearch(name, brand, category);
                if (result != null) return result;
            } catch (QuotaExceededException e) {
                log.warn("Gemini quota exceeded for research — {}", hasOpenRouter ? "falling back to OpenRouter" : "no fallback");
            } catch (Exception e) {
                log.warn("Gemini research failed: {} — {}", e.getMessage(), hasOpenRouter ? "trying OpenRouter" : "no fallback");
            }
        }

        if (hasOpenRouter) {
            try {
                return callOpenRouterResearch(name, brand, category);
            } catch (Exception e) {
                log.warn("OpenRouter research failed: {}", e.getMessage());
            }
        }

        return null;
    }

    // ── 3. Extract price/specs from DuckDuckGo snippets ───────────────────────

    /**
     * Uses Gemini text-only to parse DuckDuckGo search snippets for Ghana prices and specs.
     */
    public ProductResearch researchFromSnippets(ProductInfo info, List<String> snippets) {
        if (geminiKey == null || geminiKey.isBlank() || snippets == null || snippets.isEmpty()) {
            return null;
        }
        try {
            StringBuilder sb = new StringBuilder();
            sb.append("Product: \"").append(info.name()).append("\" by \"").append(info.brand())
              .append("\" (").append(info.category()).append(").\n")
              .append("Search snippets from DuckDuckGo:\n");
            int limit = Math.min(snippets.size(), 8);
            for (int i = 0; i < limit; i++) {
                sb.append(i + 1).append(". ").append(snippets.get(i)).append("\n");
            }
            sb.append("\nBased on these snippets and Ghana retail prices (GHS), respond with ONLY this JSON:\n")
              .append("{\"specs\":{\"<key>\":\"<value>\"},\"priceGhsMin\":<number>,\"priceGhsMax\":<number>,")
              .append("\"priceGhsTypical\":<number>}\nInclude 4-8 specs. Use 0 for unknown prices.");

            String body = mapper.writeValueAsString(Map.of(
                "contents", List.of(Map.of("parts", List.of(Map.of("text", sb.toString())))),
                "generationConfig", Map.of(
                    "temperature", 0.1,
                    "maxOutputTokens", 1024,
                    "thinkingConfig", Map.of("thinkingBudget", 0)
                )
            ));

            Request req = new Request.Builder()
                    .url(GEMINI_URL)
                    .addHeader("X-goog-api-key", geminiKey)
                    .post(RequestBody.create(body, MediaType.get("application/json")))
                    .build();

            try (Response resp = http.newCall(req).execute()) {
                String respBody = resp.body() != null ? resp.body().string() : "";
                if (!resp.isSuccessful()) {
                    log.warn("Gemini snippet research error {}: {}", resp.code(), respBody.substring(0, Math.min(200, respBody.length())));
                    return null;
                }
                JsonNode root = mapper.readTree(respBody);
                String text = firstCandidateText(root, "snippet research");
                if (text == null || text.isEmpty()) return null;
                return parseResearch(text);
            }
        } catch (Exception e) {
            log.warn("Gemini snippet research failed: {}", e.getMessage());
            return null;
        }
    }

    // ── Gemini Vision ─────────────────────────────────────────────────────────

    private ProductInfo callGeminiVision(byte[] imageBytes, String mimeType) throws Exception {
        String b64 = Base64.getEncoder().encodeToString(imageBytes);
        // thinkingConfig must be INSIDE generationConfig; thinkingBudget=0 disables thinking
        // so parts[0] is always the real response text, not a thought block
        String body = mapper.writeValueAsString(Map.of(
            "contents", List.of(Map.of("parts", List.of(
                Map.of("text", IDENTIFY_PROMPT),
                Map.of("inline_data", Map.of("mime_type", mimeType, "data", b64))
            ))),
            "generationConfig", Map.of(
                "temperature", 0.1,
                "maxOutputTokens", 512,
                "thinkingConfig", Map.of("thinkingBudget", 0)
            )
        ));

        Request req = new Request.Builder()
                .url(GEMINI_URL)
                .addHeader("X-goog-api-key", geminiKey)
                .post(RequestBody.create(body, MediaType.get("application/json")))
                .build();

        try (Response resp = http.newCall(req).execute()) {
            String respBody = resp.body() != null ? resp.body().string() : "";
            if (resp.code() == 429) throw new QuotaExceededException(respBody.substring(0, Math.min(80, respBody.length())));
            if (!resp.isSuccessful()) {
                log.error("Gemini vision error {}: {}", resp.code(), respBody.substring(0, Math.min(200, respBody.length())));
                return null;
            }
            JsonNode root = mapper.readTree(respBody);
            // Skip any thought parts — find the first non-thought text part
            String text = firstCandidateText(root, "vision");
            if (text == null || text.isEmpty()) return null;
            return parseProductInfo(text);
        }
    }

    /**
     * Gemini omits "candidates" entirely on safety/recitation blocks, so
     * root.path("candidates").get(0) can be null — guard every access point
     * instead of letting it NPE up to a 500.
     */
    private String firstCandidateText(JsonNode root, String context) {
        JsonNode candidates = root.path("candidates");
        JsonNode candidate = candidates.isArray() && candidates.size() > 0 ? candidates.get(0) : null;
        if (candidate == null) {
            String blockReason = root.path("promptFeedback").path("blockReason").asText("unknown");
            log.warn("Gemini {} returned no candidates (blockReason={})", context, blockReason);
            return null;
        }
        String finishReason = candidate.path("finishReason").asText("");
        JsonNode parts = candidate.path("content").path("parts");
        String text = "";
        if (parts.isArray()) {
            for (JsonNode part : parts) {
                if (!part.path("thought").asBoolean(false)) {
                    String t = part.path("text").asText("").trim();
                    if (!t.isEmpty()) { text = t; break; }
                }
            }
        }
        if (text.isEmpty() && !finishReason.isEmpty() && !finishReason.equals("STOP")) {
            log.warn("Gemini {} produced no text (finishReason={})", context, finishReason);
        }
        return text;
    }

    // ── Gemini Research (Google Search grounding — real live prices) ──────────

    private ProductResearch callGeminiResearch(String name, String brand, String category) throws Exception {
        String encodedName = name.replace(" ", "+");

        String prompt =
            "Search for the current retail price and full product specs of \"" + name + "\" by \"" + brand + "\" (" + category + ") in Ghana (GHS). " +
            "Search multiple major Ghanaian retailers — Jumia Ghana (jumia.com.gh), Kikuu Ghana, Tonaton Ghana, " +
            "CompuGhana, Franko Trading — and local Ghanaian markets (Accra, Kumasi, Tamale). Don't rely on just one " +
            "store: priceGhsTypical should be a representative price across whichever of these actually have a real " +
            "listing, not automatically whichever store happens to be searched first.\n\n" +
            "Also try to find each seller's real, publicly-listed customer service phone number and/or WhatsApp " +
            "number (from their official website, Google Business listing, or verified social media) so a user can " +
            "actually contact them. This is important, but accuracy matters more than completeness here: only include " +
            "a number if you are confident it is genuinely published for that seller. Never guess, infer, or " +
            "construct a plausible-looking number — leave phone/whatsapp as empty strings if you didn't find one " +
            "explicitly, rather than provide something that might be wrong.\n\n" +
            "After searching, respond with ONLY the following JSON — no markdown, no explanation, just the JSON:\n" +
            "{\n" +
            "  \"specs\": {\n" +
            "    \"<spec-name>\": \"<spec-value>\"\n" +
            "    // Include ALL relevant specs: dimensions, weight, material, color options, capacity, power/voltage,\n" +
            "    // processor/model number, RAM/storage (for electronics), ingredients/nutrition (for food),\n" +
            "    // country of origin, warranty, compatibility, certifications — NOTHING left out\n" +
            "  },\n" +
            "  \"priceGhsMin\": <lowest price found as a number>,\n" +
            "  \"priceGhsMax\": <highest price found as a number>,\n" +
            "  \"priceGhsTypical\": <a representative price across the real listings you found — not tied to one specific store>,\n" +
            "  \"sellers\": [\n" +
            "    {\"name\": \"<seller name>\", \"url\": \"<direct product URL or search URL>\", \"location\": \"<Online · Platform or City · Market>\", \"price\": <price as a number>, \"phone\": \"<intl format e.g. +233... or empty string>\", \"whatsapp\": \"<intl format or empty string>\"}\n" +
            "  ]\n" +
            "}\n\n" +
            "Requirements:\n" +
            "- Include every seller you found with real prices in GHS\n" +
            "- Always include a Jumia Ghana entry: {\"name\":\"Jumia Ghana\",\"url\":\"https://www.jumia.com.gh/catalog/?q=" + encodedName + "\",\"location\":\"Online · Nationwide\",\"price\":<the real price you found on Jumia, or 0 only if you genuinely found no listing>,\"phone\":\"\",\"whatsapp\":\"\"}\n" +
            "- Always include: {\"name\":\"Kikuu Ghana\",\"url\":\"https://www.kikuu.com/catalog/search/?q=" + encodedName + "\",\"location\":\"Online · Budget Import\",\"price\":<real price found, or 0>,\"phone\":\"\",\"whatsapp\":\"\"}\n" +
            "- Always include: {\"name\":\"Tonaton Ghana\",\"url\":\"https://tonaton.com/en_GH/search?q=" + encodedName + "\",\"location\":\"Online · Classifieds\",\"price\":<real price found, or 0>,\"phone\":\"\",\"whatsapp\":\"\"}\n" +
            "- specs: include EVERY spec you can find — 6-15 attributes minimum\n" +
            "- All price values must be plain numbers (no currency symbols)\n" +
            "- Only set a seller's price to 0 if you genuinely could not find one after searching — do not default to 0 out of caution\n" +
            "- phone/whatsapp: empty string is the correct, expected answer most of the time — only fill these in when genuinely confident";

        Map<String, Object> reqMap = new HashMap<>();
        reqMap.put("contents", List.of(Map.of("parts", List.of(Map.of("text", prompt)))));
        reqMap.put("tools", List.of(Map.of("google_search", Map.of())));
        reqMap.put("generationConfig", Map.of(
            "temperature", 0.1,
            "maxOutputTokens", 2048,
            "thinkingConfig", Map.of("thinkingBudget", 0)
        ));

        String body = mapper.writeValueAsString(reqMap);

        Request req = new Request.Builder()
                .url(GEMINI_URL)
                .addHeader("X-goog-api-key", geminiKey)
                .post(RequestBody.create(body, MediaType.get("application/json")))
                .build();

        try (Response resp = http.newCall(req).execute()) {
            String respBody = resp.body() != null ? resp.body().string() : "";
            if (resp.code() == 429) throw new QuotaExceededException(respBody.substring(0, Math.min(80, respBody.length())));
            if (!resp.isSuccessful()) {
                log.warn("Gemini research error {}: {}", resp.code(), respBody.substring(0, Math.min(200, respBody.length())));
                return null;
            }
            JsonNode root = mapper.readTree(respBody);
            // Grounding may split response across multiple parts — concatenate all text parts
            JsonNode candidates = root.path("candidates");
            JsonNode candidate = candidates.isArray() && candidates.size() > 0 ? candidates.get(0) : null;
            if (candidate == null) {
                String blockReason = root.path("promptFeedback").path("blockReason").asText("unknown");
                log.warn("Gemini research returned no candidates for '{}' (blockReason={})", name, blockReason);
                return null;
            }
            JsonNode parts = candidate.path("content").path("parts");
            StringBuilder sb = new StringBuilder();
            if (parts.isArray()) {
                for (JsonNode part : parts) {
                    String t = part.path("text").asText("").trim();
                    if (!t.isEmpty()) sb.append(t).append("\n");
                }
            }
            String text = sb.toString().trim();
            if (text.isEmpty()) {
                String finishReason = candidate.path("finishReason").asText("unknown");
                log.warn("Gemini research produced no text for '{}' (finishReason={})", name, finishReason);
                return null;
            }
            log.debug("Grounded research for '{}': {}...", name, text.substring(0, Math.min(200, text.length())));
            return parseResearch(text);
        }
    }

    // ── OpenRouter Vision ─────────────────────────────────────────────────────

    private ProductInfo callOpenRouterVision(byte[] imageBytes, String mimeType) {
        try {
            String b64 = Base64.getEncoder().encodeToString(imageBytes);
            String dataUri = "data:" + mimeType + ";base64," + b64;

            String body = mapper.writeValueAsString(Map.of(
                "model", "google/gemini-2.5-flash:free",
                "messages", List.of(Map.of(
                    "role", "user",
                    "content", List.of(
                        Map.of("type", "text", "text", IDENTIFY_PROMPT),
                        Map.of("type", "image_url", "image_url", Map.of("url", dataUri))
                    )
                )),
                "max_tokens", 256,
                "temperature", 0.1
            ));

            Request req = new Request.Builder()
                    .url(OPENROUTER_URL)
                    .addHeader("Authorization", "Bearer " + openRouterKey)
                    .addHeader("HTTP-Referer", "https://scanit.app")
                    .post(RequestBody.create(body, MediaType.get("application/json")))
                    .build();

            try (Response resp = http.newCall(req).execute()) {
                String respBody = resp.body() != null ? resp.body().string() : "";
                if (!resp.isSuccessful()) {
                    log.error("OpenRouter vision error {}: {}", resp.code(), respBody.substring(0, Math.min(200, respBody.length())));
                    return null;
                }
                JsonNode root = mapper.readTree(respBody);
                String text = root.path("choices").get(0).path("message").path("content").asText("").trim();
                return parseProductInfo(text);
            }
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            log.error("OpenRouter vision failed: {}", e.getMessage());
            return null;
        }
    }

    // ── OpenRouter Research (training-data prices — no live search) ───────────

    private ProductResearch callOpenRouterResearch(String name, String brand, String category) throws Exception {
        String encodedName = name.replace(" ", "+");
        String prompt =
            "You are a Ghana market expert. Product: \"" + name + "\" by \"" + brand + "\" (" + category + ").\n\n" +
            "Respond with ONLY valid JSON (no markdown):\n" +
            "{\n" +
            "  \"specs\": {\"<key>\": \"<value>\"},\n" +
            "  \"priceGhsMin\": <number>,\n" +
            "  \"priceGhsMax\": <number>,\n" +
            "  \"priceGhsTypical\": <number>,\n" +
            "  \"sellers\": [\n" +
            "    {\"name\": \"Jumia Ghana\", \"url\": \"https://www.jumia.com.gh/catalog/?q=" + encodedName + "\", \"location\": \"Online · Nationwide\", \"price\": <number>},\n" +
            "    {\"name\": \"Kikuu Ghana\", \"url\": \"https://www.kikuu.com/catalog/search/?q=" + encodedName + "\", \"location\": \"Online · Budget Import\", \"price\": <number>},\n" +
            "    {\"name\": \"Tonaton Ghana\", \"url\": \"https://tonaton.com/en_GH/search?q=" + encodedName + "\", \"location\": \"Online · Classifieds\", \"price\": <number>},\n" +
            "    {\"name\": \"Makola Market\", \"url\": \"\", \"location\": \"Accra · Makola Market\", \"price\": <number>},\n" +
            "    {\"name\": \"Kejetia Market\", \"url\": \"\", \"location\": \"Kumasi · Kejetia Market\", \"price\": <number>}\n" +
            "  ]\n" +
            "}\n" +
            "Rules: 4-7 specs, realistic 2025 Ghana GHS prices, include AliExpress for electronics.";

        String body = mapper.writeValueAsString(Map.of(
            "model", "google/gemini-2.0-flash-lite:free",
            "messages", List.of(Map.of("role", "user", "content", prompt)),
            "max_tokens", 1024,
            "temperature", 0.1
        ));

        Request req = new Request.Builder()
                .url(OPENROUTER_URL)
                .addHeader("Authorization", "Bearer " + openRouterKey)
                .addHeader("HTTP-Referer", "https://scanit.app")
                .post(RequestBody.create(body, MediaType.get("application/json")))
                .build();

        try (Response resp = http.newCall(req).execute()) {
            String respBody = resp.body() != null ? resp.body().string() : "";
            if (!resp.isSuccessful()) {
                log.error("OpenRouter research error {}: {}", resp.code(), respBody.substring(0, Math.min(200, respBody.length())));
                return null;
            }
            JsonNode root = mapper.readTree(respBody);
            String text = root.path("choices").get(0).path("message").path("content").asText("").trim();
            return parseResearch(text);
        }
    }

    // ── Prompts ───────────────────────────────────────────────────────────────

    private static final String IDENTIFY_PROMPT =
        "You are a product identification AI. Look at this image carefully and identify what product or item is shown.\n\n" +
        "IMPORTANT: Be generous — identify ANY physical object: consumer goods, food, drinks, electronics, clothing, " +
        "household items, tools, stationery, cosmetics, medicine, etc. Even if the brand is unclear, identify the item type.\n\n" +
        "Also assess two things from the image itself:\n" +
        "1. confidence — how clearly and unambiguously you can identify this exact product (not a generic guess), as an integer 50-99.\n" +
        "   Sharp, well-lit, clearly-branded packaging = 90-99. Partial/blurry/unusual angle = 65-85. Ambiguous or generic-looking = 50-64.\n" +
        "2. authenticity — inspect packaging quality, print sharpness, logo accuracy, spelling, and material finish for counterfeit signs:\n" +
        "   \"authentic\" — packaging looks consistent with the genuine brand, no red flags.\n" +
        "   \"suspicious\" — some inconsistency (blurry print, off colors, misspelled text, generic packaging for a branded item).\n" +
        "   \"counterfeit\" — clear counterfeit indicators (fake holograms, wrong logo, obviously copied packaging).\n" +
        "   Default to \"authentic\" when there is nothing suspicious to point to — do not guess counterfeit without a concrete visual reason.\n\n" +
        "Respond with ONLY this JSON (no markdown, no explanation):\n" +
        "{\"name\":\"<specific product name, e.g. Coca-Cola 500ml, Samsung Galaxy A54, Indomie Instant Noodles>\",\n" +
        " \"brand\":\"<brand name or 'Unknown' if not visible>\",\n" +
        " \"category\":\"<Electronics|Clothing|Food|Drinks|Personal Care|Home|Stationery|Health|Tools|General>\",\n" +
        " \"description\":\"<2-3 sentences describing what this product is and its main use>\",\n" +
        " \"confidence\":<integer 50-99>,\n" +
        " \"authenticity\":\"<authentic|suspicious|counterfeit>\"}\n\n" +
        "Only return empty name if the image is completely blank, a person only (no product), or totally unrecognisable.\n" +
        "If no clear product: {\"name\":\"\",\"brand\":\"\",\"category\":\"General\",\"description\":\"\",\"confidence\":0,\"authenticity\":\"authentic\"}";

    // ── Parsers ───────────────────────────────────────────────────────────────

    private ProductInfo parseProductInfo(String text) throws Exception {
        text = extractJson(text);
        JsonNode json = mapper.readTree(text);
        String name = json.path("name").asText("").trim();
        if (name.isEmpty()) return null;

        int confidence = json.path("confidence").asInt(0);
        if (confidence < 50 || confidence > 99) confidence = 0; // let ScanService apply its fallback

        String authenticity = json.path("authenticity").asText("authentic").trim().toLowerCase();
        if (!authenticity.equals("authentic") && !authenticity.equals("suspicious") && !authenticity.equals("counterfeit")) {
            authenticity = "authentic";
        }

        return new ProductInfo(
            name,
            json.path("brand").asText("Unknown").trim(),
            json.path("category").asText("General").trim(),
            json.path("description").asText("").trim(),
            confidence,
            authenticity
        );
    }

    private ProductResearch parseResearch(String text) {
        try {
            text = extractJson(text);
            JsonNode json = mapper.readTree(text);

            Map<String, String> specs = new HashMap<>();
            JsonNode specsNode = json.path("specs");
            if (specsNode.isObject()) {
                specsNode.fields().forEachRemaining(e -> specs.put(e.getKey(), e.getValue().asText()));
            }

            double priceMin = json.path("priceGhsMin").asDouble(0);
            double priceMax = json.path("priceGhsMax").asDouble(0);
            double priceTypical = json.path("priceGhsTypical").asDouble(0);

            List<ResearchSeller> sellers = new ArrayList<>();
            JsonNode sellersNode = json.path("sellers");
            if (sellersNode.isArray()) {
                for (JsonNode s : sellersNode) {
                    String sellerName = s.path("name").asText("").trim();
                    if (!sellerName.isEmpty()) {
                        sellers.add(new ResearchSeller(
                            sellerName,
                            s.path("url").asText("").trim(),
                            s.path("location").asText("Ghana").trim(),
                            s.path("price").asDouble(0),
                            s.path("phone").asText("").trim(),
                            s.path("whatsapp").asText("").trim()
                        ));
                    }
                }
            }

            return new ProductResearch(specs, priceMin, priceMax, priceTypical, sellers);
        } catch (Exception e) {
            log.warn("Failed to parse product research JSON: {}", e.getMessage());
            return null;
        }
    }

    private String extractJson(String text) {
        text = text.replaceAll("```json\\s*", "").replaceAll("```\\s*", "").trim();
        int start = text.indexOf('{');
        int end = text.lastIndexOf('}');
        if (start >= 0 && end > start) text = text.substring(start, end + 1);
        return text;
    }

    private static class QuotaExceededException extends RuntimeException {
        QuotaExceededException(String msg) { super(msg); }
    }
}
