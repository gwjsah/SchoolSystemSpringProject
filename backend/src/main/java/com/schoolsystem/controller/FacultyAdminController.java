    package com.schoolsystem.controller;

import com.schoolsystem.dto.Requests.FacultyCreateRequest;
import com.schoolsystem.dto.Requests.FacultyUpdateRequest;
import com.schoolsystem.dto.Responses.FacultyDetailDto;
import com.schoolsystem.service.FacultyService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/admin/faculty")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class FacultyAdminController {

    private final FacultyService facultyService;
    private final com.schoolsystem.service.EvaluationService evaluationService;

    @GetMapping
    public List<FacultyDetailDto> getAllFaculty(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String department) {
        return facultyService.getAllFaculty(search, department);
    }

    @GetMapping("/{id}")
    public FacultyDetailDto getFacultyById(@PathVariable String id) {
        return facultyService.getFacultyById(id);
    }

    @GetMapping("/{id}/evaluations")
    public com.schoolsystem.dto.Responses.FacultyEvaluationSummaryDto getFacultyEvaluations(@PathVariable String id) {
        return evaluationService.getFacultyEvaluationSummary(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public FacultyDetailDto createFaculty(@Valid @RequestBody FacultyCreateRequest request) {
        return facultyService.createFaculty(request);
    }

    @PutMapping("/{id}")
    public FacultyDetailDto updateFaculty(@PathVariable String id, @Valid @RequestBody FacultyUpdateRequest request) {
        return facultyService.updateFaculty(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteFaculty(@PathVariable String id) {
        facultyService.deleteFaculty(id);
    }
}

