package com.schoolsystem.entity;

import com.schoolsystem.entity.enums.UserType;
import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Port of models.Account. Admin, Faculty and Student each get their own table joined to "accounts". */
@Entity
@Table(name = "accounts")
@Inheritance(strategy = InheritanceType.JOINED)
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public abstract class Account {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(length = 36, nullable = false, updatable = false)
    private String id;

    @Setter(AccessLevel.NONE)
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, updatable = false)
    private UserType userType;

    @NotBlank(message = "Name cannot be empty")
    @Column(nullable = false)
    private String name;

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email address")
    @Column(nullable = false, unique = true)
    private String email;

    /** Stores a BCrypt hash. The 6-character minimum is enforced on the raw password in the request DTO. */
    @NotBlank(message = "Password is required")
    @Column(nullable = false)
    private String password;

    @NotBlank(message = "Contact number is required")
    @Pattern(regexp = "\\d{11}", message = "Contact number must be 11 digits")
    @Column(nullable = false, length = 11)
    private String contactNumber;

    protected Account(UserType userType) {
        this.userType = userType;
    }
}
