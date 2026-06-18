package com.scanit.backend.repository;

import com.scanit.backend.entity.Notification;
import com.scanit.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, String> {
    List<Notification> findByUserOrderByTimestampDesc(User user);
    long countByUserAndReadFalse(User user);
}
