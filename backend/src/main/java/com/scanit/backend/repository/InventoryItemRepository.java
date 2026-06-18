package com.scanit.backend.repository;

import com.scanit.backend.entity.InventoryItem;
import com.scanit.backend.entity.Product;
import com.scanit.backend.entity.Seller;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface InventoryItemRepository extends JpaRepository<InventoryItem, String> {
    List<InventoryItem> findBySeller(Seller seller);
    List<InventoryItem> findByProductAndListedTrue(Product product);
    List<InventoryItem> findBySellerAndListedTrue(Seller seller);
}
