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
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
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
    private final SerpApiService serpApiService;
    private final CloudinaryService cloudinaryService;

    /** Must stay in sync with PAYSTACK_PLANS in services/payment.ts. -1 = unlimited. */
    private static final int FREE_SCAN_LIMIT = 3;
    private static final java.util.Map<String, Integer> PLAN_SCAN_LIMITS = java.util.Map.of(
        "premium_monthly", 25,
        "premium_yearly", -1
    );

    /** Server-side quota check — the client also tracks this locally, but that's trivially
     *  bypassed by clearing app storage, so this is the authoritative gate. */
    private void enforceQuota(User user) {
        int limit = FREE_SCAN_LIMIT;
        if (user.isSubscriptionActive() && user.getSubscriptionExpiresAt() != null
                && Instant.now().isBefore(user.getSubscriptionExpiresAt())) {
            limit = PLAN_SCAN_LIMITS.getOrDefault(user.getSubscriptionPlan(), FREE_SCAN_LIMIT);
        }
        if (limit != -1 && user.getQuotaScansUsed() >= limit) {
            throw new ScanQuotaExceededException(
                "You've used all " + limit + " scans for this period. Upgrade or wait for renewal to keep scanning."
            );
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

        // Step 2: SerpAPI — live price comparison + where-to-buy links
        SerpApiService.ProductSearch priceSearch = null;
        try {
            priceSearch = serpApiService.searchPrices(gemini.name(), gemini.brand(), gemini.category());
        } catch (Exception e) {
            log.warn("SerpAPI price search failed, returning basic data: {}", e.getMessage());
        }

        // Step 3: Cloudinary — persist the scan photo so it survives past this response
        String cloudinaryUrl = null;
        try {
            cloudinaryUrl = cloudinaryService.upload(imageBytes, mimeType);
        } catch (Exception e) {
            log.warn("Cloudinary upload failed: {}", e.getMessage());
        }

        double typicalPrice = typicalPrice(priceSearch);
        if (typicalPrice > 0 && matched.getPrice() == 0) {
            matched.setPrice(typicalPrice);
        }
        if (cloudinaryUrl != null && (matched.getImageUrl() == null || matched.getImageUrl().isBlank())) {
            matched.setImageUrl(cloudinaryUrl);
        }
        productRepository.save(matched);

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
                        .imageUri(cloudinaryUrl != null ? cloudinaryUrl : "upload")
                        .build()
        );

        user.setScansCount(user.getScansCount() + 1);
        user.setQuotaScansUsed(user.getQuotaScansUsed() + 1);
        userRepository.save(user);

        log.debug("Scan complete — user={} product={} confidence={}", userEmail, matched.getName(), confidence);
        return toDto(saved, priceSearch);
    }

    // ── Barcode lookup ────────────────────────────────────────────────────────

    @Transactional
    public ScanResultDto findByBarcode(String userEmail, String barcode) {
        User user = findUser(userEmail);
        enforceQuota(user);

        // 1. Check local DB first
        List<Product> products = productRepository.findByBarcode(barcode);
        Product product;

        if (!products.isEmpty()) {
            product = products.get(0);
            log.debug("Barcode {} found in local DB: {}", barcode, product.getName());
        } else {
            // 2. Fallback: Open Food Facts API
            log.info("Barcode {} not in local DB — querying Open Food Facts", barcode);
            product = fetchFromOpenFoodFacts(barcode);

            // 3. SerpAPI for live prices/sellers
            SerpApiService.ProductSearch priceSearch = null;
            try {
                priceSearch = serpApiService.searchPrices(product.getName(), product.getBrand(), product.getCategory());
                double typicalPrice = typicalPrice(priceSearch);
                if (typicalPrice > 0) {
                    product.setPrice(typicalPrice);
                }
                productRepository.save(product);
            } catch (Exception e) {
                log.warn("Price search failed for barcode product: {}", e.getMessage());
                productRepository.save(product);
            }

            ScanResult saved = scanResultRepository.save(
                    ScanResult.builder()
                            .user(user)
                            .product(product)
                            .confidence(95.0)
                            .authenticityStatus(product.getAuthenticity())
                            .imageUri("barcode:" + barcode)
                            .build()
            );
            user.setScansCount(user.getScansCount() + 1);
            user.setQuotaScansUsed(user.getQuotaScansUsed() + 1);
            userRepository.save(user);
            log.debug("Barcode via OFF — user={} barcode={} product={}", userEmail, barcode, product.getName());
            return toDto(saved, priceSearch);
        }

        ScanResult saved = scanResultRepository.save(
                ScanResult.builder()
                        .user(user)
                        .product(product)
                        .confidence(99.0)
                        .authenticityStatus(product.getAuthenticity())
                        .imageUri("barcode:" + barcode)
                        .build()
        );

        user.setScansCount(user.getScansCount() + 1);
        user.setQuotaScansUsed(user.getQuotaScansUsed() + 1);
        userRepository.save(user);

        log.debug("Barcode scan — user={} barcode={} product={}", userEmail, barcode, product.getName());
        return toDto(saved, null);
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
                .stream().map(r -> toDto(r, null)).collect(Collectors.toList());
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private record MatchResult(Product product, boolean isNew) {}

    private MatchResult findOrCreateProduct(GeminiService.ProductInfo gemini) {
        if (gemini == null) {
            throw new com.scanit.backend.exception.InvalidObjectException(
                "Could not identify a product in the image. Try a clearer shot."
            );
        }

        String name = gemini.name();
        String brand = gemini.brand();

        // 1. Try exact name+brand match
        List<Product> exact = productRepository
                .findByNameContainingIgnoreCaseOrBrandContainingIgnoreCase(name, brand);
        if (!exact.isEmpty()) {
            log.debug("Gemini label '{}' matched existing product '{}'", name, exact.get(0).getName());
            return new MatchResult(exact.get(0), false);
        }

        // 2. Try individual words from the product name
        for (String word : name.split("[\\s,_\\-]+")) {
            if (word.length() > 3) {
                List<Product> byWord = productRepository
                        .findByNameContainingIgnoreCaseOrBrandContainingIgnoreCase(word, word);
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

    /** Average of sellers with a known (>0) price — the closest thing to a "typical" price. */
    private double typicalPrice(SerpApiService.ProductSearch priceSearch) {
        if (priceSearch == null || priceSearch.sellers() == null) return 0;
        return priceSearch.sellers().stream()
                .mapToDouble(SerpApiService.PriceResult::price)
                .filter(p -> p > 0)
                .average()
                .orElse(0);
    }

    // ── DTO mapping ───────────────────────────────────────────────────────────

    private ScanResultDto toDto(ScanResult r, SerpApiService.ProductSearch priceSearch) {
        ProductDto base = productService.toDto(r.getProduct());

        ProductDto productDto = base;
        if (priceSearch != null && priceSearch.sellers() != null && !priceSearch.sellers().isEmpty()) {
            // Build dynamic sellers from the SerpAPI price comparison
            List<SellerDto> dynamicSellers = priceSearch.sellers().stream()
                    .filter(s -> s.source() != null && !s.source().isBlank())
                    .map(s -> SellerDto.builder()
                            .id(UUID.randomUUID().toString())
                            .name(s.source())
                            .location(s.location())
                            .distance("N/A")
                            .phone("")
                            .whatsapp("")
                            .url(s.url() != null && !s.url().isBlank() ? s.url() : null)
                            .verified(true)
                            .rating(0.0)
                            .reviewCount(0)
                            .price(s.price())
                            .build())
                    .collect(Collectors.toList());

            // Merge: DB sellers first, then dynamic price-comparison sellers
            List<SellerDto> allSellers = new ArrayList<>(base.getSellers());
            allSellers.addAll(dynamicSellers);

            double typical = typicalPrice(priceSearch);
            productDto = ProductDto.builder()
                    .id(base.getId())
                    .name(base.getName())
                    .brand(base.getBrand())
                    .category(base.getCategory())
                    .description(base.getDescription())
                    .imageUrl(base.getImageUrl())
                    .price(typical > 0 ? typical : base.getPrice())
                    .currency(base.getCurrency())
                    .origin(base.getOrigin())
                    .specs(base.getSpecs())
                    .barcode(base.getBarcode())
                    .verified(base.isVerified())
                    .authenticity(base.getAuthenticity())
                    .sellers(allSellers)
                    .build();
        }

        return ScanResultDto.builder()
                .id(r.getId())
                .product(productDto)
                .confidence(r.getConfidence())
                .scannedAt(r.getScannedAt() != null ? r.getScannedAt().toString() : Instant.now().toString())
                .authenticityStatus(r.getAuthenticityStatus().name().toLowerCase())
                .imageUri(r.getImageUri())
                .googleSearchUrl(priceSearch != null ? priceSearch.googleSearchUrl()
                    : buildGoogleSearchUrl(r.getProduct().getName(), r.getProduct().getBrand()))
                .build();
    }

    private String buildGoogleSearchUrl(String productName, String brand) {
        String q = brand != null && !brand.isBlank() && !"Unknown".equalsIgnoreCase(brand)
                ? productName + " " + brand + " buy price Ghana"
                : productName + " buy price Ghana";
        return "https://www.google.com/search?q=" + URLEncoder.encode(q, StandardCharsets.UTF_8);
    }

    private User findUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + email));
    }
}
