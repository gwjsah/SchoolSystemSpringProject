package com.schoolsystem.service;

import com.schoolsystem.exception.NotFoundException;

import com.schoolsystem.entity.Room;
import com.schoolsystem.entity.Schedule;
import com.schoolsystem.entity.Section;
import com.schoolsystem.repository.RoomRepository;
import com.schoolsystem.repository.ScheduleRepository;
import com.schoolsystem.repository.SectionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ScheduleService {

    private final ScheduleRepository scheduleRepository;
    private final SectionRepository sectionRepository;
    private final RoomRepository roomRepository;

    @Transactional(readOnly = true)
    public List<Schedule> getAllSchedules() {
        return scheduleRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Schedule getScheduleById(String id) {
        return scheduleRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Schedule not found"));
    }

    /** Creates a schedule after checking for room conflicts on the same day and time. */
    @Transactional
    public Schedule createSchedule(Schedule.Day day, LocalTime startTime, LocalTime endTime, String roomId) {
        Schedule candidate = build(day, startTime, endTime, roomId);

        for (Schedule existing : scheduleRepository.findAll()) {
            if (candidate.hasConflict(existing))
                throw new IllegalStateException(
                        "Schedule conflicts with an existing one: " + existing.getTimeSlot());
        }
        return scheduleRepository.save(candidate);
    }

    @Transactional
    public Schedule updateSchedule(String scheduleId, Schedule.Day day,
                                   LocalTime startTime, LocalTime endTime, String roomId) {
        Schedule schedule = getScheduleById(scheduleId);
        Schedule updated = build(day, startTime, endTime, roomId);

        for (Schedule existing : scheduleRepository.findAll()) {
            if (existing.getId().equals(scheduleId)) continue; // skip self
            if (updated.hasConflict(existing))
                throw new IllegalStateException(
                        "Schedule conflicts with an existing one: " + existing.getTimeSlot());
        }

        schedule.setDay(updated.getDay());
        schedule.setStartTime(updated.getStartTime());
        schedule.setEndTime(updated.getEndTime());
        schedule.setRoom(updated.getRoom());
        return schedule;
    }

    @Transactional
    public void deleteSchedule(String scheduleId) {
        Schedule schedule = getScheduleById(scheduleId);

        List<Section> sections = sectionRepository.findBySchedules_Id(scheduleId);
        if (!sections.isEmpty()) {
            for (Section sec : sections) {
                if (sec.getSchedules().size() <= 1) {
                    throw new IllegalStateException(
                            "Cannot delete schedule — it is the only meeting time for section: "
                                    + sec.getSectionCode() + ". Delete the section instead.");
                }
            }
            for (Section sec : sections) {
                sec.getSchedules().removeIf(s -> s.getId().equals(scheduleId));
                sectionRepository.save(sec);
            }
        }

        scheduleRepository.delete(schedule);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Schedule build(Schedule.Day day, LocalTime startTime, LocalTime endTime, String roomId) {
        if (day == null)
            throw new IllegalArgumentException("Day must be selected");
        if (startTime == null)
            throw new IllegalArgumentException("Start time cannot be empty");
        if (endTime == null)
            throw new IllegalArgumentException("End time cannot be empty");
        if (roomId == null || roomId.isBlank())
            throw new IllegalArgumentException("Room must be selected");
        if (!startTime.isBefore(endTime))
            throw new IllegalArgumentException("Start time must be before end time");

        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new NotFoundException("Room not found"));

        Schedule schedule = new Schedule();
        schedule.setDay(day);
        schedule.setStartTime(startTime);
        schedule.setEndTime(endTime);
        schedule.setRoom(room);
        return schedule;
    }
}
