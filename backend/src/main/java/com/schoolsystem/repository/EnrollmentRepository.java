package com.schoolsystem.repository;

import com.schoolsystem.entity.Enrollment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface EnrollmentRepository extends JpaRepository<Enrollment, String> {
    List<Enrollment> findByStudent_Id(String studentId);
    List<Enrollment> findBySection_Id(String sectionId);
    Optional<Enrollment> findByStudent_IdAndSection_Id(String studentId, String sectionId);
    boolean existsBySection_Id(String sectionId);
    void deleteBySection_Id(String sectionId);
}
