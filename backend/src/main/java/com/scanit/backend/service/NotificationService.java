package com.scanit.backend.service;

import com.scanit.backend.dto.NotificationDto;
import com.scanit.backend.dto.PriceAlertDto;
import com.scanit.backend.entity.Notification;
import com.scanit.backend.entity.PriceAlert;
import com.scanit.backend.entity.User;
import com.scanit.backend.exception.BadRequestException;
import com.scanit.backend.exception.ResourceNotFoundException;
import com.scanit.backend.repository.NotificationRepository;
import com.scanit.backend.repository.PriceAlertRepository;
import com.scanit.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final PriceAlertRepository priceAlertRepository;
    private final UserRepository userRepository;

    public List<NotificationDto> getNotifications(String userEmail) {
        return notificationRepository.findByUserOrderByTimestampDesc(findUser(userEmail))
                .stream().map(this::toDto).collect(Collectors.toList());
    }

    public long getUnreadCount(String userEmail) {
        return notificationRepository.countByUserAndReadFalse(findUser(userEmail));
    }

    public void markAsRead(String userEmail, String notificationId) {
        User user = findUser(userEmail);
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found"));

        if (!notification.getUser().getId().equals(user.getId())) {
            throw new BadRequestException("Access denied");
        }

        notification.setRead(true);
        notificationRepository.save(notification);
    }

    public List<PriceAlertDto> getPriceAlerts(String userEmail) {
        return priceAlertRepository.findByUserOrderByTimestampDesc(findUser(userEmail))
                .stream().map(this::toAlertDto).collect(Collectors.toList());
    }

    // ── Mapping ───────────────────────────────────────────────────────────────

    private NotificationDto toDto(Notification n) {
        return NotificationDto.builder()
                .id(n.getId())
                .title(n.getTitle())
                .body(n.getBody())
                .read(n.isRead())
                .timestamp(n.getTimestamp().toString())
                .type(n.getType().name().toLowerCase())
                .build();
    }

    private PriceAlertDto toAlertDto(PriceAlert pa) {
        return PriceAlertDto.builder()
                .id(pa.getId())
                .productId(pa.getProduct().getId())
                .productName(pa.getProduct().getName())
                .oldPrice(pa.getOldPrice())
                .newPrice(pa.getNewPrice())
                .dropPercent(pa.getDropPercent())
                .timestamp(pa.getTimestamp().toString())
                .build();
    }

    private User findUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }
}
