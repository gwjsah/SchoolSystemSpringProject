package com.schoolsystem.service;

import java.math.BigDecimal;

/** Constants carried over from the old EnrollmentService and PaymentService. */
public final class BillingRules {

    private BillingRules() {}

    public static final BigDecimal DOWNPAYMENT = new BigDecimal("1000.00");
    public static final BigDecimal COST_PER_UNIT = new BigDecimal("1000.00");
    public static final BigDecimal FULL_PAYMENT_DISCOUNT = new BigDecimal("0.05");
    public static final int MAX_UNITS = 24;
}
