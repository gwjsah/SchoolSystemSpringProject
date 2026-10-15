package com.schoolsystem.controller;

import com.schoolsystem.dto.DtoMapper;
import com.schoolsystem.dto.Requests;
import com.schoolsystem.dto.Responses.AccountDto;
import com.schoolsystem.dto.Responses.CourseDto;
import com.schoolsystem.dto.Responses.SubjectDto;
import com.schoolsystem.entity.Course;
import com.schoolsystem.entity.Department;
import com.schoolsystem.entity.Faculty;
import com.schoolsystem.entity.Subject;
import com.schoolsystem.entity.SubjectCourseOverride;
import com.schoolsystem.entity.enums.Semester;
import com.schoolsystem.exception.ConflictException;
import com.schoolsystem.exception.NotFoundException;
import com.schoolsystem.repository.*;
import com.schoolsystem.service.DatabasePopulatorService;
import com.schoolsystem.service.SubjectEligibilityService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;

/** Academic catalog lookups & admin subject management. */
@RestController
@RequestMapping
@RequiredArgsConstructor
public class CatalogController {

    private final SubjectRepository subjectRepository;
    private final CourseRepository courseRepository;
    private final FacultyRepository facultyRepository;
    private final DepartmentRepository departmentRepository;
    private final CurriculumEntryRepository curriculumEntryRepository;
    private final SubjectCourseOverrideRepository subjectCourseOverrideRepository;
    private final SubjectEligibilityService subjectEligibilityService;
    private final DatabasePopulatorService databasePopulatorService;

    /**
     * Flexible subject query endpoint:
     * - ?departmentId=...
     * - ?eligibleFor=BSCS
     * - ?course=BSCS&yearLevel=1&semester=FIRST
     * - ?q=search_term
     */
    @GetMapping("/subjects")
    @Transactional(readOnly = true)
    public List<SubjectDto> subjects(@RequestParam(required = false) String departmentId,
                                     @RequestParam(required = false) String eligibleFor,
                                     @RequestParam(required = false) String course,
                                     @RequestParam(required = false) Integer yearLevel,
                                     @RequestParam(required = false) Semester semester,
                                     @RequestParam(required = false) String q) {

        Stream<Subject> stream = subjectRepository.findAll().stream();

        if (departmentId != null && !departmentId.isBlank()) {
            stream = stream.filter(s -> s.getDepartment() != null && s.getDepartment().getId().equals(departmentId.trim()));
        }

        if (eligibleFor != null && !eligibleFor.isBlank()) {
            final String targetCourse = eligibleFor.trim().toUpperCase();
            stream = stream.filter(s -> subjectEligibilityService.isEligible(targetCourse, s));
        }

        if (course != null && !course.isBlank()) {
            final String cCode = course.trim().toUpperCase();
            if (yearLevel != null && semester != null) {
                // Find subjects placed in this curriculum slot
                var placedSubjectIds = curriculumEntryRepository
                        .findByCourse_CodeIgnoreCaseAndYearLevelAndSemester(cCode, yearLevel, semester)
                        .stream().map(ce -> ce.getSubject().getId()).toList();
                stream = stream.filter(s -> placedSubjectIds.contains(s.getId()));
            } else if (yearLevel != null) {
                var placedSubjectIds = curriculumEntryRepository
                        .findByCourse_CodeIgnoreCaseAndYearLevel(cCode, yearLevel)
                        .stream().map(ce -> ce.getSubject().getId()).toList();
                stream = stream.filter(s -> placedSubjectIds.contains(s.getId()));
            } else {
                // All subjects eligible for this course
                stream = stream.filter(s -> subjectEligibilityService.isEligible(cCode, s));
            }
        }

        if (q != null && !q.isBlank()) {
            final String query = q.trim().toLowerCase();
            stream = stream.filter(s ->
                    (s.getSubjectCode() != null && s.getSubjectCode().toLowerCase().contains(query)) ||
                    (s.getSubjectName() != null && s.getSubjectName().toLowerCase().contains(query))
            );
        }

        return stream.map(s -> DtoMapper.subject(s, subjectEligibilityService.getEligibleCourseCodes(s))).toList();
    }

