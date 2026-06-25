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

    public record ProductInfo(String name, String brand, String category, String description) {}

    public record ResearchSeller(String name, String url, String location, double price) {}

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

    // ── Gemini Vision ─────────────────────────────────────────────────────────

    private ProductInfo callGeminiVision(byte[] imageBytes, String mimeType) throws Exception {
        String b64 = Base64.getEncoder().encodeToString(imageBytes);
        String body = mapper.writeValueAsString(Map.of(
            "contents", List.of(Map.of("parts", List.of(
                Map.of("text", IDENTIFY_PROMPT),
                Map.of("inline_data", Map.of("mime_type", mimeType, "data", b64))
            ))),
            "generationConfig", Map.of("temperature", 0.1, "maxOutputTokens", 512),
            "thinkingConfig", Map.of("thinkingBudget", 512)
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
            String text = root.path("candidates").get(0)
                    .path("content").path("parts").get(0).path("text").asText("").trim();
            return parseProductInfo(text);
        }
    }

    // ── Gemini Research (Google Search grounding — real live prices) ──────────

    private ProductResearch callGeminiResearch(String name, String brand, String category) throws Exception {
        String encodedName = name.replace(" ", "+");

        String prompt =
            "Search for the current retail price and full product specs of \"" + name + "\" by \"" + brand + "\" (" + category + ") in Ghana (GHS). " +
            "Search Jumia Ghana (jumia.com.gh), Tonaton Ghana, Kikuu Ghana, CompuGhana, Franko Trading, and local Ghanaian markets (Accra, Kumasi, Tamale).\n\n" +
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
            "  \"priceGhsTypical\": <typical/most-common price as a number>,\n" +
            "  \"sellers\": [\n" +
            "    {\"name\": \"<seller name>\", \"url\": \"<direct product URL or search URL>\", \"location\": \"<Online · Platform or City · Market>\", \"price\": <price as a number>}\n" +
            "  ]\n" +
            "}\n\n" +
            "Requirements:\n" +
            "- Include every seller you found with real prices in GHS\n" +
            "- Always include: {\"name\":\"Jumia Ghana\",\"url\":\"https://www.jumia.com.gh/catalog/?q=" + encodedName + "\",\"location\":\"Online · Nationwide\",\"price\":0}\n" +
            "- Always include: {\"name\":\"Kikuu Ghana\",\"url\":\"https://www.kikuu.com/catalog/search/?q=" + encodedName + "\",\"location\":\"Online · Budget Import\",\"price\":0}\n" +
            "- Always include: {\"name\":\"Tonaton Ghana\",\"url\":\"https://tonaton.com/en_GH/search?q=" + encodedName + "\",\"location\":\"Online · Classifieds\",\"price\":0}\n" +
            "- specs: include EVERY spec you can find — 6-15 attributes minimum\n" +
            "- All price values must be plain numbers (no currency symbols)\n" +
            "- If price not found for a seller, set price to 0";

        Map<String, Object> reqMap = new HashMap<>();
        reqMap.put("contents", List.of(Map.of("parts", List.of(Map.of("text", prompt)))));
        reqMap.put("tools", List.of(Map.of("google_search", Map.of())));
        reqMap.put("generationConfig", Map.of("temperature", 0.1, "maxOutputTokens", 2048));

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
            JsonNode parts = root.path("candidates").get(0).path("content").path("parts");
            StringBuilder sb = new StringBuilder();
            if (parts.isArray()) {
                for (JsonNode part : parts) {
                    String t = part.path("text").asText("").trim();
                    if (!t.isEmpty()) sb.append(t).append("\n");
                }
            }
            String text = sb.toString().trim();
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
        "Respond with ONLY this JSON (no markdown, no explanation):\n" +
        "{\"name\":\"<specific product name, e.g. Coca-Cola 500ml, Samsung Galaxy A54, Indomie Instant Noodles>\",\n" +
        " \"brand\":\"<brand name or 'Unknown' if not visible>\",\n" +
        " \"category\":\"<Electronics|Clothing|Food|Drinks|Personal Care|Home|Stationery|Health|Tools|General>\",\n" +
        " \"description\":\"<2-3 sentences describing what this product is and its main use>\"}\n\n" +
        "Only return empty name if the image is completely blank, a person only (no product), or totally unrecognisable.\n" +
        "If no clear product: {\"name\":\"\",\"brand\":\"\",\"category\":\"General\",\"description\":\"\"}";

    // ── Parsers ───────────────────────────────────────────────────────────────

    private ProductInfo parseProductInfo(String text) throws Exception {
        text = extractJson(text);
        JsonNode json = mapper.readTree(text);
        String name = json.path("name").asText("").trim();
        if (name.isEmpty()) return null;
        return new ProductInfo(
            name,
            json.path("brand").asText("Unknown").trim(),
            json.path("category").asText("General").trim(),
            json.path("description").asText("").trim()
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
                            s.path("price").asDouble(0)
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
