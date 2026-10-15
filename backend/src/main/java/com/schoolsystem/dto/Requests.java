package com.schoolsystem.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.schoolsystem.entity.Announcement;
import com.schoolsystem.entity.Schedule;
import com.schoolsystem.entity.enums.PaymentMethod;
import com.schoolsystem.entity.enums.PaymentPlan;
import com.schoolsystem.entity.enums.Quarter;
import com.schoolsystem.entity.enums.RoomType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.time.LocalTime;
import java.util.List;

/** Request bodies the API accepts. */
public final class Requests {

    private Requests() {}

    public record LoginRequest(@NotBlank String email, @NotBlank String password) {}

    public record AnnouncementRequest(
            @NotBlank String title,
            @NotBlank String content,
            @NotNull Announcement.Category category,
            @NotNull Announcement.TargetAudience targetAudience) {}

    public record RoomRequest(
            @NotBlank String roomName,
            @Positive int capacity,
            @NotNull RoomType roomType,
            @JsonProperty("isActive") Boolean isActive) {}

    public record ScheduleRequest(
            @NotNull Schedule.Day day,
            @NotNull LocalTime startTime,
            @NotNull LocalTime endTime,
            String roomId,
            RoomType slotType) {}

    public record SubjectRequest(
            @NotBlank(message = "Subject code is required") String subjectCode,
            @NotBlank(message = "Subject name is required") String subjectName,
            @Positive(message = "Units must be positive") int units,
            @Positive(message = "Year level must be positive") int yearLevel,
            @NotNull(message = "Semester is required") com.schoolsystem.entity.enums.Semester semester,
            @NotBlank(message = "Course is required") String course,
            List<String> prerequisites) {}

    public record AssignFacultyRequest(List<String> facultyIds) {}

    /** subjectCode is only used when creating a section. */
    public record SectionRequest(
            String sectionCode,
            String blockId,
            String courseCode,
            Integer yearLevel,
            String subjectCode,
            @NotBlank String facultyId,
            Integer capacity,
            @NotEmpty @Valid List<ScheduleRequest> schedules) {}

    public record SectionBlockRequest(
            @NotBlank String sectionCode,
            @NotBlank String courseCode,
            @Positive int yearLevel,
            @Positive int capacity) {}

    public record BulkSectionRequest(
            String blockCode,
            String courseCode,
            Integer yearLevel,
            Integer capacity,
            @NotEmpty List<@Valid SectionRequest> sections) {}

    public record AddToCartRequest(@NotBlank String sectionId) {}

    public record ConfirmEnrollmentRequest(@NotNull PaymentPlan paymentPlan) {}

    public record PaymentRequest(
            @NotNull @Positive BigDecimal amount,
            Quarter startingQuarter,
            @NotNull PaymentMethod paymentMethod) {}

    public record GradeRequest(
            @NotBlank String studentId,
            @NotBlank String sectionId,
            Double prelimGrade,
            Double midtermGrade,
            Double preFinalGrade,
            Double finalGrade) {}

    public record AdmissionApplicationRequest(
            @NotBlank(message = "Full name is required") String name,
            @NotBlank(message = "Email is required") @jakarta.validation.constraints.Email(message = "Invalid email format") String email,
            @NotBlank(message = "Password is required") @jakarta.validation.constraints.Size(min = 6, message = "Password must be at least 6 characters") String password,
            @NotBlank(message = "Contact number is required") @jakarta.validation.constraints.Pattern(regexp = "\\d{11}", message = "Contact number must be 11 digits") String contactNumber,
            @NotBlank(message = "Course is required") String course,
            Integer yearLevel,
            java.time.LocalDate dateOfBirth,
            String gender,
            String civilStatus,
            String nationality,
            String address,
            String emergencyContactName,
            String emergencyContactRelationship,
            String emergencyContactPhone,
            String previousSchool,
            String yearGraduated,
            String previousTrack) {}

    public record RejectAdmissionRequest(String reason) {}

    public record StudentCreateRequest(
            @NotBlank(message = "Name is required") String name,
            @NotBlank(message = "Email is required") @jakarta.validation.constraints.Email String email,
            @NotBlank(message = "Password is required") @jakarta.validation.constraints.Size(min = 6) String password,
            @NotBlank(message = "Contact number is required") @jakarta.validation.constraints.Pattern(regexp = "\\d{11}") String contactNumber,
            String studentNumber,
            @NotBlank(message = "Course is required") String course,
            Integer yearLevel,
            java.time.LocalDate dateOfBirth,
            String gender,
            String civilStatus,
            String nationality,
            String address,
            String emergencyContactName,
            String emergencyContactRelationship,
            String emergencyContactPhone,
            String previousSchool,
            String yearGraduated,
            String previousTrack) {}

