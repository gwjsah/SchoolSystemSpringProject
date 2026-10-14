package com.schoolsystem.repository;

import com.schoolsystem.entity.AttendanceRecord;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface AttendanceRecordRepository extends JpaRepository<AttendanceRecord, String> {

    List<AttendanceRecord> findBySession_Id(String sessionId);

    List<AttendanceRecord> findBySession_IdIn(Collection<String> sessionIds);

    Optional<AttendanceRecord> findBySession_IdAndStudent_Id(String sessionId, String studentId);

    boolean existsBySession_Id(String sessionId);

    long countBySession_Id(String sessionId);
}

