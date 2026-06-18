package com.scanit.backend.seed;

import com.scanit.backend.entity.*;
import com.scanit.backend.enums.AuthenticityStatus;
import com.scanit.backend.enums.NotificationType;
import com.scanit.backend.enums.UserRole;
import com.scanit.backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final ProductRepository productRepository;
    private final SellerRepository sellerRepository;
    private final InventoryItemRepository inventoryItemRepository;
    private final NotificationRepository notificationRepository;
    private final PriceAlertRepository priceAlertRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        if (userRepository.count() > 0) {
            log.info("Database already seeded — skipping.");
            return;
        }

        log.info("Seeding ScanIt database with Ghana market data...");

        // ── Demo users ────────────────────────────────────────────────────────

        User consumer = userRepository.save(User.builder()
                .name("Ama Mensah")
                .email("ama.m@scanit.app")
                .password(passwordEncoder.encode("password123"))
                .role(UserRole.CONSUMER)
                .scansCount(12)
                .savedCount(5)
                .totalSaved(18.50)
                .build());

        User sellerUser = userRepository.save(User.builder()
                .name("Kofi Asante")
                .email("kofi@scanit.app")
                .password(passwordEncoder.encode("password123"))
                .role(UserRole.SELLER)
                .build());

        // ── Sellers ───────────────────────────────────────────────────────────

        Seller makola = sellerRepository.save(Seller.builder()
                .name("Makola Market Store")
                .location("Makola")
                .phone("+233201234567")
                .whatsapp("+233201234567")
                .verified(true)
                .rating(4.5)
                .reviewCount(128)
                .latitude(5.5504)
                .longitude(-0.2174)
                .build());

        Seller accraMall = sellerRepository.save(Seller.builder()
                .name("Accra Mall Store")
                .location("Accra Mall")
                .phone("+233209876543")
                .whatsapp("+233209876543")
                .verified(true)
                .rating(4.8)
                .reviewCount(256)
                .latitude(5.6037)
                .longitude(-0.1870)
                .build());

        Seller kaneshie = sellerRepository.save(Seller.builder()
                .name("Kaneshie Market")
                .location("Kaneshie")
                .phone("+233245678901")
                .whatsapp("+233245678901")
                .verified(false)
                .rating(3.9)
                .reviewCount(45)
                .latitude(5.5577)
                .longitude(-0.2395)
                .build());

        Seller oxfordStreet = sellerRepository.save(Seller.builder()
                .user(sellerUser)
                .name("Oxford Street Shop")
                .location("Osu")
                .phone("+233302000123")
                .whatsapp("+233302000123")
                .verified(true)
                .rating(4.2)
                .reviewCount(89)
                .latitude(5.5573)
                .longitude(-0.1850)
                .build());

        // ── Products ──────────────────────────────────────────────────────────

        Map<String, String> juiceSpecs = new HashMap<>();
        juiceSpecs.put("Volume", "500ml");
        juiceSpecs.put("Sugar", "No added sugar");
        juiceSpecs.put("pH Level", "3.8");
        juiceSpecs.put("Shelf Life", "12 months");

        Product tropicalJuice = productRepository.save(Product.builder()
                .name("Tropical Juice 500ml")
                .brand("TropicFresh")
                .category("Drinks")
                .description("Refreshing tropical fruit juice made from 100% Ghanaian fruits. No added preservatives or artificial colors.")
                .imageUrl("https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=400")
                .price(3.40)
                .origin("Ghana")
                .specs(juiceSpecs)
                .barcode("6001234567890")
                .verified(true)
                .authenticity(AuthenticityStatus.AUTHENTIC)
                .build());

        Map<String, String> waterSpecs = new HashMap<>();
        waterSpecs.put("Volume", "1.5L");
        waterSpecs.put("Type", "Still");
        waterSpecs.put("TDS", "45 mg/L");
        waterSpecs.put("pH Level", "7.2");

        Product springWater = productRepository.save(Product.builder()
                .name("Pure Spring Water 1.5L")
                .brand("AquaGhana")
                .category("Drinks")
                .description("Natural spring water sourced from the Volta Region highlands. Perfectly balanced minerals for daily hydration.")
                .imageUrl("https://images.unsplash.com/photo-1560023907-5f339617ea30?w=400")
                .price(2.50)
                .origin("Ghana")
                .specs(waterSpecs)
                .barcode("6009876543210")
                .verified(true)
                .authenticity(AuthenticityStatus.AUTHENTIC)
                .build());

        Map<String, String> cocoaSpecs = new HashMap<>();
        cocoaSpecs.put("Weight", "100g");
        cocoaSpecs.put("Cocoa Content", "45%");
        cocoaSpecs.put("Sugar", "Low sugar");
        cocoaSpecs.put("Shelf Life", "18 months");

        Product cocoaSpread = productRepository.save(Product.builder()
                .name("Ghana Cocoa Spread 100g")
                .brand("CocoaBrand")
                .category("Snacks")
                .description("Premium cocoa spread made from Ghana's finest cocoa beans. Rich, smooth taste perfect for breakfast.")
                .imageUrl("https://images.unsplash.com/photo-1511381939415-e44015466834?w=400")
                .price(8.00)
                .origin("Ghana")
                .specs(cocoaSpecs)
                .barcode("6005556667770")
                .verified(true)
                .authenticity(AuthenticityStatus.AUTHENTIC)
                .build());

        Map<String, String> sheaSpecs = new HashMap<>();
        sheaSpecs.put("Volume", "250ml");
        sheaSpecs.put("Type", "Moisturizer");
        sheaSpecs.put("Ingredients", "Shea Butter, Aloe Vera");
        sheaSpecs.put("Shelf Life", "24 months");

        Product sheaCream = productRepository.save(Product.builder()
                .name("Shea Butter Cream 250ml")
                .brand("SheaGlow")
                .category("Care")
                .description("Natural shea butter moisturizing cream. Deeply nourishes skin, suitable for all skin types.")
                .imageUrl("https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=400")
                .price(15.00)
                .origin("Ghana")
                .specs(sheaSpecs)
                .barcode("6003334445550")
                .verified(false)
                .authenticity(AuthenticityStatus.SUSPICIOUS)
                .build());

        Map<String, String> chipsSpecs = new HashMap<>();
        chipsSpecs.put("Weight", "75g");
        chipsSpecs.put("Flavor", "Spicy Pepper");
        chipsSpecs.put("Calories", "350 kcal");
        chipsSpecs.put("Made From", "Locally grown plantains");

        Product pepperChips = productRepository.save(Product.builder()
                .name("Pepper Chips 75g")
                .brand("SnackGhana")
                .category("Snacks")
                .description("Spicy pepper-flavored plantain chips — a popular Ghanaian snack made from locally grown plantains.")
                .imageUrl("https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400")
                .price(2.80)
                .origin("Ghana")
                .specs(chipsSpecs)
                .barcode("6007778889990")
                .verified(true)
                .authenticity(AuthenticityStatus.AUTHENTIC)
                .build());

        Map<String, String> riceSpecs = new HashMap<>();
        riceSpecs.put("Weight", "5kg");
        riceSpecs.put("Type", "Long grain");
        riceSpecs.put("Variety", "Jasmine");
        riceSpecs.put("Origin", "Volta Region");

        Product ghanaRice = productRepository.save(Product.builder()
                .name("Ghana Jasmine Rice 5kg")
                .brand("VoltaFarms")
                .category("Food")
                .description("Premium long-grain jasmine rice farmed in the Volta Region. Fluffy, fragrant, and 100% Ghanaian.")
                .imageUrl("https://images.unsplash.com/photo-1536304929831-ee1ca9d44906?w=400")
                .price(35.00)
                .origin("Ghana")
                .specs(riceSpecs)
                .barcode("6002223334440")
                .verified(true)
                .authenticity(AuthenticityStatus.AUTHENTIC)
                .build());

        // ── Inventory: sellers listing products ───────────────────────────────

        // Tropical Juice
        inventoryItemRepository.save(item(makola,       tropicalJuice, 2.90, 50));
        inventoryItemRepository.save(item(accraMall,    tropicalJuice, 3.20, 30));
        inventoryItemRepository.save(item(kaneshie,     tropicalJuice, 2.70, 100));

        // Spring Water
        inventoryItemRepository.save(item(makola,       springWater, 2.20, 200));
        inventoryItemRepository.save(item(accraMall,    springWater, 2.50, 80));
        inventoryItemRepository.save(item(kaneshie,     springWater, 2.00, 300));

        // Cocoa Spread
        inventoryItemRepository.save(item(oxfordStreet, cocoaSpread, 6.50, 25));
        inventoryItemRepository.save(item(accraMall,    cocoaSpread, 7.50, 15));

        // Shea Cream
        inventoryItemRepository.save(item(makola,       sheaCream, 12.00, 30));
        inventoryItemRepository.save(item(kaneshie,     sheaCream, 11.50, 20));

        // Pepper Chips
        inventoryItemRepository.save(item(makola,       pepperChips, 2.80, 500));
        inventoryItemRepository.save(item(oxfordStreet, pepperChips, 3.00, 200));
        inventoryItemRepository.save(item(accraMall,    pepperChips, 2.90, 150));

        // Ghana Rice
        inventoryItemRepository.save(item(makola,       ghanaRice, 32.00, 40));
        inventoryItemRepository.save(item(accraMall,    ghanaRice, 34.50, 20));
        inventoryItemRepository.save(item(kaneshie,     ghanaRice, 30.00, 60));

        // ── Notifications for demo consumer ───────────────────────────────────

        notificationRepository.save(Notification.builder()
                .user(consumer)
                .title("Welcome to ScanIt!")
                .body("You can now scan products to check prices and verify authenticity across Ghana. Tap the scan button to get started.")
                .read(true)
                .type(NotificationType.SYSTEM)
                .build());

        notificationRepository.save(Notification.builder()
                .user(consumer)
                .title("Price Drop Alert")
                .body("Tropical Juice 500ml is now ₵2.70 at Kaneshie Market (was ₵3.40). Save ₵0.70 per bottle!")
                .read(false)
                .type(NotificationType.PRICE_ALERT)
                .build());

        notificationRepository.save(Notification.builder()
                .user(consumer)
                .title("New Verified Seller Nearby")
                .body("A verified seller at Accra Mall just listed Ghana Cocoa Spread. Tap to see details.")
                .read(false)
                .type(NotificationType.NEW_SELLER)
                .build());

        notificationRepository.save(Notification.builder()
                .user(consumer)
                .title("Authenticity Warning")
                .body("Some Shea Butter Cream 250ml listings in your area have been flagged as suspicious. Scan before buying.")
                .read(false)
                .type(NotificationType.SYSTEM)
                .build());

        // ── Price alerts ──────────────────────────────────────────────────────

        priceAlertRepository.save(PriceAlert.builder()
                .user(consumer)
                .product(tropicalJuice)
                .oldPrice(3.40)
                .newPrice(2.70)
                .dropPercent(20.6)
                .build());

        priceAlertRepository.save(PriceAlert.builder()
                .user(consumer)
                .product(cocoaSpread)
                .oldPrice(8.00)
                .newPrice(6.50)
                .dropPercent(18.8)
                .build());

        log.info("ScanIt database seeded successfully!");
        log.info("──────────────────────────────────────");
        log.info("  Consumer: ama.m@scanit.app / password123");
        log.info("  Seller:   kofi@scanit.app  / password123");
        log.info("──────────────────────────────────────");
    }

    private InventoryItem item(Seller seller, Product product, double price, int stock) {
        return InventoryItem.builder()
                .seller(seller)
                .product(product)
                .price(price)
                .stock(stock)
                .listed(true)
                .build();
    }
}
