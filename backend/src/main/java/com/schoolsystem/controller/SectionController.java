package com.schoolsystem.controller;

import com.schoolsystem.dto.DtoMapper;
import com.schoolsystem.dto.Requests.ScheduleRequest;
import com.schoolsystem.dto.Requests.SectionRequest;
import com.schoolsystem.dto.Responses.SectionDto;
import com.schoolsystem.entity.Section;
import com.schoolsystem.security.AuthUser;
import com.schoolsystem.service.SectionService;
import com.schoolsystem.service.SectionService.ScheduleSlot;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/sections")
@RequiredArgsConstructor
public class SectionController {

    private final SectionService sectionService;

    /** All sections, or only those of one subject with ?subjectCode=CSIT221. */
    @GetMapping
    public List<SectionDto> list(@RequestParam(required = false) String subjectCode) {
        List<Section> sections = (subjectCode == null || subjectCode.isBlank())
                ? sectionService.getAllSections()
                : sectionService.getSectionsBySubject(subjectCode);
        return sections.stream().map(DtoMapper::section).toList();
    }

    /** The sections the logged-in faculty member teaches. */
    @GetMapping("/mine")
    @PreAuthorize("hasRole('FACULTY')")
    public List<SectionDto> mine(@AuthenticationPrincipal AuthUser user) {
        return sectionService.getSectionsForFaculty(user.id()).stream().map(DtoMapper::section).toList();
    }

    @GetMapping("/{id}")
    public SectionDto get(@PathVariable String id) {
        return DtoMapper.section(sectionService.getSection(id));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.CREATED)
    public SectionDto create(@Valid @RequestBody SectionRequest r) {
        return DtoMapper.section(sectionService.createSection(
                r.sectionCode(), r.subjectCode(), r.facultyId(), r.capacity(), toSlots(r.schedules())));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public SectionDto update(@PathVariable String id, @Valid @RequestBody SectionRequest r) {
        return DtoMapper.section(sectionService.updateSection(
                id, r.sectionCode(), r.facultyId(), r.capacity(), toSlots(r.schedules())));
    }

    @PostMapping("/bulk/validate")
    @PreAuthorize("hasRole('ADMIN')")
    public com.schoolsystem.dto.Responses.BulkValidationResponse validateBulk(@Valid @RequestBody com.schoolsystem.dto.Requests.BulkSectionRequest r) {
        return sectionService.validateBulkSections(r.sections());
    }

    @PostMapping("/bulk")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.CREATED)
    public List<SectionDto> createBulk(@Valid @RequestBody com.schoolsystem.dto.Requests.BulkSectionRequest r) {
        return sectionService.createBulkSections(r.sections()).stream()
                .map(DtoMapper::section).toList();
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String id, @RequestParam(defaultValue = "false") boolean force) {
        sectionService.deleteSection(id, force);
    }

    private static List<ScheduleSlot> toSlots(List<ScheduleRequest> schedules) {
        return schedules.stream()
                .map(s -> new ScheduleSlot(s.day(), s.startTime(), s.endTime(), s.roomId(), s.slotType()))
                .toList();
    }
}
