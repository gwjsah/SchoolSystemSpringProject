package com.schoolsystem.service;

import com.schoolsystem.dto.Requests.SectionBlockRequest;
import com.schoolsystem.entity.Course;
import com.schoolsystem.entity.Room;
import com.schoolsystem.entity.Schedule;
import com.schoolsystem.entity.Section;
import com.schoolsystem.entity.SectionBlock;
import com.schoolsystem.exception.NotFoundException;
import com.schoolsystem.repository.CartItemRepository;
import com.schoolsystem.repository.CourseRepository;
import com.schoolsystem.repository.EnrollmentRepository;
import com.schoolsystem.repository.FacultyEvaluationRepository;
import com.schoolsystem.repository.GradeRepository;
import com.schoolsystem.repository.RoomRepository;
import com.schoolsystem.repository.ScheduleRepository;
import com.schoolsystem.repository.SectionBlockRepository;
import com.schoolsystem.repository.SectionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SectionBlockService {

    private final SectionBlockRepository sectionBlockRepository;
    private final SectionRepository sectionRepository;
    private final ScheduleRepository scheduleRepository;
    private final CourseRepository courseRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final CartItemRepository cartItemRepository;
    private final GradeRepository gradeRepository;
    private final FacultyEvaluationRepository facultyEvaluationRepository;

    @Transactional(readOnly = true)
    public List<SectionBlock> getAllBlocks() {
        return sectionBlockRepository.findAll();
    }

    @Transactional(readOnly = true)
    public SectionBlock getBlock(String id) {
        return sectionBlockRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Section block not found: " + id));
    }

    @Transactional(readOnly = true)
    public SectionBlock getBlockByCode(String code) {
        return sectionBlockRepository.findBySectionCodeIgnoreCase(code)
                .orElseThrow(() -> new NotFoundException("Section block not found: " + code));
    }

    @Transactional(readOnly = true)
    public SectionBlock lookupBlock(String courseCode, int yearLevel, String code) {
        if (courseCode == null || code == null || courseCode.isBlank() || code.isBlank()) {
            throw new IllegalArgumentException("Course code and section code are required for lookup");
        }
        String cCode = courseCode.trim().toUpperCase();
        String sCode = code.trim().toUpperCase();
        return sectionBlockRepository.findByCourseCodeIgnoreCaseAndYearLevelAndSectionCodeIgnoreCase(cCode, yearLevel, sCode)
                .orElseThrow(() -> new NotFoundException("Section " + sCode + " not found for " + cCode + " Year " + yearLevel));
    }

    @Transactional
    public SectionBlock createBlock(SectionBlockRequest request) {
        String code = request.sectionCode().trim().toUpperCase();
        String courseCode = request.courseCode().trim().toUpperCase();
        int yearLevel = request.yearLevel();

        if (sectionBlockRepository.existsByCourseCodeIgnoreCaseAndYearLevelAndSectionCodeIgnoreCase(courseCode, yearLevel, code)) {
            throw new IllegalStateException("Section " + code + " already exists for " + courseCode + " Year " + yearLevel);
        }

        SectionBlock block = new SectionBlock(
                code,
                courseCode,
                yearLevel,
                request.capacity()
        );
        return sectionBlockRepository.save(block);
    }

    @Transactional
    public SectionBlock updateBlock(String id, SectionBlockRequest request) {
        SectionBlock block = getBlock(id);
        String newCode = request.sectionCode().trim().toUpperCase();
        String newCourse = request.courseCode().trim().toUpperCase();
        int newYear = request.yearLevel();

        boolean identityChanged = !block.getSectionCode().equalsIgnoreCase(newCode)
                || !block.getCourseCode().equalsIgnoreCase(newCourse)
                || block.getYearLevel() != newYear;

        if (identityChanged) {
            sectionBlockRepository.findByCourseCodeIgnoreCaseAndYearLevelAndSectionCodeIgnoreCase(newCourse, newYear, newCode)
                    .ifPresent(existing -> {
                        if (!existing.getId().equals(id)) {
                            throw new IllegalStateException("Section " + newCode + " already exists for " + newCourse + " Year " + newYear);
                        }
                    });
            block.setSectionCode(newCode);
            block.setCourseCode(newCourse);
            block.setYearLevel(newYear);
        }

        int newCapacity = request.capacity();
        if (newCapacity <= 0 || newCapacity > 50) {
            throw new IllegalArgumentException("Capacity must be between 1 and 50");
        }

        // Validate that all sections in the block do not exceed new capacity
        for (Section sec : block.getSections()) {
            if (sec.getCurrentCount() > newCapacity) {
                throw new IllegalStateException("Cannot reduce block capacity to " + newCapacity
                        + ": section " + sec.getSubject().getSubjectCode()
                        + " already has " + sec.getCurrentCount() + " enrolled students.");
            }
            // Check that all assigned rooms can accommodate new capacity
            for (Schedule s : sec.getSchedules()) {
                Room r = s.getRoom();
                if (r != null && r.getCapacity() < newCapacity) {
                    throw new IllegalStateException("Cannot increase block capacity to " + newCapacity
                            + ": room " + r.getRoomName() + " has capacity " + r.getCapacity()
                            + " for schedule on " + s.getDay() + " " + s.getStartTime() + "–" + s.getEndTime());
                }
            }
        }

        block.setCapacity(newCapacity);

        return sectionBlockRepository.save(block);
    }

    @Transactional
    public void deleteBlock(String id, boolean force) {
        SectionBlock block = getBlock(id);
        List<Section> childSections = new ArrayList<>(block.getSections());

        for (Section sec : childSections) {
            String sectionId = sec.getId();
            if (!force) {
                if (sec.getCurrentCount() > 0) {
                    throw new IllegalStateException("Cannot delete block — section " + sec.getSubject().getSubjectCode()
                            + " has " + sec.getCurrentCount() + " enrolled student(s). Enable 'Force delete' to unenroll and remove.");
                }
                if (enrollmentRepository.existsBySection_Id(sectionId)) {
                    throw new IllegalStateException("Cannot delete block — section " + sec.getSubject().getSubjectCode()
                            + " still has enrollment records. Enable 'Force delete' to remove records.");
                }
                if (cartItemRepository.existsBySection_Id(sectionId)) {
                    throw new IllegalStateException("Cannot delete block — section " + sec.getSubject().getSubjectCode()
                            + " is currently in student cart(s). Enable 'Force delete' to remove.");
                }
            } else {
                cartItemRepository.deleteBySection_Id(sectionId);
                gradeRepository.deleteBySection_Id(sectionId);
                facultyEvaluationRepository.deleteBySection_Id(sectionId);
                enrollmentRepository.deleteBySection_Id(sectionId);
            }
        }

        sectionBlockRepository.delete(block);
    }
}

