package com.schoolsystem.service;

import com.schoolsystem.dto.Requests.AttendanceRecordItemRequest;
import com.schoolsystem.dto.Requests.SaveAttendanceRequest;
import com.schoolsystem.dto.Responses.*;
import com.schoolsystem.entity.*;
import com.schoolsystem.entity.enums.*;
import com.schoolsystem.exception.NotFoundException;
import com.schoolsystem.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AttendanceService {

    public static final ZoneId PHILIPPINE_ZONE = ZoneId.of("Asia/Manila");

    private final AttendanceSessionRepository attendanceSessionRepository;
    private final AttendanceRecordRepository attendanceRecordRepository;
    private final SectionRepository sectionRepository;
    private final StudentRepository studentRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final TermCalendarRepository termCalendarRepository;

    // ── PERMISSIONS / SECTION OWNERSHIP ──────────────────────────────────────

    public Section loadOwnedSection(String actorId, boolean admin, String sectionId) {
        Section section = sectionRepository.findById(sectionId)
                .orElseThrow(() -> new NotFoundException("Section not found: " + sectionId));
        boolean teaches = section.getFaculty() != null && section.getFaculty().getId().equals(actorId);
        if (!admin && !teaches) {
            throw new AccessDeniedException("You do not teach this section");
        }
        return section;
    }

    public TermCalendar getActiveTerm() {
        return termCalendarRepository.findFirstByIsActiveTrueOrderByStartsAtDesc()
                .orElseThrow(() -> new IllegalStateException("No active term set. Ask an admin to set up the Term Calendar."));
    }

    public LocalDate getPhilippineToday() {
        return LocalDate.now(PHILIPPINE_ZONE);
    }

    // ── 1. LIST SESSIONS (MERGED GENERATED + PERSISTED) ───────────────────────

    @Transactional(readOnly = true)
    public List<AttendanceSessionDto> getSessionsForSection(String actorId, boolean admin, String sectionId) {
        Section section = loadOwnedSection(actorId, admin, sectionId);
        TermCalendar activeTerm = getActiveTerm();
        return computeMergedSessions(section, activeTerm);
    }

    private List<AttendanceSessionDto> computeMergedSessions(Section section, TermCalendar term) {
        // Collect weekly schedule days for this section
        Set<DayOfWeek> scheduleDays = section.getSchedules().stream()
                .filter(s -> s.getDay() != null)
                .map(s -> DayOfWeek.valueOf(s.getDay().name()))
                .collect(Collectors.toSet());

        // Load all persisted sessions for this section and term
        List<AttendanceSession> persistedSessions = attendanceSessionRepository
                .findBySection_IdAndTerm_IdOrderByDateAsc(section.getId(), term.getId());

        Map<LocalDate, AttendanceSession> persistedMap = persistedSessions.stream()
                .collect(Collectors.toMap(AttendanceSession::getDate, s -> s, (a, b) -> a));

        // Find which persisted sessions have records
        Set<String> sessionIdsWithRecords = new HashSet<>();
        if (!persistedSessions.isEmpty()) {
            List<String> ids = persistedSessions.stream().map(AttendanceSession::getId).toList();
            for (AttendanceRecord r : attendanceRecordRepository.findBySession_IdIn(ids)) {
                sessionIdsWithRecords.add(r.getSession().getId());
            }
        }

        Map<LocalDate, AttendanceSessionDto> merged = new TreeMap<>();

        // Generate matching regular schedule dates inside term range
        LocalDate cur = term.getStartsAt();
        LocalDate end = term.getEndsAt();
        while (!cur.isAfter(end)) {
            if (scheduleDays.contains(cur.getDayOfWeek())) {
                AttendanceSession persisted = persistedMap.get(cur);
                if (persisted != null) {
                    merged.put(cur, new AttendanceSessionDto(
                            persisted.getId(),
                            section.getId(),
                            cur,
                            persisted.getType(),
                            persisted.getStatus(),
                            sessionIdsWithRecords.contains(persisted.getId()),
                            cur.getDayOfWeek().name()
                    ));
                } else {
                    merged.put(cur, new AttendanceSessionDto(
                            null,
                            section.getId(),
                            cur,
                            AttendanceType.REGULAR,
                            AttendanceSessionStatus.HELD,
                            false,
                            cur.getDayOfWeek().name()
                    ));
                }
            }
            cur = cur.plusDays(1);
        }

        // Include any persisted sessions that were not part of the standard regular schedule (e.g. MAKEUP)
        for (AttendanceSession ps : persistedSessions) {
            if (!merged.containsKey(ps.getDate())) {
                merged.put(ps.getDate(), new AttendanceSessionDto(
                        ps.getId(),
                        section.getId(),
                        ps.getDate(),
                        ps.getType(),
                        ps.getStatus(),
                        sessionIdsWithRecords.contains(ps.getId()),
                        ps.getDate().getDayOfWeek().name()
                ));
            }
        }

        return new ArrayList<>(merged.values());
    }

    // ── 2. GET SESSION ROSTER FOR A DATE ─────────────────────────────────────

    @Transactional(readOnly = true)
    public SessionRosterDto getSessionRoster(String actorId, boolean admin, String sectionId, LocalDate date) {
        Section section = loadOwnedSection(actorId, admin, sectionId);
        TermCalendar activeTerm = getActiveTerm();

        validateDateInsideTerm(date, activeTerm);

        // Find or build session DTO
        Optional<AttendanceSession> persistedOpt = attendanceSessionRepository.findBySection_IdAndDate(sectionId, date);
        AttendanceSession persisted = persistedOpt.orElse(null);

        boolean hasRecords = false;
        Map<String, AttendanceRecord> recordsByStudent = new HashMap<>();
        if (persisted != null) {
            List<AttendanceRecord> records = attendanceRecordRepository.findBySession_Id(persisted.getId());
            hasRecords = !records.isEmpty();
            for (AttendanceRecord r : records) {
                recordsByStudent.put(r.getStudent().getId(), r);
            }
        }

        AttendanceSessionDto sessionDto;
        if (persisted != null) {
            sessionDto = new AttendanceSessionDto(
                    persisted.getId(),
                    sectionId,
                    date,
                    persisted.getType(),
                    persisted.getStatus(),
                    hasRecords,
                    date.getDayOfWeek().name()
            );
        } else {
            sessionDto = new AttendanceSessionDto(
                    null,
                    sectionId,
                    date,
                    AttendanceType.REGULAR,
                    AttendanceSessionStatus.HELD,
                    false,
                    date.getDayOfWeek().name()
            );
        }

        // Enrolled students (Option A)
        // List<Enrollment> activeEnrollments = enrollmentRepository.findBySection_Id(sectionId).stream()
        //         .filter(e -> e.getStatus() == Status.ENROLLED)
        //         .toList();

        // Enrolled students for active term (Option B)
        List<Enrollment> activeEnrollments = enrollmentRepository.findBySection_Id(sectionId).stream()
                .filter(e -> e.getStatus() == Status.ENROLLED
                        && e.getSchoolYear().equalsIgnoreCase(activeTerm.getSchoolYear())
                        && e.getSemester() == activeTerm.getSemester())
                .toList();

        Map<String, Student> studentMap = new LinkedHashMap<>();
        for (Enrollment e : activeEnrollments) {
            studentMap.put(e.getStudent().getId(), e.getStudent());
        }

        // Rule 5: Keep past records visible for students who dropped
        Set<String> activeStudentIds = new HashSet<>(studentMap.keySet());
        for (AttendanceRecord r : recordsByStudent.values()) {
            if (!studentMap.containsKey(r.getStudent().getId())) {
                studentMap.put(r.getStudent().getId(), r.getStudent());
            }
        }

        List<AttendanceStudentDto> studentDtos = new ArrayList<>();
        int presentCount = 0;
        int absentCount = 0;
        int lateCount = 0;

        for (Student s : studentMap.values()) {
            AttendanceRecord rec = recordsByStudent.get(s.getId());
            AttendanceStatus status = rec != null ? rec.getStatus() : null;
            String remarks = rec != null ? rec.getRemarks() : null;
            boolean isDropped = !activeStudentIds.contains(s.getId());

            if (status == AttendanceStatus.PRESENT) presentCount++;
            else if (status == AttendanceStatus.ABSENT) absentCount++;
            else if (status == AttendanceStatus.LATE) lateCount++;

            studentDtos.add(new AttendanceStudentDto(
                    s.getId(),
                    s.getName(),
                    s.getStudentNumber(),
                    status,
                    remarks,
                    isDropped
            ));
        }

        studentDtos.sort(Comparator.comparing(AttendanceStudentDto::studentName, String.CASE_INSENSITIVE_ORDER));

        return new SessionRosterDto(sessionDto, studentDtos, presentCount, absentCount, lateCount);
    }

    // ── 3. SAVE ATTENDANCE FOR A DATE ────────────────────────────────────────

    @Transactional
    public SessionRosterDto saveAttendance(String actorId, boolean admin, String sectionId, LocalDate date, SaveAttendanceRequest req) {
        Section section = loadOwnedSection(actorId, admin, sectionId);
        TermCalendar activeTerm = getActiveTerm();

        validateDateInsideTerm(date, activeTerm);

        // Rule 2: Block marking attendance for future dates
        LocalDate today = getPhilippineToday();
        if (date.isAfter(today)) {
            throw new IllegalArgumentException("Cannot mark attendance for future dates (requested: " + date + ", today: " + today + ")");
        }

        // Find or persist attendance session
        AttendanceSession session = attendanceSessionRepository.findBySection_IdAndDate(sectionId, date)
                .orElseGet(() -> {
                    AttendanceSession s = new AttendanceSession();
                    s.setSection(section);
                    s.setTerm(activeTerm);
                    s.setDate(date);
                    s.setType(AttendanceType.REGULAR);
                    s.setStatus(AttendanceSessionStatus.HELD);
                    return attendanceSessionRepository.save(s);
                });

        if (session.getStatus() == AttendanceSessionStatus.CANCELLED) {
            throw new IllegalStateException("Cannot record attendance for a cancelled session on " + date + ". Restore it first.");
        }

        // Save or update each student's attendance record
        for (AttendanceRecordItemRequest item : req.records()) {
            Student student = studentRepository.findById(item.studentId())
                    .orElseThrow(() -> new NotFoundException("Student not found: " + item.studentId()));

            AttendanceRecord record = attendanceRecordRepository.findBySession_IdAndStudent_Id(session.getId(), student.getId())
                    .orElseGet(() -> {
                        AttendanceRecord r = new AttendanceRecord();
                        r.setSession(session);
                        r.setStudent(student);
                        return r;
                    });

            record.setStatus(item.status());
            record.setRemarks(item.remarks() != null && !item.remarks().isBlank() ? item.remarks().trim() : null);
            attendanceRecordRepository.save(record);
        }

        return getSessionRoster(actorId, admin, sectionId, date);
    }

    // ── 4. CREATE MAKEUP SESSION ─────────────────────────────────────────────

    @Transactional
    public AttendanceSessionDto createMakeupSession(String actorId, boolean admin, String sectionId, LocalDate date) {
        Section section = loadOwnedSection(actorId, admin, sectionId);
        TermCalendar activeTerm = getActiveTerm();

        validateDateInsideTerm(date, activeTerm);

        if (attendanceSessionRepository.existsBySection_IdAndDate(sectionId, date)) {
            throw new IllegalStateException("An attendance session already exists on " + date);
        }

        AttendanceSession session = new AttendanceSession();
        session.setSection(section);
        session.setTerm(activeTerm);
        session.setDate(date);
        session.setType(AttendanceType.MAKEUP);
        session.setStatus(AttendanceSessionStatus.HELD);
        AttendanceSession saved = attendanceSessionRepository.save(session);

        return new AttendanceSessionDto(
                saved.getId(),
                sectionId,
                date,
                saved.getType(),
                saved.getStatus(),
                false,
                date.getDayOfWeek().name()
        );
    }

    // ── 5. CANCEL SESSION ────────────────────────────────────────────────────

    @Transactional
    public AttendanceSessionDto cancelSession(String actorId, boolean admin, String sectionId, LocalDate date, Boolean force) {
        Section section = loadOwnedSection(actorId, admin, sectionId);
        TermCalendar activeTerm = getActiveTerm();

        validateDateInsideTerm(date, activeTerm);

        Optional<AttendanceSession> sessionOpt = attendanceSessionRepository.findBySection_IdAndDate(sectionId, date);
        AttendanceSession session;
        boolean hasRecords = false;

        if (sessionOpt.isPresent()) {
            session = sessionOpt.get();
            hasRecords = attendanceRecordRepository.existsBySession_Id(session.getId());
            if (hasRecords && !Boolean.TRUE.equals(force)) {
                // Rule 6: returns 409 the frontend confirms
                throw new IllegalStateException("Session on " + date + " has recorded attendance. Please confirm cancellation.");
            }
            session.setStatus(AttendanceSessionStatus.CANCELLED);
        } else {
            session = new AttendanceSession();
            session.setSection(section);
            session.setTerm(activeTerm);
            session.setDate(date);
            session.setType(AttendanceType.REGULAR);
            session.setStatus(AttendanceSessionStatus.CANCELLED);
        }

        AttendanceSession saved = attendanceSessionRepository.save(session);

        return new AttendanceSessionDto(
                saved.getId(),
                sectionId,
                date,
                saved.getType(),
                saved.getStatus(),
                hasRecords,
                date.getDayOfWeek().name()
        );
    }

    // ── 6. RESTORE SESSION ───────────────────────────────────────────────────

    @Transactional
    public AttendanceSessionDto restoreSession(String actorId, boolean admin, String sectionId, LocalDate date) {
        Section section = loadOwnedSection(actorId, admin, sectionId);
        TermCalendar activeTerm = getActiveTerm();

        validateDateInsideTerm(date, activeTerm);

        AttendanceSession session = attendanceSessionRepository.findBySection_IdAndDate(sectionId, date)
                .orElseThrow(() -> new NotFoundException("No persisted session found on " + date + " to restore."));

        session.setStatus(AttendanceSessionStatus.HELD);
        AttendanceSession saved = attendanceSessionRepository.save(session);

        boolean hasRecords = attendanceRecordRepository.existsBySession_Id(saved.getId());

        return new AttendanceSessionDto(
                saved.getId(),
                sectionId,
                date,
                saved.getType(),
                saved.getStatus(),
                hasRecords,
                date.getDayOfWeek().name()
        );
    }

    // ── 7. ATTENDANCE SHEET (STUDENTS X SESSIONS MATRIX) ──────────────────────

    @Transactional(readOnly = true)
    public AttendanceSheetDto getAttendanceSheet(String actorId, boolean admin, String sectionId) {
        Section section = loadOwnedSection(actorId, admin, sectionId);
        TermCalendar activeTerm = getActiveTerm();

        List<AttendanceSessionDto> sessions = computeMergedSessions(section, activeTerm);
        int totalHeldSessions = (int) sessions.stream()
                .filter(s -> s.status() == AttendanceSessionStatus.HELD)
                .count();

        // Enrolled students (Option A)
        // List<Enrollment> activeEnrollments = enrollmentRepository.findBySection_Id(sectionId).stream()
        //         .filter(e -> e.getStatus() == Status.ENROLLED)
        //         .toList();

        // Enrolled students for active term (Option B)
        List<Enrollment> activeEnrollments = enrollmentRepository.findBySection_Id(sectionId).stream()
                .filter(e -> e.getStatus() == Status.ENROLLED
                        && e.getSchoolYear().equalsIgnoreCase(activeTerm.getSchoolYear())
                        && e.getSemester() == activeTerm.getSemester())
                .toList();

        Map<String, Student> studentMap = new LinkedHashMap<>();
        for (Enrollment e : activeEnrollments) {
            studentMap.put(e.getStudent().getId(), e.getStudent());
        }
        Set<String> activeStudentIds = new HashSet<>(studentMap.keySet());

        // Load all saved records across all sessions of this section & term
        List<String> persistedSessionIds = sessions.stream()
                .map(AttendanceSessionDto::id)
                .filter(Objects::nonNull)
                .toList();

        // studentId -> dateString -> AttendanceSheetCellDto
        Map<String, Map<String, AttendanceSheetCellDto>> recordsMatrix = new HashMap<>();
        if (!persistedSessionIds.isEmpty()) {
            List<AttendanceRecord> allRecords = attendanceRecordRepository.findBySession_IdIn(persistedSessionIds);
            for (AttendanceRecord r : allRecords) {
                String sid = r.getStudent().getId();
                studentMap.putIfAbsent(sid, r.getStudent()); // Rule 5: Keep dropped student in sheet
                recordsMatrix.computeIfAbsent(sid, k -> new HashMap<>())
                        .put(r.getSession().getDate().toString(), new AttendanceSheetCellDto(r.getStatus(), r.getRemarks()));
            }
        }

        // Build list of students with attendance totals and rate
        List<AttendanceSheetStudentDto> studentRows = new ArrayList<>();
        Set<LocalDate> heldDates = sessions.stream()
                .filter(s -> s.status() == AttendanceSessionStatus.HELD)
                .map(AttendanceSessionDto::date)
                .collect(Collectors.toSet());

        for (Student s : studentMap.values()) {
            Map<String, AttendanceSheetCellDto> studentDateRecords = recordsMatrix.getOrDefault(s.getId(), Collections.emptyMap());

            int presentCount = 0;
            int absentCount = 0;
            int lateCount = 0;

            for (Map.Entry<String, AttendanceSheetCellDto> entry : studentDateRecords.entrySet()) {
                LocalDate d = LocalDate.parse(entry.getKey());
                if (heldDates.contains(d)) {
                    AttendanceStatus st = entry.getValue().status();
                    if (st == AttendanceStatus.PRESENT) presentCount++;
                    else if (st == AttendanceStatus.ABSENT) absentCount++;
                    else if (st == AttendanceStatus.LATE) lateCount++;
                }
            }

            Double attendanceRate = null;
            if (totalHeldSessions > 0) {
                // Confirmed formula: (Present + Late) / totalHeldSessions * 100%
                double rawRate = ((double) (presentCount + lateCount) / totalHeldSessions) * 100.0;
                attendanceRate = Math.round(rawRate * 10.0) / 10.0;
            }

            boolean isDropped = !activeStudentIds.contains(s.getId());

            studentRows.add(new AttendanceSheetStudentDto(
                    s.getId(),
                    s.getName(),
                    s.getStudentNumber(),
                    studentDateRecords,
                    presentCount,
                    absentCount,
                    lateCount,
                    totalHeldSessions,
                    attendanceRate,
                    isDropped
            ));
        }

        studentRows.sort(Comparator.comparing(AttendanceSheetStudentDto::studentName, String.CASE_INSENSITIVE_ORDER));

        return new AttendanceSheetDto(sessions, studentRows, totalHeldSessions);
    }

    private void validateDateInsideTerm(LocalDate date, TermCalendar term) {
        if (date.isBefore(term.getStartsAt()) || date.isAfter(term.getEndsAt())) {
            throw new IllegalArgumentException("Date " + date + " falls outside the active term ("
                    + term.getStartsAt() + " to " + term.getEndsAt() + ").");
        }
    }
}

