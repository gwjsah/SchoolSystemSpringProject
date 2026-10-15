package com.schoolsystem.dto;

import com.schoolsystem.dto.Responses.AccountDto;
import com.schoolsystem.dto.Responses.AdmissionPeriodDto;
import com.schoolsystem.dto.Responses.AnnouncementDto;
import com.schoolsystem.dto.Responses.BalanceDto;
import com.schoolsystem.dto.Responses.CartItemDto;
import com.schoolsystem.dto.Responses.CourseDto;
import com.schoolsystem.dto.Responses.EnrollmentDto;
import com.schoolsystem.dto.Responses.EnrollmentPeriodDto;
import com.schoolsystem.dto.Responses.EvaluationPeriodDto;
import com.schoolsystem.dto.Responses.FacultyEvaluationDto;
import com.schoolsystem.dto.Responses.GradeDto;
import com.schoolsystem.dto.Responses.GradingPeriodDto;
import com.schoolsystem.dto.Responses.PaymentDto;
import com.schoolsystem.dto.Responses.QuarterlyScheduleDto;
import com.schoolsystem.dto.Responses.RoomDto;
import com.schoolsystem.dto.Responses.RosterEntryDto;
import com.schoolsystem.dto.Responses.ScheduleDto;
import com.schoolsystem.dto.Responses.SectionDto;
import com.schoolsystem.dto.Responses.SectionBlockDto;
import com.schoolsystem.dto.Responses.SubjectDto;
import com.schoolsystem.dto.Responses.TermCalendarDto;
import com.schoolsystem.entity.Account;
import com.schoolsystem.entity.Admin;
import com.schoolsystem.entity.AdmissionPeriod;
import com.schoolsystem.entity.Announcement;
import com.schoolsystem.entity.Balance;
import com.schoolsystem.entity.Course;
import com.schoolsystem.entity.Enrollment;
import com.schoolsystem.entity.EnrollmentPeriod;
import com.schoolsystem.entity.EvaluationPeriod;
import com.schoolsystem.entity.Faculty;
import com.schoolsystem.entity.FacultyEvaluation;
import com.schoolsystem.entity.Grade;
import com.schoolsystem.entity.GradingPeriod;
import com.schoolsystem.entity.Payment;
import com.schoolsystem.entity.QuarterlySchedule;
import com.schoolsystem.entity.Room;
import com.schoolsystem.entity.Schedule;
import com.schoolsystem.entity.Section;
import com.schoolsystem.entity.Student;
import com.schoolsystem.entity.Subject;
import com.schoolsystem.entity.TermCalendar;
import com.schoolsystem.service.GradeService;

import java.util.List;

/**
 * Entity to DTO conversion. Called from the controllers, where the lazy relations
 * can still be loaded (the JPA session stays open for the whole request).
 */
public final class DtoMapper {

    private DtoMapper() {}

    public static AccountDto account(Account a) {
        String studentNumber = null, course = null, employeeNumber = null, department = null, position = null;
        Integer yearLevel = null;
        Boolean enrollmentConfirmed = null, hasPendingBalance = null;
        com.schoolsystem.entity.enums.AdmissionStatus admissionStatus = null;

        if (a instanceof Student s) {
            studentNumber = s.getStudentNumber();
            course = s.getCourse();
            yearLevel = s.getYearLevel();
            enrollmentConfirmed = s.isEnrollmentConfirmed();
            hasPendingBalance = s.isHasPendingBalance();
            admissionStatus = s.getAdmissionStatus();
        } else if (a instanceof Faculty f) {
            employeeNumber = f.getEmployeeNumber();
            department = f.getDepartment() != null ? f.getDepartment().getName() : null;
            position = f.getPosition();
        } else if (a instanceof Admin ad) {
            employeeNumber = ad.getEmployeeNumber();
        }

        return new AccountDto(a.getId(), a.getName(), a.getEmail(), a.getContactNumber(), a.getUserType(),
                studentNumber, course, yearLevel, enrollmentConfirmed, hasPendingBalance,
                employeeNumber, department, position, admissionStatus);
    }

    public static Responses.StudentDto student(Student s) {
        return new Responses.StudentDto(
                s.getId(),
                s.getName(),
                s.getEmail(),
                s.getContactNumber(),
                s.getUserType(),
                s.getStudentNumber(),
                s.getApplicationNumber(),
                s.getCourse(),
                s.getYearLevel(),
                s.getAdmissionStatus(),
                s.isEnrollmentConfirmed(),
                s.isHasPendingBalance(),
                s.getDateOfBirth(),
                s.getGender(),
                s.getCivilStatus(),
                s.getNationality(),
                s.getAddress(),
                s.getEmergencyContactName(),
                s.getEmergencyContactRelationship(),
                s.getEmergencyContactPhone(),
                s.getPreviousSchool(),
                s.getYearGraduated(),
                s.getPreviousTrack(),
                s.getRejectionReason(),
                s.getSubmittedAt(),
                s.getReviewedAt(),
                s.getReviewedBy()
        );
    }

