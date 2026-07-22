package com.scanit.backend.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.scanit.backend.dto.ApiResponse;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

/**
 * IP-based rate limit on /auth/** — the brute-force/spam-prone surface (login, sign-up,
 * OTP send). Everything else either requires a valid JWT already or has its own limit
 * (scan quota). In-memory bucket per IP is fine at this scale; would need a shared store
 * (Redis) if this ever runs on more than one instance.
 */
@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private static final int CAPACITY = 20;
    private static final Duration REFILL_PERIOD = Duration.ofMinutes(1);

    private final ConcurrentMap<String, Bucket> buckets = new ConcurrentHashMap<>();
    private final ObjectMapper mapper = new ObjectMapper();

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {

        if (!request.getRequestURI().contains("/auth/")) {
            filterChain.doFilter(request, response);
            return;
        }

        Bucket bucket = buckets.computeIfAbsent(clientIp(request), ip ->
                Bucket.builder()
                        .addLimit(Bandwidth.classic(CAPACITY, io.github.bucket4j.Refill.greedy(CAPACITY, REFILL_PERIOD)))
                        .build());

        if (bucket.tryConsume(1)) {
            filterChain.doFilter(request, response);
            return;
        }

        response.setStatus(429);
        response.setContentType("application/json");
        response.getWriter().write(mapper.writeValueAsString(
                ApiResponse.error("Too many requests. Please wait a moment and try again.")));
    }

    private String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
