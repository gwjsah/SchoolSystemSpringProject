package com.schoolsystem.controller;

import com.schoolsystem.dto.Requests.SubmitFacultyEvaluationRequest;
import com.schoolsystem.dto.Responses.FacultyEvaluationDto;
import com.schoolsystem.dto.Responses.FacultyEvaluationSummaryDto;
import com.schoolsystem.dto.Responses.StudentTeacherToEvaluateDto;
import com.schoolsystem.security.AuthUser;
import com.schoolsystem.service.EvaluationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/evaluations")
@RequiredArgsConstructor
public class EvaluationController {

    private final EvaluationService evaluationService;

    @GetMapping("/my-teachers")
    @PreAuthorize("hasRole('STUDENT')")
    public List<StudentTeacherToEvaluateDto> getMyTeachers(@AuthenticationPrincipal AuthUser user) {
        return evaluationService.getStudentTeachersToEvaluate(user.id());
    }

    @PostMapping
    @PreAuthorize("hasRole('STUDENT')")
    @ResponseStatus(HttpStatus.CREATED)
    public FacultyEvaluationDto submitEvaluation(
            @AuthenticationPrincipal AuthUser user,
            @Valid @RequestBody SubmitFacultyEvaluationRequest request) {
        return evaluationService.submitEvaluation(user.id(), request);
    }

    @GetMapping("/faculty/{facultyId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'FACULTY')")
    public FacultyEvaluationSummaryDto getFacultyEvaluationSummary(@PathVariable String facultyId) {
        return evaluationService.getFacultyEvaluationSummary(facultyId);
    }
}

