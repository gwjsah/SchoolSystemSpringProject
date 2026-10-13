package com.schoolsystem.repository;

import com.schoolsystem.entity.CartItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CartItemRepository extends JpaRepository<CartItem, String> {
    List<CartItem> findByStudent_IdOrderByAddedAtAsc(String studentId);
    Optional<CartItem> findByStudent_IdAndSubject_SubjectCode(String studentId, String subjectCode);
    boolean existsByStudent_IdAndSubject_SubjectCode(String studentId, String subjectCode);
    void deleteByStudent_IdAndSubject_SubjectCode(String studentId, String subjectCode);
    void deleteByStudent_Id(String studentId);
    void deleteBySection_Id(String sectionId);
    boolean existsBySection_Id(String sectionId);
}

