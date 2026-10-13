-- Schema for admission_periods table
-- Matches the schema format of enrollment_periods and evaluation_periods

CREATE TABLE IF NOT EXISTS `admission_periods` (
  `id` varchar(36) NOT NULL,
  `ends_at` datetime(6) NOT NULL,
  `is_open` bit(1) NOT NULL,
  `school_year` varchar(255) NOT NULL,
  `semester` enum('FIRST','SECOND','SUMMER') NOT NULL,
  `starts_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

