package com.scanit.backend.controller;

import com.scanit.backend.dto.ApiResponse;
import com.scanit.backend.dto.ScanResultDto;
import com.scanit.backend.service.ScanService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/scans")
@RequiredArgsConstructor
public class ScanController {

    private final ScanService scanService;

    /**
     * POST /scans/analyze
     * Accepts a multipart image upload. Backend calls Gemini Vision to identify
     * the product, then matches/creates it in the DB.
     */
    @PostMapping(value = "/analyze", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<ScanResultDto>> analyze(
            @RequestPart("image") MultipartFile image,
            Authentication authentication
    ) throws IOException {
        if (image.isEmpty()) {
            throw new com.scanit.backend.exception.BadRequestException("Image file is required");
        }
        if (image.getSize() > 10 * 1024 * 1024) {
            throw new com.scanit.backend.exception.BadRequestException("Image must be under 10 MB");
        }
        String contentType = image.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new com.scanit.backend.exception.BadRequestException("Only image files are allowed");
        }

        ScanResultDto result = scanService.analyzeImage(
                authentication.getName(),
                image.getBytes(),
                contentType
        );
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    /**
     * GET /scans/barcode/{code}
     * Look up a product by its barcode. Returns 404 if not in database.
     */
    @GetMapping("/barcode/{code}")
    public ResponseEntity<ApiResponse<ScanResultDto>> barcode(
            @PathVariable String code,
            Authentication authentication
    ) {
        ScanResultDto result = scanService.findByBarcode(authentication.getName(), code);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    /** GET /scans/history — authenticated user's scan history, newest first. */
    @GetMapping("/history")
    public ResponseEntity<ApiResponse<List<ScanResultDto>>> history(Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.success(scanService.getScanHistory(authentication.getName())));
    }
}
