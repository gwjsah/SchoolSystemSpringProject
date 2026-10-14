package com.schoolsystem.controller;

import com.schoolsystem.dto.DtoMapper;
import com.schoolsystem.dto.Requests.GradeRequest;
import com.schoolsystem.dto.Responses.GradeDto;
import com.schoolsystem.dto.Responses.GradingStatusDto;
import com.schoolsystem.dto.Responses.RosterEntryDto;
import com.schoolsystem.entity.Grade;
import com.schoolsystem.entity.enums.UserType;
import com.schoolsystem.security.AuthUser;
import com.schoolsystem.service.GradeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/grades")
@RequiredArgsConstructor
public class GradeController {

    private final GradeService gradeService;

    /** Whether grades can be edited right now, and whether the deadline has passed. */
    @GetMapping("/status")
    public GradingStatusDto status() {
        return new GradingStatusDto(gradeService.canEdit(), gradeService.isPastDeadline());
    }

    @GetMapping("/my")
    @PreAuthorize("hasRole('STUDENT')")
    public List<GradeDto> myGrades(@AuthenticationPrincipal AuthUser user) {
        return gradeService.getGradesForStudent(user.id());
    }

    /** Enrolled students of a section and their grades. Faculty see only their own sections. */
    @GetMapping("/sections/{sectionId}")
    @PreAuthorize("hasAnyRole('FACULTY','ADMIN')")
    public List<RosterEntryDto> roster(@AuthenticationPrincipal AuthUser user, @PathVariable String sectionId) {
        return gradeService.getSectionRoster(user.id(), isAdmin(user), sectionId).stream()
                .map(DtoMapper::rosterEntry).toList();
    }

    /** Creates or updates a student's grades. Only non-null grades overwrite what is stored. */
    @PutMapping
    @PreAuthorize("hasAnyRole('FACULTY','ADMIN')")
    public GradeDto submit(@AuthenticationPrincipal AuthUser user, @Valid @RequestBody GradeRequest r) {
        Grade grade = gradeService.submitGrade(user.id(), isAdmin(user), r.studentId(), r.sectionId(),
                r.prelimGrade(), r.midtermGrade(), r.preFinalGrade(), r.finalGrade());
        return DtoMapper.grade(grade);
    }

    private static boolean isAdmin(AuthUser user) {
        return user.userType() == UserType.ADMIN;
    }
}
