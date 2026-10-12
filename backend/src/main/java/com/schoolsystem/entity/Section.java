package com.schoolsystem.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "sections")
@Getter
@Setter
@NoArgsConstructor
public class Section {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(length = 36, nullable = false, updatable = false)
    private String id;

    /** Example: "IT-G1". */
    @NotBlank(message = "Section code is required")
    @Column(nullable = false)
    private String sectionCode;

    @NotNull(message = "Subject is required")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "subject_id", nullable = false)
    private Subject subject;

    /** Nullable: the old code did not require a faculty member. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "faculty_id")
    private Faculty faculty;

    /** One schedule per day/time slot (old scheduleIds list). */
    @ManyToMany
    @JoinTable(
            name = "section_schedules",
            joinColumns = @JoinColumn(name = "section_id"),
            inverseJoinColumns = @JoinColumn(name = "schedule_id"))
    private List<Schedule> schedules = new ArrayList<>();

    @Min(value = 1, message = "Invalid capacity size")
    @Max(value = 50, message = "Invalid capacity size")
    @Column(nullable = false)
    private int capacity;

    @Min(0)
    @Column(nullable = false)
    private int currentCount;

    /** Optimistic locking so two simultaneous enrollments cannot overshoot capacity. */
    @Version
    private Long version;

    public int getAvailableSlots() {
        return capacity - currentCount;
    }

    public boolean isFull() {
        return currentCount >= capacity;
    }

    public void incrementCurrentCount() {
        if (currentCount >= capacity) {
            throw new IllegalStateException("Section is already full");
        }
        currentCount++;
    }

    public void decrementCurrentCount() {
        if (currentCount <= 0) {
            throw new IllegalStateException("Section is already empty");
        }
        currentCount--;
    }
}
