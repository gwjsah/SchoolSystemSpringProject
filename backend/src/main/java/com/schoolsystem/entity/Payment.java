package com.schoolsystem.entity;

import com.schoolsystem.entity.enums.PaymentMethod;
import com.schoolsystem.entity.enums.PaymentType;
import com.schoolsystem.entity.enums.Quarter;
import com.schoolsystem.entity.enums.Semester;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/** A recorded payment. Immutable after creation, like the old class. */
@Entity
@Table(name = "payments")
@Getter
@Setter
@NoArgsConstructor
public class Payment {

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

    @NotNull(message = "Payment type is required")
    @Enumerated(EnumType.STRING)
    @Column(name = "payment_type", nullable = false, updatable = false)
    private PaymentType type;

    /** Nullable: not every payment type is tied to a quarter. */
    @Enumerated(EnumType.STRING)
    @Column(updatable = false)
    private Quarter quarter;

    /** BigDecimal instead of the old double, to avoid rounding errors with money. */
    @NotNull(message = "Amount is required")
    @Positive(message = "Amount must be greater than zero")
    @Column(nullable = false, updatable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    /** Nullable: older records in the old data have no method. New payments require one (see PaymentService). */
    @Enumerated(EnumType.STRING)
    @Column(updatable = false)
    private PaymentMethod paymentMethod;

    @Column(nullable = false, updatable = false)
    private LocalDateTime paidAt;

    @PrePersist
    protected void onCreate() {
        if (paidAt == null) {
            paidAt = LocalDateTime.now();
        }
    }
}
