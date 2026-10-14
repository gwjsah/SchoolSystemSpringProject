package com.schoolsystem.repository;

import com.schoolsystem.entity.Room;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RoomRepository extends JpaRepository<Room, String> {

    Optional<Room> findByRoomNameIgnoreCase(String roomName);
    List<Room> findByIsActiveTrue();
    List<Room> findByIsActiveTrueAndRoomType(com.schoolsystem.entity.enums.RoomType roomType);
}
