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

    // ── Analyze image ─────────────────────────────────────────────────────────

    @Transactional
    public ScanResultDto analyzeImage(String userEmail, byte[] imageBytes, String mimeType) {
        User user = findUser(userEmail);

        // Step 1: Vision — identify the product
        GeminiService.ProductInfo gemini = geminiService.identifyProduct(imageBytes, mimeType);
        Product matched = findOrCreateProduct(gemini);

        // Step 2: DuckDuckGo — find where to buy + Google Search links
        DuckDuckGoService.ProductSearch ddgSearch = null;
        GeminiService.ProductResearch research = null;
        try {
            ddgSearch = duckDuckGoService.searchProduct(gemini.name(), gemini.brand(), gemini.category());
            if (!ddgSearch.snippets().isEmpty()) {
                research = geminiService.researchFromSnippets(gemini, ddgSearch.snippets());
            }
            if (research == null && ddgSearch.detectedPrice() > 0) {
                research = new GeminiService.ProductResearch(
                    Map.of(), 0, 0, ddgSearch.detectedPrice(),
                    ddgSearch.sellers()
                );
            } else if (research != null && ddgSearch.sellers() != null) {
                // Merge DDG sellers (with Google URLs) into research
                List<GeminiService.ResearchSeller> merged = new ArrayList<>(ddgSearch.sellers());
                if (research.sellers() != null) {
                    for (GeminiService.ResearchSeller s : research.sellers()) {
                        if (merged.stream().noneMatch(m -> m.name().equalsIgnoreCase(s.name()))) {
                            merged.add(s);
                        }
                    }
                }
                research = new GeminiService.ProductResearch(
                    research.specs(), research.priceMin(), research.priceMax(),
                    research.priceTypical() > 0 ? research.priceTypical() : ddgSearch.detectedPrice(),
                    merged
                );
            }
        } catch (Exception e) {
            log.warn("DuckDuckGo product search failed, returning basic data: {}", e.getMessage());
        }

        // Persist updated specs/price to the product record
        if (research != null) {
            if (research.specs() != null && !research.specs().isEmpty()) {
                matched.setSpecs(research.specs());
            }
            if (research.priceTypical() > 0 && matched.getPrice() == 0) {
                matched.setPrice(research.priceTypical());
            }
            productRepository.save(matched);
        }

        double confidence = 92.0;

        ScanResult saved = scanResultRepository.save(
                ScanResult.builder()
                        .user(user)
                        .product(matched)
                        .confidence(confidence)
                        .authenticityStatus(matched.getAuthenticity())
                        .imageUri("upload")
                        .build()
        );

        user.setScansCount(user.getScansCount() + 1);
        userRepository.save(user);

        log.debug("Scan complete — user={} product={} confidence={}", userEmail, matched.getName(), confidence);
        return toDto(saved, research, ddgSearch);
    }

    // ── Barcode lookup ────────────────────────────────────────────────────────

    @Transactional
    public ScanResultDto findByBarcode(String userEmail, String barcode) {
        User user = findUser(userEmail);

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

            // 3. DuckDuckGo search for live prices/sellers
            DuckDuckGoService.ProductSearch ddgSearch = null;
            GeminiService.ProductResearch research = null;
            try {
                ddgSearch = duckDuckGoService.searchProduct(product.getName(), product.getBrand(), product.getCategory());
                if (!ddgSearch.snippets().isEmpty()) {
                    research = geminiService.researchFromSnippets(
                        new GeminiService.ProductInfo(product.getName(), product.getBrand(), product.getCategory(), product.getDescription()),
                        ddgSearch.snippets()
                    );
                }
                if (research != null && research.priceTypical() > 0) {
                    product.setPrice(research.priceTypical());
                } else if (ddgSearch.detectedPrice() > 0) {
                    product.setPrice(ddgSearch.detectedPrice());
                }
                productRepository.save(product);
            } catch (Exception e) {
                log.warn("Research failed for barcode product: {}", e.getMessage());
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
            userRepository.save(user);
            log.debug("Barcode via OFF — user={} barcode={} product={}", userEmail, barcode, product.getName());
            return toDto(saved, research, ddgSearch);
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
        userRepository.save(user);

        log.debug("Barcode scan — user={} barcode={} product={}", userEmail, barcode, product.getName());
        return toDto(saved, null, null);
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

    private Product findOrCreateProduct(GeminiService.ProductInfo gemini) {
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
            return exact.get(0);
        }

        // 2. Try individual words from the product name
        for (String word : name.split("[\\s,_\\-]+")) {
            if (word.length() > 3) {
                List<Product> byWord = productRepository
                        .findByNameContainingIgnoreCaseOrBrandContainingIgnoreCase(word, word);
                if (!byWord.isEmpty()) {
                    log.debug("Word '{}' matched existing product '{}'", word, byWord.get(0).getName());
                    return byWord.get(0);
                }
            }
        }

        // 3. Auto-create with Gemini's description
        log.info("Auto-creating product from Gemini: '{}'", name);
        return productRepository.save(Product.builder()
                .name(name.substring(0, 1).toUpperCase() + name.substring(1))
                .brand(brand)
                .category(gemini.category())
                .description(gemini.description())
                .price(0.0)
                .currency("GHS")
                .origin("Ghana")
                .verified(false)
                .authenticity(com.scanit.backend.enums.AuthenticityStatus.AUTHENTIC)
                .build());
    }

    // ── DTO mapping ───────────────────────────────────────────────────────────

    private ScanResultDto toDto(ScanResult r, GeminiService.ProductResearch research, DuckDuckGoService.ProductSearch ddgSearch) {
        ProductDto base = productService.toDto(r.getProduct());

        ProductDto productDto = base;
        if (research != null) {
            // Build dynamic sellers from research
            List<SellerDto> dynamicSellers = research.sellers().stream()
                    .filter(s -> s.name() != null && !s.name().isBlank())
                    .map(s -> SellerDto.builder()
                            .id(UUID.randomUUID().toString())
                            .name(s.name())
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

            // Merge: DB sellers first, then dynamic research sellers
            List<SellerDto> allSellers = new ArrayList<>(base.getSellers());
            allSellers.addAll(dynamicSellers);

            productDto = ProductDto.builder()
                    .id(base.getId())
                    .name(base.getName())
                    .brand(base.getBrand())
                    .category(base.getCategory())
                    .description(base.getDescription())
                    .imageUrl(base.getImageUrl())
                    .price(research.priceTypical() > 0 ? research.priceTypical() : base.getPrice())
                    .currency(base.getCurrency())
                    .origin(base.getOrigin())
                    .specs(research.specs() != null && !research.specs().isEmpty()
                            ? research.specs() : base.getSpecs())
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
