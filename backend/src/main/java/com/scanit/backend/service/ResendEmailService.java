package com.scanit.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.scanit.backend.exception.BadRequestException;
import lombok.extern.slf4j.Slf4j;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.List;
import java.util.Map;

/**
 * Single email provider for the whole app — OTP codes and password-reset links both
 * go through Resend's free tier (3,000 emails/month, 100/day). Having one provider
 * means one API key to configure and one place that can fail.
 */
@Service
@Slf4j
public class ResendEmailService {

    @Value("${resend.api-key:}") private String apiKey;
    @Value("${resend.from:onboarding@resend.dev}") private String from;

    /** Without one, OkHttp's defaults can let a slow/stuck Resend call hang well past
     *  the client's own request timeout instead of failing fast. */
    private final OkHttpClient http = new OkHttpClient.Builder()
            .callTimeout(15, java.util.concurrent.TimeUnit.SECONDS)
            .build();
    private final ObjectMapper mapper = new ObjectMapper();

    public boolean isConfigured() {
        return apiKey != null && !apiKey.isBlank();
    }

    /**
     * Sends an HTML email via Resend. Returns false (never throws) when Resend isn't
     * configured, so callers can fall back to dev-mode behaviour (e.g. surfacing an
     * OTP code directly in the API response instead of emailing it).
     */
    public boolean send(String to, String subject, String html) {
        if (!isConfigured()) {
            log.warn("Resend not configured — skipping email to {}", to);
            return false;
        }
        try {
            String json = mapper.writeValueAsString(Map.of(
                    "from", from,
                    "to", List.of(to),
                    "subject", subject,
                    "html", html
            ));

            Request request = new Request.Builder()
                    .url("https://api.resend.com/emails")
                    .addHeader("Authorization", "Bearer " + apiKey)
                    .addHeader("Content-Type", "application/json")
                    .post(RequestBody.create(json, MediaType.get("application/json")))
                    .build();

            try (Response response = http.newCall(request).execute()) {
                if (!response.isSuccessful()) {
                    String body = response.body() != null ? response.body().string() : "(no body)";
                    log.error("Resend failed ({}) to='{}': {}", response.code(), to, body);
                    throw new BadRequestException(
                            "Email send failed (Resend " + response.code() + "): " + body);
                }
                return true;
            }
        } catch (IOException e) {
            log.error("Resend IO error: {}", e.getMessage());
            throw new BadRequestException("Failed to send email (network error): " + e.getMessage());
        }
    }
}
