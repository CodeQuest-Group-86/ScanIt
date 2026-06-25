package com.scanit.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import okhttp3.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * Identifies products from images using either:
 *  1. Google Gemini Vision  (gemini.api-key)   — 1,500 req/day free
 *  2. OpenRouter            (openrouter.api-key) — free models available, no quota issues
 *
 * Set at least one key in application-dev.yml / env.
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

    private final OkHttpClient http = new OkHttpClient.Builder()
            .callTimeout(45, TimeUnit.SECONDS).build();
    private final ObjectMapper mapper = new ObjectMapper();

    public record ProductInfo(String name, String brand, String category, String description) {}

    public ProductInfo identifyProduct(byte[] imageBytes, String mimeType) {
        boolean hasGemini = geminiKey != null && !geminiKey.isBlank();
        boolean hasOpenRouter = openRouterKey != null && !openRouterKey.isBlank();

        if (!hasGemini && !hasOpenRouter) {
            throw new com.scanit.backend.exception.BadRequestException(
                "AI vision not configured. Set gemini.api-key or openrouter.api-key.");
        }

        if (hasGemini) {
            try {
                ProductInfo result = callGemini(imageBytes, mimeType);
                if (result != null) return result;
            } catch (QuotaExceededException e) {
                log.warn("Gemini quota exceeded — {}", hasOpenRouter ? "falling back to OpenRouter" : "no fallback");
            } catch (RuntimeException e) {
                throw e;
            } catch (Exception e) {
                log.warn("Gemini call failed: {} — {}", e.getMessage(), hasOpenRouter ? "trying OpenRouter" : "no fallback");
            }
        }

        if (hasOpenRouter) {
            return callOpenRouter(imageBytes, mimeType);
        }

        return null;
    }

    // ── Gemini ────────────────────────────────────────────────────────────────

    private ProductInfo callGemini(byte[] imageBytes, String mimeType) throws Exception {
        String b64 = Base64.getEncoder().encodeToString(imageBytes);
        String body = mapper.writeValueAsString(Map.of(
            "contents", List.of(Map.of("parts", List.of(
                Map.of("text", PROMPT),
                Map.of("inline_data", Map.of("mime_type", mimeType, "data", b64))
            ))),
            "generationConfig", Map.of("temperature", 0.1, "maxOutputTokens", 256)
        ));

        Request req = new Request.Builder()
                .url(GEMINI_URL)
                .addHeader("X-goog-api-key", geminiKey)
                .post(RequestBody.create(body, MediaType.get("application/json")))
                .build();

        try (Response resp = http.newCall(req).execute()) {
            String respBody = resp.body() != null ? resp.body().string() : "";
            if (resp.code() == 429) throw new QuotaExceededException("Gemini quota: " + respBody.substring(0, Math.min(80, respBody.length())));
            if (!resp.isSuccessful()) {
                log.error("Gemini error {}: {}", resp.code(), respBody.substring(0, Math.min(200, respBody.length())));
                return null;
            }
            JsonNode root = mapper.readTree(respBody);
            String text = root.path("candidates").get(0)
                    .path("content").path("parts").get(0).path("text").asText("").trim();
            return parseJson(text);
        }
    }

    // ── OpenRouter ────────────────────────────────────────────────────────────

    private ProductInfo callOpenRouter(byte[] imageBytes, String mimeType) {
        try {
            String b64 = Base64.getEncoder().encodeToString(imageBytes);
            String dataUri = "data:" + mimeType + ";base64," + b64;

            String body = mapper.writeValueAsString(Map.of(
                "model", "google/gemini-2.5-flash:free",
                "messages", List.of(Map.of(
                    "role", "user",
                    "content", List.of(
                        Map.of("type", "text", "text", PROMPT),
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
                    log.error("OpenRouter error {}: {}", resp.code(), respBody.substring(0, Math.min(200, respBody.length())));
                    return null;
                }
                JsonNode root = mapper.readTree(respBody);
                String text = root.path("choices").get(0)
                        .path("message").path("content").asText("").trim();
                return parseJson(text);
            }
        } catch (RuntimeException e) { throw e; }
        catch (Exception e) {
            log.error("OpenRouter call failed: {}", e.getMessage());
            return null;
        }
    }

    // ── Shared ────────────────────────────────────────────────────────────────

    private static final String PROMPT =
        "Look at this image and identify the product. Respond with ONLY a JSON object:\n" +
        "{\"name\":\"<product name>\",\"brand\":\"<brand or Unknown>\"," +
        "\"category\":\"<Electronics|Clothing|Food|Drinks|Care|Home|Stationery|Health|General>\"," +
        "\"description\":\"<1-2 sentences>\"}\n" +
        "If no clear product is visible: {\"name\":\"\",\"brand\":\"\",\"category\":\"General\",\"description\":\"\"}";

    private ProductInfo parseJson(String text) throws Exception {
        text = text.replaceAll("```json\\s*", "").replaceAll("```\\s*", "").trim();
        // Extract JSON object if surrounded by other text
        int start = text.indexOf('{'), end = text.lastIndexOf('}');
        if (start >= 0 && end > start) text = text.substring(start, end + 1);
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

    private static class QuotaExceededException extends RuntimeException {
        QuotaExceededException(String msg) { super(msg); }
    }
}
