package com.schoolsystem.controller;

import com.schoolsystem.dto.DtoMapper;
import com.schoolsystem.dto.Requests.PaymentRequest;
import com.schoolsystem.dto.Responses.BalanceDto;
import com.schoolsystem.dto.Responses.PaymentDto;
import com.schoolsystem.security.AuthUser;
import com.schoolsystem.service.PaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/payments")
@PreAuthorize("hasRole('STUDENT')")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    /** The balance that still has something owed, with its quarterly schedule. 204 if nothing is owed. */
    @GetMapping("/balance")
    public ResponseEntity<BalanceDto> balance(@AuthenticationPrincipal AuthUser user) {
        return paymentService.getCurrentBalance(user.id())
                .map(b -> ResponseEntity.ok(
                        DtoMapper.balance(b, paymentService.getQuarterlySchedules(b.getId()))))
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @GetMapping("/history")
    public List<PaymentDto> history(@AuthenticationPrincipal AuthUser user) {
        return paymentService.getPaymentHistory(user.id()).stream().map(DtoMapper::payment).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public void pay(@AuthenticationPrincipal AuthUser user, @Valid @RequestBody PaymentRequest r) {
        paymentService.processPayment(user.id(), r.amount(), r.startingQuarter(), r.paymentMethod());
    }
}
