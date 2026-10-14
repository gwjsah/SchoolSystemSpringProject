package com.schoolsystem.repository;

import com.schoolsystem.entity.Section;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SectionRepository extends JpaRepository<Section, String> {
    List<Section> findBySubject_SubjectCode(String subjectCode);
    List<Section> findByFaculty_Id(String facultyId);
    List<Section> findBySchedules_Id(String scheduleId);
    List<Section> findBySectionCodeStartingWith(String prefix);
    boolean existsBySectionCodeAndSubject_SubjectCode(String sectionCode, String subjectCode);
    Optional<Section> findBySectionCodeAndSubject_SubjectCode(String sectionCode, String subjectCode);
    Optional<Section> findBySectionCodeAndSubject_SubjectCodeAndIdNot(String sectionCode, String subjectCode, String id);
}
