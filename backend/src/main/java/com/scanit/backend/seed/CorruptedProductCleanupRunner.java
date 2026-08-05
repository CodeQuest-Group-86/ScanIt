package com.scanit.backend.seed;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Before the "Unknown"-brand matching-collision bug (ScanService.findOrCreateProduct) was
 * fixed, every no-visible-brand scan matched against whichever such product was created first —
 * which was this one, "Ceiling Fan with Light Fixture". Its specs/price/history got overwritten
 * by whatever unrelated object was scanned next, over and over. The original photos were never
 * persisted (ScanResult.imageUri is just the literal string "upload"), so there's no way to
 * re-derive which historical scan was actually which real object — deleting it is the only
 * honest fix. User explicitly confirmed this destructive one-time cleanup. Naturally idempotent:
 * once the row's gone, the SELECT finds nothing on every later redeploy.
 */
@Component
@Order(0)
@RequiredArgsConstructor
@Slf4j
public class CorruptedProductCleanupRunner implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;

    private static final String CORRUPTED_PRODUCT_NAME = "Ceiling Fan with Light Fixture";

    @Override
    public void run(String... args) {
        try {
            List<String> ids = jdbcTemplate.queryForList(
                    "SELECT id FROM products WHERE name = ?", String.class, CORRUPTED_PRODUCT_NAME);

            for (String id : ids) {
                jdbcTemplate.update("DELETE FROM price_alerts WHERE product_id = ?", id);
                jdbcTemplate.update("DELETE FROM saved_products WHERE product_id = ?", id);
                jdbcTemplate.update("DELETE FROM inventory_items WHERE product_id = ?", id);
                jdbcTemplate.update("DELETE FROM counterfeit_reports WHERE product_id = ?", id);
                jdbcTemplate.update("DELETE FROM scan_results WHERE product_id = ?", id);
                jdbcTemplate.update("DELETE FROM products WHERE id = ?", id);
                log.info("Removed corrupted product {} and its collided scan history", id);
            }
        } catch (Exception e) {
            log.warn("Corrupted product cleanup failed (non-fatal): {}", e.getMessage());
        }
    }
}
