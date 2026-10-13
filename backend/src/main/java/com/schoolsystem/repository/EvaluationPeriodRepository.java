package com.schoolsystem.repository;

import com.schoolsystem.entity.EvaluationPeriod;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface EvaluationPeriodRepository extends JpaRepository<EvaluationPeriod, String> {

    Optional<EvaluationPeriod> findFirstByIsOpenTrueOrderByStartsAtDesc();

    List<EvaluationPeriod> findAllByOrderByStartsAtDesc();

    List<EvaluationPeriod> findByIsOpenTrue();
}

