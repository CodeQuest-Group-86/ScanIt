package com.scanit.backend.seed;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Hibernate's ddl-auto=update adds new columns/tables but does not reliably widen an
 * already-existing column's type on Postgres — users.avatar_url was created as the
 * Hibernate default VARCHAR(255) before the entity was annotated TEXT, and stayed that
 * way across every redeploy since, silently 500-ing on any avatar over ~250 chars
 * (i.e. every real base64 photo). Runs before DataSeeder so a fresh database (created
 * straight from the entity's TEXT annotation) just gets a harmless no-op ALTER.
 */
@Component
@Order(0)
@RequiredArgsConstructor
@Slf4j
public class SchemaFixRunner implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) {
        try {
            jdbcTemplate.execute("ALTER TABLE users ALTER COLUMN avatar_url TYPE TEXT");
            log.info("users.avatar_url column confirmed TEXT");
        } catch (Exception e) {
            log.warn("Could not widen users.avatar_url to TEXT (non-fatal): {}", e.getMessage());
        }
    }
}
