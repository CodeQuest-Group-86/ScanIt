package com.scanit.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.scanit.backend.dto.ProductDto;
import com.scanit.backend.dto.SellerDto;
import com.scanit.backend.dto.ScanResultDto;
import com.scanit.backend.entity.Product;
import com.scanit.backend.entity.ScanResult;
import com.scanit.backend.entity.User;
import com.scanit.backend.exception.ResourceNotFoundException;
import com.scanit.backend.exception.ScanQuotaExceededException;
import com.scanit.backend.repository.ProductRepository;
import com.scanit.backend.repository.ScanResultRepository;
import com.scanit.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ScanService {

    private final ScanResultRepository scanResultRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final ProductService productService;
    private final GeminiService geminiService;
    private final DuckDuckGoService duckDuckGoService;
    private final CompuGhanaService compuGhanaService;
    private final PriceAlertService priceAlertService;

    /** Free tier resets daily. Paid plan limits must stay in sync with PAYSTACK_PLANS in
     *  services/payment.ts and reset when a new subscription activates, not daily.
     *  -1 = unlimited. */
    private static final int FREE_SCAN_LIMIT = 10;
    private static final java.util.Map<String, Integer> PLAN_SCAN_LIMITS = java.util.Map.of(
        "premium_monthly", 25,
        "premium_yearly", -1
    );

    /** Server-side quota check — the client also tracks this locally, but that's trivially
     *  bypassed by clearing app storage, so this is the authoritative gate. */
    private void enforceQuota(User user) {
        boolean onPaidPlan = user.isSubscriptionActive() && user.getSubscriptionExpiresAt() != null
                && Instant.now().isBefore(user.getSubscriptionExpiresAt());

        int limit;
        if (onPaidPlan) {
            limit = PLAN_SCAN_LIMITS.getOrDefault(user.getSubscriptionPlan(), FREE_SCAN_LIMIT);
        } else {
            limit = FREE_SCAN_LIMIT;
            // Free tier resets every 24h from the start of the current window, not lifetime.
            Instant now = Instant.now();
            if (user.getQuotaPeriodStart() == null
                    || now.isAfter(user.getQuotaPeriodStart().plus(1, java.time.temporal.ChronoUnit.DAYS))) {
                user.setQuotaPeriodStart(now);
                user.setQuotaScansUsed(0);
            }
        }

        if (limit != -1 && user.getQuotaScansUsed() >= limit) {
            String message = onPaidPlan
                ? "You've used all " + limit + " scans for this period. Upgrade or wait for renewal to keep scanning."
                : "You've used all " + limit + " free scans for today. Come back tomorrow or upgrade to Premium for more.";
            throw new ScanQuotaExceededException(message);
        }
    }

    // ── Analyze image ─────────────────────────────────────────────────────────

    @Transactional
    public ScanResultDto analyzeImage(String userEmail, byte[] imageBytes, String mimeType) {
        User user = findUser(userEmail);
        enforceQuota(user);

        // Step 1: Vision — identify the product
        GeminiService.ProductInfo gemini = geminiService.identifyProduct(imageBytes, mimeType);
        MatchResult match = findOrCreateProduct(gemini);
        Product matched = match.product();

        // Step 2: live cross-check — Gemini grounded search + DuckDuckGo + (for electronics)
        // CompuGhana's own API. See runLiveResearch() for why each source is there.
        LiveLookup live = runLiveResearch(gemini.name(), gemini.brand(), gemini.category());
        GeminiService.ProductResearch research = live.research();
        DuckDuckGoService.ProductSearch ddgSearch = live.ddgSearch();

        // Persist updated specs/price to the product record. Prices are refreshed on every
        // scan (not just when currently 0) so listings stay live as market prices change.
        if (research != null) {
            if (research.specs() != null && !research.specs().isEmpty()) {
                matched.setSpecs(research.specs());
            }
            if (research.priceTypical() > 0) {
                double oldPrice = matched.getPrice();
                matched.setPrice(research.priceTypical());
                productRepository.save(matched);
                priceAlertService.checkAndNotify(matched, oldPrice, research.priceTypical());
            } else {
                productRepository.save(matched);
            }
        }

        double confidence = gemini.confidence() > 0
                ? gemini.confidence()
                : (match.isNew() ? 78.0 : 90.0);

        com.scanit.backend.enums.AuthenticityStatus scanAuthenticity =
                parseAuthenticity(gemini.authenticity(), matched.getAuthenticity());

        ScanResult saved = scanResultRepository.save(
                ScanResult.builder()
                        .user(user)
                        .product(matched)
                        .confidence(confidence)
                        .authenticityStatus(scanAuthenticity)
                        .authenticityReason(gemini.authenticityReason() != null && !gemini.authenticityReason().isBlank()
                                ? gemini.authenticityReason() : null)
                        .imageUri("upload")
                        .build()
        );

        user.setScansCount(user.getScansCount() + 1);
        user.setQuotaScansUsed(user.getQuotaScansUsed() + 1);
        userRepository.save(user);

        log.debug("Scan complete — user={} product={} confidence={}", userEmail, matched.getName(), confidence);
        return toDto(saved, research, ddgSearch);
    }

    // ── Barcode lookup ────────────────────────────────────────────────────────

    @Transactional
    public ScanResultDto findByBarcode(String userEmail, String barcode) {
        User user = findUser(userEmail);
        enforceQuota(user);

        // 1. Check local DB first
        List<Product> products = productRepository.findByBarcode(barcode);
        Product product;

        double confidence;
        if (!products.isEmpty()) {
            product = products.get(0);
            confidence = 99.0;
            log.debug("Barcode {} found in local DB: {}", barcode, product.getName());
        } else {
            // 2. Fallback: Open Food Facts API
            log.info("Barcode {} not in local DB — querying Open Food Facts", barcode);
            product = fetchFromOpenFoodFacts(barcode);
            confidence = 95.0;
        }

        // 3. Live cross-check every time (not just for a brand-new product) — a repeat scan of
        // the same barcode should still reflect current prices/sellers, not whatever was cached
        // from the first time this barcode was ever scanned.
        LiveLookup live = runLiveResearch(product.getName(), product.getBrand(), product.getCategory());
        GeminiService.ProductResearch research = live.research();
        if (research != null && research.priceTypical() > 0) {
            product.setPrice(research.priceTypical());
            productRepository.save(product);
        }

        ScanResult saved = scanResultRepository.save(
                ScanResult.builder()
                        .user(user)
                        .product(product)
                        .confidence(confidence)
                        .authenticityStatus(product.getAuthenticity())
                        .imageUri("barcode:" + barcode)
                        .build()
        );

        user.setScansCount(user.getScansCount() + 1);
        user.setQuotaScansUsed(user.getQuotaScansUsed() + 1);
        userRepository.save(user);

        log.debug("Barcode scan — user={} barcode={} product={}", userEmail, barcode, product.getName());
        return toDto(saved, research, live.ddgSearch());
    }

    /** Fetch product info from Open Food Facts and auto-create it in the local DB. */
    private Product fetchFromOpenFoodFacts(String barcode) {
        try {
            HttpClient client = HttpClient.newBuilder()
                    .connectTimeout(Duration.ofSeconds(10))
                    .build();
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create("https://world.openfoodfacts.org/api/v2/product/" + barcode + ".json?fields=product_name,brands,categories_tags,image_url,quantity,nutriments"))
                    .header("User-Agent", "ScanIt/1.0 (contact@scanit.app)")
                    .GET()
                    .build();

            HttpResponse<String> resp = client.send(req, HttpResponse.BodyHandlers.ofString());

            if (resp.statusCode() != 200) {
                throw new ResourceNotFoundException("Barcode not found: " + barcode);
            }

            ObjectMapper mapper = new ObjectMapper();
            JsonNode root = mapper.readTree(resp.body());

            int status = root.path("status").asInt(0);
            if (status != 1) {
                throw new ResourceNotFoundException("Barcode not recognised: " + barcode);
            }

            JsonNode p = root.path("product");
            String name = p.path("product_name").asText("Unknown Product");
            String brand = p.path("brands").asText("Unknown");
            String imageUrl = p.path("image_url").asText(null);

            // Flatten categories: "en:beverages,en:sodas" → "Beverages"
            String category = "General";
            JsonNode cats = p.path("categories_tags");
            if (cats.isArray() && cats.size() > 0) {
                String raw = cats.get(0).asText("");
                if (raw.contains(":")) raw = raw.split(":")[1];
                category = raw.substring(0, 1).toUpperCase() + raw.substring(1).replace("-", " ");
            }

            if (name.isBlank()) name = "Product " + barcode;
            if (brand.isBlank()) brand = "Unknown";

            return productRepository.save(Product.builder()
                    .name(name.substring(0, 1).toUpperCase() + name.substring(1))
                    .brand(brand)
                    .category(category)
                    .description("Scanned from barcode " + barcode + " via Open Food Facts.")
                    .imageUrl(imageUrl)
                    .price(0.0)
                    .currency("GHS")
                    .origin("Ghana")
                    .barcode(barcode)
                    .verified(false)
                    .authenticity(com.scanit.backend.enums.AuthenticityStatus.AUTHENTIC)
                    .build());

        } catch (ResourceNotFoundException e) {
            throw e;
        } catch (Exception e) {
            log.error("Open Food Facts lookup failed for barcode {}: {}", barcode, e.getMessage());
            throw new ResourceNotFoundException("Barcode not found: " + barcode + ". Ensure the barcode is clear and try again.");
        }
    }

    // ── History ───────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<ScanResultDto> getScanHistory(String userEmail) {
        User user = findUser(userEmail);
        return scanResultRepository.findByUserOrderByScannedAtDesc(user)
                .stream().map(r -> toDto(r, null, null)).collect(Collectors.toList());
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private boolean isElectronicsCategory(String category) {
        if (category == null) return false;
        String c = category.toLowerCase();
        return c.contains("electronic") || c.contains("tool");
    }

    private record MatchResult(Product product, boolean isNew) {}

    private MatchResult findOrCreateProduct(GeminiService.ProductInfo gemini) {
        if (gemini == null) {
            throw new com.scanit.backend.exception.InvalidObjectException(
                "Could not identify a product in the image. Try a clearer shot."
            );
        }

        String name = gemini.name();
        String brand = gemini.brand();
        // "Unknown"/blank isn't a real brand — matching on it as an OR-clause would collide
        // every no-visible-brand scan (the majority) into whichever such product was created
        // first, regardless of whether the name matches at all.
        boolean hasRealBrand = brand != null && !brand.isBlank() && !brand.equalsIgnoreCase("Unknown");

        // 1. Try exact name(+brand, only when brand is real) match
        List<Product> exact = hasRealBrand
                ? productRepository.findByNameContainingIgnoreCaseOrBrandContainingIgnoreCase(name, brand)
                : productRepository.findByNameContainingIgnoreCase(name);
        if (!exact.isEmpty()) {
            log.debug("Gemini label '{}' matched existing product '{}'", name, exact.get(0).getName());
            return new MatchResult(exact.get(0), false);
        }

        // 2. Try individual words from the product name
        for (String word : name.split("[\\s,_\\-]+")) {
            if (word.length() > 3) {
                List<Product> byWord = productRepository.findByNameContainingIgnoreCase(word);
                if (!byWord.isEmpty()) {
                    log.debug("Word '{}' matched existing product '{}'", word, byWord.get(0).getName());
                    return new MatchResult(byWord.get(0), false);
                }
            }
        }

        // 3. Auto-create with Gemini's description
        log.info("Auto-creating product from Gemini: '{}'", name);
        Product created = productRepository.save(Product.builder()
                .name(name.substring(0, 1).toUpperCase() + name.substring(1))
                .brand(brand)
                .category(gemini.category())
                .description(gemini.description())
                .price(0.0)
                .currency("GHS")
                .origin("Ghana")
                .verified(false)
                .authenticity(parseAuthenticity(gemini.authenticity(), com.scanit.backend.enums.AuthenticityStatus.AUTHENTIC))
                .build());
        return new MatchResult(created, true);
    }

    /**
     * Maps Gemini's per-scan authenticity read (from visible packaging) to the enum.
     * Falls back to the product's existing stored value when Gemini didn't return one —
     * a single photo shouldn't downgrade a long-established catalog product.
     */
    private com.scanit.backend.enums.AuthenticityStatus parseAuthenticity(
            String raw, com.scanit.backend.enums.AuthenticityStatus fallback) {
        if (raw == null || raw.isBlank()) return fallback;
        try {
            return com.scanit.backend.enums.AuthenticityStatus.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return fallback;
        }
    }

    // ── Live cross-check pipeline ────────────────────────────────────────────

    private record LiveLookup(GeminiService.ProductResearch research, DuckDuckGoService.ProductSearch ddgSearch) {}

    /**
     * Runs the full live seller cross-check for a product: Gemini with real-time Google Search
     * grounding (the only path that can surface a live Jumia Ghana price — Jumia returns 403 to
     * direct server-side scraping, see CompuGhanaService's comment on the same issue), DuckDuckGo
     * as a supplementary source and the fallback research path when grounded search returns
     * nothing usable, and — for electronics — CompuGhana's own search API for a confirmed live
     * price rather than a search-snippet guess.
     *
     * Every caller of analyzeImage/findByBarcode goes through this single path so the sellers
     * shown to the user are always this scan's live lookup — toDto() never falls back to a
     * cached DB/seeded seller record.
     */
    private LiveLookup runLiveResearch(String name, String brand, String category) {
        GeminiService.ProductResearch research = null;
        try {
            research = geminiService.researchProduct(name, brand, category);
        } catch (Exception e) {
            log.warn("Gemini grounded research failed: {}", e.getMessage());
        }

        DuckDuckGoService.ProductSearch ddgSearch = null;
        try {
            ddgSearch = duckDuckGoService.searchProduct(name, brand, category);
            if (research == null && !ddgSearch.snippets().isEmpty()) {
                research = geminiService.researchFromSnippets(
                    new GeminiService.ProductInfo(name, brand, category, "", 0, null, null),
                    ddgSearch.snippets()
                );
            }
            if (research == null && ddgSearch.detectedPrice() > 0) {
                research = new GeminiService.ProductResearch(
                    Map.of(), 0, 0, ddgSearch.detectedPrice(),
                    ddgSearch.sellers()
                );
            } else if (research != null && ddgSearch.sellers() != null) {
                // Research's own sellers (from grounded search) take priority — only add a
                // DDG seller if one under (roughly) the same name isn't already present, so a
                // real Jumia price from grounded search can't be duplicated or shadowed by a
                // zero-price DDG placeholder of the same store.
                List<GeminiService.ResearchSeller> merged = new ArrayList<>(
                    research.sellers() != null ? research.sellers() : List.of());
                for (GeminiService.ResearchSeller s : ddgSearch.sellers()) {
                    if (merged.stream().noneMatch(m -> m.name().equalsIgnoreCase(s.name()))) {
                        merged.add(s);
                    }
                }
                research = new GeminiService.ProductResearch(
                    research.specs(), research.priceMin(), research.priceMax(),
                    research.priceTypical() > 0 ? research.priceTypical() : ddgSearch.detectedPrice(),
                    merged
                );
            }
        } catch (Exception e) {
            log.warn("DuckDuckGo product search failed: {}", e.getMessage());
        }

        // CompuGhana — a real live price, not a search-snippet guess. Replaces the generic
        // CompuGhana entry DuckDuckGoService adds for every product. Skipped for non-electronics
        // categories: CompuGhana is an electronics-only retailer, and its fuzzy product-suggest
        // search will still return SOME "closest match" result for a query like "sugar" or
        // "slippers" even though it doesn't actually stock that item.
        try {
            List<CompuGhanaService.Listing> compuGhanaResults = isElectronicsCategory(category)
                    ? compuGhanaService.search(name) : List.of();
            if (!compuGhanaResults.isEmpty()) {
                CompuGhanaService.Listing best = compuGhanaResults.get(0);
                GeminiService.ResearchSeller realSeller = new GeminiService.ResearchSeller(
                    "CompuGhana", best.url(), "Online · Electronics", best.price()
                );
                List<GeminiService.ResearchSeller> existing = research != null && research.sellers() != null
                        ? research.sellers() : List.of();
                List<GeminiService.ResearchSeller> merged = new ArrayList<>();
                for (GeminiService.ResearchSeller s : existing) {
                    if (!"compughana".equalsIgnoreCase(s.name().replace(" ", ""))) {
                        merged.add(s);
                    }
                }
                merged.add(realSeller);

                double priceTypical = research != null && research.priceTypical() > 0
                        ? research.priceTypical() : best.price();
                research = new GeminiService.ProductResearch(
                        research != null ? research.specs() : Map.of(),
                        research != null ? research.priceMin() : 0,
                        research != null ? research.priceMax() : 0,
                        priceTypical,
                        merged
                );
            }
        } catch (Exception e) {
            log.warn("CompuGhana enrichment failed: {}", e.getMessage());
        }

        // Standard price fallback — not tied to any one store. If priceTypical still came
        // back 0 (grounded research found sellers but didn't compute an overall typical),
        // fall back to the lowest real price actually found across every seller.
        if (research != null && research.priceTypical() <= 0 && research.sellers() != null) {
            double lowestRealPrice = research.sellers().stream()
                    .mapToDouble(GeminiService.ResearchSeller::price)
                    .filter(p -> p > 0)
                    .min()
                    .orElse(0);
            if (lowestRealPrice > 0) {
                research = new GeminiService.ProductResearch(
                        research.specs(), research.priceMin(), research.priceMax(),
                        lowestRealPrice, research.sellers()
                );
            }
        }

        return new LiveLookup(research, ddgSearch);
    }

    // ── DTO mapping ───────────────────────────────────────────────────────────

    private ScanResultDto toDto(ScanResult r, GeminiService.ProductResearch research, DuckDuckGoService.ProductSearch ddgSearch) {
        ProductDto base = productService.toDto(r.getProduct());

        // Sellers shown here are ONLY this scan's live cross-check (Gemini grounded search +
        // DuckDuckGo + CompuGhana) — never the DB/seeded `Seller`/`InventoryItem` records that
        // back base.getSellers(), so a demo/seeded listing can never be mistaken for a real,
        // currently-live one. If the live lookup found nothing, sellers is simply empty.
        List<SellerDto> liveSellers = (research != null && research.sellers() != null)
                ? research.sellers().stream()
                        // Only stores with a confirmed real price actually carry the product —
                        // a 0/unknown price means the source (AI guess, DDG placeholder, etc.)
                        // never verified this store stocks it, so don't show it as a seller.
                        .filter(s -> s.name() != null && !s.name().isBlank() && s.price() > 0)
                        .map(s -> SellerDto.builder()
                                .id(UUID.randomUUID().toString())
                                .name(s.name())
                                .location(s.location())
                                .distance("N/A")
                                .phone(s.phone() != null ? s.phone() : "")
                                .whatsapp(s.whatsapp() != null ? s.whatsapp() : "")
                                .url(s.url() != null && !s.url().isBlank() ? s.url() : null)
                                // Not a confirmed marketplace listing — AI/web-search-derived, unlike
                                // the DB-backed `Product`/`Seller` `verified` flags in ProductService.
                                .verified(false)
                                .rating(0.0)
                                .reviewCount(0)
                                .price(s.price())
                                .build())
                        .collect(Collectors.toList())
                : List.of();

        ProductDto productDto = ProductDto.builder()
                .id(base.getId())
                .name(base.getName())
                .brand(base.getBrand())
                .category(base.getCategory())
                .description(base.getDescription())
                .imageUrl(base.getImageUrl())
                .price(research != null && research.priceTypical() > 0 ? research.priceTypical() : base.getPrice())
                .currency(base.getCurrency())
                .origin(base.getOrigin())
                .specs(research != null && research.specs() != null && !research.specs().isEmpty()
                        ? research.specs() : base.getSpecs())
                .barcode(base.getBarcode())
                .verified(base.isVerified())
                .authenticity(base.getAuthenticity())
                .sellers(liveSellers)
                .reportCount(base.getReportCount())
                .build();

        return ScanResultDto.builder()
                .id(r.getId())
                .product(productDto)
                .confidence(r.getConfidence())
                .scannedAt(r.getScannedAt() != null ? r.getScannedAt().toString() : Instant.now().toString())
                .authenticityStatus(r.getAuthenticityStatus().name().toLowerCase())
                .authenticityReason(r.getAuthenticityReason())
                .imageUri(r.getImageUri())
                .googleSearchUrl(ddgSearch != null ? ddgSearch.googleSearchUrl()
                    : DuckDuckGoService.buildProductGoogleUrl(r.getProduct().getName(), r.getProduct().getBrand()))
                .duckDuckGoSearchUrl(ddgSearch != null ? ddgSearch.duckDuckGoSearchUrl() : null)
                .build();
    }

    private User findUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + email));
    }
}
