package com.schoolsystem.entity;

import com.schoolsystem.entity.enums.Semester;
import jakarta.persistence.*;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(
    name = "term_calendars",
    uniqueConstraints = @UniqueConstraint(
        name = "uk_term_calendar_sy_sem",
        columnNames = {"school_year", "semester"}
    )
)
@Getter
@Setter
@NoArgsConstructor
public class TermCalendar {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(length = 36, nullable = false, updatable = false)
    private String id;

    @NotBlank(message = "School year is required")
    @Column(name = "school_year", nullable = false)
    private String schoolYear;

    @NotNull(message = "Semester is required")
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Semester semester;

    @NotNull(message = "Start date is required")
    @Column(name = "starts_at", nullable = false)
    private LocalDate startsAt;

    @NotNull(message = "End date is required")
    @Column(name = "ends_at", nullable = false)
    private LocalDate endsAt;

    @Column(name = "is_active", nullable = false)
    private boolean isActive;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();
    }

    @AssertTrue(message = "End date must be after start date")
    private boolean isEndAfterStart() {
        return startsAt == null || endsAt == null || endsAt.isAfter(startsAt);
    }
}

