package com.schoolsystem.service;

import com.schoolsystem.exception.NotFoundException;

import com.schoolsystem.entity.Balance;
import com.schoolsystem.entity.Enrollment;
import com.schoolsystem.entity.Payment;
import com.schoolsystem.entity.QuarterlySchedule;
import com.schoolsystem.entity.Student;
import com.schoolsystem.entity.enums.PaymentMethod;
import com.schoolsystem.entity.enums.PaymentPlan;
import com.schoolsystem.entity.enums.PaymentType;
import com.schoolsystem.entity.enums.Quarter;
import com.schoolsystem.entity.enums.QuarterStatus;
import com.schoolsystem.entity.enums.Status;
import com.schoolsystem.repository.BalanceRepository;
import com.schoolsystem.repository.EnrollmentRepository;
import com.schoolsystem.repository.PaymentRepository;
import com.schoolsystem.repository.QuarterlyScheduleRepository;
import com.schoolsystem.repository.StudentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

import static com.schoolsystem.service.BillingRules.DOWNPAYMENT;

@Service
@RequiredArgsConstructor
public class PaymentService {

    private final BalanceRepository balanceRepository;
    private final QuarterlyScheduleRepository quarterlyScheduleRepository;
    private final PaymentRepository paymentRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final StudentRepository studentRepository;

    // ── FETCH ────────────────────────────────────────────────────────────────

    /** The first balance that still has something owed (money left, or downpayment not yet paid). */
    @Transactional(readOnly = true)
    public Optional<Balance> getCurrentBalance(String studentId) {
        return balanceRepository.findByStudent_Id(studentId).stream()
                .filter(b -> b.getRemainingBalance().signum() > 0 || !b.isDownpaymentPaid())
                .findFirst();
    }

    @Transactional(readOnly = true)
    public List<QuarterlySchedule> getQuarterlySchedules(String balanceId) {
        return quarterlyScheduleRepository.findByBalance_Id(balanceId).stream()
                .sorted(Comparator.comparing(QuarterlySchedule::getQuarter))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<Payment> getPaymentHistory(String studentId) {
        return paymentRepository.findByStudent_IdOrderByPaidAtDesc(studentId);
    }

    // ── PROCESS PAYMENT ──────────────────────────────────────────────────────

    @Transactional
    public void processPayment(String studentId, BigDecimal amount,
                               Quarter startingQuarter, PaymentMethod method) {
        if (amount == null || amount.signum() <= 0)
            throw new IllegalArgumentException("Payment amount must be greater than zero");
        amount = amount.setScale(2, RoundingMode.HALF_UP);
        if (method == null)
            throw new IllegalArgumentException("Payment method is required");

        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new NotFoundException("Student not found"));
        Balance balance = getCurrentBalance(studentId)
                .orElseThrow(() -> new IllegalStateException("No outstanding balance found"));

        // ── FULL PLAN ──────────────────────────────────────────────────────────
        if (balance.getPaymentPlan() == PaymentPlan.FULL) {
            BigDecimal required = balance.getRemainingBalance();
            if (amount.compareTo(required) != 0)
                throw new IllegalStateException(
                        "Full payment plan requires the entire balance of "
                                + formatCurrency(required) + " to be paid at once");

            savePayment(student, balance, PaymentType.FULL, null, amount, method);
            balance.setRemainingBalance(BigDecimal.ZERO);
            balance.setDownpaymentPaid(true);
            flipToEnrolled(studentId, balance);
            return;
        }

        // ── QUARTERLY PLAN ─────────────────────────────────────────────────────
        BigDecimal remaining = amount;

        // downpayment first, if still unpaid
        if (!balance.isDownpaymentPaid()) {
            if (remaining.compareTo(DOWNPAYMENT) < 0)
                throw new IllegalStateException(
                        "Minimum payment is the downpayment of " + formatCurrency(DOWNPAYMENT));

            savePayment(student, balance, PaymentType.DOWNPAYMENT, null, DOWNPAYMENT, method);
            balance.setDownpaymentPaid(true);
            balance.setRemainingBalance(balance.getRemainingBalance().subtract(DOWNPAYMENT));
            flipToEnrolled(studentId, balance);

            remaining = remaining.subtract(DOWNPAYMENT);
            if (remaining.signum() == 0) return;
        }

        // distribute across quarters, starting from the selected quarter
        List<QuarterlySchedule> quarters = getQuarterlySchedules(balance.getId());

        int startIndex = 0;
        if (startingQuarter != null) {
            for (int i = 0; i < quarters.size(); i++) {
                if (quarters.get(i).getQuarter() == startingQuarter) {
                    startIndex = i;
                    break;
                }
            }
        }

        // Any amount left after every quarter is covered is not recorded, same as the old code.
        for (int i = startIndex; i < quarters.size() && remaining.signum() > 0; i++) {
            QuarterlySchedule quarter = quarters.get(i);
            if (quarter.getStatus() == QuarterStatus.PAID) continue;

            BigDecimal due = quarter.getRemainingAmount();

            if (remaining.compareTo(due) >= 0) {
                savePayment(student, balance, PaymentType.QUARTERLY, quarter.getQuarter(), due, method);
                quarter.setPaidAmount(quarter.getPaidAmount().add(due));
                quarter.setRemainingAmount(BigDecimal.ZERO);
                quarter.setStatus(QuarterStatus.PAID);
                balance.setRemainingBalance(balance.getRemainingBalance().subtract(due));
                remaining = remaining.subtract(due);
            } else {
                savePayment(student, balance, PaymentType.QUARTERLY, quarter.getQuarter(), remaining, method);
                quarter.setPaidAmount(quarter.getPaidAmount().add(remaining));
                quarter.setRemainingAmount(quarter.getRemainingAmount().subtract(remaining));
                quarter.setStatus(QuarterStatus.PARTIAL);
                balance.setRemainingBalance(balance.getRemainingBalance().subtract(remaining));
                remaining = BigDecimal.ZERO;
            }
        }
    }

    // ── HELPERS ──────────────────────────────────────────────────────────────

    /** Once the downpayment (or full payment) is in, this term's PENDING enrollments become ENROLLED. */
    private void flipToEnrolled(String studentId, Balance balance) {
        List<Enrollment> pending = enrollmentRepository.findByStudent_Id(studentId).stream()
                .filter(e -> e.getStatus() == Status.PENDING
                        && e.getSemester() == balance.getSemester()
                        && e.getSchoolYear().equals(balance.getSchoolYear()))
                .toList();

        for (Enrollment e : pending) {
            e.setStatus(Status.ENROLLED);
        }
    }

    private void savePayment(Student student, Balance balance, PaymentType type,
                             Quarter quarter, BigDecimal amount, PaymentMethod method) {
        Payment payment = new Payment();
        payment.setStudent(student);
        payment.setSchoolYear(balance.getSchoolYear());
        payment.setSemester(balance.getSemester());
        payment.setType(type);
        payment.setQuarter(quarter);
        payment.setAmount(amount);
        payment.setPaymentMethod(method);
        paymentRepository.save(payment); // paidAt is filled in on persist
    }

    public static String formatCurrency(BigDecimal amount) {
        return "PHP " + String.format("%,.2f", amount);
    }
}
