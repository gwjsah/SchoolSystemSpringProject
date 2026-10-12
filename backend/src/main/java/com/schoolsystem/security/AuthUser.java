package com.schoolsystem.security;

import com.schoolsystem.entity.enums.UserType;

/** The logged-in user, rebuilt from the JWT on every request. */
public record AuthUser(String id, String email, UserType userType) {}
