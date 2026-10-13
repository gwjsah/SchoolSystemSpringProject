package com.schoolsystem.service;

import com.schoolsystem.dto.DtoMapper;
import com.schoolsystem.dto.Requests.FacultyCreateRequest;
import com.schoolsystem.dto.Requests.FacultyUpdateRequest;
import com.schoolsystem.dto.Responses.FacultyDetailDto;
import com.schoolsystem.dto.Responses.SectionDto;
import com.schoolsystem.dto.Responses.SubjectDto;
import com.schoolsystem.entity.Faculty;
import com.schoolsystem.entity.Section;
import com.schoolsystem.entity.Subject;
import com.schoolsystem.exception.NotFoundException;
import com.schoolsystem.repository.AccountRepository;
import com.schoolsystem.repository.FacultyRepository;
import com.schoolsystem.repository.SectionRepository;
import com.schoolsystem.repository.SubjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class FacultyService {

    private final FacultyRepository facultyRepository;
    private final AccountRepository accountRepository;
    private final SubjectRepository subjectRepository;
    private final SectionRepository sectionRepository;
    private final SectionService sectionService;
    private final PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public List<FacultyDetailDto> getAllFaculty(String search, String department) {
        String q = search == null ? "" : search.trim().toLowerCase();
        String dept = department == null ? "" : department.trim().toLowerCase();

        return facultyRepository.findAll().stream()
                .filter(f -> dept.isBlank() || (f.getDepartment() != null && f.getDepartment().toLowerCase().contains(dept)))
                .filter(f -> {
                    if (q.isBlank()) return true;
                    String name = f.getName() != null ? f.getName().toLowerCase() : "";
                    String email = f.getEmail() != null ? f.getEmail().toLowerCase() : "";
                    String emp = f.getEmployeeNumber() != null ? f.getEmployeeNumber().toLowerCase() : "";
                    String d = f.getDepartment() != null ? f.getDepartment().toLowerCase() : "";
                    String pos = f.getPosition() != null ? f.getPosition().toLowerCase() : "";
                    return name.contains(q) || email.contains(q) || emp.contains(q) || d.contains(q) || pos.contains(q);
                })
                .sorted(Comparator.comparing(Faculty::getName, String.CASE_INSENSITIVE_ORDER))
                .map(this::toDetailDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public FacultyDetailDto getFacultyById(String id) {
        Faculty faculty = facultyRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Faculty not found: " + id));
        return toDetailDto(faculty);
    }

    @Transactional
    public FacultyDetailDto createFaculty(FacultyCreateRequest req) {
        String email = req.email().trim().toLowerCase();
        if (accountRepository.findByEmailIgnoreCase(email).isPresent()) {
            throw new IllegalArgumentException("An account with this email address already exists.");
        }

        String employeeNumber = (req.employeeNumber() != null && !req.employeeNumber().isBlank())
                ? req.employeeNumber().trim()
                : generateEmployeeNumber();

        if (facultyRepository.existsByEmployeeNumber(employeeNumber)) {
            throw new IllegalArgumentException("Employee number already exists: " + employeeNumber);
        }

        Faculty f = new Faculty();
        f.setName(req.name().trim());
        f.setEmail(email);
        f.setPassword(passwordEncoder.encode(req.password()));
        f.setContactNumber(req.contactNumber() != null ? req.contactNumber().trim() : null);
        f.setEmployeeNumber(employeeNumber);
        f.setDepartment(req.department().trim());
        f.setPosition(req.position().trim());

        return toDetailDto(facultyRepository.save(f));
    }

    @Transactional
    public FacultyDetailDto updateFaculty(String id, FacultyUpdateRequest req) {
        Faculty f = facultyRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Faculty not found: " + id));

        String email = req.email().trim().toLowerCase();
        if (!email.equalsIgnoreCase(f.getEmail()) && accountRepository.findByEmailIgnoreCase(email).isPresent()) {
            throw new IllegalArgumentException("An account with this email address already exists.");
        }

        if (req.employeeNumber() != null && !req.employeeNumber().isBlank()) {
            String emp = req.employeeNumber().trim();
            if (facultyRepository.existsByEmployeeNumberAndIdNot(emp, id)) {
                throw new IllegalArgumentException("Employee number already exists: " + emp);
            }
            f.setEmployeeNumber(emp);
        }

        f.setName(req.name().trim());
        f.setEmail(email);
        f.setContactNumber(req.contactNumber() != null ? req.contactNumber().trim() : null);
        f.setDepartment(req.department().trim());
        f.setPosition(req.position().trim());

        if (req.password() != null && !req.password().isBlank()) {
            f.setPassword(passwordEncoder.encode(req.password().trim()));
        }

        return toDetailDto(facultyRepository.save(f));
    }

    @Transactional
    public void deleteFaculty(String id) {
        Faculty faculty = facultyRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Faculty not found: " + id));

        List<Section> sections = sectionRepository.findByFaculty_Id(id);
        if (!sections.isEmpty()) {
            throw new IllegalStateException("Cannot delete faculty member " + faculty.getName()
                    + " because they are assigned to " + sections.size() + " section(s). Please reassign or delete these sections first.");
        }

        List<Subject> subjects = subjectRepository.findByAssignedFaculties_Id(id);
        for (Subject s : subjects) {
            s.getAssignedFaculties().removeIf(f -> f.getId().equals(id));
            subjectRepository.save(s);
        }

        facultyRepository.delete(faculty);
    }

    public FacultyDetailDto toDetailDto(Faculty f) {
        List<SubjectDto> assignedSubjects = subjectRepository.findByAssignedFaculties_Id(f.getId())
                .stream()
                .map(DtoMapper::subject)
                .toList();

        List<SectionDto> sections = sectionService.getSectionsForFaculty(f.getId())
                .stream()
                .map(DtoMapper::section)
                .toList();

        return new FacultyDetailDto(
                f.getId(),
                f.getName(),
                f.getEmail(),
                f.getContactNumber(),
                f.getEmployeeNumber(),
                f.getDepartment(),
                f.getPosition(),
                assignedSubjects,
                sections
        );
    }

    private String generateEmployeeNumber() {
        long count = facultyRepository.count() + 101;
        String candidate = "FAC-" + count;
        while (facultyRepository.existsByEmployeeNumber(candidate)) {
            count++;
            candidate = "FAC-" + count;
        }
        return candidate;
    }
}

