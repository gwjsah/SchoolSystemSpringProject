package com.schoolsystem.repository;

import com.schoolsystem.entity.Grade;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface GradeRepository extends JpaRepository<Grade, String> {
    Optional<Grade> findByStudent_IdAndSection_Id(String studentId, String sectionId);
    List<Grade> findByStudent_Id(String studentId);
    List<Grade> findBySection_Id(String sectionId);
    void deleteBySection_Id(String sectionId);
}
