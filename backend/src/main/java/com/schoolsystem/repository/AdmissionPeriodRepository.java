package com.schoolsystem.repository;

import com.schoolsystem.entity.AdmissionPeriod;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AdmissionPeriodRepository extends JpaRepository<AdmissionPeriod, String> {

    Optional<AdmissionPeriod> findFirstByIsOpenTrueOrderByStartsAtDesc();

    List<AdmissionPeriod> findAllByOrderByStartsAtDesc();

    List<AdmissionPeriod> findByIsOpenTrue();
}

