package com.recorever.recorever_backend.controller;

import com.recorever.recorever_backend.model.Program;
import com.recorever.recorever_backend.repository.ProgramRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.List;

@RestController
@RequestMapping("/api/programs")
public class ProgramController {

  @Autowired
  private ProgramRepository programRepo;

  @GetMapping
  public ResponseEntity<List<Program>> getAllPrograms() {
    List<Program> programs = programRepo.findByIsDeletedFalse();
    return ResponseEntity.ok(programs);
  }
}