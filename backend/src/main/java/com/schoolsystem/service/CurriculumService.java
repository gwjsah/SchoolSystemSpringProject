package com.schoolsystem.service;

import com.schoolsystem.dto.Requests;
import com.schoolsystem.dto.Responses;
import com.schoolsystem.entity.Course;
import com.schoolsystem.entity.CurriculumEntry;
import com.schoolsystem.entity.Subject;
import com.schoolsystem.entity.enums.Semester;
import com.schoolsystem.exception.NotFoundException;
import com.schoolsystem.repository.CourseRepository;
import com.schoolsystem.repository.CurriculumEntryRepository;
import com.schoolsystem.repository.SubjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
public class CurriculumService {

    private final CurriculumEntryRepository curriculumEntryRepository;
    private final CourseRepository courseRepository;
    private final SubjectRepository subjectRepository;

    @Transactional(readOnly = true)
    public Responses.CurriculumResponse getCurriculum(String courseCode) {
        String cleanCourse = courseCode.trim().toUpperCase();
        Course course = courseRepository.findByCode(cleanCourse)
                .orElseThrow(() -> new NotFoundException("Course not found: " + cleanCourse));

        List<CurriculumEntry> entries = curriculumEntryRepository
                .findByCourse_CodeIgnoreCaseOrderByYearLevelAscSemesterAsc(cleanCourse);

        // Group entries into Year + Semester terms
        Map<String, List<CurriculumEntry>> termMap = new LinkedHashMap<>();
        int maxYear = 4;
        for (int y = 1; y <= maxYear; y++) {
            termMap.put(y + "-FIRST", new ArrayList<>());
            termMap.put(y + "-SECOND", new ArrayList<>());
        }

        for (CurriculumEntry ce : entries) {
            String key = ce.getYearLevel() + "-" + ce.getSemester().name();
            termMap.computeIfAbsent(key, k -> new ArrayList<>()).add(ce);
        }

        List<Responses.CurriculumTermDto> termDtos = new ArrayList<>();
        int totalCurriculumUnits = 0;

        for (Map.Entry<String, List<CurriculumEntry>> entry : termMap.entrySet()) {
            String[] parts = entry.getKey().split("-");
            int year = Integer.parseInt(parts[0]);
            Semester sem = Semester.valueOf(parts[1]);

            List<Responses.CurriculumEntryDto> dtoList = entry.getValue().stream()
                    .map(this::toEntryDto)
                    .toList();

            int termUnits = dtoList.stream().mapToInt(Responses.CurriculumEntryDto::units).sum();
            int termLec = dtoList.stream().mapToInt(Responses.CurriculumEntryDto::lectureUnits).sum();
            int termLab = dtoList.stream().mapToInt(Responses.CurriculumEntryDto::labUnits).sum();
            totalCurriculumUnits += termUnits;

            termDtos.add(new Responses.CurriculumTermDto(year, sem, termUnits, termLec, termLab, dtoList));
        }

        List<String> advisoryWarnings = computeAdvisoryWarnings(entries);

        return new Responses.CurriculumResponse(
                course.getCode(),
                course.getName(),
                totalCurriculumUnits,
                termDtos,
                advisoryWarnings
        );
    }

    @Transactional
    public Responses.CurriculumEntryDto addEntry(Requests.CurriculumEntryRequest req) {
        String courseCode = req.courseCode().trim().toUpperCase();
        Course course = courseRepository.findByCode(courseCode)
                .orElseThrow(() -> new NotFoundException("Course not found: " + courseCode));

        String subjectCode = req.subjectCode().trim().toUpperCase();
        Subject subject = subjectRepository.findBySubjectCode(subjectCode)
                .orElseThrow(() -> new NotFoundException("Subject not found: " + subjectCode));

        if (curriculumEntryRepository.existsByCourse_IdAndSubject_Id(course.getId(), subject.getId())) {
            throw new IllegalArgumentException("Subject " + subjectCode + " is already in the curriculum for " + courseCode);
        }

        CurriculumEntry ce = new CurriculumEntry(course, subject, req.yearLevel(), req.semester());
        return toEntryDto(curriculumEntryRepository.save(ce));
    }

    @Transactional
    public Responses.CurriculumEntryDto updateEntry(String id, Requests.CurriculumEntryRequest req) {
        CurriculumEntry ce = curriculumEntryRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Curriculum entry not found: " + id));

        ce.setYearLevel(req.yearLevel());
        ce.setSemester(req.semester());

        return toEntryDto(curriculumEntryRepository.save(ce));
    }

    @Transactional
    public void deleteEntry(String id) {
        CurriculumEntry ce = curriculumEntryRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Curriculum entry not found: " + id));
        curriculumEntryRepository.delete(ce);
    }

    public Responses.CurriculumEntryDto toEntryDto(CurriculumEntry ce) {
        Subject s = ce.getSubject();
        Course c = ce.getCourse();
        return new Responses.CurriculumEntryDto(
                ce.getId(),
                c != null ? c.getCode() : null,
                c != null ? c.getName() : null,
                s != null ? s.getSubjectCode() : null,
                s != null ? s.getSubjectName() : null,
                s != null ? s.getUnits() : 0,
                s != null ? s.getLectureUnits() : 0,
                s != null ? s.getLabUnits() : 0,
                ce.getYearLevel(),
                ce.getSemester(),
                s != null && s.getDepartment() != null ? s.getDepartment().getCode() : null,
                s != null && s.getPrerequisites() != null ? List.copyOf(s.getPrerequisites()) : List.of()
        );
    }

    private List<String> computeAdvisoryWarnings(List<CurriculumEntry> entries) {
        List<String> warnings = new ArrayList<>();
        Map<String, Integer> termIndexMap = new HashMap<>();

        for (CurriculumEntry ce : entries) {
            if (ce.getSubject() != null) {
                int termIndex = ce.getYearLevel() * 10 + (ce.getSemester() == Semester.FIRST ? 1 : 2);
                termIndexMap.put(ce.getSubject().getSubjectCode().toUpperCase(), termIndex);
            }
        }

        for (CurriculumEntry ce : entries) {
            Subject s = ce.getSubject();
            if (s == null) continue;
            int termIndex = ce.getYearLevel() * 10 + (ce.getSemester() == Semester.FIRST ? 1 : 2);

            for (String prereqCode : s.getPrerequisites()) {
                String pCode = prereqCode.trim().toUpperCase();
                if (!termIndexMap.containsKey(pCode)) {
                    warnings.add("Advisory: Subject '" + s.getSubjectCode() + "' requires prerequisite '"
                            + pCode + "' which is not present in this curriculum.");
                } else {
                    int prereqTerm = termIndexMap.get(pCode);
                    if (prereqTerm >= termIndex) {
                        warnings.add("Advisory: Subject '" + s.getSubjectCode() + "' (Year " + ce.getYearLevel()
                                + " " + ce.getSemester() + ") has prerequisite '" + pCode
                                + "' scheduled in the same or later semester.");
                    }
                }
            }
        }

        return warnings;
    }
}

