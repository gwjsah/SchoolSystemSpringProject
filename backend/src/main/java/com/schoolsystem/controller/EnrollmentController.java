package com.schoolsystem.controller;

import com.schoolsystem.dto.DtoMapper;
import com.schoolsystem.dto.Requests.AddToCartRequest;
import com.schoolsystem.dto.Requests.ConfirmEnrollmentRequest;
import com.schoolsystem.dto.Responses.BalanceDto;
import com.schoolsystem.dto.Responses.CartItemDto;
import com.schoolsystem.dto.Responses.EligibilityDto;
import com.schoolsystem.dto.Responses.EnrollmentDto;
import com.schoolsystem.dto.Responses.SectionDto;
import com.schoolsystem.dto.Responses.SubjectDto;
import com.schoolsystem.entity.Balance;
import com.schoolsystem.security.AuthUser;
import com.schoolsystem.service.EnrollmentService;
import com.schoolsystem.service.PaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** The student enrollment flow: eligibility, subject and section selection, cart, confirm, drop. */
@RestController
@RequestMapping("/enrollment")
@PreAuthorize("hasRole('STUDENT')")
@RequiredArgsConstructor
public class EnrollmentController {

    private final EnrollmentService enrollmentService;
    private final PaymentService paymentService;

    /** Tells the UI whether the student may enroll right now, and why not if they cannot. */
    @GetMapping("/eligibility")
    public EligibilityDto eligibility(@AuthenticationPrincipal AuthUser user) {
        try {
            enrollmentService.canEnroll(user.id());
            return new EligibilityDto(true, null);
        } catch (IllegalStateException e) {
            return new EligibilityDto(false, e.getMessage());
        }
    }

    @GetMapping("/subjects")
    public List<SubjectDto> availableSubjects(@AuthenticationPrincipal AuthUser user) {
        java.util.Set<String> recommendedCodes = enrollmentService.getRecommendedSubjectCodes(user.id());
        return enrollmentService.getAvailableSubjects(user.id()).stream()
                .map(s -> DtoMapper.subject(s, java.util.List.of(), recommendedCodes.contains(s.getSubjectCode())))
                .toList();
    }

    @GetMapping("/subjects/{subjectCode}/sections")
    public List<SectionDto> availableSections(@PathVariable String subjectCode) {
        return enrollmentService.getAvailableSections(subjectCode).stream().map(DtoMapper::section).toList();
    }

    @GetMapping("/cart")
    public List<CartItemDto> cart(@AuthenticationPrincipal AuthUser user) {
        return enrollmentService.getCartSections(user.id()).stream().map(DtoMapper::cartItem).toList();
    }

    @PostMapping("/cart")
    @ResponseStatus(HttpStatus.CREATED)
    public List<CartItemDto> addToCart(@AuthenticationPrincipal AuthUser user,
                                       @Valid @RequestBody AddToCartRequest r) {
        enrollmentService.addToCart(user.id(), r.sectionId());
        return cart(user);
    }

    @DeleteMapping("/cart/{subjectCode}")
    public List<CartItemDto> removeFromCart(@AuthenticationPrincipal AuthUser user,
                                            @PathVariable String subjectCode) {
        enrollmentService.removeFromCart(user.id(), subjectCode);
        return cart(user);
    }

    /** Locks in the cart as pending enrollments and creates the balance. */
    @PostMapping("/confirm")
    @ResponseStatus(HttpStatus.CREATED)
    public BalanceDto confirm(@AuthenticationPrincipal AuthUser user,
                              @Valid @RequestBody ConfirmEnrollmentRequest r) {
        Balance balance = enrollmentService.confirmEnrollment(user.id(), r.paymentPlan());
        return DtoMapper.balance(balance, paymentService.getQuarterlySchedules(balance.getId()));
    }

    /** All of the student's enrollments, including dropped ones. */
    @GetMapping
    public List<EnrollmentDto> myEnrollments(@AuthenticationPrincipal AuthUser user) {
        return enrollmentService.getStudentEnrollments(user.id()).stream().map(DtoMapper::enrollment).toList();
    }

    @PostMapping("/{enrollmentId}/drop")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void drop(@AuthenticationPrincipal AuthUser user, @PathVariable String enrollmentId) {
        enrollmentService.dropSubject(user.id(), enrollmentId);
    }
}
