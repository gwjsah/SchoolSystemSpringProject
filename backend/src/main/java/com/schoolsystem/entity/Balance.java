package com.schoolsystem.entity;

import com.schoolsystem.entity.enums.PaymentPlan;
import com.schoolsystem.entity.enums.Semester;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Entity
@Table(name = "balances")
@Getter
@Setter
@NoArgsConstructor
public class Balance {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(length = 36, nullable = false, updatable = false)
    private String id;

    @NotNull(message = "Student is required")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "student_id", nullable = false, updatable = false)
    private Student student;

    @NotBlank(message = "School year is required")
    @Column(nullable = false, updatable = false)
    private String schoolYear;

    @NotNull(message = "Semester is required")
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, updatable = false)
    private Semester semester;

    @NotNull(message = "Payment plan is required")
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, updatable = false)
    private PaymentPlan paymentPlan;

    /** BigDecimal instead of the old double, to avoid rounding errors with money. */
    @NotNull
    @PositiveOrZero(message = "Total cost cannot be negative")
    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal totalCost = BigDecimal.ZERO;

    @Column(nullable = false)
    private boolean downpaymentPaid;

    @NotNull
    @PositiveOrZero(message = "Remaining balance cannot be negative")
    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal remainingBalance = BigDecimal.ZERO;

    @Column(nullable = false)
    private boolean discountApplied;
}
