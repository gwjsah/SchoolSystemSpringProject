package com.schoolsystem.entity;

import com.schoolsystem.entity.enums.UserType;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "admins")
@Getter
@Setter
public class Admin extends Account {

    @NotBlank(message = "Employee number is required")
    @Column(nullable = false, unique = true, updatable = false)
    private String employeeNumber;

    public Admin() {
        super(UserType.ADMIN);
    }
}
