package com.schoolsystem.service;

import com.schoolsystem.exception.NotFoundException;

import com.schoolsystem.entity.Course;
import com.schoolsystem.entity.Faculty;
import com.schoolsystem.entity.Room;
import com.schoolsystem.entity.Schedule;
import com.schoolsystem.entity.Section;
import com.schoolsystem.entity.Subject;
import com.schoolsystem.repository.CourseRepository;
import com.schoolsystem.repository.EnrollmentRepository;
import com.schoolsystem.repository.FacultyRepository;
import com.schoolsystem.repository.FacultyEvaluationRepository;
import com.schoolsystem.repository.GradeRepository;
import com.schoolsystem.repository.RoomRepository;
import com.schoolsystem.repository.ScheduleRepository;
import com.schoolsystem.repository.SectionRepository;
import com.schoolsystem.repository.SubjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SectionService {

    private final SectionRepository sectionRepository;
    private final ScheduleRepository scheduleRepository;
    private final SubjectRepository subjectRepository;
    private final FacultyRepository facultyRepository;
    private final RoomRepository roomRepository;
    private final CourseRepository courseRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final GradeRepository gradeRepository;
    private final FacultyEvaluationRepository facultyEvaluationRepository;

    /** One day/time slot sent from the UI. */
    public record ScheduleSlot(Schedule.Day day, LocalTime startTime, LocalTime endTime, String roomId) {}

    // ── Create ────────────────────────────────────────────────────────────────

    /**
     * Creates the schedules and the section in one transaction. Checks room conflicts and
     * faculty conflicts before saving anything.
     */
    @Transactional
    public Section createSection(String subjectCode, String facultyId,
                                 int capacity, List<ScheduleSlot> slots) {
        if (subjectCode == null || subjectCode.isBlank())
            throw new IllegalArgumentException("Subject cannot be empty");
        if (facultyId == null || facultyId.isBlank())
            throw new IllegalArgumentException("Faculty cannot be empty");
        if (capacity <= 0)
            throw new IllegalArgumentException("Capacity must be greater than 0");
        if (slots == null || slots.isEmpty())
            throw new IllegalArgumentException("At least one schedule slot is required");

        Subject subject = subjectRepository.findBySubjectCode(subjectCode)
                .orElseThrow(() -> new NotFoundException("Subject not found: " + subjectCode));
        Faculty faculty = facultyRepository.findById(facultyId)
                .orElseThrow(() -> new NotFoundException("Faculty not found"));

        // Validate that faculty is assigned to teach this subject
        if (subject.getAssignedFaculties() == null || subject.getAssignedFaculties().stream().noneMatch(f -> f.getId().equals(facultyId))) {
            throw new IllegalStateException("Faculty " + faculty.getName() + " is not assigned to teach subject " + subjectCode + ". Please assign them on the Academic Subjects page first.");
        }

        List<Schedule> candidates = buildCandidates(slots, capacity);
        checkConflicts(candidates, facultyId, null);

        Section section = new Section();
        section.setSectionCode(generateSectionCode(subject.getCourse()));
        section.setSubject(subject);
        section.setFaculty(faculty);
        section.setCapacity(capacity);
        section.setCurrentCount(0);

        scheduleRepository.saveAll(candidates);
        section.getSchedules().addAll(candidates);
        return sectionRepository.save(section);
    }

    // ── Update ────────────────────────────────────────────────────────────────

    /** Updates a section and replaces its schedules (old ones are deleted). */
    @Transactional
    public Section updateSection(String sectionId, String facultyId,
                                 int capacity, List<ScheduleSlot> slots) {
        if (facultyId == null || facultyId.isBlank())
            throw new IllegalArgumentException("Faculty cannot be empty");
        if (capacity <= 0)
            throw new IllegalArgumentException("Capacity must be greater than 0");
        if (slots == null || slots.isEmpty())
            throw new IllegalArgumentException("At least one schedule slot is required");

        Section section = findSection(sectionId);
        Faculty faculty = facultyRepository.findById(facultyId)
                .orElseThrow(() -> new NotFoundException("Faculty not found"));

        // Validate that faculty is assigned to teach this subject
        Subject subject = section.getSubject();
        if (subject != null && (subject.getAssignedFaculties() == null || subject.getAssignedFaculties().stream().noneMatch(f -> f.getId().equals(facultyId)))) {
            throw new IllegalStateException("Faculty " + faculty.getName() + " is not assigned to teach subject " + subject.getSubjectCode() + ". Please assign them on the Academic Subjects page first.");
        }

        List<Schedule> candidates = buildCandidates(slots, capacity);
        checkConflicts(candidates, facultyId, section);

        List<Schedule> oldSchedules = new ArrayList<>(section.getSchedules());

        scheduleRepository.saveAll(candidates);
        section.setFaculty(faculty);
        section.setCapacity(capacity);
        section.getSchedules().clear();
        section.getSchedules().addAll(candidates);
        sectionRepository.save(section);

        scheduleRepository.deleteAll(oldSchedules);
        return section;
    }

    // ── Delete ────────────────────────────────────────────────────────────────

    /** Deletes a section and its schedules. Blocked while students are enrolled unless force is true. */
    @Transactional
    public void deleteSection(String sectionId) {
        deleteSection(sectionId, false);
    }

    @Transactional
    public void deleteSection(String sectionId, boolean force) {
        Section section = findSection(sectionId);

        if (!force) {
            if (section.getCurrentCount() > 0)
                throw new IllegalStateException(
                        "Cannot delete section — it has " + section.getCurrentCount()
                                + " enrolled student(s). Enable 'Force delete' to unenroll and remove.");
            if (enrollmentRepository.existsBySection_Id(sectionId))
                throw new IllegalStateException(
                        "Cannot delete section — it still has enrollment records. Enable 'Force delete' to remove records.");
        } else {
            gradeRepository.deleteBySection_Id(sectionId);
            facultyEvaluationRepository.deleteBySection_Id(sectionId);
            enrollmentRepository.deleteBySection_Id(sectionId);
        }

        List<Schedule> schedules = new ArrayList<>(section.getSchedules());
        section.getSchedules().clear();
        sectionRepository.delete(section);
        scheduleRepository.deleteAll(schedules);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Section findSection(String sectionId) {
        return sectionRepository.findById(sectionId)
                .orElseThrow(() -> new NotFoundException("Section not found"));
    }

    private List<Schedule> buildCandidates(List<ScheduleSlot> slots, int capacity) {
        List<Schedule> candidates = new ArrayList<>();
        for (ScheduleSlot slot : slots) {
            if (slot.roomId() == null || slot.roomId().isBlank())
                throw new IllegalArgumentException("Room must be selected for all slots");
            if (slot.day() == null)
                throw new IllegalArgumentException("Day must be selected for all slots");
            if (slot.startTime() == null || slot.endTime() == null)
                throw new IllegalArgumentException("Time is required for all slots");
            if (!slot.startTime().isBefore(slot.endTime()))
                throw new IllegalArgumentException("Start time must be before end time for all slots");

            Room room = roomRepository.findById(slot.roomId())
                    .orElseThrow(() -> new NotFoundException("Room not found"));
            // The old javadoc promised this rule but the code never enforced it.
            if (capacity > room.getCapacity())
                throw new IllegalArgumentException(
                        "Section capacity (" + capacity + ") exceeds the capacity of room "
                                + room.getRoomName() + " (" + room.getCapacity() + ")");

            Schedule schedule = new Schedule();
            schedule.setDay(slot.day());
            schedule.setStartTime(slot.startTime());
            schedule.setEndTime(slot.endTime());
            schedule.setRoom(room);
            candidates.add(schedule);
        }
        return candidates;
    }

    /** Room clashes against every other schedule; faculty clashes against the faculty's other sections. */
    private void checkConflicts(List<Schedule> candidates, String facultyId, Section excluded) {
        Set<String> ownIds = excluded == null
                ? Set.of()
                : excluded.getSchedules().stream().map(Schedule::getId).collect(Collectors.toSet());

        List<Schedule> others = scheduleRepository.findAll().stream()
                .filter(s -> !ownIds.contains(s.getId()))
                .toList();

        List<Schedule> facultySchedules = sectionRepository.findByFaculty_Id(facultyId).stream()
                .filter(s -> excluded == null || !s.getId().equals(excluded.getId()))
                .flatMap(s -> s.getSchedules().stream())
                .toList();

        for (Schedule candidate : candidates) {
            for (Schedule existing : others) {
                if (candidate.hasConflict(existing))
                    throw new IllegalStateException(
                            "Room conflict on " + candidate.getDay() + " "
                                    + candidate.getStartTime() + "–" + candidate.getEndTime()
                                    + ": room already booked");
            }
            // overlapsWith ignores the room. The old code reused the room-based check here,
            // so a faculty member double-booked in two different rooms was never caught.
            for (Schedule existing : facultySchedules) {
                if (candidate.overlapsWith(existing))
                    throw new IllegalStateException(
                            "Faculty conflict on " + candidate.getDay() + " "
                                    + candidate.getStartTime() + "–" + candidate.getEndTime()
                                    + ": faculty already assigned to another section");
            }
        }
    }

    /**
     * Prefix comes from the subject's course (Subject.course holds a Course.code).
     * Uses the highest existing number + 1. The old count + 1 could repeat a code after a deletion.
     */
    private String generateSectionCode(String courseCode) {
        Course course = courseRepository.findByCode(courseCode).orElse(null);
        String prefix = course != null ? course.getSectionPrefix() : courseCode + "-";

        int max = 0;
        for (Section s : sectionRepository.findBySectionCodeStartingWith(prefix)) {
            String suffix = s.getSectionCode().substring(prefix.length());
            if (suffix.matches("\\d+")) {
                max = Math.max(max, Integer.parseInt(suffix));
            }
        }
        return prefix + (max + 1);
    }

    // ── Reads ─────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<Section> getAllSections() {
        return sectionRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Section getSection(String sectionId) {
        return findSection(sectionId);
    }

    @Transactional(readOnly = true)
    public List<Section> getSectionsBySubject(String subjectCode) {
        return sectionRepository.findBySubject_SubjectCode(subjectCode);
    }

    @Transactional(readOnly = true)
    public List<Section> getSectionsForFaculty(String facultyId) {
        return sectionRepository.findByFaculty_Id(facultyId);
    }
}
