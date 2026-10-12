package com.schoolsystem.controller;

import com.schoolsystem.dto.DtoMapper;
import com.schoolsystem.dto.Requests.AnnouncementRequest;
import com.schoolsystem.dto.Responses.AnnouncementDto;
import com.schoolsystem.security.AuthUser;
import com.schoolsystem.service.AnnouncementService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/announcements")
@RequiredArgsConstructor
public class AnnouncementController {

    private final AnnouncementService announcementService;

    /** Active announcements for the logged-in user's role. */
    @GetMapping
    public List<AnnouncementDto> mine(@AuthenticationPrincipal AuthUser user) {
        return announcementService.getAnnouncementsFor(user.userType()).stream()
                .map(DtoMapper::announcement).toList();
    }

    @GetMapping("/all")
    @PreAuthorize("hasRole('ADMIN')")
    public List<AnnouncementDto> all() {
        return announcementService.getAllAnnouncements().stream().map(DtoMapper::announcement).toList();
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.CREATED)
    public AnnouncementDto post(@Valid @RequestBody AnnouncementRequest r) {
        return DtoMapper.announcement(announcementService.postAnnouncement(
                r.title(), r.content(), r.category(), r.targetAudience()));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public AnnouncementDto edit(@PathVariable String id, @Valid @RequestBody AnnouncementRequest r) {
        return DtoMapper.announcement(announcementService.editAnnouncement(
                id, r.title(), r.content(), r.category(), r.targetAudience()));
    }

    @PatchMapping("/{id}/archive")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void archive(@PathVariable String id) {
        announcementService.archiveAnnouncement(id);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String id) {
        announcementService.deleteAnnouncement(id);
    }
}
