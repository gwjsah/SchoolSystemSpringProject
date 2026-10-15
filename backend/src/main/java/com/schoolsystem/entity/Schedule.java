package com.schoolsystem.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalTime;

@Entity
@Table(name = "schedules")
@Getter
@Setter
@NoArgsConstructor
public class Schedule {

    public enum Day {
        MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY, SUNDAY
    }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(length = 36, nullable = false, updatable = false)
    private String id;

    @Enumerated(EnumType.STRING)
    @Column(name = "slot_type")
    private com.schoolsystem.entity.enums.RoomType slotType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "section_id")
    private Section section;

    @NotNull(message = "Day is required")
    @Enumerated(EnumType.STRING)
    @Column(name = "day_of_week", nullable = false)
    private Day day;

    /** Old code stored "HH:mm" strings; LocalTime makes the overlap check simpler. */
    @NotNull(message = "Start time is required")
    @Column(nullable = false)
    private LocalTime startTime;

    @NotNull(message = "End time is required")
    @Column(nullable = false)
    private LocalTime endTime;

    @NotNull(message = "Room is required")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "room_id", nullable = false)
    private Room room;

    @AssertTrue(message = "End time must be after start time")
    private boolean isEndAfterStart() {
        return startTime == null || endTime == null || endTime.isAfter(startTime);
    }

    /** Same day and overlapping times, whatever the room. Use this for faculty and student clashes. */
    public boolean overlapsWith(Schedule other) {
        return this.day == other.day
                && this.startTime.isBefore(other.endTime)
                && other.startTime.isBefore(this.endTime);
    }

    /** Room clash, as in the old code: same room and an overlapping time slot. */
    public boolean hasConflict(Schedule other) {
        return this.room.getId().equalsIgnoreCase(other.room.getId()) && overlapsWith(other);
    }

    public String getTimeSlot() {
        return day + " " + startTime + " - " + endTime;
    }
}
