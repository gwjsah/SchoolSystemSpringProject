package com.schoolsystem.controller;

import com.schoolsystem.dto.Requests;
import com.schoolsystem.dto.Responses;
import com.schoolsystem.service.DepartmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/departments")
@RequiredArgsConstructor
public class DepartmentController {

    private final DepartmentService departmentService;

    @GetMapping
    public List<Responses.DepartmentDto> getDepartments() {
        return departmentService.getAllDepartments();
    }

    @GetMapping("/{id}")
    public Responses.DepartmentDto getDepartment(@PathVariable String id) {
        return departmentService.getDepartment(id);
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.CREATED)
    public Responses.DepartmentDto createDepartment(@Valid @RequestBody Requests.DepartmentRequest req) {
        return departmentService.createDepartment(req);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public Responses.DepartmentDto updateDepartment(@PathVariable String id, @Valid @RequestBody Requests.DepartmentRequest req) {
        return departmentService.updateDepartment(id, req);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteDepartment(@PathVariable String id) {
        departmentService.deleteDepartment(id);
    }
}

