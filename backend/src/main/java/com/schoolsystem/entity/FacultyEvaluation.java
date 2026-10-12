package com.schoolsystem.entity;

import com.schoolsystem.entity.enums.Semester;
import jakarta.persistence.*;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** A student's evaluation of a faculty member for one section. Never edited after submission. */
@Entity
@Table(name = "faculty_evaluations")
@Getter
@Setter
@NoArgsConstructor
public class FacultyEvaluation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(length = 36, nullable = false, updatable = false)
    private String id;

    @NotNull(message = "Student is required")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "student_id", nullable = false, updatable = false)
    private Student student;

    @NotNull(message = "Faculty is required")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "faculty_id", nullable = false, updatable = false)
    private Faculty faculty;

    @NotNull(message = "Section is required")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "section_id", nullable = false, updatable = false)
    private Section section;

    @NotNull(message = "Semester is required")
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, updatable = false)
    private Semester semester;

    @NotBlank(message = "School year is required")
    @Column(nullable = false, updatable = false)
    private String schoolYear;

    // Fixed criteria, each rated 1-5
    @Min(1) @Max(5)
    @Column(nullable = false, updatable = false)
    private int teachingEffectiveness;

    @Min(1) @Max(5)
    @Column(nullable = false, updatable = false)
    private int subjectKnowledge;

    @Min(1) @Max(5)
    @Column(nullable = false, updatable = false)
    private int communication;

    @Min(1) @Max(5)
    @Column(nullable = false, updatable = false)
    private int professionalism;

    @Min(1) @Max(5)
    @Column(nullable = false, updatable = false)
    private int studentEngagement;

    @Column(nullable = false, updatable = false, columnDefinition = "TEXT")
    private String comments = "";

    public void setComments(String comments) {
        this.comments = comments != null ? comments : "";
    }

    public double getAverageScore() {
        return (teachingEffectiveness + subjectKnowledge + communication
                + professionalism + studentEngagement) / 5.0;
    }
}
