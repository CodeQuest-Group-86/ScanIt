package com.scanit.backend.repository;

import com.scanit.backend.entity.CounterfeitReport;
import com.scanit.backend.entity.Product;
import com.scanit.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CounterfeitReportRepository extends JpaRepository<CounterfeitReport, String> {
    long countByProduct(Product product);
    boolean existsByUserAndProduct(User user, Product product);
}
