package com.schoolsystem.entity;

import com.schoolsystem.entity.enums.Semester;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "grading_periods")
@Getter
@Setter
@NoArgsConstructor
public class GradingPeriod {

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

    private LocalDateTime deadline;

    @Column(nullable = false)
    private boolean isOpen;
}
