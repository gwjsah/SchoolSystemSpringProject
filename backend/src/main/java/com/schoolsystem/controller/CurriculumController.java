package com.schoolsystem.controller;

import com.schoolsystem.dto.Requests;
import com.schoolsystem.dto.Responses;
import com.schoolsystem.service.CurriculumService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/curriculum")
@RequiredArgsConstructor
public class CurriculumController {

    private final CurriculumService curriculumService;

    @GetMapping("/{courseCode}")
    public Responses.CurriculumResponse getCurriculum(@PathVariable String courseCode) {
        return curriculumService.getCurriculum(courseCode);
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.CREATED)
    public Responses.CurriculumEntryDto addEntry(@Valid @RequestBody Requests.CurriculumEntryRequest req) {
        return curriculumService.addEntry(req);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public Responses.CurriculumEntryDto updateEntry(@PathVariable String id, @Valid @RequestBody Requests.CurriculumEntryRequest req) {
        return curriculumService.updateEntry(id, req);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteEntry(@PathVariable String id) {
        curriculumService.deleteEntry(id);
    }
}

