package com.scanit.backend.repository;

import com.scanit.backend.entity.Product;
import com.scanit.backend.entity.SavedProduct;
import com.scanit.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SavedProductRepository extends JpaRepository<SavedProduct, String> {
    List<SavedProduct> findByUser(User user);
    Optional<SavedProduct> findByUserAndProduct(User user, Product product);
    boolean existsByUserAndProduct(User user, Product product);
    void deleteByUserAndProduct(User user, Product product);
}
