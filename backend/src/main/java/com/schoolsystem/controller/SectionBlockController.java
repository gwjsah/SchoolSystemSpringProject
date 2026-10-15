package com.schoolsystem.controller;

import com.schoolsystem.dto.DtoMapper;
import com.schoolsystem.dto.Requests.SectionBlockRequest;
import com.schoolsystem.dto.Responses.SectionBlockDto;
import com.schoolsystem.service.SectionBlockService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/section-blocks")
@RequiredArgsConstructor
public class SectionBlockController {

    private final SectionBlockService sectionBlockService;

    @GetMapping
    public List<SectionBlockDto> list() {
        return sectionBlockService.getAllBlocks().stream()
                .map(DtoMapper::sectionBlock)
                .toList();
    }

    @GetMapping("/{id}")
    public SectionBlockDto get(@PathVariable String id) {
        return DtoMapper.sectionBlock(sectionBlockService.getBlock(id));
    }

    @GetMapping("/lookup")
    @PreAuthorize("hasRole('ADMIN')")
    public SectionBlockDto lookup(@RequestParam String courseCode,
                                  @RequestParam int yearLevel,
                                  @RequestParam String code) {
        return DtoMapper.sectionBlock(sectionBlockService.lookupBlock(courseCode, yearLevel, code));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.CREATED)
    public SectionBlockDto create(@Valid @RequestBody SectionBlockRequest request) {
        return DtoMapper.sectionBlock(sectionBlockService.createBlock(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public SectionBlockDto update(@PathVariable String id, @Valid @RequestBody SectionBlockRequest request) {
        return DtoMapper.sectionBlock(sectionBlockService.updateBlock(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String id, @RequestParam(defaultValue = "false") boolean force) {
        sectionBlockService.deleteBlock(id, force);
    }
}

