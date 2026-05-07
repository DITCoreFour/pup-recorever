package com.recorever.recorever_backend.controller;

import com.recorever.recorever_backend.model.Program;
import com.recorever.recorever_backend.repository.ProgramRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

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

  @PostMapping
  public ResponseEntity<?> createProgram(@RequestBody Map<String, String> payload) {
    String code = payload.get("programCode");
    String name = payload.get("programName");

    if (name == null || name.trim().isEmpty()) {
      return ResponseEntity.badRequest().body(Map.of("error", "Program name is required"));
    }

    Program program = new Program();
    program.setProgramCode(code != null ? code : "");
    program.setProgramName(name);
    program.setDeleted(false);

    Program savedProgram = programRepo.save(program);
    return ResponseEntity.ok(savedProgram);
  }

  @PutMapping("/{id}")
  public ResponseEntity<?> updateProgram(
      @PathVariable int id, 
      @RequestBody Map<String, String> payload
  ) {
    return programRepo.findById(id).map(program -> {
      String code = payload.get("programCode");
      String name = payload.get("programName");

      if (name != null && !name.trim().isEmpty()) {
        program.setProgramName(name);
      }
      if (code != null) {
        program.setProgramCode(code);
      }

      programRepo.save(program);
      return ResponseEntity.ok(program);
    }).orElse(ResponseEntity.notFound().build());
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<?> deleteProgram(@PathVariable int id) {
    return programRepo.findById(id).map(program -> {
      program.setDeleted(true);
      programRepo.save(program);
      return ResponseEntity.ok().build();
    }).orElse(ResponseEntity.notFound().build());
  }
}