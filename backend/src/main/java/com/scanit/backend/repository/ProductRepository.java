package com.scanit.backend.repository;

import com.scanit.backend.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProductRepository extends JpaRepository<Product, String> {
    List<Product> findByNameContainingIgnoreCaseOrBrandContainingIgnoreCase(String name, String brand);
    List<Product> findByCategoryIgnoreCase(String category);
    List<Product> findByBarcode(String barcode);
}
