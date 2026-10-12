package com.schoolsystem.entity;

import com.schoolsystem.entity.enums.Semester;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * A subject a student has passed. Fields match the completedSubjects collection in the old
 * data (id, studentId, subjectCode, grade, semester, schoolYear).
 */
@Entity
@Table(name = "completed_subjects",
        uniqueConstraints = @UniqueConstraint(columnNames = {"student_id", "subject_id"}))
@Getter
@Setter
@NoArgsConstructor
public class CompletedSubject {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(length = 36, nullable = false, updatable = false)
    private String id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "student_id", nullable = false, updatable = false)
    private Student student;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "subject_id", nullable = false, updatable = false)
    private Subject subject;

    /** The overall grade it was passed with. */
    @NotNull
    @Column(nullable = false)
    private Double grade;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Semester semester;

    @NotBlank
    @Column(nullable = false)
    private String schoolYear;
}
