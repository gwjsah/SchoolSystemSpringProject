package com.schoolsystem.service;

import com.schoolsystem.dto.DtoMapper;
import com.schoolsystem.dto.Requests.BulkSectionRequest;
import com.schoolsystem.dto.Requests.SectionRequest;
import com.schoolsystem.dto.Responses.BulkValidationItem;
import com.schoolsystem.dto.Responses.BulkValidationResponse;
import com.schoolsystem.dto.Responses.ScheduleDto;
import com.schoolsystem.entity.*;
import com.schoolsystem.entity.enums.RoomType;
import com.schoolsystem.exception.NotFoundException;
import com.schoolsystem.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SectionService {

    private final SectionRepository sectionRepository;
    private final SectionBlockRepository sectionBlockRepository;
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
        return createSection(null, null, null, null, subjectCode, facultyId, capacity, slots);
    }

    @Transactional
    public Section createSection(String sectionCode, String subjectCode, String facultyId,
                                 int capacity, List<ScheduleSlot> slots) {
        return createSection(sectionCode, null, null, null, subjectCode, facultyId, capacity, slots);
    }

    /**
     * Creates the schedules and the section in one transaction.
     * Links to or creates the SectionBlock.
     * Enforces:
     * - Faculty qualification
     * - Room capacity vs block capacity
     * - Room clash against all existing schedules
     * - Faculty clash against all schedules taught by faculty
     * - Block clash: no two classes in the same block can overlap in time
     */
    @Transactional
    public Section createSection(String sectionCode, String blockId, String courseCode, Integer yearLevel,
                                 String subjectCode, String facultyId, Integer capacity, List<ScheduleSlot> slots) {
        if (subjectCode == null || subjectCode.isBlank())
            throw new IllegalArgumentException("Subject cannot be empty");
        if (facultyId == null || facultyId.isBlank())
            throw new IllegalArgumentException("Faculty cannot be empty");
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

        // Resolve SectionBlock
        SectionBlock block;
        if (blockId != null && !blockId.isBlank()) {
            block = sectionBlockRepository.findById(blockId)
                    .orElseThrow(() -> new NotFoundException("Section block not found: " + blockId));
        } else if (sectionCode != null && !sectionCode.trim().isEmpty()) {
            String trimmedCode = sectionCode.trim().toUpperCase();
            String cCode = (courseCode != null && !courseCode.isBlank()) ? courseCode.trim().toUpperCase() : subject.getCourse();
            int yLevel = (yearLevel != null && yearLevel > 0) ? yearLevel : subject.getYearLevel();
            int cap = (capacity != null && capacity > 0) ? capacity : 35;

            Optional<SectionBlock> existingBlock = sectionBlockRepository
                    .findByCourseCodeIgnoreCaseAndYearLevelAndSectionCodeIgnoreCase(cCode, yLevel, trimmedCode);
            if (existingBlock.isPresent()) {
                block = existingBlock.get();
                if (capacity != null && capacity > 0 && block.getCapacity() != capacity) {
                    throw new IllegalStateException("Section block '" + trimmedCode + "' already exists for "
                            + cCode + " Year " + yLevel + " with capacity " + block.getCapacity()
                            + " (cannot create with capacity " + capacity + ")");
                }
            } else {
                block = new SectionBlock(trimmedCode, cCode, yLevel, cap);
                block = sectionBlockRepository.save(block);
            }
        } else {
            String cCode = subject.getCourse();
            int yLevel = subject.getYearLevel();
            String genCode = generateSectionCode(cCode, yLevel);
            int cap = (capacity != null && capacity > 0) ? capacity : 35;
            block = new SectionBlock(genCode, cCode, yLevel, cap);
            block = sectionBlockRepository.save(block);
        }

        // Validate subject uniqueness within this specific block
        if (sectionRepository.existsByBlock_IdAndSubject_SubjectCode(block.getId(), subject.getSubjectCode())) {
            throw new IllegalStateException("Section block '" + block.getSectionCode() + "' (Year " + block.getYearLevel()
                    + ") already contains a class for subject " + subject.getSubjectCode());
        }

        int effectiveCapacity = block.getCapacity();
        List<Schedule> candidates = buildCandidates(slots, effectiveCapacity, null, null);

        // Conflict checking: Room clash, Faculty clash, and Block-internal clash
        checkConflicts(candidates, facultyId, block, null, null);

        Section section = new Section();
        section.setBlock(block);
        section.setSubject(subject);
        section.setFaculty(faculty);
        section.setCurrentCount(0);

        for (Schedule s : candidates) {
            s.setSection(section);
        }

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
        if (slots == null || slots.isEmpty())
            throw new IllegalArgumentException("At least one schedule slot is required");

        Section section = findSection(sectionId);
        Faculty faculty = facultyRepository.findById(facultyId)
                .orElseThrow(() -> new NotFoundException("Faculty not found"));

        Subject subject = section.getSubject();
        if (subject != null && (subject.getAssignedFaculties() == null || subject.getAssignedFaculties().stream().noneMatch(f -> f.getId().equals(facultyId)))) {
            throw new IllegalStateException("Faculty " + faculty.getName() + " is not assigned to teach subject " + subject.getSubjectCode() + ". Please assign them on the Academic Subjects page first.");
        }

        SectionBlock block = section.getBlock();

        // If block capacity is updated and capacity was passed
        if (capacity > 0 && capacity != block.getCapacity()) {
            if (section.getCurrentCount() > capacity) {
                throw new IllegalStateException("Cannot reduce capacity to " + capacity + ": section already has " + section.getCurrentCount() + " enrolled students");
            }
            block.setCapacity(capacity);
            sectionBlockRepository.save(block);
        }

        if (sectionCode != null && !sectionCode.trim().isEmpty()) {
            String trimmed = sectionCode.trim().toUpperCase();
            if (!block.getSectionCode().equalsIgnoreCase(trimmed)) {
                // If the target block exists, move this section under it if subject isn't already in it
                Optional<SectionBlock> targetBlock = sectionBlockRepository.findBySectionCodeIgnoreCase(trimmed);
                if (targetBlock.isPresent()) {
                    SectionBlock tb = targetBlock.get();
                    if (sectionRepository.existsByBlock_SectionCodeIgnoreCaseAndSubject_SubjectCode(trimmed, subject.getSubjectCode())) {
                        throw new IllegalStateException("Target block '" + trimmed + "' already contains subject " + subject.getSubjectCode());
                    }
                    block = tb;
                    section.setBlock(block);
                } else {
                    // Update current block's code if only this class is in it or update name
                    block.setSectionCode(trimmed);
                    sectionBlockRepository.save(block);
                }
            }
        }

        List<Schedule> candidates = buildCandidates(slots, block.getCapacity(), section, null);
        checkConflicts(candidates, facultyId, block, section, null);

        List<Schedule> oldSchedules = new ArrayList<>(section.getSchedules());

        for (Schedule s : candidates) {
            s.setSection(section);
        }

        scheduleRepository.saveAll(candidates);
        section.setFaculty(faculty);
        section.getSchedules().clear();
        section.getSchedules().addAll(candidates);
        sectionRepository.save(section);

        scheduleRepository.deleteAll(oldSchedules);
        return section;
    }

    // ── Delete ────────────────────────────────────────────────────────────────

    /** Deletes a section and its schedules. Auto-deletes empty block if this was the last class. */
    @Transactional
    public void deleteSection(String sectionId) {
        deleteSection(sectionId, false);
    }

    @Transactional
    public void deleteSection(String sectionId, boolean force) {
        Section section = findSection(sectionId);
        SectionBlock block = section.getBlock();

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

        // Auto-delete empty block when last class is deleted (Option A)
        if (block != null && sectionRepository.countByBlock_Id(block.getId()) == 0) {
            sectionBlockRepository.delete(block);
        }
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

        // Check for self-overlap within the candidate slots of the same section
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

    /**
     * Checks conflicts:
     * 1. Room clash: no other schedule in the DB or current batch may book the same room at the same time.
     * 2. Faculty clash: faculty cannot teach another class at the same time.
     * 3. Block clash: classes within the SAME block cannot overlap in time on the same day (students take all classes!).
     */
    private void checkConflicts(List<Schedule> candidates, String facultyId, SectionBlock block, Section excluded, List<Schedule> additionalBatchSchedules) {
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
                .filter(s -> !ownIds.contains(s.getId()))
                .toList();

        // Schedules that belong to the same block
        List<Schedule> blockSchedules = (block != null && block.getId() != null)
                ? sectionRepository.findByBlock_Id(block.getId()).stream()
                    .filter(s -> excluded == null || !s.getId().equals(excluded.getId()))
                    .flatMap(s -> s.getSchedules().stream())
                    .filter(s -> !ownIds.contains(s.getId()))
                    .toList()
                : List.of();

        for (Schedule candidate : candidates) {
            // 1. Room clash
            for (Schedule existing : others) {
                if (candidate.hasConflict(existing))
                    throw new IllegalStateException(
                            "Room conflict on " + candidate.getDay() + " "
                                    + candidate.getStartTime() + "–" + candidate.getEndTime()
                                    + " in room " + candidate.getRoom().getRoomName() + ": room already booked");
            }

            // 2. Faculty clash
            for (Schedule existing : facultySchedules) {
                if (candidate.overlapsWith(existing))
                    throw new IllegalStateException(
                            "Faculty conflict on " + candidate.getDay() + " "
                                    + candidate.getStartTime() + "–" + candidate.getEndTime()
                                    + ": faculty already assigned to another section");
            }

            // 3. Block clash (classes within the same block cannot overlap in time)
            for (Schedule existing : blockSchedules) {
                if (candidate.overlapsWith(existing)) {
                    String existingSubj = (existing.getSection() != null && existing.getSection().getSubject() != null)
                            ? existing.getSection().getSubject().getSubjectCode() : "another class";
                    throw new IllegalStateException(
                            "Block schedule clash on " + candidate.getDay() + " "
                                    + candidate.getStartTime() + "–" + candidate.getEndTime()
                                    + ": clashes with " + existingSubj + " in the same block ("
                                    + (block != null ? block.getSectionCode() : "") + ")");
                }
            }
        }
    }

    // ── Bulk Section Operations ───────────────────────────────────────────────

    public BulkValidationResponse validateBulkSections(BulkSectionRequest bulkReq) {
        if (bulkReq == null || bulkReq.sections() == null || bulkReq.sections().isEmpty()) {
            return new BulkValidationResponse(false, List.of(), List.of("No sections provided for validation"));
        }

        List<SectionRequest> requests = bulkReq.sections();
        List<BulkValidationItem> items = new ArrayList<>();
        List<String> globalErrors = new ArrayList<>();
        List<Schedule> batchAllocatedSchedules = new ArrayList<>();
        Map<String, List<Schedule>> batchFacultySchedules = new HashMap<>();
        Set<String> seenSubjectAndCode = new HashSet<>();

        String blockCode = (bulkReq.blockCode() != null && !bulkReq.blockCode().isBlank())
                ? bulkReq.blockCode().trim().toUpperCase() : null;
        int blockCapacity = (bulkReq.capacity() != null && bulkReq.capacity() > 0)
                ? bulkReq.capacity() : 35;

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

            int rowCap = (req.capacity() != null && req.capacity() > 0) ? req.capacity() : blockCapacity;
            if (rowCap <= 0) {
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

            String effectiveCourse = bulkReq.courseCode() != null && !bulkReq.courseCode().isBlank()
                    ? bulkReq.courseCode().trim().toUpperCase()
                    : (subject != null ? subject.getCourse() : "BSCS");
            int effectiveYear = bulkReq.yearLevel() != null && bulkReq.yearLevel() > 0
                    ? bulkReq.yearLevel()
                    : (subject != null ? subject.getYearLevel() : 1);

            String sectionCode = blockCode != null
                    ? blockCode
                    : (req.sectionCode() != null && !req.sectionCode().isBlank()
                        ? req.sectionCode().trim().toUpperCase()
                        : (subject != null ? generateSectionCode(subject.getCourse(), subject.getYearLevel()) : "TBD"));

            if (subject != null) {
                String pairKey = subject.getSubjectCode() + "::" + sectionCode;
                if (seenSubjectAndCode.contains(pairKey)) {
                    errors.add("Duplicate section code '" + sectionCode + "' within this block for subject " + subject.getSubjectCode());
                } else {
                    seenSubjectAndCode.add(pairKey);
                }

                Optional<SectionBlock> existingBlock = sectionBlockRepository
                        .findByCourseCodeIgnoreCaseAndYearLevelAndSectionCodeIgnoreCase(effectiveCourse, effectiveYear, sectionCode);
                if (existingBlock.isPresent()) {
                    if (sectionRepository.existsByBlock_IdAndSubject_SubjectCode(existingBlock.get().getId(), subject.getSubjectCode())) {
                        errors.add("Section block '" + sectionCode + "' (Year " + effectiveYear + ") already has a class for subject " + subject.getSubjectCode());
                    }
                    if (bulkReq.capacity() != null && bulkReq.capacity() > 0 && existingBlock.get().getCapacity() != bulkReq.capacity()) {
                        errors.add("Section block '" + sectionCode + "' already exists with capacity "
                                + existingBlock.get().getCapacity() + " (cannot create with capacity " + bulkReq.capacity() + ")");
                    }
                }
            }

            List<ScheduleSlot> slots = (req.schedules() != null)
                    ? req.schedules().stream()
                            .map(s -> new ScheduleSlot(s.day(), s.startTime(), s.endTime(), s.roomId(), s.slotType()))
                            .toList()
                    : List.of();

            if (errors.isEmpty() && faculty != null) {
                try {
                    List<Schedule> candidates = buildCandidates(slots, rowCap, null, batchAllocatedSchedules);

                    // Block clash validation across batch items
                    for (Schedule c : candidates) {
                        for (Schedule bAlloc : batchAllocatedSchedules) {
                            if (c.overlapsWith(bAlloc)) {
                                throw new IllegalStateException("Block schedule clash on " + c.getDay() + " "
                                        + c.getStartTime() + "–" + c.getEndTime()
                                        + ": overlaps with another subject class in this block");
                            }
                        }
                    }

                    // Faculty clash validation
                    List<Schedule> facultyBatch = batchFacultySchedules.getOrDefault(faculty.getId(), List.of());
                    checkConflicts(candidates, faculty.getId(), null, null, batchAllocatedSchedules);
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
    public List<Section> createBulkSections(BulkSectionRequest bulkReq) {
        if (bulkReq == null || bulkReq.sections() == null || bulkReq.sections().isEmpty()) {
            throw new IllegalArgumentException("No sections provided");
        }

        BulkValidationResponse validation = validateBulkSections(bulkReq);
        if (!validation.valid()) {
            String allErrors = validation.items().stream()
                    .filter(it -> !it.valid())
                    .map(it -> it.subjectCode() + " (" + it.sectionCode() + "): " + String.join(", ", it.errors()))
                    .collect(Collectors.joining("; "));
            throw new IllegalStateException("Validation failed: " + allErrors);
        }

        List<SectionRequest> requests = bulkReq.sections();
        List<Section> createdSections = new ArrayList<>();
        List<Schedule> batchAllocatedSchedules = new ArrayList<>();

        String blockCode = (bulkReq.blockCode() != null && !bulkReq.blockCode().isBlank())
                ? bulkReq.blockCode().trim().toUpperCase()
                : (requests.get(0).sectionCode() != null && !requests.get(0).sectionCode().isBlank()
                    ? requests.get(0).sectionCode().trim().toUpperCase()
                    : generateSectionCode("BSCS"));

        String courseCode = (bulkReq.courseCode() != null && !bulkReq.courseCode().isBlank())
                ? bulkReq.courseCode().trim().toUpperCase()
                : (requests.get(0).courseCode() != null ? requests.get(0).courseCode().trim().toUpperCase() : "BSCS");

        int yearLevel = (bulkReq.yearLevel() != null && bulkReq.yearLevel() > 0)
                ? bulkReq.yearLevel()
                : (requests.get(0).yearLevel() != null ? requests.get(0).yearLevel() : 1);

        int capacity = (bulkReq.capacity() != null && bulkReq.capacity() > 0)
                ? bulkReq.capacity()
                : (requests.get(0).capacity() != null && requests.get(0).capacity() > 0 ? requests.get(0).capacity() : 35);

        Optional<SectionBlock> existingBlockOpt = sectionBlockRepository
                .findByCourseCodeIgnoreCaseAndYearLevelAndSectionCodeIgnoreCase(courseCode, yearLevel, blockCode);

        SectionBlock block;
        if (existingBlockOpt.isPresent()) {
            block = existingBlockOpt.get();
            if (bulkReq.capacity() != null && bulkReq.capacity() > 0 && block.getCapacity() != capacity) {
                throw new IllegalStateException("Section block '" + blockCode + "' already exists for "
                        + courseCode + " Year " + yearLevel + " with capacity " + block.getCapacity()
                        + " (cannot create with capacity " + capacity + ")");
            }
        } else {
            SectionBlock newBlock = new SectionBlock(blockCode, courseCode, yearLevel, capacity);
            block = sectionBlockRepository.save(newBlock);
        }

        for (SectionRequest req : requests) {
            Subject subject = subjectRepository.findBySubjectCode(req.subjectCode())
                    .orElseThrow(() -> new NotFoundException("Subject not found: " + req.subjectCode()));
            Faculty faculty = facultyRepository.findById(req.facultyId())
                    .orElseThrow(() -> new NotFoundException("Faculty not found"));

            List<ScheduleSlot> slots = req.schedules().stream()
                    .map(s -> new ScheduleSlot(s.day(), s.startTime(), s.endTime(), s.roomId(), s.slotType()))
                    .toList();

            List<Schedule> candidates = buildCandidates(slots, block.getCapacity(), null, batchAllocatedSchedules);
            checkConflicts(candidates, faculty.getId(), block, null, batchAllocatedSchedules);

            Section section = new Section();
            section.setBlock(block);
            section.setSubject(subject);
            section.setFaculty(faculty);
            section.setCurrentCount(0);

            for (Schedule s : candidates) {
                s.setSection(section);
            }

            scheduleRepository.saveAll(candidates);
            section.getSchedules().addAll(candidates);
            Section saved = sectionRepository.save(section);

            batchAllocatedSchedules.addAll(candidates);
            createdSections.add(saved);
        }

        return createdSections;
    }

    /**
     * Prefix comes from the course sectionPrefix (e.g. "CS-F", "IT-G").
     * Uses highest existing number + 1 across SectionBlocks.
     */
    public String generateSectionCode(String courseCode) {
        return generateSectionCode(courseCode, 1);
    }

    public String generateSectionCode(String courseCode, int yearLevel) {
        Course course = courseRepository.findByCode(courseCode).orElse(null);
        String prefix = course != null ? course.getSectionPrefix() : courseCode + "-";

        int max = 0;
        for (SectionBlock b : sectionBlockRepository.findByCourseCodeIgnoreCaseAndYearLevelAndSectionCodeStartingWithIgnoreCase(courseCode, yearLevel, prefix)) {
            String suffix = b.getSectionCode().substring(prefix.length());
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
