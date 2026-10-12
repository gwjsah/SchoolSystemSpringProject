package com.schoolsystem.config;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.schoolsystem.entity.Account;
import com.schoolsystem.entity.Admin;
import com.schoolsystem.entity.Announcement;
import com.schoolsystem.entity.Balance;
import com.schoolsystem.entity.CompletedSubject;
import com.schoolsystem.entity.Course;
import com.schoolsystem.entity.Enrollment;
import com.schoolsystem.entity.EnrollmentPeriod;
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
import com.schoolsystem.entity.enums.PaymentMethod;
import com.schoolsystem.entity.enums.PaymentPlan;
import com.schoolsystem.entity.enums.PaymentType;
import com.schoolsystem.entity.enums.Quarter;
import com.schoolsystem.entity.enums.QuarterStatus;
import com.schoolsystem.entity.enums.RoomType;
import com.schoolsystem.entity.enums.Semester;
import com.schoolsystem.entity.enums.Status;
import com.schoolsystem.entity.enums.UserType;
import com.schoolsystem.repository.AccountRepository;
import com.schoolsystem.repository.AnnouncementRepository;
import com.schoolsystem.repository.BalanceRepository;
import com.schoolsystem.repository.CompletedSubjectRepository;
import com.schoolsystem.repository.CourseRepository;
import com.schoolsystem.repository.EnrollmentPeriodRepository;
import com.schoolsystem.repository.EnrollmentRepository;
import com.schoolsystem.repository.FacultyEvaluationRepository;
import com.schoolsystem.repository.GradeRepository;
import com.schoolsystem.repository.GradingPeriodRepository;
import com.schoolsystem.repository.PaymentRepository;
import com.schoolsystem.repository.QuarterlyScheduleRepository;
import com.schoolsystem.repository.RoomRepository;
import com.schoolsystem.repository.ScheduleRepository;
import com.schoolsystem.repository.SectionRepository;
import com.schoolsystem.repository.SubjectRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * One-time import of the old json-server db.json into MySQL.
 *
 * Runs only with the "import" profile. Everything happens in one transaction, so a bad record
 * rolls the whole import back. Old ids (s001, SEC-001, room-101...) are used only to link records;
 * every row gets a new UUID. Passwords are hashed with BCrypt.
 */
@Component
@Profile("import")
@RequiredArgsConstructor
@Slf4j
public class DataImporter implements ApplicationRunner {

