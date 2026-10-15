package com.schoolsystem.service;

import com.schoolsystem.dto.Requests;
import com.schoolsystem.dto.Responses;
import com.schoolsystem.entity.Department;
import com.schoolsystem.exception.ConflictException;
import com.schoolsystem.exception.NotFoundException;
import com.schoolsystem.repository.CourseRepository;
import com.schoolsystem.repository.DepartmentRepository;
import com.schoolsystem.repository.FacultyRepository;
import com.schoolsystem.repository.SubjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class DepartmentService {

    private final DepartmentRepository departmentRepository;
    private final CourseRepository courseRepository;
    private final SubjectRepository subjectRepository;
    private final FacultyRepository facultyRepository;

    @Transactional(readOnly = true)
    public List<Responses.DepartmentDto> getAllDepartments() {
        return departmentRepository.findAll().stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public Responses.DepartmentDto getDepartment(String id) {
        Department d = departmentRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Department not found: " + id));
        return toDto(d);
    }

    @Transactional
    public Responses.DepartmentDto createDepartment(Requests.DepartmentRequest req) {
        String code = req.code().trim().toUpperCase();
        if (departmentRepository.findByCodeIgnoreCase(code).isPresent()) {
            throw new IllegalArgumentException("Department with code '" + code + "' already exists.");
        }

        Department d = new Department();
        d.setCode(code);
        d.setName(req.name().trim());
        d.setDescription(req.description() != null ? req.description().trim() : null);

        return toDto(departmentRepository.save(d));
    }

    @Transactional
    public Responses.DepartmentDto updateDepartment(String id, Requests.DepartmentRequest req) {
        Department d = departmentRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Department not found: " + id));

        String code = req.code().trim().toUpperCase();
        if (!d.getCode().equalsIgnoreCase(code) && departmentRepository.findByCodeIgnoreCase(code).isPresent()) {
            throw new IllegalArgumentException("Department with code '" + code + "' already exists.");
        }

        d.setCode(code);
        d.setName(req.name().trim());
        d.setDescription(req.description() != null ? req.description().trim() : null);

        return toDto(departmentRepository.save(d));
    }

    @Transactional
    public void deleteDepartment(String id) {
        Department d = departmentRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Department not found: " + id));

        long courseCount = courseRepository.findByDepartment_Id(id).size();
        long subjectCount = subjectRepository.findByDepartment_Id(id).size();
        long facultyCount = facultyRepository.findByDepartment_Id(id).size();

        if (courseCount > 0 || subjectCount > 0 || facultyCount > 0) {
            throw new ConflictException(String.format(
                    "Cannot delete department '%s' (%s). It still has %d course(s), %d subject(s), and %d faculty member(s) assigned. Reassign or remove them first.",
                    d.getName(), d.getCode(), courseCount, subjectCount, facultyCount
            ));
        }

        departmentRepository.delete(d);
    }

    public Responses.DepartmentDto toDto(Department d) {
        long courseCount = courseRepository.findByDepartment_Id(d.getId()).size();
        long subjectCount = subjectRepository.findByDepartment_Id(d.getId()).size();
        long facultyCount = facultyRepository.findByDepartment_Id(d.getId()).size();

        return new Responses.DepartmentDto(
                d.getId(),
                d.getCode(),
                d.getName(),
                d.getDescription(),
                courseCount,
                subjectCount,
                facultyCount
        );
    }
}

