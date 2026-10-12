package com.schoolsystem.repository;

import com.schoolsystem.entity.EnrollmentPeriod;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface EnrollmentPeriodRepository extends JpaRepository<EnrollmentPeriod, String> {

    /** The active period is the open one, like the old getActive() (?isOpen=true). Newest start wins if several are open. */
    Optional<EnrollmentPeriod> findFirstByIsOpenTrueOrderByStartsAtDesc();
}
