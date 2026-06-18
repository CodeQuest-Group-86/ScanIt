package com.scanit.backend.repository;

import com.scanit.backend.entity.Seller;
import com.scanit.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SellerRepository extends JpaRepository<Seller, String> {
    Optional<Seller> findByUser(User user);
    List<Seller> findByVerifiedTrue();
}