    private final AccountRepository accountRepository;
    private final CourseRepository courseRepository;
    private final RoomRepository roomRepository;
    private final ScheduleRepository scheduleRepository;
    private final SubjectRepository subjectRepository;
    private final SectionRepository sectionRepository;
    private final EnrollmentPeriodRepository enrollmentPeriodRepository;
    private final GradingPeriodRepository gradingPeriodRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final CompletedSubjectRepository completedSubjectRepository;
    private final BalanceRepository balanceRepository;
    private final QuarterlyScheduleRepository quarterlyScheduleRepository;
    private final PaymentRepository paymentRepository;
    private final GradeRepository gradeRepository;
    private final AnnouncementRepository announcementRepository;
    private final FacultyEvaluationRepository facultyEvaluationRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.import.file:db.json}")
    private String importFile;

    @Override
    @Transactional
    public void run(ApplicationArguments args) throws IOException {
        if (accountRepository.count() > 0) {
            log.warn("The database already has accounts. Skipping the import to avoid duplicates.");
            return;
        }

        Path path = Path.of(importFile);
        if (!Files.exists(path))
            throw new IllegalStateException("Import file not found: " + path.toAbsolutePath());

        JsonNode root = new ObjectMapper().readTree(path.toFile());
        log.info("Importing {}", path.toAbsolutePath());

        Map<String, Student> students = new HashMap<>();
        Map<String, Faculty> faculty = new HashMap<>();
        importAccounts(root.path("accounts"), students, faculty);
        importCourses(root.path("courses"));
        Map<String, Room> rooms = importRooms(root.path("rooms"));
        Map<String, Schedule> schedules = importSchedules(root.path("schedules"), rooms);
        Map<String, Subject> subjects = importSubjects(root.path("subjects"));
        Map<String, Section> sections = importSections(root.path("sections"), subjects, faculty, schedules);
        importEnrollmentPeriods(root.path("enrollmentPeriods"));
        importGradingPeriods(root.path("gradingPeriods"));
        importEnrollments(root.path("enrollments"), students, subjects, sections);
        importCompletedSubjects(root.path("completedSubjects"), students, subjects);
        Map<String, Balance> balances = importBalances(root.path("balances"), students);
        importQuarterlySchedules(root.path("quarterlySchedules"), balances);
        importPayments(root.path("payments"), students);
        importGrades(root.path("grades"), students, sections, subjects);
        importAnnouncements(root.path("announcements"));
        importFacultyEvaluations(root.path("facultyEvaluations"), students, faculty, sections);

        log.info("Import finished.");
    }

    // ── Accounts ──────────────────────────────────────────────────────────────

    private void importAccounts(JsonNode nodes, Map<String, Student> students, Map<String, Faculty> faculty) {
        int count = 0;
        for (JsonNode n : nodes) {
            UserType type = UserType.valueOf(req(n, "userType"));

            Account account = switch (type) {
                case STUDENT -> {
                    Student s = new Student();
                    s.setStudentNumber(req(n, "studentNumber"));
                    s.setCourse(req(n, "course"));
                    s.setYearLevel(integer(n, "yearLevel"));
                    s.setHasPendingBalance(bool(n, "hasPendingBalance"));
                    s.setEnrollmentConfirmed(bool(n, "enrollmentConfirmed"));
                    yield s;
                }
                case FACULTY -> {
                    Faculty f = new Faculty();
                    f.setEmployeeNumber(req(n, "employeeNumber"));
                    f.setDepartment(req(n, "department"));
                    f.setPosition(req(n, "position"));
                    yield f;
                }
                case ADMIN -> {
                    Admin a = new Admin();
                    a.setEmployeeNumber(req(n, "employeeNumber"));
                    yield a;
                }
            };

            account.setName(req(n, "name"));
            account.setEmail(req(n, "email"));
            account.setPassword(passwordEncoder.encode(req(n, "password")));
            account.setContactNumber(req(n, "contactNumber"));

            Account saved = accountRepository.save(account);
            if (saved instanceof Student s) students.put(req(n, "id"), s);
            if (saved instanceof Faculty f) faculty.put(req(n, "id"), f);
            count++;
        }
        done("accounts", count);
    }

    // ── Academic structure ────────────────────────────────────────────────────

    private void importCourses(JsonNode nodes) {
        int count = 0;
        for (JsonNode n : nodes) {
            Course course = new Course();
            course.setCode(req(n, "code"));
            course.setName(req(n, "name"));
            course.setSectionPrefix(req(n, "sectionPrefix"));
            courseRepository.save(course);
            count++;
        }
        done("courses", count);
    }

    private Map<String, Room> importRooms(JsonNode nodes) {
        Map<String, Room> map = new HashMap<>();
        for (JsonNode n : nodes) {
            Room room = new Room();
            room.setRoomName(req(n, "roomName"));
            room.setCapacity(integer(n, "capacity"));
            room.setRoomType(RoomType.valueOf(req(n, "roomType")));
            room.setActive(bool(n, "isActive"));
            map.put(req(n, "id"), roomRepository.save(room));
        }
        done("rooms", map.size());
        return map;
    }

    private Map<String, Schedule> importSchedules(JsonNode nodes, Map<String, Room> rooms) {
        Map<String, Schedule> map = new HashMap<>();
        for (JsonNode n : nodes) {
            Schedule schedule = new Schedule();
            schedule.setDay(Schedule.Day.valueOf(req(n, "day")));
            schedule.setStartTime(LocalTime.parse(req(n, "startTime")));
            schedule.setEndTime(LocalTime.parse(req(n, "endTime")));
            schedule.setRoom(find(rooms, req(n, "roomId"), "room"));
            map.put(req(n, "id"), scheduleRepository.save(schedule));
        }
        done("schedules", map.size());
        return map;
    }

    /** Keyed by subjectCode, because enrollments, grades and sections refer to subjects by code. */
    private Map<String, Subject> importSubjects(JsonNode nodes) {
        Map<String, Subject> map = new HashMap<>();
        for (JsonNode n : nodes) {
            Subject subject = new Subject();
            subject.setSubjectCode(req(n, "subjectCode"));
            subject.setSubjectName(req(n, "subjectName"));
            subject.setUnits(integer(n, "units"));
            subject.setYearLevel(integer(n, "yearLevel"));
            subject.setSemester(Semester.valueOf(req(n, "semester")));
            subject.setCourse(req(n, "course"));
            subject.setPrerequisites(strings(n.get("prerequisites")));
            map.put(subject.getSubjectCode(), subjectRepository.save(subject));
        }
        done("subjects", map.size());
        return map;
    }

    private Map<String, Section> importSections(JsonNode nodes, Map<String, Subject> subjects,
                                                Map<String, Faculty> faculty, Map<String, Schedule> schedules) {
        Map<String, Section> map = new HashMap<>();
        for (JsonNode n : nodes) {
            Section section = new Section();
            section.setSectionCode(req(n, "sectionCode"));
            section.setSubject(find(subjects, req(n, "subjectCode"), "subject"));
            section.setFaculty(find(faculty, req(n, "facultyId"), "faculty"));
            for (String scheduleId : strings(n.get("scheduleIds"))) {
                section.getSchedules().add(find(schedules, scheduleId, "schedule"));
            }
            section.setCapacity(integer(n, "capacity"));
            section.setCurrentCount(integer(n, "currentCount")); // corrected after enrollments are loaded
            map.put(req(n, "id"), sectionRepository.save(section));
        }
        done("sections", map.size());
        return map;
    }

    private void importEnrollmentPeriods(JsonNode nodes) {
        int count = 0;
        for (JsonNode n : nodes) {
            EnrollmentPeriod period = new EnrollmentPeriod();
            period.setSemester(Semester.valueOf(req(n, "semester")));
            period.setSchoolYear(req(n, "schoolYear"));
            period.setStartsAt(dateTime(n.get("start")));
            period.setEndsAt(dateTime(n.get("end")));
            period.setOpen(bool(n, "isOpen"));
            enrollmentPeriodRepository.save(period);
            count++;
        }
        done("enrollment periods", count);
    }

    private void importGradingPeriods(JsonNode nodes) {
        int count = 0;
        for (JsonNode n : nodes) {
            GradingPeriod period = new GradingPeriod();
            period.setSemester(Semester.valueOf(req(n, "semester")));
            period.setSchoolYear(req(n, "schoolYear"));
            period.setDeadline(dateTime(n.get("deadline")));
            period.setOpen(bool(n, "isOpen"));
            gradingPeriodRepository.save(period);
            count++;
        }
        done("grading periods", count);
    }

    // ── Enrollment and grades ─────────────────────────────────────────────────

    private void importEnrollments(JsonNode nodes, Map<String, Student> students,
                                   Map<String, Subject> subjects, Map<String, Section> sections) {
        Map<String, Integer> activeCounts = new HashMap<>();
        int count = 0;
        for (JsonNode n : nodes) {
            Status status = Status.valueOf(req(n, "status"));

            Enrollment enrollment = new Enrollment();
            enrollment.setStudent(find(students, req(n, "studentId"), "student"));
            enrollment.setSubject(find(subjects, req(n, "subjectCode"), "subject"));
            enrollment.setSection(find(sections, req(n, "sectionId"), "section"));
            enrollment.setSemester(Semester.valueOf(req(n, "semester")));
            enrollment.setSchoolYear(req(n, "schoolYear"));
            enrollment.setStatus(status);
            enrollment.setEnrolledAt(dateTime(n.get("enrolledAt")));
            enrollmentRepository.save(enrollment);
            count++;

            if (status == Status.ENROLLED || status == Status.PENDING) {
                activeCounts.merge(req(n, "sectionId"), 1, Integer::sum);
            }
        }
        done("enrollments", count);

        // The old currentCount could drift from the real enrollments. Rebuild it from the records.
        for (Map.Entry<String, Section> entry : sections.entrySet()) {
            Section section = entry.getValue();
            int actual = activeCounts.getOrDefault(entry.getKey(), 0);
            if (section.getCurrentCount() != actual) {
                log.warn("Section {} had currentCount {} but {} active enrollments. Using {}.",
                        section.getSectionCode(), section.getCurrentCount(), actual, actual);
                section.setCurrentCount(actual);
            }
        }
    }

    private void importCompletedSubjects(JsonNode nodes, Map<String, Student> students, Map<String, Subject> subjects) {
        int count = 0;
        for (JsonNode n : nodes) {
            CompletedSubject completed = new CompletedSubject();
            completed.setStudent(find(students, req(n, "studentId"), "student"));
            completed.setSubject(find(subjects, req(n, "subjectCode"), "subject"));
            completed.setGrade(n.path("grade").asDouble());
            completed.setSemester(Semester.valueOf(req(n, "semester")));
            completed.setSchoolYear(req(n, "schoolYear"));
            completedSubjectRepository.save(completed);
            count++;
        }
        done("completed subjects", count);
    }

    private void importGrades(JsonNode nodes, Map<String, Student> students,
                              Map<String, Section> sections, Map<String, Subject> subjects) {
        int count = 0;
        for (JsonNode n : nodes) {
            Grade grade = new Grade();
            grade.setStudent(find(students, req(n, "studentId"), "student"));
            grade.setSection(find(sections, req(n, "sectionId"), "section"));
            grade.setSubject(find(subjects, req(n, "subjectCode"), "subject"));
            grade.setSemester(Semester.valueOf(req(n, "semester")));
            grade.setSchoolYear(req(n, "schoolYear"));
            grade.setPrelimGrade(dbl(n, "prelimGrade"));
            grade.setMidtermGrade(dbl(n, "midtermGrade"));
            grade.setPreFinalGrade(dbl(n, "preFinalGrade"));
            grade.setFinalGrade(dbl(n, "finalGrade"));
            grade.setComputedMidterm(dbl(n, "computedMidterm"));
            grade.setComputedFinal(dbl(n, "computedFinal"));
            grade.setOverallGrade(dbl(n, "overallGrade"));
            grade.setSubmittedAt(dateTime(n.get("submittedAt")));
            gradeRepository.save(grade);
            count++;
        }
        done("grades", count);
    }

    // ── Billing ───────────────────────────────────────────────────────────────

    private Map<String, Balance> importBalances(JsonNode nodes, Map<String, Student> students) {
        Map<String, Balance> map = new HashMap<>();
        for (JsonNode n : nodes) {
            Balance balance = new Balance();
            balance.setStudent(find(students, req(n, "studentId"), "student"));
            balance.setSchoolYear(req(n, "schoolYear"));
            balance.setSemester(Semester.valueOf(req(n, "semester")));
            balance.setPaymentPlan(PaymentPlan.valueOf(req(n, "paymentPlan")));
            balance.setTotalCost(money(n, "totalCost"));
            balance.setDownpaymentPaid(bool(n, "downpaymentPaid"));
            balance.setRemainingBalance(money(n, "remainingBalance"));
            balance.setDiscountApplied(bool(n, "discountApplied"));
            map.put(req(n, "id"), balanceRepository.save(balance));
        }
        done("balances", map.size());
        return map;
    }

    private void importQuarterlySchedules(JsonNode nodes, Map<String, Balance> balances) {
        int count = 0;
        for (JsonNode n : nodes) {
            QuarterlySchedule schedule = new QuarterlySchedule();
            schedule.setBalance(find(balances, req(n, "balanceId"), "balance"));
            schedule.setQuarter(Quarter.valueOf(req(n, "quarter")));
            schedule.setScheduledAmount(money(n, "scheduledAmount"));
            schedule.setPaidAmount(money(n, "paidAmount"));
            schedule.setRemainingAmount(money(n, "remainingAmount"));
            schedule.setStatus(QuarterStatus.valueOf(req(n, "status")));
            quarterlyScheduleRepository.save(schedule);
            count++;
        }
        done("quarterly schedules", count);
    }

    private void importPayments(JsonNode nodes, Map<String, Student> students) {
        int count = 0;
        for (JsonNode n : nodes) {
            Payment payment = new Payment();
            payment.setStudent(find(students, req(n, "studentId"), "student"));
            payment.setSchoolYear(req(n, "schoolYear"));
            payment.setSemester(Semester.valueOf(req(n, "semester")));
            payment.setType(PaymentType.valueOf(req(n, "type")));
            String quarter = text(n, "quarter");
            if (quarter != null) payment.setQuarter(Quarter.valueOf(quarter));
            payment.setAmount(money(n, "amount"));
            String method = text(n, "paymentMethod"); // older records have none
            if (method != null) payment.setPaymentMethod(PaymentMethod.valueOf(method));
            payment.setPaidAt(dateTime(n.get("paidAt")));
            paymentRepository.save(payment);
            count++;
        }
        done("payments", count);
    }

    // ── Announcements and evaluations ─────────────────────────────────────────

    private void importAnnouncements(JsonNode nodes) {
        int count = 0;
        for (JsonNode n : nodes) {
            Announcement announcement = new Announcement();
            announcement.setTitle(req(n, "title"));
            announcement.setContent(req(n, "content"));
            announcement.setCategory(Announcement.Category.valueOf(req(n, "category")));
            announcement.setTargetAudience(Announcement.TargetAudience.valueOf(req(n, "targetAudience")));
            announcement.setPostedAt(dateTime(n.get("postedAt")));
            announcement.setArchived(bool(n, "isArchived"));
            announcementRepository.save(announcement);
            count++;
        }
        done("announcements", count);
    }

    private void importFacultyEvaluations(JsonNode nodes, Map<String, Student> students,
                                          Map<String, Faculty> faculty, Map<String, Section> sections) {
        int count = 0;
        for (JsonNode n : nodes) {
            FacultyEvaluation evaluation = new FacultyEvaluation();
            evaluation.setStudent(find(students, req(n, "studentId"), "student"));
            evaluation.setFaculty(find(faculty, req(n, "facultyId"), "faculty"));
            evaluation.setSection(find(sections, req(n, "sectionId"), "section"));
            evaluation.setSemester(Semester.valueOf(req(n, "semester")));
            evaluation.setSchoolYear(req(n, "schoolYear"));
            evaluation.setTeachingEffectiveness(integer(n, "teachingEffectiveness"));
            evaluation.setSubjectKnowledge(integer(n, "subjectKnowledge"));
            evaluation.setCommunication(integer(n, "communication"));
            evaluation.setProfessionalism(integer(n, "professionalism"));
            evaluation.setStudentEngagement(integer(n, "studentEngagement"));
            evaluation.setComments(text(n, "comments"));
            facultyEvaluationRepository.save(evaluation);
            count++;
        }
        done("faculty evaluations", count);
    }

    // ── JSON helpers ──────────────────────────────────────────────────────────

    private static void done(String what, int count) {
        log.info("Imported {} {}", count, what);
    }

    private static <T> T find(Map<String, T> map, String key, String what) {
        T value = map.get(key);
        if (value == null)
            throw new IllegalStateException("Unknown " + what + " referenced in db.json: " + key);
        return value;
    }

    private static String text(JsonNode n, String field) {
        JsonNode v = n.get(field);
        return (v == null || v.isNull()) ? null : v.asText();
    }

    private static String req(JsonNode n, String field) {
        String v = text(n, field);
        if (v == null)
            throw new IllegalStateException("Missing '" + field + "' in record: " + n);
        return v;
    }

    private static int integer(JsonNode n, String field) {
        return n.path(field).asInt();
    }

    private static boolean bool(JsonNode n, String field) {
        return n.path(field).asBoolean(false);
    }

    private static Double dbl(JsonNode n, String field) {
        JsonNode v = n.get(field);
        return (v == null || v.isNull()) ? null : v.asDouble();
    }

    private static BigDecimal money(JsonNode n, String field) {
        return n.path(field).decimalValue().setScale(2, RoundingMode.HALF_UP);
    }

    private static List<String> strings(JsonNode array) {
        List<String> out = new ArrayList<>();
        if (array != null && array.isArray()) {
            array.forEach(x -> out.add(x.asText()));
        }
        return out;
    }

    /** Handles both Jackson's array form [2026,8,1,9,0] and ISO strings like "2025-06-01T08:00:00". */
    private static LocalDateTime dateTime(JsonNode v) {
        if (v == null || v.isNull()) return null;
        if (v.isArray()) {
            int[] p = new int[7];
            for (int i = 0; i < 7 && i < v.size(); i++) {
                p[i] = v.get(i).asInt();
            }
            return LocalDateTime.of(p[0], p[1], p[2], p[3], p[4], p[5], p[6]);
        }
        return LocalDateTime.parse(v.asText());
    }
}
