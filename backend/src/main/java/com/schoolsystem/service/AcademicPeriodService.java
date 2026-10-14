package com.schoolsystem.service;

import com.schoolsystem.dto.DtoMapper;
import com.schoolsystem.dto.Requests.CreateTermCalendarRequest;
import com.schoolsystem.dto.Requests.OpenAdmissionPeriodRequest;
import com.schoolsystem.dto.Requests.OpenEnrollmentPeriodRequest;
import com.schoolsystem.dto.Requests.OpenEvaluationPeriodRequest;
import com.schoolsystem.dto.Requests.OpenGradingPeriodRequest;
import com.schoolsystem.dto.Requests.UpdateTermCalendarRequest;
import com.schoolsystem.dto.Responses.AcademicPeriodsStatusDto;
import com.schoolsystem.entity.AdmissionPeriod;
import com.schoolsystem.entity.EnrollmentPeriod;
import com.schoolsystem.entity.EvaluationPeriod;
import com.schoolsystem.entity.GradingPeriod;
import com.schoolsystem.entity.TermCalendar;
import com.schoolsystem.exception.NotFoundException;
import com.schoolsystem.repository.AdmissionPeriodRepository;
import com.schoolsystem.repository.AttendanceSessionRepository;
import com.schoolsystem.repository.EnrollmentPeriodRepository;
import com.schoolsystem.repository.EvaluationPeriodRepository;
import com.schoolsystem.repository.GradingPeriodRepository;
import com.schoolsystem.repository.TermCalendarRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AcademicPeriodService {

    private final EnrollmentPeriodRepository enrollmentPeriodRepository;
    private final GradingPeriodRepository gradingPeriodRepository;
    private final EvaluationPeriodRepository evaluationPeriodRepository;
    private final AdmissionPeriodRepository admissionPeriodRepository;
    private final TermCalendarRepository termCalendarRepository;
    private final AttendanceSessionRepository attendanceSessionRepository;

    @Transactional(readOnly = true)
    public AcademicPeriodsStatusDto getPeriodsStatus() {
        EnrollmentPeriod activeEnrollment = enrollmentPeriodRepository
                .findFirstByIsOpenTrueOrderByStartsAtDesc()
                .orElse(null);
        GradingPeriod activeGrading = gradingPeriodRepository
                .findFirstByIsOpenTrueOrderByDeadlineDesc()
                .orElse(null);
        EvaluationPeriod activeEvaluation = evaluationPeriodRepository
                .findFirstByIsOpenTrueOrderByStartsAtDesc()
                .orElse(null);
        AdmissionPeriod activeAdmission = admissionPeriodRepository
                .findFirstByIsOpenTrueOrderByStartsAtDesc()
                .orElse(null);
        TermCalendar activeTerm = termCalendarRepository
                .findFirstByIsActiveTrueOrderByStartsAtDesc()
                .orElse(null);

        return new AcademicPeriodsStatusDto(
                DtoMapper.enrollmentPeriod(activeEnrollment),
                DtoMapper.gradingPeriod(activeGrading),
                DtoMapper.evaluationPeriod(activeEvaluation),
                DtoMapper.admissionPeriod(activeAdmission),
                DtoMapper.termCalendar(activeTerm)
        );
    }

    // ── Enrollment Period ───────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<EnrollmentPeriod> getAllEnrollmentPeriods() {
        return enrollmentPeriodRepository.findAllByOrderByStartsAtDesc();
    }

    @Transactional
    public EnrollmentPeriod openEnrollmentPeriod(OpenEnrollmentPeriodRequest req) {
        if (req.startsAt() == null || req.endsAt() == null) {
            throw new IllegalArgumentException("Start and end dates are required");
        }
        if (!req.endsAt().isAfter(req.startsAt())) {
            throw new IllegalArgumentException("End date must be after start date");
        }

        // Close any currently open enrollment periods
        List<EnrollmentPeriod> openPeriods = enrollmentPeriodRepository.findByIsOpenTrue();
        for (EnrollmentPeriod op : openPeriods) {
            op.setOpen(false);
        }
        enrollmentPeriodRepository.saveAll(openPeriods);

        EnrollmentPeriod period = new EnrollmentPeriod();
        period.setSemester(req.semester());
        period.setSchoolYear(req.schoolYear().trim());
        period.setStartsAt(req.startsAt());
        period.setEndsAt(req.endsAt());
        period.setOpen(true);

        return enrollmentPeriodRepository.save(period);
    }

    @Transactional
    public EnrollmentPeriod closeEnrollmentPeriod(String id) {
        EnrollmentPeriod period = enrollmentPeriodRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Enrollment period not found: " + id));
        period.setOpen(false);
        return enrollmentPeriodRepository.save(period);
    }

    @Transactional
    public EnrollmentPeriod closeActiveEnrollmentPeriod() {
        EnrollmentPeriod active = enrollmentPeriodRepository.findFirstByIsOpenTrueOrderByStartsAtDesc()
                .orElseThrow(() -> new IllegalStateException("No active enrollment period is currently open"));
        active.setOpen(false);
        return enrollmentPeriodRepository.save(active);
    }

    // ── Grading Period ──────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<GradingPeriod> getAllGradingPeriods() {
        return gradingPeriodRepository.findAll();
    }

    @Transactional
    public GradingPeriod openGradingPeriod(OpenGradingPeriodRequest req) {
        // Close any currently open grading periods
        List<GradingPeriod> openPeriods = gradingPeriodRepository.findByIsOpenTrue();
        for (GradingPeriod gp : openPeriods) {
            gp.setOpen(false);
        }
        gradingPeriodRepository.saveAll(openPeriods);

        GradingPeriod period = new GradingPeriod();
        period.setSemester(req.semester());
        period.setSchoolYear(req.schoolYear().trim());
        period.setDeadline(req.deadline());
        period.setOpen(true);

        return gradingPeriodRepository.save(period);
    }

    @Transactional
    public GradingPeriod closeGradingPeriod(String id) {
        GradingPeriod period = gradingPeriodRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Grading period not found: " + id));
        period.setOpen(false);
        return gradingPeriodRepository.save(period);
    }

    @Transactional
    public GradingPeriod closeActiveGradingPeriod() {
        GradingPeriod active = gradingPeriodRepository.findFirstByIsOpenTrueOrderByDeadlineDesc()
                .orElseThrow(() -> new IllegalStateException("No active grading period is currently open"));
        active.setOpen(false);
        return gradingPeriodRepository.save(active);
    }

    // ── Evaluation Period ───────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<EvaluationPeriod> getAllEvaluationPeriods() {
        return evaluationPeriodRepository.findAllByOrderByStartsAtDesc();
    }

    @Transactional
    public EvaluationPeriod openEvaluationPeriod(OpenEvaluationPeriodRequest req) {
        if (req.startsAt() == null || req.endsAt() == null) {
            throw new IllegalArgumentException("Start and end dates are required");
        }
        if (!req.endsAt().isAfter(req.startsAt())) {
            throw new IllegalArgumentException("End date must be after start date");
        }

        // Close any currently open evaluation periods
        List<EvaluationPeriod> openPeriods = evaluationPeriodRepository.findByIsOpenTrue();
        for (EvaluationPeriod ep : openPeriods) {
            ep.setOpen(false);
        }
        evaluationPeriodRepository.saveAll(openPeriods);

        EvaluationPeriod period = new EvaluationPeriod();
        period.setSemester(req.semester());
        period.setSchoolYear(req.schoolYear().trim());
        period.setStartsAt(req.startsAt());
        period.setEndsAt(req.endsAt());
        period.setOpen(true);

        return evaluationPeriodRepository.save(period);
    }

    @Transactional
    public EvaluationPeriod closeEvaluationPeriod(String id) {
        EvaluationPeriod period = evaluationPeriodRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Evaluation period not found: " + id));
        period.setOpen(false);
        return evaluationPeriodRepository.save(period);
    }

    @Transactional
    public EvaluationPeriod closeActiveEvaluationPeriod() {
        EvaluationPeriod active = evaluationPeriodRepository.findFirstByIsOpenTrueOrderByStartsAtDesc()
                .orElseThrow(() -> new IllegalStateException("No active evaluation period is currently open"));
        active.setOpen(false);
        return evaluationPeriodRepository.save(active);
    }

    // ── Admission Period ────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<AdmissionPeriod> getAllAdmissionPeriods() {
        return admissionPeriodRepository.findAllByOrderByStartsAtDesc();
    }

    @Transactional
    public AdmissionPeriod openAdmissionPeriod(OpenAdmissionPeriodRequest req) {
        if (req.startsAt() == null || req.endsAt() == null) {
            throw new IllegalArgumentException("Start and end dates are required");
        }
        if (!req.endsAt().isAfter(req.startsAt())) {
            throw new IllegalArgumentException("End date must be after start date");
        }

        // Close any currently open admission periods
        List<AdmissionPeriod> openPeriods = admissionPeriodRepository.findByIsOpenTrue();
        for (AdmissionPeriod ap : openPeriods) {
            ap.setOpen(false);
        }
        admissionPeriodRepository.saveAll(openPeriods);

        AdmissionPeriod period = new AdmissionPeriod();
        period.setSemester(req.semester());
        period.setSchoolYear(req.schoolYear().trim());
        period.setStartsAt(req.startsAt());
        period.setEndsAt(req.endsAt());
        period.setOpen(true);

        return admissionPeriodRepository.save(period);
    }

    @Transactional
    public AdmissionPeriod closeAdmissionPeriod(String id) {
        AdmissionPeriod period = admissionPeriodRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Admission period not found: " + id));
        period.setOpen(false);
        return admissionPeriodRepository.save(period);
    }

    @Transactional
    public AdmissionPeriod closeActiveAdmissionPeriod() {
        AdmissionPeriod active = admissionPeriodRepository.findFirstByIsOpenTrueOrderByStartsAtDesc()
                .orElseThrow(() -> new IllegalStateException("No active admission period is currently open"));
        active.setOpen(false);
        return admissionPeriodRepository.save(active);
    }

    // ── Term Calendar ───────────────────────────────────────────────────────

    private void validateSchoolYear(String sy) {
        if (sy == null || !sy.matches("^\\d{4}-\\d{4}$")) {
            throw new IllegalArgumentException("School year must follow the format 'YYYY-YYYY' (e.g. 2026-2027)");
        }
        String[] parts = sy.split("-");
        int y1 = Integer.parseInt(parts[0]);
        int y2 = Integer.parseInt(parts[1]);
        if (y2 != y1 + 1) {
            throw new IllegalArgumentException("School year must have consecutive years (e.g. " + y1 + "-" + (y1 + 1) + ")");
        }
    }

    @Transactional(readOnly = true)
    public List<TermCalendar> getAllTerms() {
        return termCalendarRepository.findAllByOrderByStartsAtDesc();
    }

    @Transactional(readOnly = true)
    public TermCalendar getActiveTerm() {
        return termCalendarRepository.findFirstByIsActiveTrueOrderByStartsAtDesc()
                .orElseThrow(() -> new NotFoundException("No active term calendar is currently set"));
    }

    @Transactional
    public TermCalendar createTerm(CreateTermCalendarRequest req) {
        if (req.startsAt() == null || req.endsAt() == null) {
            throw new IllegalArgumentException("Class start and end dates are required");
        }
        if (!req.endsAt().isAfter(req.startsAt())) {
            throw new IllegalArgumentException("Class end date must be after start date");
        }
        String sy = req.schoolYear().trim();
        validateSchoolYear(sy);

        if (termCalendarRepository.existsBySchoolYearAndSemester(sy, req.semester())) {
            throw new IllegalStateException("A term calendar already exists for " + sy + " " + req.semester());
        }

        TermCalendar term = new TermCalendar();
        term.setSchoolYear(sy);
        term.setSemester(req.semester());
        term.setStartsAt(req.startsAt());
        term.setEndsAt(req.endsAt());
        term.setActive(false);

        return termCalendarRepository.save(term);
    }

    @Transactional
    public TermCalendar updateTerm(String id, UpdateTermCalendarRequest req) {
        TermCalendar term = termCalendarRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Term calendar not found: " + id));

        if (req.startsAt() == null || req.endsAt() == null) {
            throw new IllegalArgumentException("Class start and end dates are required");
        }
        if (!req.endsAt().isAfter(req.startsAt())) {
            throw new IllegalArgumentException("Class end date must be after start date");
        }
        String sy = req.schoolYear().trim();
        validateSchoolYear(sy);

        if (termCalendarRepository.existsBySchoolYearAndSemesterAndIdNot(sy, req.semester(), id)) {
            throw new IllegalStateException("A term calendar already exists for " + sy + " " + req.semester());
        }

        if (attendanceSessionRepository.existsByTerm_IdAndDateLessThanOrTerm_IdAndDateGreaterThan(id, req.startsAt(), req.endsAt())) {
            throw new IllegalStateException("Cannot update term dates: saved attendance sessions exist outside the new date range (" + req.startsAt() + " to " + req.endsAt() + ").");
        }

        term.setSchoolYear(sy);
        term.setSemester(req.semester());
        term.setStartsAt(req.startsAt());
        term.setEndsAt(req.endsAt());

        return termCalendarRepository.save(term);
    }

    @Transactional
    public TermCalendar activateTerm(String id) {
        TermCalendar target = termCalendarRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Term calendar not found: " + id));

        List<TermCalendar> activeTerms = termCalendarRepository.findByIsActiveTrue();
        for (TermCalendar t : activeTerms) {
            if (!t.getId().equals(id)) {
                t.setActive(false);
            }
        }
        termCalendarRepository.saveAll(activeTerms);

        target.setActive(true);
        return termCalendarRepository.save(target);
    }
}
