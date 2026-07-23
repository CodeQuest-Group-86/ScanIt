package com.scanit.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import okhttp3.MediaType;
import okhttp3.MultipartBody;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.concurrent.TimeUnit;

/**
 * Uploads scan images to Cloudinary's free tier (25 monthly credits — plenty for a
 * scan-photo history) via a signed REST upload, so scanned photos get a durable HTTPS
 * URL instead of living only on the user's device.
 */
@Service
@Slf4j
public class CloudinaryService {

    @Value("${cloudinary.cloud-name:}") private String cloudName;
    @Value("${cloudinary.api-key:}") private String apiKey;
    @Value("${cloudinary.api-secret:}") private String apiSecret;

    private static final String FOLDER = "scanit/scans";

    private final OkHttpClient http = new OkHttpClient.Builder()
            .callTimeout(20, TimeUnit.SECONDS)
            .build();
    private final ObjectMapper mapper = new ObjectMapper();

    public boolean isConfigured() {
        return !isBlank(cloudName) && !isBlank(apiKey) && !isBlank(apiSecret);
    }

    /** Uploads a scan image and returns its Cloudinary secure_url, or null if not
     *  configured / the upload failed — callers should degrade gracefully either way. */
    public String upload(byte[] imageBytes, String mimeType) {
        if (!isConfigured()) {
            log.warn("Cloudinary not configured — scan image will not be persisted");
            return null;
        }
        try {
            long timestamp = Instant.now().getEpochSecond();
            String signature = sign("folder=" + FOLDER + "&timestamp=" + timestamp);

            String contentType = mimeType != null && !mimeType.isBlank() ? mimeType : "image/jpeg";
            String ext = contentType.contains("png") ? "png" : "jpg";

            RequestBody fileBody = RequestBody.create(imageBytes, MediaType.get(contentType));
            MultipartBody body = new MultipartBody.Builder()
                    .setType(MultipartBody.FORM)
                    .addFormDataPart("file", "scan." + ext, fileBody)
                    .addFormDataPart("api_key", apiKey)
                    .addFormDataPart("timestamp", String.valueOf(timestamp))
                    .addFormDataPart("folder", FOLDER)
                    .addFormDataPart("signature", signature)
                    .build();

            Request request = new Request.Builder()
                    .url("https://api.cloudinary.com/v1_1/" + cloudName + "/image/upload")
                    .post(body)
                    .build();

            try (Response response = http.newCall(request).execute()) {
                String respBody = response.body() != null ? response.body().string() : "";
                if (!response.isSuccessful()) {
                    log.warn("Cloudinary upload failed ({}): {}", response.code(),
                            respBody.substring(0, Math.min(300, respBody.length())));
                    return null;
                }
                JsonNode root = mapper.readTree(respBody);
                String secureUrl = root.path("secure_url").asText(null);
                if (secureUrl == null) {
                    log.warn("Cloudinary response had no secure_url: {}", respBody.substring(0, Math.min(200, respBody.length())));
                }
                return secureUrl;
            }
        } catch (Exception e) {
            log.warn("Cloudinary upload error: {}", e.getMessage());
            return null;
        }
    }

    /** Cloudinary signed-upload scheme: sha1(sorted "key=value&..." params + api_secret). */
    private String sign(String paramsToSign) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-1");
        byte[] hash = digest.digest((paramsToSign + apiSecret).getBytes(StandardCharsets.UTF_8));
        StringBuilder sb = new StringBuilder(hash.length * 2);
        for (byte b : hash) sb.append(String.format("%02x", b));
        return sb.toString();
    }

    private boolean isBlank(String s) {
        return s == null || s.isBlank();
    }
}