    @GetMapping("/subjects/{subjectCode}")
    @Transactional(readOnly = true)
    public SubjectDto subject(@PathVariable String subjectCode) {
        Subject s = subjectRepository.findBySubjectCode(subjectCode.trim().toUpperCase())
                .orElseThrow(() -> new NotFoundException("Subject not found: " + subjectCode));
        return DtoMapper.subject(s, subjectEligibilityService.getEligibleCourseCodes(s));
    }

    @PostMapping("/subjects")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public SubjectDto createSubject(@Valid @RequestBody Requests.SubjectRequest r) {
        String code = r.subjectCode().toUpperCase().trim();
        if (subjectRepository.findBySubjectCode(code).isPresent()) {
            throw new IllegalStateException("Subject code already exists: " + code);
        }

        Department dept = departmentRepository.findById(r.departmentId().trim())
                .orElseThrow(() -> new NotFoundException("Department not found: " + r.departmentId()));

        Subject s = new Subject();
        s.setSubjectCode(code);
        s.setSubjectName(r.subjectName().trim());
        s.setLectureUnits(r.lectureUnits());
        s.setLabUnits(r.labUnits());
        s.syncUnits();
        s.setOpenToAll(Boolean.TRUE.equals(r.openToAll()));
        s.setDepartment(dept);
        s.setPrerequisites(r.prerequisites() != null ? r.prerequisites() : List.of());

        // Validate and assign faculty (must belong to same department)
        if (r.assignedFacultyIds() != null && !r.assignedFacultyIds().isEmpty()) {
            List<Faculty> facultyList = facultyRepository.findAllById(r.assignedFacultyIds());
            for (Faculty f : facultyList) {
                if (f.getDepartment() == null || !f.getDepartment().getId().equals(dept.getId())) {
                    throw new ConflictException("Faculty " + f.getName() + " does not belong to department " + dept.getName());
                }
            }
            s.setAssignedFaculties(facultyList);
        }

        Subject saved = subjectRepository.save(s);

        // Apply overrides if provided
        if (r.overrides() != null) {
            for (Requests.SubjectCourseOverrideRequest ov : r.overrides()) {
                Course c = courseRepository.findByCode(ov.courseCode().trim().toUpperCase())
                        .orElseThrow(() -> new NotFoundException("Course not found: " + ov.courseCode()));
                SubjectCourseOverride override = new SubjectCourseOverride(saved, c, ov.type());
                subjectCourseOverrideRepository.save(override);
                saved.getCourseOverrides().add(override);
            }
        }

        return DtoMapper.subject(saved, subjectEligibilityService.getEligibleCourseCodes(saved));
    }

