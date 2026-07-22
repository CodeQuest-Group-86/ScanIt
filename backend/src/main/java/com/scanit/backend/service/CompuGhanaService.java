package com.scanit.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import org.springframework.stereotype.Service;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;

/**
 * Real per-product prices from CompuGhana's own Shopify search API — the only one of the
 * originally-requested Ghanaian retailers (Jumia, Melcom, CompuGhana, Shoprite) that's
 * actually scrapeable server-side:
 *  - Jumia returns 403 (bot-protected)
 *  - Melcom sits behind a Sucuri firewall (redirects/challenges non-browser clients)
 *  - Shoprite Ghana has no online store at all, only a physical-store locator
 * Every price here is real and live, not a generic search-snippet guess.
 */
@Service
@Slf4j
public class CompuGhanaService {

    private static final String SEARCH_URL = "https://compughana.com/search/suggest.json";

    private final OkHttpClient http = new OkHttpClient.Builder()
            .callTimeout(10, TimeUnit.SECONDS)
            .build();
    private final ObjectMapper mapper = new ObjectMapper();

    public record Listing(String name, double price, String url, String imageUrl) {}

    /** Returns the best-matching product listing, or empty if nothing was found/reachable. */
    public List<Listing> search(String query) {
        List<Listing> results = new ArrayList<>();
        try {
            String url = SEARCH_URL + "?q=" + URLEncoder.encode(query, StandardCharsets.UTF_8)
                    + "&resources%5Btype%5D=product&resources%5Blimit%5D=5";
            Request request = new Request.Builder()
                    .url(url)
                    .header("User-Agent", "Mozilla/5.0 (compatible; ScanIt/1.0)")
                    .get()
                    .build();

            try (Response response = http.newCall(request).execute()) {
                if (!response.isSuccessful() || response.body() == null) return results;
                JsonNode root = mapper.readTree(response.body().string());
                JsonNode products = root.path("resources").path("results").path("products");
                for (JsonNode p : products) {
                    double price = p.path("price").asDouble(0);
                    String handle = p.path("handle").asText("");
                    if (price <= 0 || handle.isBlank()) continue;
                    results.add(new Listing(
                            p.path("title").asText(""),
                            price,
                            "https://compughana.com/products/" + handle,
                            p.path("featured_image").path("url").asText(null)
                    ));
                }
            }
        } catch (Exception e) {
            log.warn("CompuGhana search failed for '{}': {}", query, e.getMessage());
        }
        return results;
    }
}
