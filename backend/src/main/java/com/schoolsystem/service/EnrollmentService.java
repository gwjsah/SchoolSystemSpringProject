package com.schoolsystem.service;

import com.schoolsystem.exception.NotFoundException;

import com.schoolsystem.entity.Balance;
import com.schoolsystem.entity.CartItem;
import com.schoolsystem.entity.Enrollment;
import com.schoolsystem.entity.EnrollmentPeriod;
import com.schoolsystem.entity.QuarterlySchedule;
import com.schoolsystem.entity.Schedule;
import com.schoolsystem.entity.Section;
import com.schoolsystem.entity.Student;
import com.schoolsystem.entity.Subject;
import com.schoolsystem.entity.enums.PaymentPlan;
import com.schoolsystem.entity.enums.Quarter;
import com.schoolsystem.entity.enums.QuarterStatus;
import com.schoolsystem.entity.enums.Semester;
import com.schoolsystem.entity.enums.Status;
import com.schoolsystem.repository.BalanceRepository;
import com.schoolsystem.repository.CartItemRepository;
import com.schoolsystem.repository.CompletedSubjectRepository;
import com.schoolsystem.repository.EnrollmentPeriodRepository;
import com.schoolsystem.repository.EnrollmentRepository;
import com.schoolsystem.repository.QuarterlyScheduleRepository;
import com.schoolsystem.repository.SectionRepository;
import com.schoolsystem.repository.StudentRepository;
import com.schoolsystem.repository.SubjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

import static com.schoolsystem.service.BillingRules.COST_PER_UNIT;
import static com.schoolsystem.service.BillingRules.DOWNPAYMENT;
import static com.schoolsystem.service.BillingRules.FULL_PAYMENT_DISCOUNT;
import static com.schoolsystem.service.BillingRules.MAX_UNITS;

@Service
@RequiredArgsConstructor
public class EnrollmentService {

    private final EnrollmentPeriodRepository enrollmentPeriodRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final BalanceRepository balanceRepository;
    private final QuarterlyScheduleRepository quarterlyScheduleRepository;
    private final SubjectRepository subjectRepository;
    private final CompletedSubjectRepository completedSubjectRepository;
    private final SectionRepository sectionRepository;
    private final StudentRepository studentRepository;
    private final CartItemRepository cartItemRepository;

    // ── GATE CHECK ──────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public void canEnroll(String studentId) {
        EnrollmentPeriod period = enrollmentPeriodRepository.findFirstByIsOpenTrueOrderByStartsAtDesc()
                .orElseThrow(() -> new IllegalStateException(
                        "There is no active enrollment period at this time. Please check back later."));

        // 1. unpaid balance from a PREVIOUS semester only
        boolean hasUnpaidBalance = balanceRepository.findByStudent_Id(studentId).stream()
                .filter(b -> !isSameTerm(b.getSemester(), b.getSchoolYear(), period))
                .anyMatch(b -> b.getRemainingBalance().signum() > 0);
        if (hasUnpaidBalance)
            throw new IllegalStateException(
                    "You have an outstanding balance from a previous semester. "
                            + "Please settle your balance before enrolling.");

