package com.schoolsystem.repository;

import com.schoolsystem.entity.FacultyEvaluation;
import com.schoolsystem.entity.enums.Semester;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FacultyEvaluationRepository extends JpaRepository<FacultyEvaluation, String> {

    List<FacultyEvaluation> findByFaculty_Id(String facultyId);

    List<FacultyEvaluation> findByFaculty_IdAndSemesterAndSchoolYear(String facultyId, Semester semester, String schoolYear);

    List<FacultyEvaluation> findByStudent_Id(String studentId);

    Optional<FacultyEvaluation> findByStudent_IdAndSection_Id(String studentId, String sectionId);

    boolean existsByStudent_IdAndSection_Id(String studentId, String sectionId);

    void deleteBySection_Id(String sectionId);
}
