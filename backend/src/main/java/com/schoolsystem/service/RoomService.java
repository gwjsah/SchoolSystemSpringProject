package com.schoolsystem.service;

import com.schoolsystem.exception.NotFoundException;

import com.schoolsystem.entity.Room;
import com.schoolsystem.entity.enums.RoomType;
import com.schoolsystem.repository.RoomRepository;
import com.schoolsystem.repository.ScheduleRepository;
import com.schoolsystem.entity.Schedule;
import com.schoolsystem.repository.SectionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalTime;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RoomService {

    private final RoomRepository roomRepository;
    private final ScheduleRepository scheduleRepository;
    private final SectionRepository sectionRepository;

    @Transactional(readOnly = true)
    public List<Room> getAllRooms() {
        return roomRepository.findAll();
    }

    @Transactional(readOnly = true)
    public List<Room> findAvailableRooms(Schedule.Day day, LocalTime startTime, LocalTime endTime,
                                         RoomType roomType, int minCapacity, String excludeSectionId) {
        if (day == null) throw new IllegalArgumentException("Day is required");
        if (startTime == null || endTime == null) throw new IllegalArgumentException("Time range is required");
        if (!startTime.isBefore(endTime)) throw new IllegalArgumentException("Start time must be before end time");

        Set<String> excludedScheduleIds = Collections.emptySet();
        if (excludeSectionId != null && !excludeSectionId.isBlank()) {
            excludedScheduleIds = sectionRepository.findById(excludeSectionId)
                    .map(sec -> sec.getSchedules().stream().map(Schedule::getId).collect(Collectors.toSet()))
                    .orElse(Collections.emptySet());
        }

        Set<String> finalExcludedScheduleIds = excludedScheduleIds;
        List<Schedule> conflictingSchedules = scheduleRepository.findAll().stream()
                .filter(s -> s.getDay() == day)
                .filter(s -> !finalExcludedScheduleIds.contains(s.getId()))
                .filter(s -> startTime.isBefore(s.getEndTime()) && s.getStartTime().isBefore(endTime))
                .toList();

        Set<String> busyRoomIds = conflictingSchedules.stream()
                .map(s -> s.getRoom().getId())
                .collect(Collectors.toSet());

        List<Room> activeRooms = roomRepository.findByIsActiveTrue();
        return activeRooms.stream()
                .filter(r -> roomType == null || r.getRoomType() == roomType)
                .filter(r -> r.getCapacity() >= minCapacity)
                .filter(r -> !busyRoomIds.contains(r.getId()))
                .sorted(Comparator.comparingInt((Room r) -> r.getCapacity() - minCapacity)
                        .thenComparing(Room::getRoomName))
                .toList();
    }

    @Transactional
    public Room createRoom(String name, int capacity, RoomType type) {
        validate(name, capacity);
        String trimmed = name.trim();
        if (roomRepository.findByRoomNameIgnoreCase(trimmed).isPresent()) {
            throw new IllegalStateException("A room with the name '" + trimmed + "' already exists");
        }

        Room room = new Room();
        room.setRoomName(trimmed);
        room.setCapacity(capacity);
        room.setRoomType(type);
        room.setActive(true); // active by default
        return roomRepository.save(room);
    }

    @Transactional
    public Room updateRoom(String roomId, String name, int capacity, RoomType type, boolean isActive) {
        validate(name, capacity);
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new NotFoundException("Room not found"));

        String trimmed = name.trim();
        roomRepository.findByRoomNameIgnoreCase(trimmed)
                .filter(existing -> !existing.getId().equals(roomId))
                .ifPresent(existing -> {
                    throw new IllegalStateException("A room with the name '" + trimmed + "' already exists");
                });

        room.setRoomName(trimmed);
        room.setCapacity(capacity);
        room.setRoomType(type);
        room.setActive(isActive);
        return room;
    }

    @Transactional
    public void deleteRoom(String roomId) {
        if (!roomRepository.existsById(roomId))
            throw new NotFoundException("Room not found");

        long schedules = scheduleRepository.countByRoom_Id(roomId);
        if (schedules > 0)
            throw new IllegalStateException(
                    "Cannot delete room — it has " + schedules
                            + " schedule(s) assigned to it. Remove them first.");

        roomRepository.deleteById(roomId);
    }

    private void validate(String name, int capacity) {
        if (name == null || name.isBlank())
            throw new IllegalArgumentException("Room name cannot be empty");
        if (capacity <= 0)
            throw new IllegalArgumentException("Capacity must be greater than 0");
    }
}
