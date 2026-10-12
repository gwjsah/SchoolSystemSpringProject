package com.schoolsystem.service;

import com.schoolsystem.exception.NotFoundException;

import com.schoolsystem.entity.Account;
import com.schoolsystem.repository.AccountRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AccountRepository accountRepository;
    private final PasswordEncoder passwordEncoder;

    /**
     * Checks credentials against the stored BCrypt hash. JWT issuing comes with the security config.
     * One generic message for both failures, so the API does not reveal which emails exist.
     */
    @Transactional(readOnly = true)
    public Account login(String email, String password) {
        Account account = accountRepository
                .findByEmailIgnoreCase(email == null ? "" : email.trim())
                .orElseThrow(() -> new IllegalArgumentException("Invalid email or password"));

        if (password == null || !passwordEncoder.matches(password, account.getPassword()))
            throw new IllegalArgumentException("Invalid email or password");

        if (account instanceof com.schoolsystem.entity.Student s) {
            if (s.getAdmissionStatus() == com.schoolsystem.entity.enums.AdmissionStatus.PENDING) {
                throw new IllegalArgumentException("Your admission application is currently pending review by the school administration.");
            }
            if (s.getAdmissionStatus() == com.schoolsystem.entity.enums.AdmissionStatus.REJECTED) {
                String reason = s.getRejectionReason();
                throw new IllegalArgumentException("Your admission application was not approved." + (reason != null && !reason.isBlank() ? " Reason: " + reason : ""));
            }
        }

        return account;
    }

    @Transactional(readOnly = true)
    public Account getAccount(String id) {
        return accountRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Account not found"));
    }
}
