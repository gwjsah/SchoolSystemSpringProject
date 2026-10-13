package com.schoolsystem.repository;

import com.schoolsystem.entity.Faculty;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FacultyRepository extends JpaRepository<Faculty, String> {
    boolean existsByEmployeeNumber(String employeeNumber);
    Optional<Faculty> findByEmployeeNumber(String employeeNumber);
    boolean existsByEmployeeNumberAndIdNot(String employeeNumber, String id);
}
