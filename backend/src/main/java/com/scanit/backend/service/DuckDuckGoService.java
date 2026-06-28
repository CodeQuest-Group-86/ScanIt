package com.scanit.backend.service;

import lombok.extern.slf4j.Slf4j;
import okhttp3.*;
import org.springframework.stereotype.Service;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * DuckDuckGo HTML lite search — finds retailers and product pages without an API key.
 * Seller links point to Google Search so users leave the app to compare prices.
 */
@Service
@Slf4j
public class DuckDuckGoService {

    private static final Pattern LINK_PATTERN =
        Pattern.compile("class=\"result__a\"[^>]*href=\"([^\"]+)\"[^>]*>([^<]*)</");
    private static final Pattern SNIPPET_PATTERN =
        Pattern.compile("class=\"result__snippet\"[^>]*>([\\s\\S]*?)</a>");

    private static final List<Map<String, String>> GHANA_RETAILERS = List.of(
        Map.of("name", "Jumia Ghana", "site", "jumia.com.gh", "location", "Online · Nationwide"),
        Map.of("name", "Tonaton Ghana", "site", "tonaton.com", "location", "Online · Classifieds"),
        Map.of("name", "Kikuu Ghana", "site", "kikuu.com", "location", "Online · Budget Import"),
        Map.of("name", "CompuGhana", "site", "compughana.com", "location", "Online · Electronics"),
        Map.of("name", "Franko Trading", "site", "frankotrading.com", "location", "Accra · Electronics")
    );

    private final OkHttpClient http = new OkHttpClient();

    public record SearchHit(String title, String url, String snippet) {}

    public record ProductSearch(
        List<GeminiService.ResearchSeller> sellers,
        List<String> snippets,
        String googleSearchUrl,
        String duckDuckGoSearchUrl,
        double detectedPrice
    ) {}

    /** Search DuckDuckGo and build seller list with Google Search URLs. */
    public ProductSearch searchProduct(String name, String brand, String category) {
        String query = (name + " " + (brand != null && !brand.isBlank() && !"Unknown".equalsIgnoreCase(brand) ? brand + " " : "")
            + "buy price Ghana " + category).trim();

        List<SearchHit> hits = searchWeb(query);
        List<String> snippets = hits.stream().map(SearchHit::snippet).filter(s -> !s.isBlank()).toList();

        double detectedPrice = 0;
        for (SearchHit hit : hits) {
            detectedPrice = extractPrice(hit.title() + " " + hit.snippet());
            if (detectedPrice > 0) break;
        }

        List<GeminiService.ResearchSeller> sellers = new ArrayList<>();
        Set<String> seen = new HashSet<>();

        for (Map<String, String> retailer : GHANA_RETAILERS) {
            String rName = retailer.get("name");
            seen.add(rName.toLowerCase());
            sellers.add(new GeminiService.ResearchSeller(
                rName,
                buildGoogleSearchUrl(name, rName),
                retailer.get("location"),
                detectedPrice
            ));
        }

        for (SearchHit hit : hits) {
            if (!isShoppingHit(hit)) continue;
            String host;
            try {
                host = new java.net.URI(hit.url()).getHost().replace("www.", "");
            } catch (Exception e) {
                continue;
            }
            if (host.isBlank() || seen.contains(host)) continue;
            seen.add(host);

            String displayName = host.substring(0, 1).toUpperCase() + host.substring(1);
            double price = extractPrice(hit.title() + " " + hit.snippet());
            sellers.add(new GeminiService.ResearchSeller(
                displayName,
                buildGoogleSearchUrl(name, displayName),
                hit.url().contains(".gh") ? "Online · Ghana" : "Online",
                price
            ));
        }

        return new ProductSearch(
            sellers,
            snippets,
            buildProductGoogleUrl(name, brand),
            "https://duckduckgo.com/?q=" + URLEncoder.encode(query, StandardCharsets.UTF_8) + "&ia=web",
            detectedPrice
        );
    }

    private List<SearchHit> searchWeb(String query) {
        try {
            RequestBody body = RequestBody.create(
                "q=" + URLEncoder.encode(query, StandardCharsets.UTF_8),
                MediaType.get("application/x-www-form-urlencoded")
            );
            Request req = new Request.Builder()
                .url("https://html.duckduckgo.com/html/")
                .header("User-Agent", "Mozilla/5.0 (compatible; ScanIt/1.0)")
                .post(body)
                .build();

            try (Response resp = http.newCall(req).execute()) {
                if (!resp.isSuccessful() || resp.body() == null) return List.of();
                return parseHtml(resp.body().string());
            }
        } catch (Exception e) {
            log.warn("DuckDuckGo search failed: {}", e.getMessage());
            return List.of();
        }
    }

    private List<SearchHit> parseHtml(String html) {
        List<SearchHit> hits = new ArrayList<>();
        Set<String> seen = new HashSet<>();

        Matcher linkMatcher = LINK_PATTERN.matcher(html);
        while (linkMatcher.find() && hits.size() < 12) {
            String url = decodeEntities(linkMatcher.group(1).trim());
            String title = decodeEntities(linkMatcher.group(2).trim());
            if (url.isBlank() || title.isBlank() || seen.contains(url)) continue;
            seen.add(url);

            String snippet = "";
            int pos = linkMatcher.end();
            Matcher snippetMatcher = SNIPPET_PATTERN.matcher(html.substring(pos, Math.min(pos + 500, html.length())));
            if (snippetMatcher.find()) {
                snippet = decodeEntities(snippetMatcher.group(1).replaceAll("<[^>]+>", "").trim());
            }
            hits.add(new SearchHit(title, url, snippet));
        }
        return hits;
    }

    private boolean isShoppingHit(SearchHit hit) {
        String haystack = (hit.title() + " " + hit.url() + " " + hit.snippet()).toLowerCase();
        return haystack.contains("jumia") || haystack.contains("tonaton") || haystack.contains("kikuu")
            || haystack.contains("amazon") || haystack.contains("shop") || haystack.contains("buy")
            || haystack.contains("price") || haystack.contains("store") || haystack.contains("ghs");
    }

    private double extractPrice(String text) {
        Matcher ghs = Pattern.compile("(?:GHS|GH₵|₵)\\s*([\\d,]+(?:\\.\\d{1,2})?)", Pattern.CASE_INSENSITIVE).matcher(text);
        if (ghs.find()) return Double.parseDouble(ghs.group(1).replace(",", ""));
        Matcher plain = Pattern.compile("\\b([\\d,]+(?:\\.\\d{1,2})?)\\s*(?:GHS|cedis?)\\b", Pattern.CASE_INSENSITIVE).matcher(text);
        if (plain.find()) return Double.parseDouble(plain.group(1).replace(",", ""));
        return 0;
    }

    private String decodeEntities(String text) {
        return text.replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">").replace("&quot;", "\"");
    }

    public static String buildGoogleSearchUrl(String productName, String context) {
        String q = productName + " " + context + " buy Ghana";
        return "https://www.google.com/search?q=" + URLEncoder.encode(q, StandardCharsets.UTF_8);
    }

    public static String buildProductGoogleUrl(String productName, String brand) {
        String q = brand != null && !brand.isBlank() && !"Unknown".equalsIgnoreCase(brand)
            ? productName + " " + brand + " buy price Ghana"
            : productName + " buy price Ghana";
        return "https://www.google.com/search?q=" + URLEncoder.encode(q, StandardCharsets.UTF_8);
    }
}
