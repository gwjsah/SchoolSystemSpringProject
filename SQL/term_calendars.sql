-- Schema for term_calendars table
-- Defines the academic term calendar (school year, semester, class start/end dates, active status)

CREATE TABLE IF NOT EXISTS `term_calendars` (
  `id` varchar(36) NOT NULL,
  `school_year` varchar(255) NOT NULL,
  `semester` enum('FIRST','SECOND','SUMMER') NOT NULL,
  `starts_at` date NOT NULL,
  `ends_at` date NOT NULL,
  `is_active` bit(1) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_term_calendar_sy_sem` (`school_year`, `semester`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

