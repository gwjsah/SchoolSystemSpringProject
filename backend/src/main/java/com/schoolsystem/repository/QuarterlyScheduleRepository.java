package com.schoolsystem.repository;

import com.schoolsystem.entity.QuarterlySchedule;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface QuarterlyScheduleRepository extends JpaRepository<QuarterlySchedule, String> {
    List<QuarterlySchedule> findByBalance_Id(String balanceId);
}