    public record StudentUpdateRequest(
            @NotBlank(message = "Name is required") String name,
            @NotBlank(message = "Email is required") @jakarta.validation.constraints.Email String email,
            @NotBlank(message = "Contact number is required") @jakarta.validation.constraints.Pattern(regexp = "\\d{11}") String contactNumber,
            String studentNumber,
            @NotBlank(message = "Course is required") String course,
            Integer yearLevel,
            com.schoolsystem.entity.enums.AdmissionStatus admissionStatus,
            Boolean hasPendingBalance,
            Boolean enrollmentConfirmed,
            java.time.LocalDate dateOfBirth,
            String gender,
            String civilStatus,
            String nationality,
            String address,
            String emergencyContactName,
            String emergencyContactRelationship,
            String emergencyContactPhone,
            String previousSchool,
            String yearGraduated,
            String previousTrack,
            String rejectionReason) {}

    public record StudentProfileUpdateRequest(
            @NotBlank(message = "Contact number is required") @jakarta.validation.constraints.Pattern(regexp = "\\d{11}") String contactNumber,
            String address,
            String emergencyContactName,
            String emergencyContactRelationship,
            String emergencyContactPhone) {}

    public record FacultyCreateRequest(
            @NotBlank(message = "Name is required") String name,
            @NotBlank(message = "Email is required") @jakarta.validation.constraints.Email String email,
            @NotBlank(message = "Password is required") @jakarta.validation.constraints.Size(min = 6) String password,
            String contactNumber,
            String employeeNumber,
            @NotBlank(message = "Department cannot be empty") String department,
            @NotBlank(message = "Position cannot be empty") String position) {}

    public record FacultyUpdateRequest(
            @NotBlank(message = "Name is required") String name,
            @NotBlank(message = "Email is required") @jakarta.validation.constraints.Email String email,
            String contactNumber,
            String employeeNumber,
            @NotBlank(message = "Department cannot be empty") String department,
            @NotBlank(message = "Position cannot be empty") String position,
            String password) {}

    public record OpenEnrollmentPeriodRequest(
            @NotNull(message = "Semester is required") com.schoolsystem.entity.enums.Semester semester,
            @NotBlank(message = "School year is required") String schoolYear,
            @NotNull(message = "Start date/time is required") java.time.LocalDateTime startsAt,
            @NotNull(message = "End date/time is required") java.time.LocalDateTime endsAt) {}

    public record OpenGradingPeriodRequest(
            @NotNull(message = "Semester is required") com.schoolsystem.entity.enums.Semester semester,
            @NotBlank(message = "School year is required") String schoolYear,
            java.time.LocalDateTime deadline) {}

    public record OpenEvaluationPeriodRequest(
            @NotNull(message = "Semester is required") com.schoolsystem.entity.enums.Semester semester,
            @NotBlank(message = "School year is required") String schoolYear,
            @NotNull(message = "Start date/time is required") java.time.LocalDateTime startsAt,
            @NotNull(message = "End date/time is required") java.time.LocalDateTime endsAt) {}

    public record OpenAdmissionPeriodRequest(
            @NotNull(message = "Semester is required") com.schoolsystem.entity.enums.Semester semester,
            @NotBlank(message = "School year is required") String schoolYear,
            @NotNull(message = "Start date/time is required") java.time.LocalDateTime startsAt,
            @NotNull(message = "End date/time is required") java.time.LocalDateTime endsAt) {}

    public record SubmitFacultyEvaluationRequest(
            @NotBlank(message = "Faculty ID is required") String facultyId,
            @NotBlank(message = "Section ID is required") String sectionId,
            @jakarta.validation.constraints.Min(1) @jakarta.validation.constraints.Max(5) int teachingEffectiveness,
            @jakarta.validation.constraints.Min(1) @jakarta.validation.constraints.Max(5) int subjectKnowledge,
            @jakarta.validation.constraints.Min(1) @jakarta.validation.constraints.Max(5) int communication,
            @jakarta.validation.constraints.Min(1) @jakarta.validation.constraints.Max(5) int professionalism,
            @jakarta.validation.constraints.Min(1) @jakarta.validation.constraints.Max(5) int studentEngagement,
            String comments) {}

    public record CreateTermCalendarRequest(
            @NotBlank(message = "School year is required") String schoolYear,
            @NotNull(message = "Semester is required") com.schoolsystem.entity.enums.Semester semester,
            @NotNull(message = "Start date is required") java.time.LocalDate startsAt,
            @NotNull(message = "End date is required") java.time.LocalDate endsAt) {}

    public record UpdateTermCalendarRequest(
            @NotBlank(message = "School year is required") String schoolYear,
            @NotNull(message = "Semester is required") com.schoolsystem.entity.enums.Semester semester,
            @NotNull(message = "Start date is required") java.time.LocalDate startsAt,
            @NotNull(message = "End date is required") java.time.LocalDate endsAt) {}

    public record AttendanceRecordItemRequest(
            @NotBlank(message = "Student ID is required") String studentId,
            @NotNull(message = "Attendance status is required") com.schoolsystem.entity.enums.AttendanceStatus status,
            String remarks) {}

    public record SaveAttendanceRequest(
            @NotNull(message = "Records list is required")
            @jakarta.validation.Valid
            java.util.List<AttendanceRecordItemRequest> records) {}

    public record CreateMakeupSessionRequest(
            @NotNull(message = "Date is required") java.time.LocalDate date) {}

    public record CancelSessionRequest(
            Boolean force) {}
}

