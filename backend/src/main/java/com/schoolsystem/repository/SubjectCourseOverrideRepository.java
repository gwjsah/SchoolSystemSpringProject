package com.schoolsystem.repository;

import com.schoolsystem.entity.SubjectCourseOverride;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SubjectCourseOverrideRepository extends JpaRepository<SubjectCourseOverride, String> {
    List<SubjectCourseOverride> findBySubject_Id(String subjectId);
    List<SubjectCourseOverride> findBySubject_SubjectCode(String subjectCode);
    Optional<SubjectCourseOverride> findBySubject_IdAndCourse_Id(String subjectId, String courseId);
    Optional<SubjectCourseOverride> findBySubject_SubjectCodeIgnoreCaseAndCourse_CodeIgnoreCase(String subjectCode, String courseCode);
    void deleteBySubject_Id(String subjectId);
}

