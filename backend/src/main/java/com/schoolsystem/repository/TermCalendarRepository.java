package com.schoolsystem.repository;

import com.schoolsystem.entity.TermCalendar;
import com.schoolsystem.entity.enums.Semester;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TermCalendarRepository extends JpaRepository<TermCalendar, String> {

    Optional<TermCalendar> findFirstByIsActiveTrueOrderByStartsAtDesc();

    List<TermCalendar> findAllByOrderByStartsAtDesc();

    Optional<TermCalendar> findBySchoolYearAndSemester(String schoolYear, Semester semester);

    boolean existsBySchoolYearAndSemester(String schoolYear, Semester semester);

    boolean existsBySchoolYearAndSemesterAndIdNot(String schoolYear, Semester semester, String id);

    List<TermCalendar> findByIsActiveTrue();
}

