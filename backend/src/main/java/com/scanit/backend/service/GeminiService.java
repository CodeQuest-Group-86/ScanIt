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
