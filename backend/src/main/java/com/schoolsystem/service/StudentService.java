package com.schoolsystem.service;

import com.schoolsystem.dto.DtoMapper;
import com.schoolsystem.dto.Requests.AdmissionApplicationRequest;
import com.schoolsystem.dto.Requests.StudentCreateRequest;
import com.schoolsystem.dto.Requests.StudentProfileUpdateRequest;
import com.schoolsystem.dto.Requests.StudentUpdateRequest;
import com.schoolsystem.dto.Responses.AdmissionApplicationResponse;
import com.schoolsystem.dto.Responses.AdmissionStatusResponse;
import com.schoolsystem.dto.Responses.StudentDto;
import com.schoolsystem.entity.Student;
import com.schoolsystem.entity.enums.AdmissionStatus;
import com.schoolsystem.exception.NotFoundException;
import com.schoolsystem.repository.AccountRepository;
import com.schoolsystem.repository.StudentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.Year;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class StudentService {

    private final StudentRepository studentRepository;
    private final AccountRepository accountRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public AdmissionApplicationResponse applyForAdmission(AdmissionApplicationRequest req) {
        String email = req.email().trim().toLowerCase();
        if (accountRepository.findByEmailIgnoreCase(email).isPresent()) {
            throw new IllegalArgumentException("An account with this email address already exists.");
        }

        String applicationNumber = generateApplicationNumber();

        Student student = new Student();
        student.setName(req.name().trim());
        student.setEmail(email);
        student.setPassword(passwordEncoder.encode(req.password()));
        student.setContactNumber(req.contactNumber().trim());
        student.setCourse(req.course().trim());
        student.setYearLevel(req.yearLevel() != null && req.yearLevel() > 0 ? req.yearLevel() : 1);
        student.setAdmissionStatus(AdmissionStatus.PENDING);
        student.setApplicationNumber(applicationNumber);
        student.setStudentNumber(applicationNumber); // temporary until admitted
        student.setDateOfBirth(req.dateOfBirth());
        student.setGender(req.gender());
        student.setCivilStatus(req.civilStatus());
        student.setNationality(req.nationality());
        student.setAddress(req.address());
        student.setEmergencyContactName(req.emergencyContactName());
        student.setEmergencyContactRelationship(req.emergencyContactRelationship());
        student.setEmergencyContactPhone(req.emergencyContactPhone());
        student.setPreviousSchool(req.previousSchool());
        student.setYearGraduated(req.yearGraduated());
        student.setPreviousTrack(req.previousTrack());
        student.setSubmittedAt(LocalDateTime.now());
        student.setHasPendingBalance(false);
        student.setEnrollmentConfirmed(false);

        Student saved = studentRepository.save(student);

        return new AdmissionApplicationResponse(
                saved.getId(),
                saved.getApplicationNumber(),
                saved.getName(),
                saved.getEmail(),
                saved.getCourse(),
                saved.getAdmissionStatus(),
                saved.getSubmittedAt(),
                "Admission application submitted successfully. Please wait for the school administration's review."
        );
    }

    @Transactional(readOnly = true)
    public AdmissionStatusResponse checkAdmissionStatus(String email) {
        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException("Email address is required");
        }
        Student student = studentRepository.findByEmailIgnoreCase(email.trim().toLowerCase())
                .orElseThrow(() -> new NotFoundException("No admission application found with email: " + email));

        String officialNumber = student.getAdmissionStatus() == AdmissionStatus.ADMITTED ? student.getStudentNumber() : null;

        return new AdmissionStatusResponse(
                student.getApplicationNumber(),
                student.getName(),
                student.getEmail(),
                student.getCourse(),
                student.getAdmissionStatus(),
                officialNumber,
                student.getSubmittedAt(),
                student.getReviewedAt(),
                student.getRejectionReason()
        );
    }

    @Transactional(readOnly = true)
    public List<StudentDto> getAllStudents(String search, String course, Integer yearLevel, AdmissionStatus status) {
        String q = search == null ? "" : search.trim().toLowerCase();

        return studentRepository.findAll().stream()
                .filter(s -> status == null || s.getAdmissionStatus() == status)
                .filter(s -> course == null || course.isBlank() || s.getCourse().equalsIgnoreCase(course.trim()))
                .filter(s -> yearLevel == null || s.getYearLevel() == yearLevel)
                .filter(s -> {
                    if (q.isBlank()) return true;
                    String name = s.getName() != null ? s.getName().toLowerCase() : "";
                    String email = s.getEmail() != null ? s.getEmail().toLowerCase() : "";
                    String num = s.getStudentNumber() != null ? s.getStudentNumber().toLowerCase() : "";
                    String app = s.getApplicationNumber() != null ? s.getApplicationNumber().toLowerCase() : "";
                    String c = s.getCourse() != null ? s.getCourse().toLowerCase() : "";
                    return name.contains(q) || email.contains(q) || num.contains(q) || app.contains(q) || c.contains(q);
                })
                .sorted(Comparator.comparing(Student::getSubmittedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(DtoMapper::student)
                .toList();
    }

    @Transactional(readOnly = true)
    public StudentDto getStudentById(String id) {
        Student student = studentRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Student not found"));
        return DtoMapper.student(student);
    }

    @Transactional
    public StudentDto admitStudent(String id, String adminName) {
        Student student = studentRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Student not found"));

        if (student.getStudentNumber() == null || student.getStudentNumber().startsWith("APP-")) {
            student.setStudentNumber(generateOfficialStudentNumber());
        }

        student.setAdmissionStatus(AdmissionStatus.ADMITTED);
        student.setReviewedAt(LocalDateTime.now());
        student.setReviewedBy(adminName != null ? adminName : "Administrator");
        student.setRejectionReason(null);

        return DtoMapper.student(studentRepository.save(student));
    }

    @Transactional
    public StudentDto rejectStudent(String id, String adminName, String reason) {
        Student student = studentRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Student not found"));

        student.setAdmissionStatus(AdmissionStatus.REJECTED);
        student.setReviewedAt(LocalDateTime.now());
        student.setReviewedBy(adminName != null ? adminName : "Administrator");
        student.setRejectionReason(reason != null && !reason.isBlank() ? reason.trim() : "Application requirements not met.");

        return DtoMapper.student(studentRepository.save(student));
    }

    @Transactional
    public StudentDto createStudent(StudentCreateRequest req) {
        String email = req.email().trim().toLowerCase();
        if (accountRepository.findByEmailIgnoreCase(email).isPresent()) {
            throw new IllegalArgumentException("An account with this email already exists.");
        }

        String studentNumber = (req.studentNumber() != null && !req.studentNumber().isBlank())
                ? req.studentNumber().trim()
                : generateOfficialStudentNumber();

        if (studentRepository.existsByStudentNumber(studentNumber)) {
            throw new IllegalArgumentException("Student number already exists: " + studentNumber);
        }

        Student student = new Student();
        student.setName(req.name().trim());
        student.setEmail(email);
        student.setPassword(passwordEncoder.encode(req.password()));
        student.setContactNumber(req.contactNumber().trim());
        student.setStudentNumber(studentNumber);
        student.setApplicationNumber(generateApplicationNumber());
        student.setCourse(req.course().trim());
        student.setYearLevel(req.yearLevel() != null && req.yearLevel() > 0 ? req.yearLevel() : 1);
        student.setAdmissionStatus(AdmissionStatus.ADMITTED);
        student.setReviewedAt(LocalDateTime.now());
        student.setReviewedBy("Administrator");
        student.setSubmittedAt(LocalDateTime.now());
        student.setHasPendingBalance(false);
        student.setEnrollmentConfirmed(false);
        student.setDateOfBirth(req.dateOfBirth());
        student.setGender(req.gender());
        student.setCivilStatus(req.civilStatus());
        student.setNationality(req.nationality());
        student.setAddress(req.address());
        student.setEmergencyContactName(req.emergencyContactName());
        student.setEmergencyContactRelationship(req.emergencyContactRelationship());
        student.setEmergencyContactPhone(req.emergencyContactPhone());
        student.setPreviousSchool(req.previousSchool());
        student.setYearGraduated(req.yearGraduated());
        student.setPreviousTrack(req.previousTrack());

        return DtoMapper.student(studentRepository.save(student));
    }

    @Transactional
    public StudentDto updateStudent(String id, StudentUpdateRequest req) {
        Student student = studentRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Student not found"));

        String email = req.email().trim().toLowerCase();
        if (!email.equalsIgnoreCase(student.getEmail()) && accountRepository.findByEmailIgnoreCase(email).isPresent()) {
            throw new IllegalArgumentException("An account with this email already exists.");
        }

        if (req.studentNumber() != null && !req.studentNumber().isBlank() && !req.studentNumber().equalsIgnoreCase(student.getStudentNumber())) {
            if (studentRepository.existsByStudentNumber(req.studentNumber().trim())) {
                throw new IllegalArgumentException("Student number already exists: " + req.studentNumber());
            }
            student.setStudentNumber(req.studentNumber().trim());
        }

        student.setName(req.name().trim());
        student.setEmail(email);
        student.setContactNumber(req.contactNumber().trim());
        student.setCourse(req.course().trim());
        if (req.yearLevel() != null && req.yearLevel() > 0) student.setYearLevel(req.yearLevel());
        if (req.admissionStatus() != null) student.setAdmissionStatus(req.admissionStatus());
        if (req.hasPendingBalance() != null) student.setHasPendingBalance(req.hasPendingBalance());
        if (req.enrollmentConfirmed() != null) student.setEnrollmentConfirmed(req.enrollmentConfirmed());

        student.setDateOfBirth(req.dateOfBirth());
        student.setGender(req.gender());
        student.setCivilStatus(req.civilStatus());
        student.setNationality(req.nationality());
        student.setAddress(req.address());
        student.setEmergencyContactName(req.emergencyContactName());
        student.setEmergencyContactRelationship(req.emergencyContactRelationship());
        student.setEmergencyContactPhone(req.emergencyContactPhone());
        student.setPreviousSchool(req.previousSchool());
        student.setYearGraduated(req.yearGraduated());
        student.setPreviousTrack(req.previousTrack());
        student.setRejectionReason(req.rejectionReason());

        return DtoMapper.student(studentRepository.save(student));
    }

    @Transactional
    public void deleteStudent(String id) {
        Student student = studentRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Student not found"));
        studentRepository.delete(student);
    }

    @Transactional(readOnly = true)
    public StudentDto getStudentProfile(String studentId) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new NotFoundException("Student profile not found"));
        return DtoMapper.student(student);
    }

    @Transactional
    public StudentDto updateStudentProfile(String studentId, StudentProfileUpdateRequest req) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new NotFoundException("Student profile not found"));

        student.setContactNumber(req.contactNumber().trim());
        student.setAddress(req.address());
        student.setEmergencyContactName(req.emergencyContactName());
        student.setEmergencyContactRelationship(req.emergencyContactRelationship());
        student.setEmergencyContactPhone(req.emergencyContactPhone());

        return DtoMapper.student(studentRepository.save(student));
    }

    private synchronized String generateApplicationNumber() {
        int year = Year.now().getValue();
        int maxSeq = 0;
        for (Student s : studentRepository.findAll()) {
            String app = s.getApplicationNumber();
            if (app != null && app.startsWith("APP-" + year + "-")) {
                try {
                    int seq = Integer.parseInt(app.substring(("APP-" + year + "-").length()));
                    if (seq > maxSeq) maxSeq = seq;
                } catch (NumberFormatException ignored) {}
            }
        }
        return String.format("APP-%d-%05d", year, maxSeq + 1);
    }

    private synchronized String generateOfficialStudentNumber() {
        int year = Year.now().getValue();
        int maxSeq = 0;
        for (Student s : studentRepository.findAll()) {
            String num = s.getStudentNumber();
            if (num != null && num.startsWith(year + "-") && !num.startsWith("APP-")) {
                try {
                    int seq = Integer.parseInt(num.substring((year + "-").length()));
                    if (seq > maxSeq) maxSeq = seq;
                } catch (NumberFormatException ignored) {}
            }
        }
        return String.format("%d-%05d", year, maxSeq + 1);
    }
}

