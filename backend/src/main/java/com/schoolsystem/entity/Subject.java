package com.schoolsystem.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Min;
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

    @Min(value = 0, message = "Lecture units cannot be negative")
    @Column(name = "lecture_units", nullable = false)
    private int lectureUnits = 1;

    @Min(value = 0, message = "Lab units cannot be negative")
    @Column(name = "lab_units", nullable = false)
    private int labUnits = 2;

    @Column(name = "open_to_all", nullable = false)
    private boolean openToAll = false;

    @NotNull(message = "Owning department is required")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "department_id", nullable = false)
    private Department department;

    /** Assumed to hold subject codes, like the old List<String>. */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "subject_prerequisites", joinColumns = @JoinColumn(name = "subject_id"))
    @Column(name = "prerequisite_code")
    private List<String> prerequisites = new ArrayList<>();

    /** Faculty members qualified / assigned to teach this subject. */
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "subject_assigned_faculty",
            joinColumns = @JoinColumn(name = "subject_id"),
            inverseJoinColumns = @JoinColumn(name = "faculty_id")
    )
    private List<Faculty> assignedFaculties = new ArrayList<>();

    @OneToMany(mappedBy = "subject", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<CurriculumEntry> curriculumEntries = new ArrayList<>();

    @OneToMany(mappedBy = "subject", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<SubjectCourseOverride> courseOverrides = new ArrayList<>();

    public void setPrerequisites(List<String> prerequisites) {
        this.prerequisites = prerequisites != null ? prerequisites : new ArrayList<>();
    }

    public void setAssignedFaculties(List<Faculty> assignedFaculties) {
        this.assignedFaculties = assignedFaculties != null ? assignedFaculties : new ArrayList<>();
    }

    /** Synchronizes total units from lecture and lab units. */
    public void syncUnits() {
        this.units = this.lectureUnits + this.labUnits;
    }
}
