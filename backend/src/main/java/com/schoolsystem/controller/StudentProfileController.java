package com.schoolsystem.controller;

import com.schoolsystem.dto.Requests.StudentProfileUpdateRequest;
import com.schoolsystem.dto.Responses.StudentDto;
import com.schoolsystem.security.AuthUser;
import com.schoolsystem.service.StudentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/student/profile")
@PreAuthorize("hasRole('STUDENT')")
@RequiredArgsConstructor
public class StudentProfileController {

    private final StudentService studentService;

    @GetMapping
    public StudentDto getProfile(@AuthenticationPrincipal AuthUser user) {
        return studentService.getStudentProfile(user.id());
    }

    @PutMapping
    public StudentDto updateProfile(
            @AuthenticationPrincipal AuthUser user,
            @Valid @RequestBody StudentProfileUpdateRequest request) {
        return studentService.updateStudentProfile(user.id(), request);
    }
}
