package com.schoolsystem.controller;

import com.schoolsystem.dto.DtoMapper;
import com.schoolsystem.dto.Requests.CreateTermCalendarRequest;
import com.schoolsystem.dto.Requests.OpenAdmissionPeriodRequest;
import com.schoolsystem.dto.Requests.OpenEnrollmentPeriodRequest;
import com.schoolsystem.dto.Requests.OpenEvaluationPeriodRequest;
import com.schoolsystem.dto.Requests.OpenGradingPeriodRequest;
import com.schoolsystem.dto.Requests.UpdateTermCalendarRequest;
import com.schoolsystem.dto.Responses.AcademicPeriodsStatusDto;
import com.schoolsystem.dto.Responses.AdmissionPeriodDto;
import com.schoolsystem.dto.Responses.EnrollmentPeriodDto;
import com.schoolsystem.dto.Responses.EvaluationPeriodDto;
import com.schoolsystem.dto.Responses.GradingPeriodDto;
import com.schoolsystem.dto.Responses.TermCalendarDto;
import com.schoolsystem.service.AcademicPeriodService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/academic-periods")
@RequiredArgsConstructor
public class AcademicPeriodController {

    private final AcademicPeriodService academicPeriodService;

    @GetMapping({"/status", "/summary"})
    public AcademicPeriodsStatusDto getStatus() {
        return academicPeriodService.getPeriodsStatus();
    }

    // ── Enrollment Periods ──────────────────────────────────────────────────

    @GetMapping("/enrollment")
    public List<EnrollmentPeriodDto> getAllEnrollmentPeriods() {
        return academicPeriodService.getAllEnrollmentPeriods().stream()
                .map(DtoMapper::enrollmentPeriod)
                .toList();
    }

    @PostMapping("/enrollment")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.CREATED)
    public EnrollmentPeriodDto openEnrollmentPeriod(@Valid @RequestBody OpenEnrollmentPeriodRequest req) {
        return DtoMapper.enrollmentPeriod(academicPeriodService.openEnrollmentPeriod(req));
    }

    @PostMapping("/enrollment/close")
    @PreAuthorize("hasRole('ADMIN')")
    public EnrollmentPeriodDto closeActiveEnrollmentPeriod() {
        return DtoMapper.enrollmentPeriod(academicPeriodService.closeActiveEnrollmentPeriod());
    }

    @PostMapping("/enrollment/{id}/close")
    @PreAuthorize("hasRole('ADMIN')")
    public EnrollmentPeriodDto closeEnrollmentPeriod(@PathVariable String id) {
        return DtoMapper.enrollmentPeriod(academicPeriodService.closeEnrollmentPeriod(id));
    }

    // ── Grading Periods ─────────────────────────────────────────────────────

    @GetMapping("/grading")
    public List<GradingPeriodDto> getAllGradingPeriods() {
        return academicPeriodService.getAllGradingPeriods().stream()
                .map(DtoMapper::gradingPeriod)
                .toList();
    }

    @PostMapping("/grading")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.CREATED)
    public GradingPeriodDto openGradingPeriod(@Valid @RequestBody OpenGradingPeriodRequest req) {
        return DtoMapper.gradingPeriod(academicPeriodService.openGradingPeriod(req));
    }

    @PostMapping("/grading/close")
    @PreAuthorize("hasRole('ADMIN')")
    public GradingPeriodDto closeActiveGradingPeriod() {
        return DtoMapper.gradingPeriod(academicPeriodService.closeActiveGradingPeriod());
    }

    @PostMapping("/grading/{id}/close")
    @PreAuthorize("hasRole('ADMIN')")
    public GradingPeriodDto closeGradingPeriod(@PathVariable String id) {
        return DtoMapper.gradingPeriod(academicPeriodService.closeGradingPeriod(id));
    }

    // ── Evaluation Periods ──────────────────────────────────────────────────

    @GetMapping("/evaluation")
    public List<EvaluationPeriodDto> getAllEvaluationPeriods() {
        return academicPeriodService.getAllEvaluationPeriods().stream()
                .map(DtoMapper::evaluationPeriod)
                .toList();
    }

    @PostMapping("/evaluation")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.CREATED)
    public EvaluationPeriodDto openEvaluationPeriod(@Valid @RequestBody OpenEvaluationPeriodRequest req) {
        return DtoMapper.evaluationPeriod(academicPeriodService.openEvaluationPeriod(req));
    }

    @PostMapping("/evaluation/close")
    @PreAuthorize("hasRole('ADMIN')")
    public EvaluationPeriodDto closeActiveEvaluationPeriod() {
        return DtoMapper.evaluationPeriod(academicPeriodService.closeActiveEvaluationPeriod());
    }

    @PostMapping("/evaluation/{id}/close")
    @PreAuthorize("hasRole('ADMIN')")
    public EvaluationPeriodDto closeEvaluationPeriod(@PathVariable String id) {
        return DtoMapper.evaluationPeriod(academicPeriodService.closeEvaluationPeriod(id));
    }

    // ── Admission Periods ───────────────────────────────────────────────────

    @GetMapping("/admission")
    public List<AdmissionPeriodDto> getAllAdmissionPeriods() {
        return academicPeriodService.getAllAdmissionPeriods().stream()
                .map(DtoMapper::admissionPeriod)
                .toList();
    }

    @PostMapping("/admission")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.CREATED)
    public AdmissionPeriodDto openAdmissionPeriod(@Valid @RequestBody OpenAdmissionPeriodRequest req) {
        return DtoMapper.admissionPeriod(academicPeriodService.openAdmissionPeriod(req));
    }

    @PostMapping("/admission/close")
    @PreAuthorize("hasRole('ADMIN')")
    public AdmissionPeriodDto closeActiveAdmissionPeriod() {
        return DtoMapper.admissionPeriod(academicPeriodService.closeActiveAdmissionPeriod());
    }

    @PostMapping("/admission/{id}/close")
    @PreAuthorize("hasRole('ADMIN')")
    public AdmissionPeriodDto closeAdmissionPeriod(@PathVariable String id) {
        return DtoMapper.admissionPeriod(academicPeriodService.closeAdmissionPeriod(id));
    }

    // ── Term Calendar ───────────────────────────────────────────────────────

    @GetMapping("/term")
    @PreAuthorize("hasRole('ADMIN')")
    public List<TermCalendarDto> getAllTerms() {
        return academicPeriodService.getAllTerms().stream()
                .map(DtoMapper::termCalendar)
                .toList();
    }

    @GetMapping("/term/active")
    public TermCalendarDto getActiveTerm() {
        return DtoMapper.termCalendar(academicPeriodService.getActiveTerm());
    }

    @PostMapping("/term")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.CREATED)
    public TermCalendarDto createTerm(@Valid @RequestBody CreateTermCalendarRequest req) {
        return DtoMapper.termCalendar(academicPeriodService.createTerm(req));
    }

    @PutMapping("/term/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public TermCalendarDto updateTerm(@PathVariable String id, @Valid @RequestBody UpdateTermCalendarRequest req) {
        return DtoMapper.termCalendar(academicPeriodService.updateTerm(id, req));
    }

    @PatchMapping("/term/{id}/activate")
    @PreAuthorize("hasRole('ADMIN')")
    public TermCalendarDto activateTerm(@PathVariable String id) {
        return DtoMapper.termCalendar(academicPeriodService.activateTerm(id));
    }
}

