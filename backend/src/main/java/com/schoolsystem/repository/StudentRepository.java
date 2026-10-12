package com.schoolsystem.repository;

import com.schoolsystem.entity.Student;
import com.schoolsystem.entity.enums.AdmissionStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface StudentRepository extends JpaRepository<Student, String> {
    Optional<Student> findByEmailIgnoreCase(String email);
    Optional<Student> findByStudentNumber(String studentNumber);
    Optional<Student> findByApplicationNumber(String applicationNumber);
    List<Student> findByAdmissionStatus(AdmissionStatus status);
    boolean existsByStudentNumber(String studentNumber);
    boolean existsByApplicationNumber(String applicationNumber);
    long countByAdmissionStatus(AdmissionStatus status);
}
