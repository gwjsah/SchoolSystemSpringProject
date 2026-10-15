package com.schoolsystem.entity;

import com.schoolsystem.entity.enums.OverrideType;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "subject_course_overrides", uniqueConstraints = {
        @UniqueConstraint(name = "uk_override_subject_course", columnNames = {"subject_id", "course_id"})
})
@Getter
@Setter
@NoArgsConstructor
public class SubjectCourseOverride {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(length = 36, nullable = false, updatable = false)
    private String id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "subject_id", nullable = false)
    private Subject subject;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "course_id", nullable = false)
    private Course course;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "override_type", nullable = false, length = 20)
    private OverrideType overrideType;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public SubjectCourseOverride(Subject subject, Course course, OverrideType overrideType) {
        this.subject = subject;
        this.course = course;
        this.overrideType = overrideType;
    }
}
