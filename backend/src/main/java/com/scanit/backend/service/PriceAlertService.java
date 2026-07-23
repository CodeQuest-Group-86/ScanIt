package com.scanit.backend.service;

import com.scanit.backend.entity.PriceAlert;
import com.scanit.backend.entity.Product;
import com.scanit.backend.entity.SavedProduct;
import com.scanit.backend.enums.NotificationType;
import com.scanit.backend.repository.PriceAlertRepository;
import com.scanit.backend.repository.SavedProductRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Notifies users who saved a product when a fresh scan finds a real price drop.
 * Called from ScanService right after a product's price is updated.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PriceAlertService {

    private final SavedProductRepository savedProductRepository;
    private final PriceAlertRepository priceAlertRepository;
    private final NotificationService notificationService;

    @Transactional
    public void checkAndNotify(Product product, double oldPrice, double newPrice) {
        // Not a real drop — either this is the product's first-ever price, or it went up/stayed the same.
        if (oldPrice <= 0 || newPrice <= 0 || newPrice >= oldPrice) return;

        double dropPercent = ((oldPrice - newPrice) / oldPrice) * 100;
        List<SavedProduct> savers = savedProductRepository.findByProduct(product);
        if (savers.isEmpty()) return;

        String title = "Price drop: " + product.getName();
        String body = String.format(
                "Now GHS %.2f (was GHS %.2f) — %.0f%% off",
                newPrice, oldPrice, dropPercent
        );

        for (SavedProduct saved : savers) {
            priceAlertRepository.save(PriceAlert.builder()
                    .user(saved.getUser())
                    .product(product)
                    .oldPrice(oldPrice)
                    .newPrice(newPrice)
                    .dropPercent(dropPercent)
                    .build());
            notificationService.notify(saved.getUser(), title, body, NotificationType.PRICE_ALERT);
        }

        log.info("Price drop on {} ({} -> {}) — notified {} users", product.getName(), oldPrice, newPrice, savers.size());
    }
}
