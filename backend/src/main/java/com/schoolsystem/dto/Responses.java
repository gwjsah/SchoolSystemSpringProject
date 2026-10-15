package com.schoolsystem.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.schoolsystem.entity.Announcement;
import com.schoolsystem.entity.Schedule;
import com.schoolsystem.entity.enums.AdmissionStatus;
import com.schoolsystem.entity.enums.PaymentMethod;
import com.schoolsystem.entity.enums.PaymentPlan;
import com.schoolsystem.entity.enums.PaymentType;
import com.schoolsystem.entity.enums.Quarter;
import com.schoolsystem.entity.enums.QuarterStatus;
import com.schoolsystem.entity.enums.RoomType;
import com.schoolsystem.entity.enums.Semester;
import com.schoolsystem.entity.enums.Status;
import com.schoolsystem.entity.enums.UserType;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;

/** Response bodies the API returns. Passwords are never included. */
public final class Responses {

    private Responses() {}

    /** Student, faculty and admin fields share one shape. Fields that do not apply are null. */
    public record AccountDto(
            String id, String name, String email, String contactNumber, UserType userType,
            String studentNumber, String course, Integer yearLevel,
            Boolean enrollmentConfirmed, Boolean hasPendingBalance,
            String employeeNumber, String department, String position,
            AdmissionStatus admissionStatus) {}

    public record StudentDto(
            String id, String name, String email, String contactNumber, UserType userType,
            String studentNumber, String applicationNumber, String course, int yearLevel,
            AdmissionStatus admissionStatus, boolean enrollmentConfirmed, boolean hasPendingBalance,
            LocalDate dateOfBirth, String gender, String civilStatus, String nationality,
            String address, String emergencyContactName, String emergencyContactRelationship,
            String emergencyContactPhone, String previousSchool, String yearGraduated,
            String previousTrack, String rejectionReason, LocalDateTime submittedAt,
            LocalDateTime reviewedAt, String reviewedBy) {}

    public record AdmissionApplicationResponse(
            String id, String applicationNumber, String name, String email,
            String course, AdmissionStatus status, LocalDateTime submittedAt, String message) {}

    public record AdmissionStatusResponse(
            String applicationNumber, String name, String email, String course,
            AdmissionStatus status, String studentNumber, LocalDateTime submittedAt,
            LocalDateTime reviewedAt, String rejectionReason) {}

    public record LoginResponse(String token, AccountDto user) {}

    public record AnnouncementDto(
            String id, String title, String content,
            Announcement.Category category, Announcement.TargetAudience targetAudience,
            LocalDateTime postedAt, @JsonProperty("isArchived") boolean isArchived) {}

    public record RoomDto(
            String id, String roomName, int capacity, RoomType roomType,
            @JsonProperty("isActive") boolean isActive) {}

    public record ScheduleDto(
            String id, Schedule.Day day, LocalTime startTime, LocalTime endTime,
            String roomId, String roomName, RoomType slotType) {}

    public record BulkValidationItem(
            String subjectCode,
            String sectionCode,
            boolean valid,
            List<String> errors,
            List<ScheduleDto> allocatedSchedules) {}

    public record BulkValidationResponse(
            boolean valid,
            List<BulkValidationItem> items,
            List<String> globalErrors) {}

    public record SectionDto(
            String id, String blockId, String sectionCode, String subjectCode, String subjectName, int units,
            String facultyId, String facultyName, List<ScheduleDto> schedules,
            int capacity, int currentCount, int availableSlots, boolean full,
            String blockCourseCode, Integer blockYearLevel) {}

    public record SectionBlockDto(
            String id, String sectionCode, String courseCode, int yearLevel, int capacity,
            int classCount, List<SectionDto> classes) {}

    public record DepartmentDto(
            String id,
            String code,
            String name,
            String description,
            long courseCount,
            long subjectCount,
            long facultyCount) {}

    public record CurriculumPlacementDto(
            String id,
            String courseCode,
            String courseName,
            int yearLevel,
            Semester semester) {}

    public record SubjectCourseOverrideDto(
            String courseCode,
            com.schoolsystem.entity.enums.OverrideType type) {}

    public record SubjectDto(
            String id,
            String subjectCode,
            String subjectName,
            int units,
            int lectureUnits,
            int labUnits,
            boolean openToAll,
            String departmentId,
            String departmentCode,
            String departmentName,
            List<String> prerequisites,
            List<AccountDto> assignedFaculty,
            List<CurriculumPlacementDto> curriculumPlacements,
            List<SubjectCourseOverrideDto> overrides,
            List<String> eligibleCourses,
            boolean recommended) {}

    public record CurriculumEntryDto(
            String id,
            String courseCode,
            String courseName,
            String subjectCode,
            String subjectName,
            int units,
            int lectureUnits,
            int labUnits,
            int yearLevel,
            Semester semester,
            String departmentCode,
            List<String> prerequisites) {}

    public record CurriculumTermDto(
            int yearLevel,
            Semester semester,
            int totalUnits,
            int totalLectureUnits,
            int totalLabUnits,
            List<CurriculumEntryDto> entries) {}

    public record CurriculumResponse(
            String courseCode,
            String courseName,
            int totalUnits,
            List<CurriculumTermDto> terms,
            List<String> advisoryWarnings) {}

    public record CourseDto(String id, String code, String name, String sectionPrefix) {}

    public record EnrollmentDto(
            String id, String studentId, String subjectCode, String subjectName, int units,
            String sectionId, String sectionCode, Semester semester, String schoolYear,
            Status status, LocalDateTime enrolledAt) {}

    public record CartItemDto(
            String sectionId, String sectionCode, String subjectCode, String subjectName, int units,
            List<ScheduleDto> schedules, String facultyName) {}

