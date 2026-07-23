package com.scanit.backend.controller;

import com.scanit.backend.dto.ApiResponse;
import com.scanit.backend.dto.ProductDto;
import com.scanit.backend.dto.RecommendationDto;
import com.scanit.backend.dto.request.ReportCounterfeitRequest;
import com.scanit.backend.service.ProductService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<ProductDto>>> search(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) String category
    ) {
        return ResponseEntity.ok(ApiResponse.success(productService.searchProducts(query, category)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ProductDto>> getProduct(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.success(productService.getProduct(id)));
    }

    @GetMapping("/{id}/recommendations")
    public ResponseEntity<ApiResponse<List<RecommendationDto>>> getRecommendations(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.success(productService.getRecommendations(id)));
    }

    /** Community counterfeit flag — one per user per product. Requires sign-in (JWT),
     *  same as everything else not explicitly permitAll'd in SecurityConfig. */
    @PostMapping("/{id}/report-counterfeit")
    public ResponseEntity<ApiResponse<Map<String, Long>>> reportCounterfeit(
            @PathVariable String id,
            @RequestBody(required = false) ReportCounterfeitRequest req,
            Authentication auth
    ) {
        long count = productService.reportCounterfeit(
                auth.getName(), id, req != null ? req : new ReportCounterfeitRequest()
        );
        return ResponseEntity.ok(ApiResponse.success("Report submitted", Map.of("reportCount", count)));
    }
}
