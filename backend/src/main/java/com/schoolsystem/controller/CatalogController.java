package com.schoolsystem.controller;

import com.schoolsystem.dto.DtoMapper;
import com.schoolsystem.dto.Responses.AccountDto;
import com.schoolsystem.dto.Responses.CourseDto;
import com.schoolsystem.dto.Responses.SubjectDto;
import com.schoolsystem.exception.NotFoundException;
import com.schoolsystem.repository.CourseRepository;
import com.schoolsystem.repository.FacultyRepository;
import com.schoolsystem.repository.SubjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.schoolsystem.dto.Requests;
import com.schoolsystem.entity.Subject;
import com.schoolsystem.service.DatabasePopulatorService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;

import java.util.List;
import java.util.Map;

/** Academic catalog lookups & admin subject management. */
@RestController
@RequestMapping
@RequiredArgsConstructor
public class CatalogController {

    private final SubjectRepository subjectRepository;
    private final CourseRepository courseRepository;
    private final FacultyRepository facultyRepository;
    private final DatabasePopulatorService databasePopulatorService;

    /** Optional filters: ?course=BSIT&yearLevel=2 */
    @GetMapping("/subjects")
    @Transactional(readOnly = true)
    public List<SubjectDto> subjects(@RequestParam(required = false) String course,
                                     @RequestParam(required = false) Integer yearLevel) {
        return subjectRepository.findAll().stream()
                .filter(s -> course == null || s.getCourse().equalsIgnoreCase(course))
                .filter(s -> yearLevel == null || s.getYearLevel() == yearLevel)
                .map(DtoMapper::subject)
                .toList();
    }

    @GetMapping("/subjects/{subjectCode}")
    @Transactional(readOnly = true)
    public SubjectDto subject(@PathVariable String subjectCode) {
        return subjectRepository.findBySubjectCode(subjectCode)
                .map(DtoMapper::subject)
                .orElseThrow(() -> new NotFoundException("Subject not found: " + subjectCode));
    }

    @PostMapping("/subjects")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.CREATED)
    public SubjectDto createSubject(@Valid @RequestBody Requests.SubjectRequest r) {
        if (subjectRepository.findBySubjectCode(r.subjectCode()).isPresent()) {
            throw new IllegalStateException("Subject code already exists: " + r.subjectCode());
        }
        Subject s = new Subject();
        s.setSubjectCode(r.subjectCode().toUpperCase().trim());
        s.setSubjectName(r.subjectName().trim());
        s.setUnits(r.units());
        s.setYearLevel(r.yearLevel());
        s.setSemester(r.semester());
        s.setCourse(r.course().toUpperCase().trim());
        s.setPrerequisites(r.prerequisites() != null ? r.prerequisites() : List.of());
        return DtoMapper.subject(subjectRepository.save(s));
    }

    @PutMapping("/subjects/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public SubjectDto updateSubject(@PathVariable String id, @Valid @RequestBody Requests.SubjectRequest r) {
        Subject s = subjectRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Subject not found: " + id));
        s.setSubjectName(r.subjectName().trim());
        s.setUnits(r.units());
        s.setYearLevel(r.yearLevel());
        s.setSemester(r.semester());
        s.setCourse(r.course().toUpperCase().trim());
        s.setPrerequisites(r.prerequisites() != null ? r.prerequisites() : List.of());
        return DtoMapper.subject(subjectRepository.save(s));
    }

    @DeleteMapping("/subjects/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteSubject(@PathVariable String id) {
        Subject s = subjectRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Subject not found: " + id));
        subjectRepository.delete(s);
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
