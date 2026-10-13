package com.schoolsystem.entity;

import com.schoolsystem.entity.enums.Semester;
import jakarta.persistence.*;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "admission_periods")
@Getter
@Setter
@NoArgsConstructor
public class AdmissionPeriod {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(length = 36, nullable = false, updatable = false)
    private String id;

    @NotNull(message = "Semester is required")
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, updatable = false)
    private Semester semester;

    @NotBlank(message = "School year is required")
    @Column(nullable = false, updatable = false)
    private String schoolYear;

    @NotNull(message = "Start is required")
    @Column(name = "starts_at", nullable = false)
    private LocalDateTime startsAt;

    @NotNull(message = "End is required")
    @Column(name = "ends_at", nullable = false)
    private LocalDateTime endsAt;

    @Column(nullable = false)
    private boolean isOpen;

    @AssertTrue(message = "End must be after start")
    private boolean isEndAfterStart() {
        return startsAt == null || endsAt == null || endsAt.isAfter(startsAt);
    }
}

