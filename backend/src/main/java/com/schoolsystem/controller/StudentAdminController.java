package com.schoolsystem.controller;

import com.schoolsystem.dto.Requests.RejectAdmissionRequest;
import com.schoolsystem.dto.Requests.StudentCreateRequest;
import com.schoolsystem.dto.Requests.StudentUpdateRequest;
import com.schoolsystem.dto.Responses.StudentDto;
import com.schoolsystem.entity.enums.AdmissionStatus;
import com.schoolsystem.security.AuthUser;
import com.schoolsystem.service.StudentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/admin/students")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class StudentAdminController {

    private final StudentService studentService;

    @GetMapping
    public List<StudentDto> getAllStudents(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String course,
            @RequestParam(required = false) Integer yearLevel,
            @RequestParam(required = false) AdmissionStatus status) {
        return studentService.getAllStudents(search, course, yearLevel, status);
    }

    @GetMapping("/{id}")
    public StudentDto getStudentById(@PathVariable String id) {
        return studentService.getStudentById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public StudentDto createStudent(@Valid @RequestBody StudentCreateRequest request) {
        return studentService.createStudent(request);
    }

    @PutMapping("/{id}")
    public StudentDto updateStudent(@PathVariable String id, @Valid @RequestBody StudentUpdateRequest request) {
        return studentService.updateStudent(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteStudent(@PathVariable String id) {
        studentService.deleteStudent(id);
    }

    @PostMapping("/{id}/admit")
    public StudentDto admitStudent(@PathVariable String id, @AuthenticationPrincipal AuthUser user) {
        String adminIdentifier = user != null ? user.email() : "Administrator";
        return studentService.admitStudent(id, adminIdentifier);
    }

    @PostMapping("/{id}/reject")
    public StudentDto rejectStudent(
            @PathVariable String id,
            @RequestBody(required = false) RejectAdmissionRequest request,
            @AuthenticationPrincipal AuthUser user) {
        String adminIdentifier = user != null ? user.email() : "Administrator";
        String reason = request != null ? request.reason() : null;
        return studentService.rejectStudent(id, adminIdentifier, reason);
    }
}

