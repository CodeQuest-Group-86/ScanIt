package com.scanit.backend.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class DuckDuckGoServiceTest {

    private final DuckDuckGoService service = new DuckDuckGoService();

    /** Regression: the cedi sign was a raw literal in the regex source, which depends on
     *  javac reading the file as UTF-8 -- not guaranteed without an explicit source
     *  encoding, and silently broken on at least one real build. This is real DuckDuckGo
     *  snippet text, not a synthetic example. */
    @Test
    void extractPrice_cediSignFormat() {
        assertThat(service.extractPrice("Jiji.com.gh 48+ Samsung Galaxy A14 in Ghana From GH₵ 950 New & used"))
                .isEqualTo(950.0);
    }

    @Test
    void extractPrice_plainGhsFormat() {
        assertThat(service.extractPrice("Find Samsung Galaxy A14 price in Ghana (2,156 GHS) - specs"))
                .isEqualTo(2156.0);
    }

    @Test
    void extractPrice_bareCediSign() {
        assertThat(service.extractPrice("Tropical Juice 500ml is now ₵2.70 at Kaneshie Market"))
                .isEqualTo(2.70);
    }

    @Test
    void extractPrice_noPriceInText_returnsZero() {
        assertThat(service.extractPrice("Explore Samsung Galaxy smartphones and accessories"))
                .isEqualTo(0.0);
    }
}
