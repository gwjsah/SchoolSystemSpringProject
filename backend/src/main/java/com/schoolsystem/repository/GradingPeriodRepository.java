package com.schoolsystem.repository;

import com.schoolsystem.entity.GradingPeriod;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface GradingPeriodRepository extends JpaRepository<GradingPeriod, String> {

    /** The active period is the open one, like the old getActive() (?isOpen=true). Latest deadline wins if several are open. */
    Optional<GradingPeriod> findFirstByIsOpenTrueOrderByDeadlineDesc();

    List<GradingPeriod> findByIsOpenTrue();
}
