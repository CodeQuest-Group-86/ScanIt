package com.scanit.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import okhttp3.HttpUrl;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Live price comparison and "where to buy" links via SerpAPI's Google Shopping engine
 * (free tier: 100 searches/month). Called once per scan, right after Gemini identifies
 * the product — Spring Boot does the scraping server-side so no API key is ever exposed
 * to the client.
 */
@Service
@Slf4j
public class SerpApiService {

    @Value("${serpapi.api-key:}") private String apiKey;

    private static final String SEARCH_URL = "https://serpapi.com/search.json";
    private static final Pattern PRICE_PATTERN =
        Pattern.compile("[\\d,]+(?:\\.\\d{1,2})?");

    private final OkHttpClient http = new OkHttpClient.Builder()
            .callTimeout(20, TimeUnit.SECONDS)
            .build();
    private final ObjectMapper mapper = new ObjectMapper();

    public record PriceResult(String source, String url, double price, String location) {}

    public record ProductSearch(List<PriceResult> sellers, String googleSearchUrl) {}

    public boolean isConfigured() {
        return apiKey != null && !apiKey.isBlank();
    }

    /** Searches Google Shopping (via SerpAPI) for live Ghana prices and seller links. */
    public ProductSearch searchPrices(String name, String brand, String category) {
        String query = buildQuery(name, brand);
        String googleSearchUrl = "https://www.google.com/search?q="
                + URLEncoder.encode(query + " buy Ghana", StandardCharsets.UTF_8);

        if (!isConfigured()) {
            log.warn("SerpAPI not configured — skipping live price search for '{}'", name);
            return new ProductSearch(List.of(), googleSearchUrl);
        }

        try {
            HttpUrl url = HttpUrl.parse(SEARCH_URL).newBuilder()
                    .addQueryParameter("engine", "google_shopping")
                    .addQueryParameter("q", query)
                    .addQueryParameter("gl", "gh")
                    .addQueryParameter("hl", "en")
                    .addQueryParameter("google_domain", "google.com")
                    .addQueryParameter("api_key", apiKey)
                    .build();

            Request request = new Request.Builder().url(url).get().build();

            try (Response response = http.newCall(request).execute()) {
                String body = response.body() != null ? response.body().string() : "";
                if (!response.isSuccessful()) {
                    log.warn("SerpAPI error {}: {}", response.code(), body.substring(0, Math.min(200, body.length())));
                    return new ProductSearch(List.of(), googleSearchUrl);
                }

                JsonNode root = mapper.readTree(body);
                JsonNode items = root.path("shopping_results");
                List<PriceResult> sellers = new ArrayList<>();

                if (items.isArray()) {
                    for (JsonNode item : items) {
                        String source = item.path("source").asText("").trim();
                        if (source.isBlank()) continue;

                        double price = item.hasNonNull("extracted_price")
                                ? item.path("extracted_price").asDouble(0)
                                : extractPrice(item.path("price").asText(""));

                        String link = item.path("product_link").asText(item.path("link").asText(""));

                        sellers.add(new PriceResult(source, link, price, "Online · Ghana"));
                        if (sellers.size() >= 10) break;
                    }
                }

                log.debug("SerpAPI found {} sellers for '{}'", sellers.size(), name);
                return new ProductSearch(sellers, googleSearchUrl);
            }
        } catch (Exception e) {
            log.warn("SerpAPI search failed for '{}': {}", name, e.getMessage());
            return new ProductSearch(List.of(), googleSearchUrl);
        }
    }

    private String buildQuery(String name, String brand) {
        boolean hasBrand = brand != null && !brand.isBlank() && !"Unknown".equalsIgnoreCase(brand);
        return hasBrand ? (name + " " + brand).trim() : name.trim();
    }

    private double extractPrice(String text) {
        if (text == null || text.isBlank()) return 0;
        Matcher m = PRICE_PATTERN.matcher(text);
        if (m.find()) {
            try {
                return Double.parseDouble(m.group().replace(",", ""));
            } catch (NumberFormatException ignored) {
                return 0;
            }
        }
        return 0;
    }
}
