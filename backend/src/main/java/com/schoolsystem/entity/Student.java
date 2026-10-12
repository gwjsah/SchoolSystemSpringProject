package com.schoolsystem.entity;

import com.schoolsystem.entity.enums.AdmissionStatus;
import com.schoolsystem.entity.enums.UserType;
import jakarta.persistence.*;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "students")
@Getter
@Setter
public class Student extends Account {

    @Column(unique = true)
    private String studentNumber;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AdmissionStatus admissionStatus = AdmissionStatus.ADMITTED;

    @Column(length = 50)
    private String applicationNumber;

    /** Plain string, as in the old model. Can become a relation to Course later. */
    @NotBlank(message = "Course cannot be empty")
    @Column(nullable = false)
    private String course;

    @Min(value = 1, message = "Year level must be between 1 and 5")
    @Max(value = 5, message = "Year level must be between 1 and 5")
    @Column(nullable = false)
    private int yearLevel = 1;

    @Column(nullable = false)
    private boolean hasPendingBalance;

    @Column(nullable = false)
    private boolean enrollmentConfirmed;

    private LocalDate dateOfBirth;

    @Column(length = 20)
    private String gender;

    @Column(length = 30)
    private String civilStatus;

    @Column(length = 50)
    private String nationality;

    @Column(length = 255)
    private String address;

    @Column(length = 100)
    private String emergencyContactName;

    @Column(length = 50)
    private String emergencyContactRelationship;

    @Column(length = 20)
    private String emergencyContactPhone;

    @Column(length = 150)
    private String previousSchool;

    @Column(length = 10)
    private String yearGraduated;

    @Column(length = 100)
    private String previousTrack;

    @Column(length = 500)
    private String rejectionReason;

    private LocalDateTime submittedAt;

    private LocalDateTime reviewedAt;

    @Column(length = 100)
    private String reviewedBy;

    public Student() {
        super(UserType.STUDENT);
    }

    public AdmissionStatus getAdmissionStatus() {
        return admissionStatus != null ? admissionStatus : AdmissionStatus.ADMITTED;
    }

    public void togglePendingBalance() {
        this.hasPendingBalance = !hasPendingBalance;
    }
}
