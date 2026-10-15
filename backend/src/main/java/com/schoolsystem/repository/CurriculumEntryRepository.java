package com.schoolsystem.repository;

import com.schoolsystem.entity.CurriculumEntry;
import com.schoolsystem.entity.enums.Semester;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CurriculumEntryRepository extends JpaRepository<CurriculumEntry, String> {
    List<CurriculumEntry> findByCourse_CodeIgnoreCaseOrderByYearLevelAscSemesterAsc(String courseCode);
    List<CurriculumEntry> findByCourse_IdOrderByYearLevelAscSemesterAsc(String courseId);
    List<CurriculumEntry> findByCourse_CodeIgnoreCaseAndYearLevel(String courseCode, int yearLevel);
    List<CurriculumEntry> findByCourse_CodeIgnoreCaseAndYearLevelAndSemester(String courseCode, int yearLevel, Semester semester);
    List<CurriculumEntry> findBySubject_Id(String subjectId);
    List<CurriculumEntry> findBySubject_SubjectCode(String subjectCode);
    Optional<CurriculumEntry> findByCourse_IdAndSubject_Id(String courseId, String subjectId);
    Optional<CurriculumEntry> findByCourse_CodeIgnoreCaseAndSubject_SubjectCodeIgnoreCase(String courseCode, String subjectCode);
    boolean existsByCourse_IdAndSubject_Id(String courseId, String subjectId);
    boolean existsByCourse_CodeIgnoreCaseAndSubject_SubjectCodeIgnoreCase(String courseCode, String subjectCode);
    void deleteBySubject_Id(String subjectId);
}

