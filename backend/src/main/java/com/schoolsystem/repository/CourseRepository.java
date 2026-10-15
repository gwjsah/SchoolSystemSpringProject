package com.schoolsystem.repository;

import com.schoolsystem.entity.Course;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CourseRepository extends JpaRepository<Course, String> {
    Optional<Course> findByCode(String code);
    Optional<Course> findByCodeIgnoreCase(String code);
    List<Course> findByDepartment_Id(String departmentId);
}
