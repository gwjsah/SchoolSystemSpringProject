package com.schoolsystem.service;

import com.schoolsystem.dto.DtoMapper;
import com.schoolsystem.dto.Requests.SectionRequest;
import com.schoolsystem.dto.Responses.BulkValidationItem;
import com.schoolsystem.dto.Responses.BulkValidationResponse;
import com.schoolsystem.dto.Responses.ScheduleDto;
import com.schoolsystem.exception.NotFoundException;

import com.schoolsystem.entity.Course;
import com.schoolsystem.entity.Faculty;
import com.schoolsystem.entity.Room;
import com.schoolsystem.entity.Schedule;
import com.schoolsystem.entity.Section;
import com.schoolsystem.entity.Subject;
import com.schoolsystem.entity.enums.RoomType;
import com.schoolsystem.repository.CartItemRepository;
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
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
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
    private final CartItemRepository cartItemRepository;

    /** One day/time slot sent from the UI. */
    public record ScheduleSlot(
            Schedule.Day day,
            LocalTime startTime,
            LocalTime endTime,
            String roomId,
            RoomType slotType
    ) {
        public ScheduleSlot(Schedule.Day day, LocalTime startTime, LocalTime endTime, String roomId) {
            this(day, startTime, endTime, roomId, null);
        }
    }

    // ── Create ────────────────────────────────────────────────────────────────

    @Transactional
    public Section createSection(String subjectCode, String facultyId,
                                 int capacity, List<ScheduleSlot> slots) {
        return createSection(null, subjectCode, facultyId, capacity, slots);
    }

    /**
     * Creates the schedules and the section in one transaction. Checks room conflicts and
     * faculty conflicts before saving anything. Auto-allocates room if roomId is empty/null/AUTO.
     */
    @Transactional
    public Section createSection(String sectionCode, String subjectCode, String facultyId,
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

        String finalSectionCode;
        if (sectionCode != null && !sectionCode.trim().isEmpty()) {
            finalSectionCode = sectionCode.trim().toUpperCase();
            if (sectionRepository.existsBySectionCodeAndSubject_SubjectCode(finalSectionCode, subject.getSubjectCode())) {
                throw new IllegalStateException("Section code '" + finalSectionCode + "' already exists for subject " + subject.getSubjectCode());
            }
        } else {
            finalSectionCode = generateSectionCode(subject.getCourse());
        }

        List<Schedule> candidates = buildCandidates(slots, capacity, null, null);
        checkConflicts(candidates, facultyId, null, null);

        Section section = new Section();
        section.setSectionCode(finalSectionCode);
        section.setSubject(subject);
        section.setFaculty(faculty);
        section.setCapacity(capacity);
        section.setCurrentCount(0);

        scheduleRepository.saveAll(candidates);
        section.getSchedules().addAll(candidates);
        return sectionRepository.save(section);
    }

    // ── Update ────────────────────────────────────────────────────────────────

    @Transactional
    public Section updateSection(String sectionId, String facultyId,
                                 int capacity, List<ScheduleSlot> slots) {
        return updateSection(sectionId, null, facultyId, capacity, slots);
    }

    /** Updates a section and replaces its schedules (old ones are deleted). */
    @Transactional
    public Section updateSection(String sectionId, String sectionCode, String facultyId,
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

        if (sectionCode != null && !sectionCode.trim().isEmpty()) {
            String trimmed = sectionCode.trim().toUpperCase();
            sectionRepository.findBySectionCodeAndSubject_SubjectCodeAndIdNot(trimmed, subject.getSubjectCode(), sectionId)
                    .ifPresent(existing -> {
                        throw new IllegalStateException("Section code '" + trimmed + "' already exists for subject " + subject.getSubjectCode());
                    });
            section.setSectionCode(trimmed);
        }

        List<Schedule> candidates = buildCandidates(slots, capacity, section, null);
        checkConflicts(candidates, facultyId, section, null);

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
            if (cartItemRepository.existsBySection_Id(sectionId))
                throw new IllegalStateException(
                        "Cannot delete section — it is currently selected in student cart(s). Enable 'Force delete' to remove.");
        } else {
            cartItemRepository.deleteBySection_Id(sectionId);
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

    private List<Schedule> buildCandidates(List<ScheduleSlot> slots, int capacity, Section excluded, List<Schedule> additionalOccupiedSchedules) {
        List<Schedule> candidates = new ArrayList<>();
        Set<String> ownIds = excluded == null
                ? Set.of()
                : excluded.getSchedules().stream().map(Schedule::getId).collect(Collectors.toSet());

        List<Schedule> allDbSchedules = scheduleRepository.findAll().stream()
                .filter(s -> !ownIds.contains(s.getId()))
                .toList();

        for (ScheduleSlot slot : slots) {
            if (slot.day() == null)
                throw new IllegalArgumentException("Day must be selected for all slots");
            if (slot.startTime() == null || slot.endTime() == null)
                throw new IllegalArgumentException("Time is required for all slots");
            if (!slot.startTime().isBefore(slot.endTime()))
                throw new IllegalArgumentException("Start time must be before end time for all slots");

            RoomType requiredType = slot.slotType() != null ? slot.slotType() : RoomType.LECTURE;
            Room room;

            if (slot.roomId() != null && !slot.roomId().isBlank() && !"AUTO".equalsIgnoreCase(slot.roomId())) {
                room = roomRepository.findById(slot.roomId())
                        .orElseThrow(() -> new NotFoundException("Room not found: " + slot.roomId()));
                if (!room.isActive()) {
                    throw new IllegalArgumentException("Selected room " + room.getRoomName() + " is inactive");
                }
                if (capacity > room.getCapacity()) {
                    throw new IllegalArgumentException(
                            "Section capacity (" + capacity + ") exceeds the capacity of room "
                                    + room.getRoomName() + " (" + room.getCapacity() + ")");
                }
            } else {
                room = allocateBestFitRoom(slot.day(), slot.startTime(), slot.endTime(), requiredType, capacity,
                        allDbSchedules, candidates, additionalOccupiedSchedules);
            }

            Schedule schedule = new Schedule();
            schedule.setDay(slot.day());
            schedule.setStartTime(slot.startTime());
            schedule.setEndTime(slot.endTime());
            schedule.setRoom(room);
            schedule.setSlotType(slot.slotType() != null ? slot.slotType() : room.getRoomType());
            candidates.add(schedule);
        }

        // Check for self-overlap within the candidate slots
        for (int i = 0; i < candidates.size(); i++) {
            for (int j = i + 1; j < candidates.size(); j++) {
                Schedule s1 = candidates.get(i);
                Schedule s2 = candidates.get(j);
                if (s1.overlapsWith(s2)) {
                    throw new IllegalArgumentException(
                            "Schedule slots within the same section cannot overlap in time on " + s1.getDay()
                                    + " (" + s1.getStartTime() + "–" + s1.getEndTime() + " vs "
                                    + s2.getStartTime() + "–" + s2.getEndTime() + ")");
                }
            }
        }

        return candidates;
    }

    private Room allocateBestFitRoom(Schedule.Day day, LocalTime startTime, LocalTime endTime,
                                     RoomType requiredType, int capacity,
                                     List<Schedule> allDbSchedules,
                                     List<Schedule> sectionCandidates,
                                     List<Schedule> additionalOccupiedSchedules) {
        Set<String> occupiedRoomIds = new HashSet<>();

        for (Schedule s : allDbSchedules) {
            if (s.getDay() == day && startTime.isBefore(s.getEndTime()) && s.getStartTime().isBefore(endTime)) {
                occupiedRoomIds.add(s.getRoom().getId());
            }
        }
        for (Schedule s : sectionCandidates) {
            if (s.getDay() == day && startTime.isBefore(s.getEndTime()) && s.getStartTime().isBefore(endTime)) {
                occupiedRoomIds.add(s.getRoom().getId());
            }
        }
        if (additionalOccupiedSchedules != null) {
            for (Schedule s : additionalOccupiedSchedules) {
                if (s.getDay() == day && startTime.isBefore(s.getEndTime()) && s.getStartTime().isBefore(endTime)) {
                    occupiedRoomIds.add(s.getRoom().getId());
                }
            }
        }

        List<Room> activeMatchingRooms = roomRepository.findByIsActiveTrueAndRoomType(requiredType);
        return activeMatchingRooms.stream()
                .filter(r -> r.getCapacity() >= capacity)
                .filter(r -> !occupiedRoomIds.contains(r.getId()))
                .min(Comparator.comparingInt((Room r) -> r.getCapacity() - capacity)
                        .thenComparing(Room::getRoomName))
                .orElseThrow(() -> new IllegalStateException(
                        "No available " + requiredType + " room found with capacity >= " + capacity
                                + " for " + day + " " + startTime + "–" + endTime));
    }

    /** Room clashes against every other schedule; faculty clashes against the faculty's other sections. */
    private void checkConflicts(List<Schedule> candidates, String facultyId, Section excluded, List<Schedule> additionalBatchSchedules) {
        Set<String> ownIds = excluded == null
                ? Set.of()
                : excluded.getSchedules().stream().map(Schedule::getId).collect(Collectors.toSet());

        List<Schedule> others = new ArrayList<>(scheduleRepository.findAll().stream()
                .filter(s -> !ownIds.contains(s.getId()))
                .toList());
        if (additionalBatchSchedules != null) {
            others.addAll(additionalBatchSchedules);
        }

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
                                    + " in room " + candidate.getRoom().getRoomName() + ": room already booked");
            }
            for (Schedule existing : facultySchedules) {
                if (candidate.overlapsWith(existing))
                    throw new IllegalStateException(
                            "Faculty conflict on " + candidate.getDay() + " "
                                    + candidate.getStartTime() + "–" + candidate.getEndTime()
                                    + ": faculty already assigned to another section");
            }
        }
    }

    // ── Bulk Section Operations ───────────────────────────────────────────────

    public BulkValidationResponse validateBulkSections(List<SectionRequest> requests) {
        if (requests == null || requests.isEmpty()) {
            return new BulkValidationResponse(false, List.of(), List.of("No sections provided for validation"));
        }

        List<BulkValidationItem> items = new ArrayList<>();
        List<String> globalErrors = new ArrayList<>();
        List<Schedule> batchAllocatedSchedules = new ArrayList<>();
        Map<String, List<Schedule>> batchFacultySchedules = new HashMap<>();
        Set<String> seenSubjectAndCode = new HashSet<>();

        for (int i = 0; i < requests.size(); i++) {
            SectionRequest req = requests.get(i);
            List<String> errors = new ArrayList<>();
            List<ScheduleDto> allocatedDtoList = new ArrayList<>();

            if (req.subjectCode() == null || req.subjectCode().isBlank()) {
                errors.add("Subject is required");
            }
            if (req.facultyId() == null || req.facultyId().isBlank()) {
                errors.add("Faculty is required");
            }
            if (req.capacity() <= 0) {
                errors.add("Capacity must be greater than 0");
            }
            if (req.schedules() == null || req.schedules().isEmpty()) {
                errors.add("At least one schedule slot is required");
            }

            Subject subject = null;
            if (req.subjectCode() != null && !req.subjectCode().isBlank()) {
                subject = subjectRepository.findBySubjectCode(req.subjectCode()).orElse(null);
                if (subject == null) {
                    errors.add("Subject not found: " + req.subjectCode());
                }
            }

            Faculty faculty = null;
            if (req.facultyId() != null && !req.facultyId().isBlank()) {
                faculty = facultyRepository.findById(req.facultyId()).orElse(null);
                if (faculty == null) {
                    errors.add("Faculty not found");
                }
            }

            if (subject != null && faculty != null) {
                final String targetFacultyId = faculty.getId();
                if (subject.getAssignedFaculties() == null || subject.getAssignedFaculties().stream().noneMatch(f -> f.getId().equals(targetFacultyId))) {
                    errors.add("Faculty " + faculty.getName() + " is not assigned to teach subject " + subject.getSubjectCode());
                }
            }

            String sectionCode = req.sectionCode() != null && !req.sectionCode().isBlank()
                    ? req.sectionCode().trim().toUpperCase()
                    : (subject != null ? generateSectionCode(subject.getCourse()) : "TBD");

            if (subject != null) {
                String pairKey = subject.getSubjectCode() + "::" + sectionCode;
                if (seenSubjectAndCode.contains(pairKey)) {
                    errors.add("Duplicate section code '" + sectionCode + "' within this block for subject " + subject.getSubjectCode());
                } else {
                    seenSubjectAndCode.add(pairKey);
                }

                if (sectionRepository.existsBySectionCodeAndSubject_SubjectCode(sectionCode, subject.getSubjectCode())) {
                    errors.add("Section code '" + sectionCode + "' already exists in database for subject " + subject.getSubjectCode());
                }
            }

            List<ScheduleSlot> slots = (req.schedules() != null)
                    ? req.schedules().stream()
                            .map(s -> new ScheduleSlot(s.day(), s.startTime(), s.endTime(), s.roomId(), s.slotType()))
                            .toList()
                    : List.of();

            if (errors.isEmpty() && faculty != null) {
                try {
                    List<Schedule> candidates = buildCandidates(slots, req.capacity(), null, batchAllocatedSchedules);

                    List<Schedule> facultyBatch = batchFacultySchedules.getOrDefault(faculty.getId(), List.of());
                    checkConflicts(candidates, faculty.getId(), null, batchAllocatedSchedules);
                    for (Schedule c : candidates) {
                        for (Schedule fb : facultyBatch) {
                            if (c.overlapsWith(fb)) {
                                throw new IllegalStateException("Faculty conflict on " + c.getDay() + " "
                                        + c.getStartTime() + "–" + c.getEndTime()
                                        + ": faculty already assigned to another section in this block");
                            }
                        }
                    }

                    batchAllocatedSchedules.addAll(candidates);
                    batchFacultySchedules.computeIfAbsent(faculty.getId(), k -> new ArrayList<>()).addAll(candidates);
                    allocatedDtoList = candidates.stream().map(DtoMapper::schedule).toList();
                } catch (Exception e) {
                    errors.add(e.getMessage());
                }
            }

            items.add(new BulkValidationItem(
                    req.subjectCode(),
                    sectionCode,
                    errors.isEmpty(),
                    errors,
                    allocatedDtoList
            ));
        }

        boolean valid = globalErrors.isEmpty() && items.stream().allMatch(BulkValidationItem::valid);
        return new BulkValidationResponse(valid, items, globalErrors);
    }

    @Transactional
    public List<Section> createBulkSections(List<SectionRequest> requests) {
        if (requests == null || requests.isEmpty()) {
            throw new IllegalArgumentException("No sections provided");
        }

        BulkValidationResponse validation = validateBulkSections(requests);
        if (!validation.valid()) {
            String allErrors = validation.items().stream()
                    .filter(it -> !it.valid())
                    .map(it -> it.subjectCode() + " (" + it.sectionCode() + "): " + String.join(", ", it.errors()))
                    .collect(Collectors.joining("; "));
            throw new IllegalStateException("Validation failed: " + allErrors);
        }

        List<Section> createdSections = new ArrayList<>();
        List<Schedule> batchAllocatedSchedules = new ArrayList<>();

        for (SectionRequest req : requests) {
            Subject subject = subjectRepository.findBySubjectCode(req.subjectCode())
                    .orElseThrow(() -> new NotFoundException("Subject not found: " + req.subjectCode()));
            Faculty faculty = facultyRepository.findById(req.facultyId())
                    .orElseThrow(() -> new NotFoundException("Faculty not found"));

            String sectionCode = req.sectionCode() != null && !req.sectionCode().isBlank()
                    ? req.sectionCode().trim().toUpperCase()
                    : generateSectionCode(subject.getCourse());

            List<ScheduleSlot> slots = req.schedules().stream()
                    .map(s -> new ScheduleSlot(s.day(), s.startTime(), s.endTime(), s.roomId(), s.slotType()))
                    .toList();

            List<Schedule> candidates = buildCandidates(slots, req.capacity(), null, batchAllocatedSchedules);
            checkConflicts(candidates, faculty.getId(), null, batchAllocatedSchedules);

            Section section = new Section();
            section.setSectionCode(sectionCode);
            section.setSubject(subject);
            section.setFaculty(faculty);
            section.setCapacity(req.capacity());
            section.setCurrentCount(0);

            scheduleRepository.saveAll(candidates);
            section.getSchedules().addAll(candidates);
            Section saved = sectionRepository.save(section);

            batchAllocatedSchedules.addAll(candidates);
            createdSections.add(saved);
        }

        return createdSections;
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
