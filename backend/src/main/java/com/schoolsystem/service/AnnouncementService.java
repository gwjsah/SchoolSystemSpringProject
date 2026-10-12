package com.schoolsystem.service;

import com.schoolsystem.exception.NotFoundException;

import com.schoolsystem.entity.Announcement;
import com.schoolsystem.entity.enums.UserType;
import com.schoolsystem.repository.AnnouncementRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AnnouncementService {

    private final AnnouncementRepository announcementRepository;

    /** Active announcements visible to the given role. */
    @Transactional(readOnly = true)
    public List<Announcement> getAnnouncementsFor(UserType userType) {
        Announcement.TargetAudience audience = switch (userType) {
            case STUDENT -> Announcement.TargetAudience.STUDENTS;
            case FACULTY -> Announcement.TargetAudience.FACULTY;
            case ADMIN   -> Announcement.TargetAudience.ADMIN;
        };

        return announcementRepository.findByIsArchivedFalseOrderByPostedAtDesc()
                .stream()
                .filter(a -> a.isVisibleTo(audience))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<Announcement> getAllAnnouncements() {
        return announcementRepository.findAllByOrderByPostedAtDesc();
    }

    // ADMIN only
    @Transactional
    public Announcement postAnnouncement(String title, String content,
                                         Announcement.Category category,
                                         Announcement.TargetAudience targetAudience) {
        if (title == null || title.isBlank())
            throw new IllegalArgumentException("Title cannot be empty");
        if (content == null || content.isBlank())
            throw new IllegalArgumentException("Content cannot be empty");

        Announcement announcement = new Announcement();
        announcement.setTitle(title);
        announcement.setContent(content);
        announcement.setCategory(category);
        announcement.setTargetAudience(targetAudience);
        return announcementRepository.save(announcement);
    }

    // ADMIN only: archive instead of hard delete
    @Transactional
    public void archiveAnnouncement(String id) {
        Announcement target = find(id);
        if (target.isArchived())
            throw new IllegalStateException("Announcement is already archived");
        target.archive();
    }

    // ADMIN only
    @Transactional
    public void deleteAnnouncement(String id) {
        if (!announcementRepository.existsById(id))
            throw new NotFoundException("Announcement not found");
        announcementRepository.deleteById(id);
    }

    // ADMIN only: only non-blank / non-null values overwrite, as before
    @Transactional
    public Announcement editAnnouncement(String id, String newTitle, String newContent,
                                         Announcement.Category newCategory,
                                         Announcement.TargetAudience newAudience) {
        Announcement target = find(id);
        if (newTitle != null && !newTitle.isBlank()) target.setTitle(newTitle);
        if (newContent != null && !newContent.isBlank()) target.setContent(newContent);
        if (newCategory != null) target.setCategory(newCategory);
        if (newAudience != null) target.setTargetAudience(newAudience);
        return target;
    }

    private Announcement find(String id) {
        return announcementRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Announcement not found"));
    }
}
