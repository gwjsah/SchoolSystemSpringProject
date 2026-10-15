package com.schoolsystem.entity;

import com.schoolsystem.entity.enums.UserType;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "faculties")
@Getter
@Setter
public class Faculty extends Account {

    @NotBlank(message = "Employee number is required")
    @Column(nullable = false, unique = true, updatable = false)
    private String employeeNumber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "department_id")
    private Department department;

    @NotBlank(message = "Position cannot be empty")
    @Column(nullable = false)
    private String position;

    public Faculty() {
        super(UserType.FACULTY);
    }
}
