package com.scanit.backend.repository;

import com.scanit.backend.entity.PriceAlert;
import com.scanit.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PriceAlertRepository extends JpaRepository<PriceAlert, String> {
    List<PriceAlert> findByUserOrderByTimestampDesc(User user);
}
