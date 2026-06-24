package com.scanit.backend.controller;

import com.scanit.backend.dto.ApiResponse;
import com.scanit.backend.dto.ScanResultDto;
import com.scanit.backend.service.ScanService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/scans")
@RequiredArgsConstructor
public class ScanController {

    private final ScanService scanService;

    /**
     * POST /scans/analyze
     *
     * Body: {
     *   "imageUri":   "file:///path/to/photo.jpg",   // local URI from expo-camera
     *   "imageLabel": "chocolate sauce"               // AI-detected label (optional but recommended)
     * }
     *
     * The imageLabel is detected by HuggingFace Vision / TFLite on the mobile app
     * and sent here so the backend can do a smarter keyword search against the
     * product database instead of using a random hash fallback.
     *
     * Returns: matched product + confidence + authenticity status + seller listings.
     */
    @PostMapping("/analyze")
    public ResponseEntity<ApiResponse<ScanResultDto>> analyze(
            @RequestBody Map<String, String> body,
            Authentication authentication
    ) {
        String imageUri   = body.getOrDefault("imageUri", "");
        String imageLabel = body.getOrDefault("imageLabel", "");
        ScanResultDto result = scanService.analyzeImage(authentication.getName(), imageUri, imageLabel);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    /**
     * GET /scans/barcode/{code}
     *
     * Look up a product by its barcode (EAN-13, QR, etc.).
     * Barcode scans are 99% accurate — the result has confidence=99.
     * The scan is saved to the user's history.
     *
     * Returns 404 if the barcode is not in the database.
     */
    @GetMapping("/barcode/{code}")
    public ResponseEntity<ApiResponse<ScanResultDto>> barcode(
            @PathVariable String code,
            Authentication authentication
    ) {
        ScanResultDto result = scanService.findByBarcode(authentication.getName(), code);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    /**
     * GET /scans/history
     * Returns the authenticated user's scan history, newest first.
     */
    @GetMapping("/history")
    public ResponseEntity<ApiResponse<List<ScanResultDto>>> history(Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.success(scanService.getScanHistory(authentication.getName())));
    }
}