        // 2. already enrolled this semester
        boolean alreadyEnrolled = enrollmentRepository.findByStudent_Id(studentId).stream()
                .anyMatch(e -> isSameTerm(e.getSemester(), e.getSchoolYear(), period) && isActive(e));
        if (alreadyEnrolled)
            throw new IllegalStateException(
                    "You have already enrolled for " + period.getSemester()
                            + " Semester " + period.getSchoolYear() + ".");
    }

    // ── SUBJECT SELECTION ───────────────────────────────────────────────────

    /**
     * Determines whether a subject is eligible for a student's course based strictly on the subject's course in the DB:
     * - 'GEN': open to all students across all programs.
     * - Matches the student's enrolled course (e.g. BSCS, BSIT).
     * - 'CSIT': common computing course open to both BSCS and BSIT students.
     */
    public static boolean isSubjectEligibleForStudent(Subject subject, String studentCourse) {
        if (subject == null) return false;
        String subjectCourse = subject.getCourse() != null ? subject.getCourse().toUpperCase().trim() : "";
        String studentProg = studentCourse != null ? studentCourse.toUpperCase().trim() : "";

        if ("GEN".equalsIgnoreCase(subjectCourse)) {
            return true;
        }
        if ("CSIT".equalsIgnoreCase(subjectCourse)) {
            return studentProg.contains("CS") || studentProg.contains("IT");
        }
        return subjectCourse.equalsIgnoreCase(studentProg);
    }

    /** Subjects for the student's year level that match program eligibility from the DB, are not done, not taken, and have prerequisites met. */
    @Transactional(readOnly = true)
    public List<Subject> getAvailableSubjects(String studentId) {
        Student student = loadStudent(studentId);

        List<Subject> candidates = subjectRepository.findByYearLevel(student.getYearLevel());

        Set<String> completedCodes = completedSubjectRepository.findByStudent_Id(studentId).stream()
                .map(c -> c.getSubject().getSubjectCode())
                .collect(Collectors.toSet());

        Set<String> enrolledCodes = enrollmentRepository.findByStudent_Id(studentId).stream()
                .filter(EnrollmentService::isActive)
                .map(e -> e.getSubject().getSubjectCode())
                .collect(Collectors.toSet());

        return candidates.stream()
                .filter(s -> isSubjectEligibleForStudent(s, student.getCourse()))
                .filter(s -> !completedCodes.contains(s.getSubjectCode()))
                .filter(s -> !enrolledCodes.contains(s.getSubjectCode()))
                .filter(s -> completedCodes.containsAll(s.getPrerequisites()))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<Section> getAvailableSections(String subjectCode) {
        return sectionRepository.findBySubject_SubjectCode(subjectCode).stream()
                .filter(s -> !s.isFull())
                .toList();
    }

    // ── CART ────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<CartItem> getCart(String studentId) {
        return cartItemRepository.findByStudent_IdOrderByAddedAtAsc(studentId);
    }

    @Transactional
    public void addToCart(String studentId, String sectionId) {
        // The API can be called directly, so the gate and availability are checked here too.
        canEnroll(studentId);

        Student student = loadStudent(studentId);
        Section section = sectionRepository.findById(sectionId)
                .orElseThrow(() -> new NotFoundException("Section not found"));
        Subject subject = section.getSubject();

        // duplicate check
        if (cartItemRepository.existsByStudent_IdAndSubject_SubjectCode(studentId, subject.getSubjectCode()))
            throw new IllegalStateException("Subject already in cart");

        if (getAvailableSubjects(studentId).stream()
                .noneMatch(s -> s.getSubjectCode().equals(subject.getSubjectCode())))
            throw new IllegalArgumentException("Subject is not available for this student");

        // unit limit (enrolled/pending + cart + this one)
        List<CartItem> currentCart = cartItemRepository.findByStudent_IdOrderByAddedAtAsc(studentId);
        int cartUnits = currentCart.stream()
                .mapToInt(i -> i.getSubject().getUnits())
                .sum();
        if (getCurrentUnits(studentId) + cartUnits + subject.getUnits() > MAX_UNITS)
            throw new IllegalStateException(
                    "Adding this subject exceeds the " + MAX_UNITS + " unit limit");

        // section capacity: check slots and reserve (first come first served)
        if (section.isFull())
            throw new IllegalStateException("Section is already full");

        // schedule conflicts: any overlap on the same day, whatever the room
        List<Section> activeSections = enrollmentRepository.findByStudent_Id(studentId).stream()
                .filter(EnrollmentService::isActive)
                .map(Enrollment::getSection)
                .toList();
        if (overlaps(section, activeSections))
            throw new IllegalStateException("Schedule conflict with an existing enrollment");

        List<Section> cartSections = currentCart.stream()
                .map(CartItem::getSection)
                .toList();
        if (overlaps(section, cartSections))
            throw new IllegalStateException("Schedule conflict with another selected subject");

        // Reserve the slot immediately
        section.incrementCurrentCount();
        sectionRepository.save(section);

        CartItem cartItem = new CartItem(student, section, subject);
        cartItemRepository.save(cartItem);
    }

    @Transactional
    public void removeFromCart(String studentId, String subjectCode) {
        Optional<CartItem> opt = cartItemRepository.findByStudent_IdAndSubject_SubjectCode(studentId, subjectCode);
        if (opt.isPresent()) {
            CartItem item = opt.get();
            Section section = item.getSection();
            if (section.getCurrentCount() > 0) {
                section.decrementCurrentCount();
                sectionRepository.save(section);
            }
            cartItemRepository.delete(item);
        }
    }

    @Transactional
    public void clearCart(String studentId) {
        List<CartItem> items = cartItemRepository.findByStudent_IdOrderByAddedAtAsc(studentId);
        for (CartItem item : items) {
            Section section = item.getSection();
            if (section.getCurrentCount() > 0) {
                section.decrementCurrentCount();
                sectionRepository.save(section);
            }
        }
        cartItemRepository.deleteByStudent_Id(studentId);
    }

    // ── CONFIRM ENROLLMENT ──────────────────────────────────────────────────

    /** Saves the cart as PENDING enrollments and creates the balance (plus quarterly schedule if chosen). */
    @Transactional
    public Balance confirmEnrollment(String studentId, PaymentPlan paymentPlan) {
        if (paymentPlan == null)
            throw new IllegalArgumentException("Payment plan is required");

        Student student = loadStudent(studentId);
        canEnroll(studentId);
        EnrollmentPeriod period = getActivePeriod();

        List<CartItem> cartItems = cartItemRepository.findByStudent_IdOrderByAddedAtAsc(studentId);
        if (cartItems.isEmpty())
            throw new IllegalStateException("No subjects selected to confirm");

        BigDecimal totalCost = BigDecimal.ZERO;
        for (CartItem item : cartItems) {
            Section section = item.getSection();
            Subject subject = section.getSubject();

            Enrollment enrollment = new Enrollment();
            enrollment.setStudent(student);
            enrollment.setSubject(subject);
            enrollment.setSection(section);
            enrollment.setSemester(period.getSemester());
            enrollment.setSchoolYear(period.getSchoolYear());
            enrollment.setStatus(Status.PENDING);
            enrollmentRepository.save(enrollment);

            // Note: section.incrementCurrentCount() is NOT called here because the slot was already
            // reserved when the student added the section to the cart.

            totalCost = totalCost.add(COST_PER_UNIT.multiply(BigDecimal.valueOf(subject.getUnits())));
        }

        boolean discountApplied = paymentPlan == PaymentPlan.FULL;
        BigDecimal remaining = discountApplied
                ? totalCost.multiply(BigDecimal.ONE.subtract(FULL_PAYMENT_DISCOUNT))
                : totalCost;
        remaining = remaining.setScale(2, RoundingMode.HALF_UP);

        Balance balance = new Balance();
        balance.setStudent(student);
        balance.setSchoolYear(period.getSchoolYear());
        balance.setSemester(period.getSemester());
        balance.setPaymentPlan(paymentPlan);
        balance.setTotalCost(totalCost.setScale(2, RoundingMode.HALF_UP));
        balance.setDownpaymentPaid(false);
        balance.setRemainingBalance(remaining);
        balance.setDiscountApplied(discountApplied);
        balanceRepository.save(balance);

        if (paymentPlan == PaymentPlan.QUARTERLY)
            createQuarterlySchedule(balance, remaining);

        student.setEnrollmentConfirmed(true);
        // Clear the cart records from the database directly without releasing the reserved slots,
        // because those slots are now officially enrolled/pending for this student.
        cartItemRepository.deleteByStudent_Id(studentId);
        return balance;
    }

    // ── DROP SUBJECT ────────────────────────────────────────────────────────

    @Transactional
    public void dropSubject(String studentId, String enrollmentId) {
        Enrollment enrollment = enrollmentRepository.findById(enrollmentId)
                .orElseThrow(() -> new NotFoundException("Enrollment not found"));
        // Students may only drop their own enrollments.
        if (!enrollment.getStudent().getId().equals(studentId))
            throw new NotFoundException("Enrollment not found");

        if (enrollment.getStatus() == Status.DROPPED)
            throw new IllegalStateException("Subject is already dropped");

        enrollment.setStatus(Status.DROPPED);
        enrollment.getSection().decrementCurrentCount();

        // flag pending balance on student, as in the old code
        loadStudent(studentId).setHasPendingBalance(true);
    }

    // ── HELPERS ─────────────────────────────────────────────────────────────

    private Student loadStudent(String studentId) {
        return studentRepository.findById(studentId)
                .orElseThrow(() -> new NotFoundException("Student not found"));
    }

    private EnrollmentPeriod getActivePeriod() {
        return enrollmentPeriodRepository.findFirstByIsOpenTrueOrderByStartsAtDesc()
                .orElseThrow(() -> new IllegalStateException("No active enrollment period"));
    }

    private static boolean isSameTerm(Semester semester, String schoolYear, EnrollmentPeriod period) {
        return semester == period.getSemester() && schoolYear.equals(period.getSchoolYear());
    }

    private static boolean isActive(Enrollment e) {
        return e.getStatus() == Status.ENROLLED || e.getStatus() == Status.PENDING;
    }

    private int getCurrentUnits(String studentId) {
        return enrollmentRepository.findByStudent_Id(studentId).stream()
                .filter(EnrollmentService::isActive)
                .mapToInt(e -> e.getSubject().getUnits())
                .sum();
    }

    /**
     * True if any schedule of newSection overlaps any schedule of the given sections (same day,
     * overlapping time). The old code used the room-based hasConflict here, so two classes at the
     * same time in different rooms were never flagged.
     */
    private static boolean overlaps(Section newSection, List<Section> others) {
        for (Section other : others) {
            for (Schedule existing : other.getSchedules()) {
                for (Schedule candidate : newSection.getSchedules()) {
                    if (candidate.overlapsWith(existing)) return true;
                }
            }
        }
        return false;
    }

    /**
     * Splits what is left after the downpayment evenly across the quarters. The old code split the
     * whole balance, even though the downpayment is taken off it separately, so the last quarterly
     * payment would have pushed the remaining balance below zero.
     */
    private void createQuarterlySchedule(Balance balance, BigDecimal remainingBalance) {
        Quarter[] quarters = Quarter.values();
        BigDecimal payable = remainingBalance.subtract(DOWNPAYMENT).max(BigDecimal.ZERO);
        BigDecimal each = payable.divide(BigDecimal.valueOf(quarters.length), 2, RoundingMode.DOWN);

        BigDecimal allocated = BigDecimal.ZERO;
        for (int i = 0; i < quarters.length; i++) {
            // the last quarter absorbs any rounding leftover
            BigDecimal amount = (i == quarters.length - 1) ? payable.subtract(allocated) : each;
            allocated = allocated.add(amount);

            QuarterlySchedule schedule = new QuarterlySchedule();
            schedule.setBalance(balance);
            schedule.setQuarter(quarters[i]);
            schedule.setScheduledAmount(amount);
            schedule.setPaidAmount(BigDecimal.ZERO);
            schedule.setRemainingAmount(amount);
            schedule.setStatus(amount.signum() == 0 ? QuarterStatus.PAID : QuarterStatus.UNPAID);
            quarterlyScheduleRepository.save(schedule);
        }
    }

    // ── Reads ─────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<Enrollment> getStudentEnrollments(String studentId) {
        return enrollmentRepository.findByStudent_Id(studentId);
    }

    @Transactional(readOnly = true)
    public List<Section> getCartSections(String studentId) {
        return cartItemRepository.findByStudent_IdOrderByAddedAtAsc(studentId).stream()
                .map(CartItem::getSection)
                .toList();
    }
}
