package com.scanit.backend.repository;

import com.scanit.backend.entity.ScanResult;
import com.scanit.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ScanResultRepository extends JpaRepository<ScanResult, String> {
    List<ScanResult> findByUserOrderByScannedAtDesc(User user);
}
