package com.schoolsystem.repository;

import com.schoolsystem.entity.Section;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SectionRepository extends JpaRepository<Section, String> {
    List<Section> findBySubject_SubjectCode(String subjectCode);
    List<Section> findByFaculty_Id(String facultyId);
    List<Section> findBySchedules_Id(String scheduleId);
    List<Section> findByBlock_SectionCodeStartingWithIgnoreCase(String prefix);
    List<Section> findByBlock_SectionCodeIgnoreCase(String sectionCode);
    List<Section> findByBlock_Id(String blockId);
    long countByBlock_Id(String blockId);
    boolean existsByBlock_IdAndSubject_SubjectCode(String blockId, String subjectCode);
    Optional<Section> findByBlock_IdAndSubject_SubjectCode(String blockId, String subjectCode);
    Optional<Section> findByBlock_IdAndSubject_SubjectCodeAndIdNot(String blockId, String subjectCode, String id);
    boolean existsByBlock_SectionCodeIgnoreCaseAndSubject_SubjectCode(String sectionCode, String subjectCode);
    Optional<Section> findByBlock_SectionCodeIgnoreCaseAndSubject_SubjectCode(String sectionCode, String subjectCode);
    Optional<Section> findByBlock_SectionCodeIgnoreCaseAndSubject_SubjectCodeAndIdNot(String sectionCode, String subjectCode, String id);
}
