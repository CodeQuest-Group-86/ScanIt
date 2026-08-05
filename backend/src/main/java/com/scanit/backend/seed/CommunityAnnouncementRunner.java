package com.scanit.backend.seed;

import com.scanit.backend.entity.User;
import com.scanit.backend.enums.NotificationType;
import com.scanit.backend.repository.NotificationRepository;
import com.scanit.backend.repository.UserRepository;
import com.scanit.backend.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * One-time broadcast to every existing user (in-app notification + push, for whoever has a
 * registered device) announcing the ScanIt Telegram community. Guarded by title existence so
 * it only ever actually sends once, no matter how many times the app redeploys — remove this
 * class once it's confirmed sent if you don't want the dead code sitting around.
 */
@Component
@Order(1)
@RequiredArgsConstructor
@Slf4j
public class CommunityAnnouncementRunner implements CommandLineRunner {

    private final UserRepository userRepository;
    private final NotificationRepository notificationRepository;
    private final NotificationService notificationService;

    private static final String TITLE = "Join the ScanIt Forum!";
    private static final String BODY =
        "Meet other devs, connect, and help grow the community — join our Telegram: https://t.me/+miW3xIdfIPQ4Y2I0";

    @Override
    public void run(String... args) {
        if (notificationRepository.existsByTitle(TITLE)) {
            return; // already broadcast — never resend on later redeploys
        }

        java.util.List<User> users = userRepository.findAll();
        int sent = 0, pushed = 0;
        for (User user : users) {
            // One user's row failing (bad data, transient DB error, etc.) must never abort
            // the whole broadcast — or worse, crash app startup, as happened here once already.
            try {
                notificationService.notify(user, TITLE, BODY, NotificationType.COMMUNITY);
                sent++;
                if (user.getPushToken() != null && !user.getPushToken().isBlank()) pushed++;
            } catch (Exception e) {
                log.warn("Community announcement failed for user {}: {}", user.getId(), e.getMessage());
            }
        }
        log.info("Community announcement broadcast to {}/{} users ({} with a push token)", sent, users.size(), pushed);
    }
}
