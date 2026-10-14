package com.schoolsystem.repository;

import com.schoolsystem.entity.AttendanceSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface AttendanceSessionRepository extends JpaRepository<AttendanceSession, String> {

    Optional<AttendanceSession> findBySection_IdAndDate(String sectionId, LocalDate date);

    List<AttendanceSession> findBySection_IdAndTerm_IdOrderByDateAsc(String sectionId, String termId);

    boolean existsBySection_IdAndDate(String sectionId, LocalDate date);

    @Query("SELECT COUNT(s) > 0 FROM AttendanceSession s WHERE s.term.id = :termId AND (s.date < :startsAt OR s.date > :endsAt)")
    boolean existsByTerm_IdAndDateLessThanOrTerm_IdAndDateGreaterThan(
            @Param("termId") String termId,
            @Param("startsAt") LocalDate startsAt,
            @Param("endsAt") LocalDate endsAt
    );

    long countBySection_IdAndTerm_Id(String sectionId, String termId);
}

