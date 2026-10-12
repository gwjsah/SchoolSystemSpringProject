package com.schoolsystem.repository;

import com.schoolsystem.entity.Balance;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BalanceRepository extends JpaRepository<Balance, String> {
    List<Balance> findByStudent_Id(String studentId);
}
