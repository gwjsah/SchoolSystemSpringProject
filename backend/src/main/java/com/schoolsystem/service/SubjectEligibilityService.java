package com.schoolsystem.service;

import com.schoolsystem.entity.Course;
import com.schoolsystem.entity.CurriculumEntry;
import com.schoolsystem.entity.Subject;
import com.schoolsystem.entity.SubjectCourseOverride;
import com.schoolsystem.entity.enums.OverrideType;
import com.schoolsystem.repository.CourseRepository;
import com.schoolsystem.repository.CurriculumEntryRepository;
import com.schoolsystem.repository.SubjectCourseOverrideRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

/**
 * Single source of truth for subject eligibility.
 * Formula:
 * eligible(course, subject) = (NOT in Never-allow) AND (openToAll OR in Course Curriculum OR in Always-allow)
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SubjectEligibilityService {

    private final CourseRepository courseRepository;
    private final CurriculumEntryRepository curriculumEntryRepository;
    private final SubjectCourseOverrideRepository subjectCourseOverrideRepository;

    /**
     * Checks if a subject is eligible for a specific course code (e.g., "BSCS").
     */
    public boolean isEligible(String courseCode, Subject subject) {
        if (courseCode == null || subject == null) {
            return false;
        }
        String cleanCourse = courseCode.trim().toUpperCase();

        List<SubjectCourseOverride> overrides = subject.getCourseOverrides() != null
                ? subject.getCourseOverrides()
                : subjectCourseOverrideRepository.findBySubject_Id(subject.getId());

        for (SubjectCourseOverride override : overrides) {
            if (override.getCourse() != null && override.getCourse().getCode().equalsIgnoreCase(cleanCourse)) {
                if (override.getOverrideType() == OverrideType.DENY) {
                    return false;
                }
                if (override.getOverrideType() == OverrideType.ALLOW) {
                    return true;
                }
            }
        }

        if (subject.isOpenToAll()) {
            return true;
        }

        List<CurriculumEntry> entries = subject.getCurriculumEntries() != null
                ? subject.getCurriculumEntries()
                : curriculumEntryRepository.findBySubject_Id(subject.getId());

        return entries.stream()
                .anyMatch(ce -> ce.getCourse() != null && ce.getCourse().getCode().equalsIgnoreCase(cleanCourse));
    }

    /**
     * Computes the list of course codes that are eligible to take this subject.
     */
    public List<String> getEligibleCourseCodes(Subject subject) {
        if (subject == null) {
            return List.of();
        }
        List<Course> allCourses = courseRepository.findAll();
        List<String> eligible = new ArrayList<>();
        for (Course c : allCourses) {
            if (isEligible(c.getCode(), subject)) {
                eligible.add(c.getCode());
            }
        }
        eligible.sort(String::compareToIgnoreCase);
        return eligible;
    }
}
