package com.recorever.recorever_backend.repository;

import com.recorever.recorever_backend.model.Program;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ProgramRepository extends JpaRepository<Program, Integer> {
  List<Program> findByIsDeletedFalse();
}