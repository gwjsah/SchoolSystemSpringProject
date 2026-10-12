package com.schoolsystem.entity;

import com.schoolsystem.entity.enums.RoomType;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "rooms")
@Getter
@Setter
@NoArgsConstructor
public class Room {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(length = 36, nullable = false, updatable = false)
    private String id;

    @NotBlank(message = "Room name is required")
    @Column(nullable = false)
    private String roomName;

    @Positive(message = "Capacity must be positive")
    @Column(nullable = false)
    private int capacity;

    @NotNull(message = "Room type is required")
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RoomType roomType;

    /** Defaults to true; the old class had no default. */
    @Column(nullable = false)
    private boolean isActive = true;
}
