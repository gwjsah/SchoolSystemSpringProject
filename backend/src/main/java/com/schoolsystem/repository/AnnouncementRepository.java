package com.schoolsystem.repository;

import com.schoolsystem.entity.Announcement;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AnnouncementRepository extends JpaRepository<Announcement, String> {
    List<Announcement> findByIsArchivedFalseOrderByPostedAtDesc();
    List<Announcement> findAllByOrderByPostedAtDesc();
}
