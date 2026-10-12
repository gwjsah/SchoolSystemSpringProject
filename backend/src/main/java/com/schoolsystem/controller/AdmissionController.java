package com.schoolsystem.controller;

import com.schoolsystem.dto.Requests.AdmissionApplicationRequest;
import com.schoolsystem.dto.Responses.AdmissionApplicationResponse;
import com.schoolsystem.dto.Responses.AdmissionStatusResponse;
import com.schoolsystem.service.StudentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/admissions")
@RequiredArgsConstructor
public class AdmissionController {

    private final StudentService studentService;

    @PostMapping("/apply")
    @ResponseStatus(HttpStatus.CREATED)
    public AdmissionApplicationResponse apply(@Valid @RequestBody AdmissionApplicationRequest request) {
        return studentService.applyForAdmission(request);
    }

    @GetMapping("/status")
    public AdmissionStatusResponse checkStatus(@RequestParam String email) {
        return studentService.checkAdmissionStatus(email);
    }
}

