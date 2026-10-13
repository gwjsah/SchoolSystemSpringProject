package com.schoolsystem.service;

import com.schoolsystem.dto.DtoMapper;
import com.schoolsystem.dto.Requests.SubmitFacultyEvaluationRequest;
import com.schoolsystem.dto.Responses.FacultyEvaluationDto;
import com.schoolsystem.dto.Responses.FacultyEvaluationSummaryDto;
import com.schoolsystem.dto.Responses.StudentTeacherToEvaluateDto;
import com.schoolsystem.entity.Enrollment;
import com.schoolsystem.entity.EvaluationPeriod;
import com.schoolsystem.entity.Faculty;
import com.schoolsystem.entity.FacultyEvaluation;
import com.schoolsystem.entity.Section;
import com.schoolsystem.entity.Student;
import com.schoolsystem.entity.enums.Status;
import com.schoolsystem.exception.NotFoundException;
import com.schoolsystem.repository.EnrollmentRepository;
import com.schoolsystem.repository.EvaluationPeriodRepository;
import com.schoolsystem.repository.FacultyEvaluationRepository;
import com.schoolsystem.repository.FacultyRepository;
import com.schoolsystem.repository.SectionRepository;
import com.schoolsystem.repository.StudentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class EvaluationService {

    private final FacultyEvaluationRepository facultyEvaluationRepository;
    private final EvaluationPeriodRepository evaluationPeriodRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final StudentRepository studentRepository;
    private final FacultyRepository facultyRepository;
    private final SectionRepository sectionRepository;

    @Transactional(readOnly = true)
    public List<StudentTeacherToEvaluateDto> getStudentTeachersToEvaluate(String studentId) {
        List<Enrollment> enrollments = enrollmentRepository.findByStudent_Id(studentId).stream()
                .filter(e -> e.getStatus() != Status.DROPPED)
                .filter(e -> e.getSection() != null && e.getSection().getFaculty() != null)
                .toList();

        Optional<EvaluationPeriod> activePeriodOpt = evaluationPeriodRepository.findFirstByIsOpenTrueOrderByStartsAtDesc();
        if (activePeriodOpt.isPresent()) {
            EvaluationPeriod activePeriod = activePeriodOpt.get();
            List<Enrollment> matchingTermEnrollments = enrollments.stream()
                    .filter(e -> e.getSemester() == activePeriod.getSemester()
                            && e.getSchoolYear().equalsIgnoreCase(activePeriod.getSchoolYear()))
                    .toList();
            if (!matchingTermEnrollments.isEmpty()) {
                enrollments = matchingTermEnrollments;
            }
        }

        List<StudentTeacherToEvaluateDto> result = new ArrayList<>();
        for (Enrollment e : enrollments) {
            Section section = e.getSection();
            Faculty faculty = section.getFaculty();
            Optional<FacultyEvaluation> existing = facultyEvaluationRepository
                    .findByStudent_IdAndSection_Id(studentId, section.getId());

            result.add(new StudentTeacherToEvaluateDto(
                    faculty.getId(),
                    faculty.getName(),
                    faculty.getEmail(),
                    faculty.getDepartment(),
                    faculty.getPosition(),
                    faculty.getEmployeeNumber(),
                    section.getId(),
                    section.getSectionCode(),
                    section.getSubject() != null ? section.getSubject().getSubjectCode() : "",
                    section.getSubject() != null ? section.getSubject().getSubjectName() : "",
                    e.getSemester(),
                    e.getSchoolYear(),
                    existing.isPresent(),
                    existing.map(DtoMapper::facultyEvaluation).orElse(null)
            ));
        }

        return result;
    }

    @Transactional
    public FacultyEvaluationDto submitEvaluation(String studentId, SubmitFacultyEvaluationRequest req) {
        EvaluationPeriod activePeriod = evaluationPeriodRepository.findFirstByIsOpenTrueOrderByStartsAtDesc()
                .orElseThrow(() -> new IllegalStateException("Faculty evaluation period is not currently open."));

        LocalDateTime now = LocalDateTime.now();
        if (activePeriod.getStartsAt() != null && now.isBefore(activePeriod.getStartsAt())) {
            throw new IllegalStateException("Faculty evaluation period has not started yet.");
        }
        if (activePeriod.getEndsAt() != null && now.isAfter(activePeriod.getEndsAt())) {
            throw new IllegalStateException("Faculty evaluation period has already ended.");
        }

        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new NotFoundException("Student not found: " + studentId));

        Faculty faculty = facultyRepository.findById(req.facultyId())
                .orElseThrow(() -> new NotFoundException("Faculty not found: " + req.facultyId()));

        Section section = sectionRepository.findById(req.sectionId())
                .orElseThrow(() -> new NotFoundException("Section not found: " + req.sectionId()));

        // Verify student is enrolled in this section
        boolean enrolled = enrollmentRepository.findByStudent_Id(studentId).stream()
                .anyMatch(e -> e.getSection() != null && e.getSection().getId().equals(section.getId()) && e.getStatus() != Status.DROPPED);
        if (!enrolled) {
            throw new IllegalStateException("You are not enrolled in section " + section.getSectionCode());
        }

        if (facultyEvaluationRepository.existsByStudent_IdAndSection_Id(studentId, section.getId())) {
            throw new IllegalStateException("You have already submitted an evaluation for this section.");
        }

        FacultyEvaluation fe = new FacultyEvaluation();
        fe.setStudent(student);
        fe.setFaculty(faculty);
        fe.setSection(section);
        fe.setSemester(activePeriod.getSemester());
        fe.setSchoolYear(activePeriod.getSchoolYear());
        fe.setTeachingEffectiveness(req.teachingEffectiveness());
        fe.setSubjectKnowledge(req.subjectKnowledge());
        fe.setCommunication(req.communication());
        fe.setProfessionalism(req.professionalism());
        fe.setStudentEngagement(req.studentEngagement());
        fe.setComments(req.comments() != null ? req.comments().trim() : "");

        FacultyEvaluation saved = facultyEvaluationRepository.save(fe);
        return DtoMapper.facultyEvaluation(saved);
    }

    @Transactional(readOnly = true)
    public FacultyEvaluationSummaryDto getFacultyEvaluationSummary(String facultyId) {
        Faculty faculty = facultyRepository.findById(facultyId)
                .orElseThrow(() -> new NotFoundException("Faculty not found: " + facultyId));

        List<FacultyEvaluation> evaluations = facultyEvaluationRepository.findByFaculty_Id(facultyId);

        int total = evaluations.size();
        double avgTeaching = 0.0;
        double avgKnowledge = 0.0;
        double avgComm = 0.0;
        double avgProf = 0.0;
        double avgEngage = 0.0;
        double overallAvg = 0.0;

        Map<Integer, Long> scoreDistribution = new HashMap<>();
        for (int i = 1; i <= 5; i++) {
            scoreDistribution.put(i, 0L);
        }

        if (total > 0) {
            avgTeaching = evaluations.stream().mapToInt(FacultyEvaluation::getTeachingEffectiveness).average().orElse(0.0);
            avgKnowledge = evaluations.stream().mapToInt(FacultyEvaluation::getSubjectKnowledge).average().orElse(0.0);
            avgComm = evaluations.stream().mapToInt(FacultyEvaluation::getCommunication).average().orElse(0.0);
            avgProf = evaluations.stream().mapToInt(FacultyEvaluation::getProfessionalism).average().orElse(0.0);
            avgEngage = evaluations.stream().mapToInt(FacultyEvaluation::getStudentEngagement).average().orElse(0.0);
            overallAvg = (avgTeaching + avgKnowledge + avgComm + avgProf + avgEngage) / 5.0;

            for (FacultyEvaluation eval : evaluations) {
                int rounded = (int) Math.round(eval.getAverageScore());
                rounded = Math.max(1, Math.min(5, rounded));
                scoreDistribution.put(rounded, scoreDistribution.get(rounded) + 1);
            }
        }

        List<FacultyEvaluationDto> dtoList = evaluations.stream()
                .map(DtoMapper::facultyEvaluation)
                .toList();

        return new FacultyEvaluationSummaryDto(
                faculty.getId(),
                faculty.getName(),
                faculty.getEmployeeNumber(),
                faculty.getDepartment(),
                faculty.getPosition(),
                total,
                Math.round(overallAvg * 100.0) / 100.0,
                Math.round(avgTeaching * 100.0) / 100.0,
                Math.round(avgKnowledge * 100.0) / 100.0,
                Math.round(avgComm * 100.0) / 100.0,
                Math.round(avgProf * 100.0) / 100.0,
                Math.round(avgEngage * 100.0) / 100.0,
                scoreDistribution,
                dtoList
        );
    }
}

