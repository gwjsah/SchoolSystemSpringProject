package com.schoolsystem.repository;

import com.schoolsystem.entity.CompletedSubject;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CompletedSubjectRepository extends JpaRepository<CompletedSubject, String> {
    List<CompletedSubject> findByStudent_Id(String studentId);
    boolean existsByStudent_IdAndSubject_SubjectCode(String studentId, String subjectCode);
}
