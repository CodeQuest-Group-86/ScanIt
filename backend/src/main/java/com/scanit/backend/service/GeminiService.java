package com.scanit.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import okhttp3.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Base64;
import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * Product identification via Gemini Vision (free tier: 1,500 requests/day). Reads a
 * scan photo and returns the product name / brand / category / authenticity read.
 * Live pricing and "where to buy" links come from {@link SerpApiService} afterwards.
 */
@Service
@Slf4j
public class GeminiService {

    @Value("${gemini.api-key:}") private String geminiKey;

    private static final String GEMINI_URL =
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

    private final OkHttpClient http = new OkHttpClient.Builder()
            .callTimeout(30, TimeUnit.SECONDS).build();
    private final ObjectMapper mapper = new ObjectMapper();

    public record ProductInfo(String name, String brand, String category, String description,
                               int confidence, String authenticity) {}

    // ── Vision: identify product from image ────────────────────────────────────

    public ProductInfo identifyProduct(byte[] imageBytes, String mimeType) {
        if (geminiKey == null || geminiKey.isBlank()) {
            throw new com.scanit.backend.exception.BadRequestException(
                "AI vision not configured. Set gemini.api-key.");
        }
        try {
            return callGeminiVision(imageBytes, mimeType);
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            log.warn("Gemini vision failed: {}", e.getMessage());
            return null;
        }
    }

    private ProductInfo callGeminiVision(byte[] imageBytes, String mimeType) throws Exception {
        String b64 = Base64.getEncoder().encodeToString(imageBytes);
        // thinkingConfig must be INSIDE generationConfig; thinkingBudget=0 disables thinking
        // so parts[0] is always the real response text, not a thought block
        String body = mapper.writeValueAsString(Map.of(
            "contents", java.util.List.of(Map.of("parts", java.util.List.of(
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
            if (resp.code() == 429) {
                log.warn("Gemini vision quota exceeded: {}", respBody.substring(0, Math.min(80, respBody.length())));
                return null;
            }
            if (!resp.isSuccessful()) {
                log.error("Gemini vision error {}: {}", resp.code(), respBody.substring(0, Math.min(200, respBody.length())));
                return null;
            }
            JsonNode root = mapper.readTree(respBody);
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

    // ── Prompt ────────────────────────────────────────────────────────────────

    private static final String IDENTIFY_PROMPT =
        "You are a product identification AI. Look at this image carefully.\n\n" +
        "CRITICAL RULES:\n" +
        "1. ONLY identify the MAIN product clearly visible in the image. Ignore background clutter, packaging materials, people, or unrelated objects.\n" +
        "2. The 'name' MUST include the specific variant/model/size visible on the product. Examples:\n" +
        "   - If you see a Coca-Cola bottle with '500ml' on it → name: \"Coca-Cola 500ml\"\n" +
        "   - If you see a Samsung phone → name: \"Samsung Galaxy A54\" (include exact model if visible)\n" +
        "   - If you see Indomie noodles → name: \"Indomie Instant Noodles\"\n" +
        "   - If you see a Dell laptop → name: \"Dell Inspiron 15 3520\" (include model number if visible)\n" +
        "3. Extract brand, category, and a 1-2 sentence description.\n" +
        "4. If the product is a drink/food, ALWAYS include the volume/weight in the name (e.g., '500ml', '1L', '250g').\n" +
        "5. If the product is electronics, ALWAYS try to identify the exact model number.\n" +
        "6. If you cannot read any text/label on the product, say so in the description but still give your best guess for the name.\n\n" +
        "Respond with ONLY this JSON (no markdown, no explanation):\n" +
        "{\"name\":\"<EXACT product name with model/size/variant, e.g. Coca-Cola 500ml>\",\n" +
        " \"brand\":\"<brand name or 'Unknown'>\",\n" +
        " \"category\":\"<Electronics|Clothing|Food|Drinks|Personal Care|Home|Stationery|Health|Tools|General>\",\n" +
        " \"confidence\":<integer 50-99>,\n" +
        " \"authenticity\":\"<authentic|suspicious|counterfeit>\",\n" +
        " \"description\":\"<1-2 sentences about what this product is and its main use>\"}\n\n" +
        "Only return empty name if the image is completely blank, a person only (no product), or totally unrecognisable.\n" +
        "If no clear product: {\"name\":\"\",\"brand\":\"\",\"category\":\"General\",\"confidence\":0,\"authenticity\":\"authentic\",\"description\":\"\"}";

    // ── Parser ────────────────────────────────────────────────────────────────

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

    private String extractJson(String text) {
        text = text.replaceAll("```json\\s*", "").replaceAll("```\\s*", "").trim();
        int start = text.indexOf('{');
        int end = text.lastIndexOf('}');
        if (start >= 0 && end > start) text = text.substring(start, end + 1);
        return text;
    }
}
