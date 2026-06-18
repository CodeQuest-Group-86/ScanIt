package com.scanit.backend.controller;

import com.scanit.backend.dto.ApiResponse;
import com.scanit.backend.dto.NotificationDto;
import com.scanit.backend.dto.PriceAlertDto;
import com.scanit.backend.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<NotificationDto>>> getAll(Authentication auth) {
        return ResponseEntity.ok(ApiResponse.success(notificationService.getNotifications(auth.getName())));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<ApiResponse<Long>> getUnreadCount(Authentication auth) {
        return ResponseEntity.ok(ApiResponse.success(notificationService.getUnreadCount(auth.getName())));
    }

    @PostMapping("/{id}/read")
    public ResponseEntity<ApiResponse<Void>> markAsRead(@PathVariable String id, Authentication auth) {
        notificationService.markAsRead(auth.getName(), id);
        return ResponseEntity.ok(ApiResponse.success("Marked as read", null));
    }

    @GetMapping("/price-alerts")
    public ResponseEntity<ApiResponse<List<PriceAlertDto>>> getPriceAlerts(Authentication auth) {
        return ResponseEntity.ok(ApiResponse.success(notificationService.getPriceAlerts(auth.getName())));
    }
}
