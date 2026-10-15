package com.schoolsystem.repository;

import com.schoolsystem.entity.SectionBlock;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SectionBlockRepository extends JpaRepository<SectionBlock, String> {
    Optional<SectionBlock> findBySectionCodeIgnoreCase(String sectionCode);
    boolean existsBySectionCodeIgnoreCase(String sectionCode);
    Optional<SectionBlock> findByCourseCodeIgnoreCaseAndYearLevelAndSectionCodeIgnoreCase(String courseCode, int yearLevel, String sectionCode);
    boolean existsByCourseCodeIgnoreCaseAndYearLevelAndSectionCodeIgnoreCase(String courseCode, int yearLevel, String sectionCode);
    List<SectionBlock> findByCourseCode(String courseCode);
    List<SectionBlock> findByCourseCodeAndYearLevel(String courseCode, int yearLevel);
    List<SectionBlock> findByCourseCodeIgnoreCaseAndYearLevelAndSectionCodeStartingWithIgnoreCase(String courseCode, int yearLevel, String prefix);
    List<SectionBlock> findBySectionCodeStartingWithIgnoreCase(String prefix);
}

