package com.schoolsystem.controller;

import com.schoolsystem.dto.Requests.CancelSessionRequest;
import com.schoolsystem.dto.Requests.CreateMakeupSessionRequest;
import com.schoolsystem.dto.Requests.SaveAttendanceRequest;
import com.schoolsystem.dto.Responses.AttendanceSessionDto;
import com.schoolsystem.dto.Responses.AttendanceSheetDto;
import com.schoolsystem.dto.Responses.SessionRosterDto;
import com.schoolsystem.entity.enums.UserType;
import com.schoolsystem.security.AuthUser;
import com.schoolsystem.service.AttendanceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/attendance")
@RequiredArgsConstructor
public class AttendanceController {

    private final AttendanceService attendanceService;

    private static boolean isAdmin(AuthUser user) {
        return user.userType() == UserType.ADMIN;
    }

    /** Lists all sessions (generated regular schedule dates + makeups + cancelled). */
    @GetMapping("/sections/{sectionId}/sessions")
    @PreAuthorize("hasAnyRole('FACULTY','ADMIN')")
    public List<AttendanceSessionDto> getSessions(
            @AuthenticationPrincipal AuthUser user,
            @PathVariable String sectionId) {
        return attendanceService.getSessionsForSection(user.id(), isAdmin(user), sectionId);
    }

    /** Returns the roster and any recorded attendance for a specific session date. */
    @GetMapping("/sections/{sectionId}/sessions/{date}")
    @PreAuthorize("hasAnyRole('FACULTY','ADMIN')")
    public SessionRosterDto getSessionRoster(
            @AuthenticationPrincipal AuthUser user,
            @PathVariable String sectionId,
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return attendanceService.getSessionRoster(user.id(), isAdmin(user), sectionId, date);
    }

    /** Records or updates attendance statuses for all students on a session date. */
    @PutMapping("/sections/{sectionId}/sessions/{date}")
    @PreAuthorize("hasAnyRole('FACULTY','ADMIN')")
    public SessionRosterDto saveAttendance(
            @AuthenticationPrincipal AuthUser user,
            @PathVariable String sectionId,
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @Valid @RequestBody SaveAttendanceRequest req) {
        return attendanceService.saveAttendance(user.id(), isAdmin(user), sectionId, date, req);
    }

    /** Adds an extra (makeup) session within the active term range. */
    @PostMapping("/sections/{sectionId}/sessions/makeup")
    @PreAuthorize("hasAnyRole('FACULTY','ADMIN')")
    public AttendanceSessionDto createMakeupSession(
            @AuthenticationPrincipal AuthUser user,
            @PathVariable String sectionId,
            @Valid @RequestBody CreateMakeupSessionRequest req) {
        return attendanceService.createMakeupSession(user.id(), isAdmin(user), sectionId, req.date());
    }

    /** Cancels a session. If records exist, requires confirmation (?force=true or body.force). */
    @PatchMapping("/sections/{sectionId}/sessions/{date}/cancel")
    @PreAuthorize("hasAnyRole('FACULTY','ADMIN')")
    public AttendanceSessionDto cancelSession(
            @AuthenticationPrincipal AuthUser user,
            @PathVariable String sectionId,
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) Boolean force,
            @RequestBody(required = false) CancelSessionRequest body) {
        boolean isForced = Boolean.TRUE.equals(force) || (body != null && Boolean.TRUE.equals(body.force()));
        return attendanceService.cancelSession(user.id(), isAdmin(user), sectionId, date, isForced);
    }

    /** Restores a previously cancelled session. */
    @PatchMapping("/sections/{sectionId}/sessions/{date}/restore")
    @PreAuthorize("hasAnyRole('FACULTY','ADMIN')")
    public AttendanceSessionDto restoreSession(
            @AuthenticationPrincipal AuthUser user,
            @PathVariable String sectionId,
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return attendanceService.restoreSession(user.id(), isAdmin(user), sectionId, date);
    }

    /** Returns students x sessions matrix with totals and attendance rate. */
    @GetMapping("/sections/{sectionId}/sheet")
    @PreAuthorize("hasAnyRole('FACULTY','ADMIN')")
    public AttendanceSheetDto getAttendanceSheet(
            @AuthenticationPrincipal AuthUser user,
            @PathVariable String sectionId) {
        return attendanceService.getAttendanceSheet(user.id(), isAdmin(user), sectionId);
    }
}