    public static AnnouncementDto announcement(Announcement a) {
        return new AnnouncementDto(a.getId(), a.getTitle(), a.getContent(), a.getCategory(),
                a.getTargetAudience(), a.getPostedAt(), a.isArchived());
    }

    public static RoomDto room(Room r) {
        return new RoomDto(r.getId(), r.getRoomName(), r.getCapacity(), r.getRoomType(), r.isActive());
    }

    public static ScheduleDto schedule(Schedule s) {
        return new ScheduleDto(s.getId(), s.getDay(), s.getStartTime(), s.getEndTime(),
                s.getRoom().getId(), s.getRoom().getRoomName(), s.getSlotType());
    }

    public static SectionDto section(Section s) {
        Faculty f = s.getFaculty();
        String blockId = s.getBlock() != null ? s.getBlock().getId() : null;
        String blockCourseCode = s.getBlock() != null ? s.getBlock().getCourseCode() : null;
        Integer blockYearLevel = s.getBlock() != null ? s.getBlock().getYearLevel() : null;
        return new SectionDto(s.getId(), blockId, s.getSectionCode(),
                s.getSubject().getSubjectCode(), s.getSubject().getSubjectName(), s.getSubject().getUnits(),
                f == null ? null : f.getId(), f == null ? null : f.getName(),
                s.getSchedules().stream().map(DtoMapper::schedule).toList(),
                s.getCapacity(), s.getCurrentCount(), s.getAvailableSlots(), s.isFull(),
                blockCourseCode, blockYearLevel);
    }

    public static SectionBlockDto sectionBlock(com.schoolsystem.entity.SectionBlock b) {
        List<SectionDto> classDtos = b.getSections() != null
                ? b.getSections().stream().map(DtoMapper::section).toList()
                : List.of();
        return new SectionBlockDto(
                b.getId(),
                b.getSectionCode(),
                b.getCourseCode(),
                b.getYearLevel(),
                b.getCapacity(),
                classDtos.size(),
                classDtos
        );
    }

    public static SubjectDto subject(Subject s) {
        return subject(s, List.of(), false);
    }

    public static SubjectDto subject(Subject s, List<String> eligibleCourses) {
        return subject(s, eligibleCourses, false);
    }

    public static SubjectDto subject(Subject s, List<String> eligibleCourses, boolean recommended) {
        List<AccountDto> facultyDtos = s.getAssignedFaculties() != null
                ? s.getAssignedFaculties().stream().map(DtoMapper::account).toList()
                : List.of();

        List<Responses.CurriculumPlacementDto> placements = s.getCurriculumEntries() != null
                ? s.getCurriculumEntries().stream()
                    .map(ce -> new Responses.CurriculumPlacementDto(
                            ce.getId(),
                            ce.getCourse() != null ? ce.getCourse().getCode() : null,
                            ce.getCourse() != null ? ce.getCourse().getName() : null,
                            ce.getYearLevel(),
                            ce.getSemester()))
                    .toList()
                : List.of();

        List<Responses.SubjectCourseOverrideDto> overrides = s.getCourseOverrides() != null
                ? s.getCourseOverrides().stream()
                    .map(o -> new Responses.SubjectCourseOverrideDto(
                            o.getCourse() != null ? o.getCourse().getCode() : null,
                            o.getOverrideType()))
                    .toList()
                : List.of();

        return new SubjectDto(
                s.getId(),
                s.getSubjectCode(),
                s.getSubjectName(),
                s.getUnits(),
                s.getLectureUnits(),
                s.getLabUnits(),
                s.isOpenToAll(),
                s.getDepartment() != null ? s.getDepartment().getId() : null,
                s.getDepartment() != null ? s.getDepartment().getCode() : null,
                s.getDepartment() != null ? s.getDepartment().getName() : null,
                List.copyOf(s.getPrerequisites()),
                facultyDtos,
                placements,
                overrides,
                eligibleCourses != null ? eligibleCourses : List.of(),
                recommended
        );
    }

    public static CourseDto course(Course c) {
        return new CourseDto(c.getId(), c.getCode(), c.getName(), c.getSectionPrefix());
    }

    public static EnrollmentDto enrollment(Enrollment e) {
        return new EnrollmentDto(e.getId(), e.getStudent().getId(),
                e.getSubject().getSubjectCode(), e.getSubject().getSubjectName(), e.getSubject().getUnits(),
                e.getSection().getId(), e.getSection().getSectionCode(),
                e.getSemester(), e.getSchoolYear(), e.getStatus(), e.getEnrolledAt());
    }

    public static CartItemDto cartItem(Section s) {
        Faculty f = s.getFaculty();
        return new CartItemDto(s.getId(), s.getSectionCode(),
                s.getSubject().getSubjectCode(), s.getSubject().getSubjectName(), s.getSubject().getUnits(),
                s.getSchedules().stream().map(DtoMapper::schedule).toList(),
                f != null ? f.getName() : "TBA");
    }

