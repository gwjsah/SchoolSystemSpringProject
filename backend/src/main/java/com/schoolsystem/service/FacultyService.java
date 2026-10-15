package com.schoolsystem.service;

import com.schoolsystem.dto.DtoMapper;
import com.schoolsystem.dto.Requests.FacultyCreateRequest;
import com.schoolsystem.dto.Requests.FacultyUpdateRequest;
import com.schoolsystem.dto.Responses.FacultyDetailDto;
import com.schoolsystem.dto.Responses.SectionDto;
import com.schoolsystem.dto.Responses.SubjectDto;
import com.schoolsystem.entity.Department;
import com.schoolsystem.entity.Faculty;
import com.schoolsystem.entity.Section;
import com.schoolsystem.entity.Subject;
import com.schoolsystem.exception.ConflictException;
import com.schoolsystem.exception.NotFoundException;
import com.schoolsystem.repository.AccountRepository;
import com.schoolsystem.repository.DepartmentRepository;
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
    private final DepartmentRepository departmentRepository;
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
                .filter(f -> dept.isBlank() || (f.getDepartment() != null &&
                        (f.getDepartment().getCode().toLowerCase().contains(dept) ||
                         f.getDepartment().getName().toLowerCase().contains(dept))))
                .filter(f -> {
                    if (q.isBlank()) return true;
                    String name = f.getName() != null ? f.getName().toLowerCase() : "";
                    String email = f.getEmail() != null ? f.getEmail().toLowerCase() : "";
                    String emp = f.getEmployeeNumber() != null ? f.getEmployeeNumber().toLowerCase() : "";
                    String dCode = f.getDepartment() != null ? f.getDepartment().getCode().toLowerCase() : "";
                    String dName = f.getDepartment() != null ? f.getDepartment().getName().toLowerCase() : "";
                    String pos = f.getPosition() != null ? f.getPosition().toLowerCase() : "";
                    return name.contains(q) || email.contains(q) || emp.contains(q) || dCode.contains(q) || dName.contains(q) || pos.contains(q);
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

        Department dept = resolveDepartment(req.departmentId(), req.department());

        Faculty f = new Faculty();
        f.setName(req.name().trim());
        f.setEmail(email);
        f.setPassword(passwordEncoder.encode(req.password()));
        f.setContactNumber(req.contactNumber() != null ? req.contactNumber().trim() : null);
        f.setEmployeeNumber(employeeNumber);
        f.setDepartment(dept);
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

        Department targetDept = resolveDepartment(req.departmentId(), req.department());
        if (f.getDepartment() != null && !f.getDepartment().getId().equals(targetDept.getId())) {
            // Guard: check if assigned to subjects in the current department
            List<Subject> currentSubjects = subjectRepository.findByAssignedFaculties_Id(f.getId());
            if (!currentSubjects.isEmpty()) {
                throw new ConflictException(String.format(
                        "Cannot transfer faculty %s to department '%s' because they are assigned to teach %d subject(s) in department '%s'. Reassign or remove those subject assignments first.",
                        f.getName(), targetDept.getName(), currentSubjects.size(), f.getDepartment().getName()
                ));
            }
        }

        f.setName(req.name().trim());
        f.setEmail(email);
        f.setContactNumber(req.contactNumber() != null ? req.contactNumber().trim() : null);
        f.setDepartment(targetDept);
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

        Department d = f.getDepartment();

        return new FacultyDetailDto(
                f.getId(),
                f.getName(),
                f.getEmail(),
                f.getContactNumber(),
                f.getEmployeeNumber(),
                d != null ? d.getName() : null,
                d != null ? d.getId() : null,
                d != null ? d.getCode() : null,
                f.getPosition(),
                assignedSubjects,
                sections
        );
    }

    private Department resolveDepartment(String deptId, String deptNameOrCode) {
        if (deptId != null && !deptId.isBlank()) {
            return departmentRepository.findById(deptId.trim())
                    .orElseThrow(() -> new NotFoundException("Department not found with ID: " + deptId));
        }
        if (deptNameOrCode != null && !deptNameOrCode.isBlank()) {
            String trimmed = deptNameOrCode.trim();
            return departmentRepository.findByCodeIgnoreCase(trimmed)
                    .or(() -> departmentRepository.findByNameIgnoreCase(trimmed))
                    .orElseThrow(() -> new NotFoundException("Department not found: " + trimmed));
        }
        throw new IllegalArgumentException("Department is required.");
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
