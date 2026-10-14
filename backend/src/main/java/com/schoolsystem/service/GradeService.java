package com.schoolsystem.service;

import com.schoolsystem.dto.DtoMapper;
import com.schoolsystem.dto.Responses.GradeDto;
import com.schoolsystem.exception.NotFoundException;

import com.schoolsystem.entity.Enrollment;
import com.schoolsystem.entity.enums.Status;
import com.schoolsystem.repository.EnrollmentRepository;
import org.springframework.security.access.AccessDeniedException;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import com.schoolsystem.entity.CompletedSubject;
import com.schoolsystem.entity.Grade;
import com.schoolsystem.entity.GradingPeriod;
import com.schoolsystem.entity.Section;
import com.schoolsystem.entity.Student;
import com.schoolsystem.entity.Subject;
import com.schoolsystem.entity.enums.Semester;
import com.schoolsystem.repository.CompletedSubjectRepository;
import com.schoolsystem.repository.GradeRepository;
import com.schoolsystem.repository.GradingPeriodRepository;
import com.schoolsystem.repository.SectionRepository;
import com.schoolsystem.repository.StudentRepository;
import com.schoolsystem.repository.SubjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class GradeService {

    private static final double PASSING_GRADE = 3.0;

    private final GradeRepository gradeRepository;
    private final GradingPeriodRepository gradingPeriodRepository;
    private final CompletedSubjectRepository completedSubjectRepository;
    private final StudentRepository studentRepository;
    private final SectionRepository sectionRepository;
    private final SubjectRepository subjectRepository;
    private final EnrollmentRepository enrollmentRepository;

    // ── CAN EDIT ─────────────────────────────────────────────────────────────

    /** Grading is editable while a grading period is open. Past the deadline still returns true. */
    @Transactional(readOnly = true)
    public boolean canEdit() {
        return activePeriod() != null;
    }

    @Transactional(readOnly = true)
    public boolean isPastDeadline() {
        GradingPeriod period = activePeriod();
        return period != null
                && period.getDeadline() != null
                && LocalDateTime.now().isAfter(period.getDeadline());
    }

    // ── SUBMIT / UPDATE GRADE ─────────────────────────────────────────────────

    /**
     * Creates the grade record, or updates it with whichever grades are non-null, then recomputes.
     * A subject is marked completed once the overall grade passes.
     */
    @Transactional
    public Grade saveGrade(String studentId, String sectionId, String subjectCode,
                           Semester semester, String schoolYear,
                           Double prelim, Double midterm, Double preFinal, Double finalGrade) {

        if (!canEdit())
            throw new IllegalStateException("Grading period is closed");

        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new NotFoundException("Student not found"));
        Section section = sectionRepository.findById(sectionId)
                .orElseThrow(() -> new NotFoundException("Section not found"));
        Subject subject = subjectRepository.findBySubjectCode(subjectCode)
                .orElseThrow(() -> new NotFoundException("Subject not found: " + subjectCode));

        Grade grade = gradeRepository.findByStudent_IdAndSection_Id(studentId, sectionId)
                .orElseGet(() -> {
                    Grade g = new Grade();
                    g.setStudent(student);
                    g.setSection(section);
                    g.setSubject(subject);
                    g.setSemester(semester);
                    g.setSchoolYear(schoolYear);
                    return g;
                });

        // only overwrite non-null incoming values
        if (prelim != null) grade.setPrelimGrade(prelim);
        if (midterm != null) grade.setMidtermGrade(midterm);
        if (preFinal != null) grade.setPreFinalGrade(preFinal);
        if (finalGrade != null) grade.setFinalGrade(finalGrade);

        Double computedMidterm = computeMidterm(grade.getPrelimGrade(), grade.getMidtermGrade());
        Double computedFinal = computeFinal(grade.getPreFinalGrade(), grade.getFinalGrade());
        Double overall = computeOverall(computedMidterm, computedFinal);

        grade.setComputedMidterm(computedMidterm);
        grade.setComputedFinal(computedFinal);
        grade.setOverallGrade(overall);
        grade.setSubmittedAt(LocalDateTime.now());
        Grade saved = gradeRepository.save(grade);

        // The old update branch tested the grades sent in this call (often null on a partial
        // update) instead of the recomputed overall, so a passing subject could be missed.
        if (isPassing(overall)
                && !completedSubjectRepository.existsByStudent_IdAndSubject_SubjectCode(studentId, subjectCode)) {
            CompletedSubject completed = new CompletedSubject();
            completed.setStudent(student);
            completed.setSubject(subject);
            completed.setGrade(overall);
            completed.setSemester(semester);
            completed.setSchoolYear(schoolYear);
            completedSubjectRepository.save(completed);
        }
        return saved;
    }

    /**
     * Higher is better: 5.0 is the highest mark and 3.0 the lowest passing mark (every completed
     * subject in the old data is between 1.25 and 2.0). The old code tested overall >= 3.0, which
     * would call 3.75 or 4.0 passed. To restore the old rule, change <= to >= below.
     */
    public static boolean isPassing(Double overallGrade) {
        return overallGrade != null && overallGrade >= PASSING_GRADE;
    }

    // ── REMARKS ───────────────────────────────────────────────────────────────

    public static String getRemarks(Double overallGrade) {
        if (overallGrade == null) return "—";
        return isPassing(overallGrade) ? "Passed" : "Failed";
    }

    // ── COMPUTATION ───────────────────────────────────────────────────────────

    public static Double computeMidterm(Double prelim, Double midterm) {
        if (prelim == null || midterm == null) return null;
        return (prelim * 0.40) + (midterm * 0.60);
    }

    public static Double computeFinal(Double preFinal, Double finalGrade) {
        if (preFinal == null || finalGrade == null) return null;
        return (preFinal * 0.40) + (finalGrade * 0.60);
    }

    public static Double computeOverall(Double computedMidterm, Double computedFinal) {
        if (computedMidterm == null || computedFinal == null) return null;
        return (computedMidterm + computedFinal) / 2.0;
    }

    public static String formatGrade(Double grade) {
        if (grade == null) return "—";
        return String.format("%.2f", grade);
    }

    private GradingPeriod activePeriod() {
        return gradingPeriodRepository.findFirstByIsOpenTrueOrderByDeadlineDesc().orElse(null);
    }

    // ── Reads and faculty submission ──────────────────────────────────────────

    /** An enrolled student in a section, with their grade record if one exists yet. */
    public record RosterEntry(Enrollment enrollment, Grade grade) {}

    @Transactional(readOnly = true)
    public List<GradeDto> getGradesForStudent(String studentId) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new NotFoundException("Student not found"));

        List<Grade> existingGrades = gradeRepository.findByStudent_Id(studentId);
        List<GradeDto> result = new ArrayList<>();

        Set<String> coveredSectionIds = new HashSet<>();
        Set<String> coveredSubjTermKeys = new HashSet<>();

        for (Grade g : existingGrades) {
            result.add(DtoMapper.grade(g));
            if (g.getSection() != null) {
                coveredSectionIds.add(g.getSection().getId());
            }
            if (g.getSubject() != null && g.getSemester() != null && g.getSchoolYear() != null) {
                coveredSubjTermKeys.add(g.getSubject().getSubjectCode() + "|" + g.getSemester() + "|" + g.getSchoolYear());
            }
        }

        // Include all enrolled subjects that do not have a Grade record yet
        List<Enrollment> enrollments = enrollmentRepository.findByStudent_Id(studentId);
        for (Enrollment e : enrollments) {
            if (e.getStatus() == Status.DROPPED) {
                continue;
            }
            String sectionId = e.getSection() != null ? e.getSection().getId() : null;
            String subjTermKey = e.getSubject() != null && e.getSemester() != null && e.getSchoolYear() != null
                    ? e.getSubject().getSubjectCode() + "|" + e.getSemester() + "|" + e.getSchoolYear()
                    : null;

            if (sectionId != null && coveredSectionIds.contains(sectionId)) {
                continue;
            }
            if (subjTermKey != null && coveredSubjTermKeys.contains(subjTermKey)) {
                continue;
            }

            String teacherName = null;
            if (e.getSection() != null && e.getSection().getFaculty() != null) {
                teacherName = e.getSection().getFaculty().getName();
            }
            int units = e.getSubject() != null ? e.getSubject().getUnits() : 0;
            String sectionCode = e.getSection() != null ? e.getSection().getSectionCode() : "—";
            String subjectCode = e.getSubject() != null ? e.getSubject().getSubjectCode() : "—";
            String subjectName = e.getSubject() != null ? e.getSubject().getSubjectName() : "—";

            GradeDto placeholder = new GradeDto(
                    "pending-" + e.getId(),
                    student.getId(),
                    student.getName(),
                    sectionId,
                    sectionCode,
                    subjectCode,
                    subjectName,
                    e.getSemester(),
                    e.getSchoolYear(),
                    null, // prelimGrade
                    null, // midtermGrade
                    null, // preFinalGrade
                    null, // finalGrade
                    null, // computedMidterm
                    null, // computedFinal
                    null, // overallGrade
                    null, // remarks
                    null, // submittedAt
                    units,
                    teacherName
            );
            result.add(placeholder);
            if (sectionId != null) coveredSectionIds.add(sectionId);
            if (subjTermKey != null) coveredSubjTermKeys.add(subjTermKey);
        }

        return result;
    }

    /** Faculty can view only their own sections; admins can view any. */
    @Transactional(readOnly = true)
    public List<RosterEntry> getSectionRoster(String actorId, boolean admin, String sectionId) {
        loadOwnedSection(actorId, admin, sectionId);

        Map<String, Grade> gradesByStudent = gradeRepository.findBySection_Id(sectionId).stream()
                .collect(Collectors.toMap(g -> g.getStudent().getId(), g -> g, (a, b) -> a));

        return enrollmentRepository.findBySection_Id(sectionId).stream()
                .filter(e -> e.getStatus() != Status.DROPPED)
                .map(e -> new RosterEntry(e, gradesByStudent.get(e.getStudent().getId())))
                .toList();
    }

    /**
     * Submits grades for a student in a section. The subject, semester and school year come from
     * the student's enrollment, so the caller only sends the student, the section and the grades.
     */
    @Transactional
    public Grade submitGrade(String actorId, boolean admin, String studentId, String sectionId,
                             Double prelim, Double midterm, Double preFinal, Double finalGrade) {
        Section section = loadOwnedSection(actorId, admin, sectionId);

        Enrollment enrollment = enrollmentRepository.findByStudent_IdAndSection_Id(studentId, sectionId)
                .filter(e -> e.getStatus() != Status.DROPPED)
                .orElseThrow(() -> new IllegalArgumentException("Student is not enrolled in this section"));

        return saveGrade(studentId, sectionId, section.getSubject().getSubjectCode(),
                enrollment.getSemester(), enrollment.getSchoolYear(),
                prelim, midterm, preFinal, finalGrade);
    }

    private Section loadOwnedSection(String actorId, boolean admin, String sectionId) {
        Section section = sectionRepository.findById(sectionId)
                .orElseThrow(() -> new NotFoundException("Section not found"));
        boolean teaches = section.getFaculty() != null && section.getFaculty().getId().equals(actorId);
        if (!admin && !teaches)
            throw new AccessDeniedException("You do not teach this section");
        return section;
    }
}