    public static QuarterlyScheduleDto quarter(QuarterlySchedule q) {
        return new QuarterlyScheduleDto(q.getId(), q.getQuarter(), q.getScheduledAmount(),
                q.getPaidAmount(), q.getRemainingAmount(), q.getStatus());
    }

    public static BalanceDto balance(Balance b, List<QuarterlySchedule> quarters) {
        return new BalanceDto(b.getId(), b.getSchoolYear(), b.getSemester(), b.getPaymentPlan(),
                b.getTotalCost(), b.isDownpaymentPaid(), b.getRemainingBalance(), b.isDiscountApplied(),
                quarters.stream().map(DtoMapper::quarter).toList());
    }

    public static PaymentDto payment(Payment p) {
        return new PaymentDto(p.getId(), p.getSchoolYear(), p.getSemester(), p.getType(), p.getQuarter(),
                p.getAmount(), p.getPaymentMethod(), p.getPaidAt());
    }

    public static GradeDto grade(Grade g) {
        String teacherName = null;
        if (g.getSection() != null && g.getSection().getFaculty() != null) {
            teacherName = g.getSection().getFaculty().getName();
        }
        int units = g.getSubject() != null ? g.getSubject().getUnits() : 0;

        return new GradeDto(g.getId(), g.getStudent().getId(), g.getStudent().getName(),
                g.getSection() != null ? g.getSection().getId() : null,
                g.getSection() != null ? g.getSection().getSectionCode() : "—",
                g.getSubject() != null ? g.getSubject().getSubjectCode() : "—",
                g.getSubject() != null ? g.getSubject().getSubjectName() : "—",
                g.getSemester(), g.getSchoolYear(),
                g.getPrelimGrade(), g.getMidtermGrade(), g.getPreFinalGrade(), g.getFinalGrade(),
                g.getComputedMidterm(), g.getComputedFinal(), g.getOverallGrade(),
                GradeService.getRemarks(g.getOverallGrade()), g.getSubmittedAt(),
                units, teacherName);
    }

    public static RosterEntryDto rosterEntry(GradeService.RosterEntry r) {
        Student s = r.enrollment().getStudent();
        return new RosterEntryDto(s.getId(), s.getStudentNumber(), s.getName(),
                r.enrollment().getStatus(), r.grade() == null ? null : grade(r.grade()));
    }

    public static EnrollmentPeriodDto enrollmentPeriod(EnrollmentPeriod p) {
        if (p == null) return null;
        return new EnrollmentPeriodDto(
                p.getId(), p.getSemester(), p.getSchoolYear(),
                p.getStartsAt(), p.getEndsAt(), p.isOpen());
    }

    public static GradingPeriodDto gradingPeriod(GradingPeriod p) {
        if (p == null) return null;
        return new GradingPeriodDto(
                p.getId(), p.getSemester(), p.getSchoolYear(),
                p.getDeadline(), p.isOpen());
    }

    public static EvaluationPeriodDto evaluationPeriod(EvaluationPeriod p) {
        if (p == null) return null;
        return new EvaluationPeriodDto(
                p.getId(), p.getSemester(), p.getSchoolYear(),
                p.getStartsAt(), p.getEndsAt(), p.isOpen());
    }

    public static AdmissionPeriodDto admissionPeriod(AdmissionPeriod p) {
        if (p == null) return null;
        return new AdmissionPeriodDto(
                p.getId(), p.getSemester(), p.getSchoolYear(),
                p.getStartsAt(), p.getEndsAt(), p.isOpen());
    }

    public static FacultyEvaluationDto facultyEvaluation(FacultyEvaluation fe) {
        if (fe == null) return null;
        return new FacultyEvaluationDto(
                fe.getId(),
                fe.getStudent() != null ? fe.getStudent().getId() : null,
                fe.getStudent() != null ? fe.getStudent().getName() : null,
                fe.getStudent() != null ? fe.getStudent().getStudentNumber() : null,
                fe.getFaculty() != null ? fe.getFaculty().getId() : null,
                fe.getFaculty() != null ? fe.getFaculty().getName() : null,
                fe.getSection() != null ? fe.getSection().getId() : null,
                fe.getSection() != null ? fe.getSection().getSectionCode() : null,
                fe.getSection() != null && fe.getSection().getSubject() != null ? fe.getSection().getSubject().getSubjectCode() : null,
                fe.getSection() != null && fe.getSection().getSubject() != null ? fe.getSection().getSubject().getSubjectName() : null,
                fe.getSemester(),
                fe.getSchoolYear(),
                fe.getTeachingEffectiveness(),
                fe.getSubjectKnowledge(),
                fe.getCommunication(),
                fe.getProfessionalism(),
                fe.getStudentEngagement(),
                fe.getAverageScore(),
                fe.getComments());
    }

    public static TermCalendarDto termCalendar(TermCalendar t) {
        if (t == null) return null;
        return new TermCalendarDto(
                t.getId(),
                t.getSchoolYear(),
                t.getSemester(),
                t.getStartsAt(),
                t.getEndsAt(),
                t.isActive(),
                t.getCreatedAt(),
                t.getUpdatedAt());
    }
}
