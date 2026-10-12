package com.schoolsystem.entity;

import com.schoolsystem.entity.enums.Quarter;
import com.schoolsystem.entity.enums.QuarterStatus;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

/** One installment of a Balance's payment plan. */
@Entity
@Table(name = "quarterly_schedules")
@Getter
@Setter
@NoArgsConstructor
public class QuarterlySchedule {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(length = 36, nullable = false, updatable = false)
    private String id;

    @NotNull(message = "Balance is required")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "balance_id", nullable = false, updatable = false)
    private Balance balance;

    @NotNull(message = "Quarter is required")
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, updatable = false)
    private Quarter quarter;

    /** BigDecimal instead of the old double, to avoid rounding errors with money. */
    @NotNull
    @PositiveOrZero
    @Column(nullable = false, updatable = false, precision = 12, scale = 2)
    private BigDecimal scheduledAmount;

    @NotNull
    @PositiveOrZero(message = "Paid amount cannot be negative")
    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal paidAmount = BigDecimal.ZERO;

    @NotNull
    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal remainingAmount = BigDecimal.ZERO;

    @NotNull(message = "Status cannot be null")
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private QuarterStatus status;
}
