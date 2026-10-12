package com.schoolsystem.service;

import com.schoolsystem.exception.NotFoundException;

import com.schoolsystem.entity.Room;
import com.schoolsystem.entity.enums.RoomType;
import com.schoolsystem.repository.RoomRepository;
import com.schoolsystem.repository.ScheduleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class RoomService {

    private final RoomRepository roomRepository;
    private final ScheduleRepository scheduleRepository;

    @Transactional(readOnly = true)
    public List<Room> getAllRooms() {
        return roomRepository.findAll();
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
