package com.schoolsystem.entity;

import com.schoolsystem.entity.enums.Semester;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "curriculum_entries", uniqueConstraints = {
        @UniqueConstraint(name = "uk_curriculum_course_subject", columnNames = {"course_id", "subject_id"})
})
@Getter
@Setter
@NoArgsConstructor
public class CurriculumEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(length = 36, nullable = false, updatable = false)
    private String id;

    @NotNull(message = "Course is required")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "course_id", nullable = false)
    private Course course;

    @NotNull(message = "Subject is required")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "subject_id", nullable = false)
    private Subject subject;

    @Column(nullable = false)
    private int yearLevel;

    @NotNull(message = "Semester is required")
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Semester semester;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public CurriculumEntry(Course course, Subject subject, int yearLevel, Semester semester) {
        this.course = course;
        this.subject = subject;
        this.yearLevel = yearLevel;
        this.semester = semester;
    }
}

