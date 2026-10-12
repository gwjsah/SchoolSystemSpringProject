package com.schoolsystem.controller;

import com.schoolsystem.dto.DtoMapper;
import com.schoolsystem.dto.Requests.ScheduleRequest;
import com.schoolsystem.dto.Responses.ScheduleDto;
import com.schoolsystem.service.ScheduleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/schedules")
@RequiredArgsConstructor
public class ScheduleController {

    private final ScheduleService scheduleService;

    @GetMapping
    public List<ScheduleDto> list() {
        return scheduleService.getAllSchedules().stream().map(DtoMapper::schedule).toList();
    }

    @GetMapping("/{id}")
    public ScheduleDto get(@PathVariable String id) {
        return DtoMapper.schedule(scheduleService.getScheduleById(id));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.CREATED)
    public ScheduleDto create(@Valid @RequestBody ScheduleRequest r) {
        return DtoMapper.schedule(scheduleService.createSchedule(r.day(), r.startTime(), r.endTime(), r.roomId()));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ScheduleDto update(@PathVariable String id, @Valid @RequestBody ScheduleRequest r) {
        return DtoMapper.schedule(scheduleService.updateSchedule(id, r.day(), r.startTime(), r.endTime(), r.roomId()));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String id) {
        scheduleService.deleteSchedule(id);
    }
}
