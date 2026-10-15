package com.schoolsystem.repository;

import com.schoolsystem.entity.Subject;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SubjectRepository extends JpaRepository<Subject, String> {
    Optional<Subject> findBySubjectCode(String subjectCode);
    List<Subject> findByDepartment_Id(String departmentId);
    List<Subject> findByAssignedFaculties_Id(String facultyId);
}
