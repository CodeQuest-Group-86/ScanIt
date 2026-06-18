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
     * Body: { "imageUri": "file:///..." }
     * Returns a matched product with confidence score and authenticity status.
     */
    @PostMapping("/analyze")
    public ResponseEntity<ApiResponse<ScanResultDto>> analyze(
            @RequestBody Map<String, String> body,
            Authentication authentication
    ) {
        String imageUri = body.getOrDefault("imageUri", "");
        ScanResultDto result = scanService.analyzeImage(authentication.getName(), imageUri);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping("/history")
    public ResponseEntity<ApiResponse<List<ScanResultDto>>> history(Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.success(scanService.getScanHistory(authentication.getName())));
    }
}
