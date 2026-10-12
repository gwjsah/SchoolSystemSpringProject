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
@Table(name = "grades")
@Getter
@Setter
@NoArgsConstructor
public class Grade {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(length = 36, nullable = false, updatable = false)
    private String id;

    @NotNull(message = "Student is required")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "student_id", nullable = false, updatable = false)
    private Student student;

    @NotNull(message = "Section is required")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "section_id", nullable = false, updatable = false)
    private Section section;

    @NotNull(message = "Subject is required")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "subject_id", nullable = false, updatable = false)
    private Subject subject;

    @NotNull(message = "Semester is required")
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, updatable = false)
    private Semester semester;

    @NotBlank(message = "School year is required")
    @Column(nullable = false, updatable = false)
    private String schoolYear;

    // All grade columns are nullable: they are filled in as the term progresses.
    private Double prelimGrade;
    private Double midtermGrade;
    private Double preFinalGrade;
    private Double finalGrade;
    private Double computedMidterm;
    private Double computedFinal;
    private Double overallGrade;

    private LocalDateTime submittedAt;
}
