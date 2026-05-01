package com.recorever.recorever_backend.controller;

import com.recorever.recorever_backend.model.Category;
import com.recorever.recorever_backend.model.SurrenderedLocation;
import com.recorever.recorever_backend.repository.CategoryRepository;
import com.recorever.recorever_backend.repository.SurrenderedLocationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.List;

@RestController
@RequestMapping("/api")
public class FormsMetaDataController {

    @Autowired
    private CategoryRepository categoryRepo;

    @Autowired
    private SurrenderedLocationRepository surrenderRepo;

    @GetMapping("/categories")
    public ResponseEntity<List<Category>> getAllCategories() {
        List<Category> categories = categoryRepo.findByIsDeletedFalse();
        return ResponseEntity.ok(categories);
    }

    @GetMapping("/surrender-locations")
    public ResponseEntity<List<SurrenderedLocation>> getAllSurrenderLocations() {
        List<SurrenderedLocation> locations = surrenderRepo.findByIsDeletedFalse();
        return ResponseEntity.ok(locations);
    }
}