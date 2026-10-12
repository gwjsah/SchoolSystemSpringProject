package com.schoolsystem.repository;

import com.schoolsystem.entity.Schedule;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ScheduleRepository extends JpaRepository<Schedule, String> {
    List<Schedule> findByRoom_Id(String roomId);
    long countByRoom_Id(String roomId);
}
