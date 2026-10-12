package com.schoolsystem.repository;

import com.schoolsystem.entity.FacultyEvaluation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FacultyEvaluationRepository extends JpaRepository<FacultyEvaluation, String> {

    List<FacultyEvaluation> findByFaculty_Id(String facultyId);
    void deleteBySection_Id(String sectionId);
}
