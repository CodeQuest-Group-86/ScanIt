package com.scanit.backend.service;

import lombok.extern.slf4j.Slf4j;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.concurrent.TimeUnit;

import com.scanit.backend.exception.BadRequestException;

/**
 * Shared Resend transport + branded HTML shell, used by both OTP emails (OtpService)
 * and transactional emails like the premium payment receipt (PaymentService).
 */
@Service
@Slf4j
public class EmailService {

    @Value("${resend.api-key:}") private String resendApiKey;
    @Value("${resend.from:onboarding@resend.dev}") private String resendFrom;

    /** Publicly hosted so email clients can fetch it — served from this app's own static resources. */
    private static final String LOGO_URL = "https://scanit-raij.onrender.com/api/v1/logo.png";

    private final OkHttpClient resendClient = new OkHttpClient.Builder()
            .callTimeout(15, TimeUnit.SECONDS)
            .build();

    public boolean isConfigured() {
        return !resendApiKey.isBlank();
    }

    /**
     * Sends an HTML email via Resend. Throws BadRequestException on failure — callers for
     * whom email delivery is non-critical (e.g. a payment receipt) should catch and log
     * rather than let it fail the surrounding operation.
     */
    public void send(String to, String subject, String html) {
        if (resendApiKey.isBlank()) {
            log.warn("Resend not configured — skipping email '{}' to {}", subject, to);
            return;
        }

        String json = String.format(
                "{\"from\":\"%s\",\"to\":[\"%s\"],\"subject\":\"%s\",\"html\":\"%s\"}",
                resendFrom, to, subject, html.replace("\"", "\\\""));

        Request request = new Request.Builder()
                .url("https://api.resend.com/emails")
                .addHeader("Authorization", "Bearer " + resendApiKey)
                .addHeader("Content-Type", "application/json")
                .post(RequestBody.create(json, MediaType.get("application/json")))
                .build();

        try (Response response = resendClient.newCall(request).execute()) {
            if (!response.isSuccessful()) {
                String body = response.body() != null ? response.body().string() : "(no body)";
                log.error("Resend failed ({}) from='{}': {}", response.code(), resendFrom, body);
                throw new BadRequestException("Email send failed (Resend " + response.code() + "): " + body);
            }
        } catch (IOException e) {
            log.error("Resend IO error: {}", e.getMessage());
            throw new BadRequestException("Failed to send email (network error): " + e.getMessage());
        }
    }

    /**
     * Wraps arbitrary body markup in the app's branded header/footer shell.
     * Attribute values inside bodyHtml MUST use single quotes, not double — the whole
     * result gets `"` escaped when embedded into the outer JSON payload in send(), so
     * any double quotes in the markup would come out mangled.
     */
    public String emailShell(String bodyHtml) {
        return String.format(
                "<div style='background-color:#FAF0E4;background-image:linear-gradient(180deg,#FFF6EC 0%%,#FAF0E4 55%%,#F2E0C8 100%%);padding:40px 16px;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;'>" +
                "<div style='max-width:440px;margin:0 auto;background-color:#FFFFFF;border-radius:28px;overflow:hidden;box-shadow:0 20px 40px rgba(62,44,35,0.14);'>" +

                // ── Header banner ──
                "<div style='background-color:#E8682A;background-image:linear-gradient(135deg,#FF9A5C 0%%,#E8682A 55%%,#C4521A 100%%);padding:44px 24px 32px;text-align:center;'>" +
                "<table role='presentation' align='center' cellpadding='0' cellspacing='0' style='margin:0 auto;'><tr><td style='background-color:#FFFFFF;border-radius:22px;padding:14px;box-shadow:0 10px 24px rgba(0,0,0,0.18);'>" +
                "<img src='%s' width='52' height='52' alt='ScanIt' style='display:block;border-radius:12px;' />" +
                "</td></tr></table>" +
                "<p style='margin:20px 0 0;color:#FFFFFF;font-size:24px;font-weight:800;letter-spacing:0.3px;'>Scan<span style='color:#FFE3CC;'>It</span></p>" +
                "<p style='margin:6px 0 0;color:rgba(255,255,255,0.88);font-size:12px;font-weight:500;letter-spacing:0.2px;'>Know it&#39;s real before you buy it</p>" +
                "</div>" +

                // ── Body ──
                "%s" +

                // ── Footer ──
                "<div style='padding:28px 32px 32px;text-align:center;'>" +
                "<div style='height:1px;background-color:#F0E4D4;margin:0 0 20px;'></div>" +
                "<p style='margin:0;color:#C4B5A5;font-size:11px;line-height:16px;'>This is an automated message from ScanIt &mdash; please don&#39;t reply.</p>" +
                "</div>" +

                "</div>" +
                "</div>",
                LOGO_URL, bodyHtml);
    }
}
