package com.recorever.recorever_backend.controller;

import com.recorever.recorever_backend.dto.CategoryPayload;
import com.recorever.recorever_backend.model.Category;
import com.recorever.recorever_backend.repository.CategoryRepository;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/admin/categories")
@PreAuthorize("hasRole('ADMIN', 'SUPERADMIN')")
public class CategoryAdminController {

    @Autowired
    private CategoryRepository categoryRepo;

    @PostMapping
    public ResponseEntity<?> createCategory(@Valid @RequestBody CategoryPayload payload) {
        Category category = new Category();
        category.setCategoryName(payload.getCategory_name());
        category.setDeleted(false);
        
        Category saved = categoryRepo.save(category);
        return ResponseEntity.status(201).body(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateCategory(@PathVariable int id, @Valid @RequestBody CategoryPayload payload) {
        Optional<Category> categoryOpt = categoryRepo.findById(id);
        if (categoryOpt.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("error", "Category not found"));
        }
        
        Category category = categoryOpt.get();
        category.setCategoryName(payload.getCategory_name());
        Category saved = categoryRepo.save(category);
        
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteCategory(@PathVariable int id) {
        int updated = categoryRepo.softDeleteCategory(id);
        if (updated == 0) {
            return ResponseEntity.status(404).body(Map.of("error", "Category not found"));
        }
        
        return ResponseEntity.ok(Map.of("success", true, "message", "Category deleted successfully"));
    }
}