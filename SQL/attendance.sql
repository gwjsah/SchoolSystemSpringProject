-- Schema for attendance_sessions and attendance_records tables

CREATE TABLE IF NOT EXISTS `attendance_sessions` (
  `id` varchar(36) NOT NULL,
  `section_id` varchar(36) NOT NULL,
  `term_id` varchar(36) NOT NULL,
  `date` date NOT NULL,
  `type` enum('REGULAR','MAKEUP') NOT NULL DEFAULT 'REGULAR',
  `status` enum('HELD','CANCELLED') NOT NULL DEFAULT 'HELD',
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_attendance_session_section_date` (`section_id`, `date`),
  KEY `idx_attendance_sessions_term` (`term_id`),
  KEY `idx_attendance_sessions_date` (`date`),
  CONSTRAINT `fk_att_session_section` FOREIGN KEY (`section_id`) REFERENCES `sections` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_att_session_term` FOREIGN KEY (`term_id`) REFERENCES `term_calendars` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `attendance_records` (
  `id` varchar(36) NOT NULL,
  `session_id` varchar(36) NOT NULL,
  `student_id` varchar(36) NOT NULL,
  `status` enum('PRESENT','ABSENT','LATE') NOT NULL,
  `remarks` varchar(255) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_attendance_record_session_student` (`session_id`, `student_id`),
  KEY `idx_attendance_records_student` (`student_id`),
  CONSTRAINT `fk_att_record_session` FOREIGN KEY (`session_id`) REFERENCES `attendance_sessions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_att_record_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

