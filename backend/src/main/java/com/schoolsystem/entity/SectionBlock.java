package com.schoolsystem.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "section_blocks", uniqueConstraints = {
        @UniqueConstraint(name = "uk_block_course_year_code", columnNames = {"course_code", "year_level", "section_code"})
})
@Getter
@Setter
@NoArgsConstructor
public class SectionBlock {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(length = 36, nullable = false, updatable = false)
    private String id;

    /** Section block code, e.g. "CS-F1", "BSCS-1A". Unique within (course_code, year_level). */
    @NotBlank(message = "Section code is required")
    @Column(name = "section_code", nullable = false, length = 30)
    private String sectionCode;

    /** Course code, e.g. "BSCS", "BSIT". */
    @NotBlank(message = "Course code is required")
    @Column(name = "course_code", nullable = false, length = 20)
    private String courseCode;

    @Min(1)
    @Max(4)
    @Column(name = "year_level", nullable = false)
    private int yearLevel;

    /** Block-wide capacity shared by all classes inside this block. */
    @Min(value = 1, message = "Invalid capacity size")
    @Max(value = 50, message = "Invalid capacity size")
    @Column(nullable = false)
    private int capacity;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "block", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Section> sections = new ArrayList<>();

    public SectionBlock(String sectionCode, String courseCode, int yearLevel, int capacity) {
        this.sectionCode = sectionCode;
        this.courseCode = courseCode;
        this.yearLevel = yearLevel;
        this.capacity = capacity;
    }
}

