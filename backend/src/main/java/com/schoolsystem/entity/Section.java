package com.schoolsystem.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "sections", uniqueConstraints = {
        @UniqueConstraint(name = "uk_block_subject", columnNames = {"block_id", "subject_id"})
})
@Getter
@Setter
@NoArgsConstructor
public class Section {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(length = 36, nullable = false, updatable = false)
    private String id;

    @NotNull(message = "Section block is required")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "block_id", nullable = false)
    private SectionBlock block;

    @NotNull(message = "Subject is required")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "subject_id", nullable = false)
    private Subject subject;

    /** Nullable: the faculty member can be assigned or unassigned. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "faculty_id")
    private Faculty faculty;

    /** One-to-many schedule slots owned exclusively by this section. */
    @OneToMany(mappedBy = "section", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Schedule> schedules = new ArrayList<>();

    @Min(0)
    @Column(nullable = false)
    private int currentCount;

    /** Optimistic locking so two simultaneous enrollments cannot overshoot capacity. */
    @Version
    private Long version;

    public String getSectionCode() {
        return block != null ? block.getSectionCode() : null;
    }

    public void setSectionCode(String sectionCode) {
        if (block != null) {
            block.setSectionCode(sectionCode);
        }
    }

    public int getCapacity() {
        return block != null ? block.getCapacity() : 0;
    }

    public void setCapacity(int capacity) {
        if (block != null) {
            block.setCapacity(capacity);
        }
    }

    public int getAvailableSlots() {
        return getCapacity() - currentCount;
    }

    public boolean isFull() {
        return currentCount >= getCapacity();
    }

    public void incrementCurrentCount() {
        if (currentCount >= getCapacity()) {
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
