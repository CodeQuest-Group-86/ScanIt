package com.scanit.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * Sends push notifications through Expo's push service — works for any Expo-managed app
 * without needing separate FCM/APNs credentials. Best-effort: a failed send is logged,
 * never thrown, so it can never break the request (payment, scan, etc.) that triggered it.
 */
@Service
@Slf4j
public class PushNotificationService {

    private static final String EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

    private final OkHttpClient http = new OkHttpClient.Builder()
            .callTimeout(10, TimeUnit.SECONDS)
            .build();
    private final ObjectMapper mapper = new ObjectMapper();

    public void send(String expoPushToken, String title, String body) {
        if (expoPushToken == null || expoPushToken.isBlank()) return;

        try {
            String json = mapper.writeValueAsString(Map.of(
                    "to", expoPushToken,
                    "title", title,
                    "body", body,
                    "sound", "default"
            ));

            Request request = new Request.Builder()
                    .url(EXPO_PUSH_URL)
                    .addHeader("Content-Type", "application/json")
                    .addHeader("Accept", "application/json")
                    .post(RequestBody.create(json, MediaType.get("application/json")))
                    .build();

            try (Response response = http.newCall(request).execute()) {
                if (!response.isSuccessful()) {
                    String respBody = response.body() != null ? response.body().string() : "";
                    log.warn("Expo push send failed ({}): {}", response.code(), respBody);
                }
            }
        } catch (Exception e) {
            log.warn("Expo push send error: {}", e.getMessage());
        }
    }
}
