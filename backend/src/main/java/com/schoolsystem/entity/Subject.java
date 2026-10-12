package com.schoolsystem.entity;

import com.schoolsystem.entity.enums.Semester;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "subjects")
@Getter
@Setter
@NoArgsConstructor
public class Subject {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(length = 36, nullable = false, updatable = false)
    private String id;

    @NotBlank(message = "Subject code is required")
    @Column(nullable = false, unique = true, updatable = false)
    private String subjectCode;

    @NotBlank(message = "Subject name is required")
    @Column(nullable = false)
    private String subjectName;

    @Positive(message = "Units must be positive")
    @Column(nullable = false)
    private int units;

    @Positive(message = "Year level must be positive")
    @Column(nullable = false)
    private int yearLevel;

    @NotNull(message = "Semester is required")
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Semester semester;

    @NotBlank(message = "Course is required")
    @Column(nullable = false)
    private String course;

    /** Assumed to hold subject codes, like the old List<String>. */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "subject_prerequisites", joinColumns = @JoinColumn(name = "subject_id"))
    @Column(name = "prerequisite_code")
    private List<String> prerequisites = new ArrayList<>();

    public void setPrerequisites(List<String> prerequisites) {
        this.prerequisites = prerequisites != null ? prerequisites : new ArrayList<>();
    }
}