    @PutMapping("/subjects/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public SubjectDto updateSubject(@PathVariable String id, @Valid @RequestBody Requests.SubjectRequest r) {
        Subject s = subjectRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Subject not found: " + id));

        Department dept = departmentRepository.findById(r.departmentId().trim())
                .orElseThrow(() -> new NotFoundException("Department not found: " + r.departmentId()));

        // If department changes, ensure all currently assigned faculty belong to the new department
        if (!s.getDepartment().getId().equals(dept.getId())) {
            List<Faculty> currentFaculty = s.getAssignedFaculties() != null ? s.getAssignedFaculties() : List.of();
            for (Faculty f : currentFaculty) {
                if (f.getDepartment() == null || !f.getDepartment().getId().equals(dept.getId())) {
                    throw new ConflictException(String.format(
                            "Cannot move subject '%s' to department '%s' while faculty '%s' from '%s' is assigned to it. Reassign faculty first.",
                            s.getSubjectCode(), dept.getName(), f.getName(), f.getDepartment() != null ? f.getDepartment().getName() : "None"
                    ));
                }
            }
        }

        s.setSubjectName(r.subjectName().trim());
        s.setLectureUnits(r.lectureUnits());
        s.setLabUnits(r.labUnits());
        s.syncUnits();
        s.setOpenToAll(Boolean.TRUE.equals(r.openToAll()));
        s.setDepartment(dept);
        s.setPrerequisites(r.prerequisites() != null ? r.prerequisites() : List.of());

        if (r.assignedFacultyIds() != null) {
            List<Faculty> facultyList = r.assignedFacultyIds().isEmpty()
                    ? new ArrayList<>()
                    : facultyRepository.findAllById(r.assignedFacultyIds());
            for (Faculty f : facultyList) {
                if (f.getDepartment() == null || !f.getDepartment().getId().equals(dept.getId())) {
                    throw new ConflictException("Faculty " + f.getName() + " does not belong to department " + dept.getName());
                }
            }
            s.setAssignedFaculties(facultyList);
        }

        // Update overrides
        if (r.overrides() != null) {
            subjectCourseOverrideRepository.deleteBySubject_Id(s.getId());
            s.getCourseOverrides().clear();
            for (Requests.SubjectCourseOverrideRequest ov : r.overrides()) {
                Course c = courseRepository.findByCode(ov.courseCode().trim().toUpperCase())
                        .orElseThrow(() -> new NotFoundException("Course not found: " + ov.courseCode()));
                SubjectCourseOverride override = new SubjectCourseOverride(s, c, ov.type());
                subjectCourseOverrideRepository.save(override);
                s.getCourseOverrides().add(override);
            }
        }

        Subject saved = subjectRepository.save(s);
        return DtoMapper.subject(saved, subjectEligibilityService.getEligibleCourseCodes(saved));
    }

    @DeleteMapping("/subjects/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void deleteSubject(@PathVariable String id) {
        Subject s = subjectRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Subject not found: " + id));

        // Delete curriculum entries and overrides tied to this subject
        curriculumEntryRepository.deleteBySubject_Id(id);
        subjectCourseOverrideRepository.deleteBySubject_Id(id);

        subjectRepository.delete(s);
    }

    /** Bulk assign faculty qualified/assigned to teach a subject (must belong to subject's department). */
    @PutMapping("/subjects/{id}/faculty")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public SubjectDto assignFacultyToSubject(@PathVariable String id,
                                             @RequestBody Requests.AssignFacultyRequest r) {
        Subject s = subjectRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Subject not found: " + id));

        List<Faculty> facultyMembers = (r.facultyIds() != null && !r.facultyIds().isEmpty())
                ? facultyRepository.findAllById(r.facultyIds())
                : new ArrayList<>();

        for (Faculty f : facultyMembers) {
            if (f.getDepartment() == null || !f.getDepartment().getId().equals(s.getDepartment().getId())) {
                throw new ConflictException("Faculty " + f.getName() + " does not belong to "
                        + s.getDepartment().getName() + " (" + s.getDepartment().getCode() + ")");
            }
        }

        s.setAssignedFaculties(facultyMembers);
        Subject saved = subjectRepository.save(s);
        return DtoMapper.subject(saved, subjectEligibilityService.getEligibleCourseCodes(saved));
    }

    @GetMapping("/courses")
    public List<CourseDto> courses() {
        return courseRepository.findAll().stream().map(DtoMapper::course).toList();
    }

    @GetMapping("/faculty")
    @PreAuthorize("hasRole('ADMIN')")
    public List<AccountDto> faculty() {
        return facultyRepository.findAll().stream().map(DtoMapper::account).toList();
    }

    @PostMapping("/admin/populate-data")
    @PreAuthorize("hasRole('ADMIN')")
    public Map<String, Object> populateData() {
        return databasePopulatorService.populate();
    }
}
