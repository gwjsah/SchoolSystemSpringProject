package com.schoolsystem.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "announcements")
@Getter
@Setter
@NoArgsConstructor
public class Announcement {

    /** Who the announcement is meant for. */
    public enum TargetAudience {
        ALL, STUDENTS, FACULTY, ADMIN
    }

    public enum Category {
        GENERAL, ENROLLMENT, EXAM, HOLIDAY, REMINDER
    }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(length = 36, nullable = false, updatable = false)
    private String id;

    @NotBlank(message = "Title is required")
    @Column(nullable = false)
    private String title;

    @NotBlank(message = "Content is required")
    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @NotNull(message = "Category is required")
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Category category;

    @NotNull(message = "Target audience is required")
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TargetAudience targetAudience;

    @Column(nullable = false, updatable = false)
    private LocalDateTime postedAt;

    /** Active (false) or archived (true). */
    @Column(nullable = false)
    private boolean isArchived;

    @PrePersist
    protected void onCreate() {
        if (postedAt == null) {
            postedAt = LocalDateTime.now();
        }
    }

    public boolean isVisibleTo(TargetAudience audience) {
        return this.targetAudience == TargetAudience.ALL || this.targetAudience == audience;
    }

    /** Flips the archived flag, same behavior as the old archive(). */
    public void archive() {
        this.isArchived = !isArchived;
    }
}
