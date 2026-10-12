package com.schoolsystem.controller;

import com.schoolsystem.dto.DtoMapper;
import com.schoolsystem.dto.Requests.LoginRequest;
import com.schoolsystem.dto.Responses.AccountDto;
import com.schoolsystem.dto.Responses.LoginResponse;
import com.schoolsystem.entity.Account;
import com.schoolsystem.security.AuthUser;
import com.schoolsystem.security.JwtService;
import com.schoolsystem.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final JwtService jwtService;

    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest request) {
        Account account;
        try {
            account = authService.login(request.email(), request.password());
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, e.getMessage());
        }
        return new LoginResponse(jwtService.generateToken(account), DtoMapper.account(account));
    }

    @GetMapping("/me")
    public AccountDto me(@AuthenticationPrincipal AuthUser user) {
        return DtoMapper.account(authService.getAccount(user.id()));
    }
}