    public record EligibilityDto(boolean eligible, String reason) {}

    public record QuarterlyScheduleDto(
            String id, Quarter quarter, BigDecimal scheduledAmount, BigDecimal paidAmount,
            BigDecimal remainingAmount, QuarterStatus status) {}

    public record BalanceDto(
            String id, String schoolYear, Semester semester, PaymentPlan paymentPlan,
            BigDecimal totalCost, boolean downpaymentPaid, BigDecimal remainingBalance,
            boolean discountApplied, List<QuarterlyScheduleDto> quarters) {}

    public record PaymentDto(
            String id, String schoolYear, Semester semester, PaymentType type, Quarter quarter,
            BigDecimal amount, PaymentMethod paymentMethod, LocalDateTime paidAt) {}

    public record GradeDto(
            String id, String studentId, String studentName, String sectionId, String sectionCode,
            String subjectCode, String subjectName, Semester semester, String schoolYear,
            Double prelimGrade, Double midtermGrade, Double preFinalGrade, Double finalGrade,
            Double computedMidterm, Double computedFinal, Double overallGrade,
            String remarks, LocalDateTime submittedAt,
            Integer units, String teacherName) {}

    /** One enrolled student in a section, with their grade record if one exists yet. */
    public record RosterEntryDto(
            String studentId, String studentNumber, String studentName,
            Status enrollmentStatus, GradeDto grade) {}

    public record GradingStatusDto(boolean canEdit, boolean pastDeadline) {}

    public record FacultyDetailDto(
            String id,
            String name,
            String email,
            String contactNumber,
            String employeeNumber,
            String department,
            String departmentId,
            String departmentCode,
            String position,
            List<SubjectDto> assignedSubjects,
            List<SectionDto> sections) {}

    public record EnrollmentPeriodDto(
            String id,
            Semester semester,
            String schoolYear,
            LocalDateTime startsAt,
            LocalDateTime endsAt,
            @JsonProperty("isOpen") boolean isOpen) {}

    public record GradingPeriodDto(
            String id,
            Semester semester,
            String schoolYear,
            LocalDateTime deadline,
            @JsonProperty("isOpen") boolean isOpen) {}

    public record EvaluationPeriodDto(
            String id,
            Semester semester,
            String schoolYear,
            LocalDateTime startsAt,
            LocalDateTime endsAt,
            @JsonProperty("isOpen") boolean isOpen) {}

    public record AdmissionPeriodDto(
            String id,
            Semester semester,
            String schoolYear,
            LocalDateTime startsAt,
            LocalDateTime endsAt,
            @JsonProperty("isOpen") boolean isOpen) {}

    public record TermCalendarDto(
            String id,
            String schoolYear,
            Semester semester,
            LocalDate startsAt,
            LocalDate endsAt,
            @JsonProperty("isActive") boolean isActive,
            LocalDateTime createdAt,
            LocalDateTime updatedAt) {}

    public record AcademicPeriodsStatusDto(
            EnrollmentPeriodDto activeEnrollmentPeriod,
            GradingPeriodDto activeGradingPeriod,
            EvaluationPeriodDto activeEvaluationPeriod,
            AdmissionPeriodDto activeAdmissionPeriod,
            TermCalendarDto activeTerm) {}

    public record FacultyEvaluationDto(
            String id,
            String studentId,
            String studentName,
            String studentNumber,
            String facultyId,
            String facultyName,
            String sectionId,
            String sectionCode,
            String subjectCode,
            String subjectName,
            Semester semester,
            String schoolYear,
            int teachingEffectiveness,
            int subjectKnowledge,
            int communication,
            int professionalism,
            int studentEngagement,
            double averageScore,
            String comments) {}

    public record StudentTeacherToEvaluateDto(
            String facultyId,
            String facultyName,
            String email,
            String department,
            String position,
            String employeeNumber,
            String sectionId,
            String sectionCode,
            String subjectCode,
            String subjectName,
            Semester semester,
            String schoolYear,
            boolean isEvaluated,
            FacultyEvaluationDto evaluation) {}

    public record FacultyEvaluationSummaryDto(
            String facultyId,
            String facultyName,
            String employeeNumber,
            String department,
            String position,
            int totalEvaluations,
            double overallAverage,
            double averageTeachingEffectiveness,
            double averageSubjectKnowledge,
            double averageCommunication,
            double averageProfessionalism,
            double averageStudentEngagement,
            Map<Integer, Long> scoreDistribution,
            List<FacultyEvaluationDto> evaluations) {}

    public record AttendanceSessionDto(
            String id,
            String sectionId,
            LocalDate date,
            com.schoolsystem.entity.enums.AttendanceType type,
            com.schoolsystem.entity.enums.AttendanceSessionStatus status,
            boolean isRecorded,
            String dayOfWeek) {}

    public record AttendanceStudentDto(
            String studentId,
            String studentName,
            String studentNumber,
            com.schoolsystem.entity.enums.AttendanceStatus status,
            String remarks,
            boolean isDropped) {}

    public record SessionRosterDto(
            AttendanceSessionDto session,
            List<AttendanceStudentDto> students,
            int presentCount,
            int absentCount,
            int lateCount) {}

    public record AttendanceSheetCellDto(
            com.schoolsystem.entity.enums.AttendanceStatus status,
            String remarks) {}

    public record AttendanceSheetStudentDto(
            String studentId,
            String studentName,
            String studentNumber,
            Map<String, AttendanceSheetCellDto> attendanceByDate,
            int presentCount,
            int absentCount,
            int lateCount,
            int heldSessionsCount,
            Double attendanceRate,
            boolean isDropped) {}

    public record AttendanceSheetDto(
            List<AttendanceSessionDto> sessions,
            List<AttendanceSheetStudentDto> students,
            int totalHeldSessions) {}
}

