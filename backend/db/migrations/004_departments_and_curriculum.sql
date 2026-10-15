-- Migration 004: Add Departments, Curriculum, Subject Overrides, and Lecture/Lab Units
-- Safe and idempotent backfill migration

-- 1. Create departments table
CREATE TABLE IF NOT EXISTS departments (
    id VARCHAR(36) PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Seed CCS and GE departments if not exist
INSERT INTO departments (id, code, name)
VALUES 
    (UUID(), 'CCS', 'College of Computer Studies'),
    (UUID(), 'GE', 'General Education')
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Helper procedure for idempotent column addition in MySQL 8.0
DROP PROCEDURE IF EXISTS AddColumnIfNotExists;
DELIMITER //
CREATE PROCEDURE AddColumnIfNotExists(
    IN tableName VARCHAR(64),
    IN colName VARCHAR(64),
    IN colDef VARCHAR(255)
)
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tableName AND COLUMN_NAME = colName
    ) THEN
        SET @sql = CONCAT('ALTER TABLE ', tableName, ' ADD COLUMN ', colName, ' ', colDef);
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END //
DELIMITER ;

-- 2. Alter courses: add department_id
CALL AddColumnIfNotExists('courses', 'department_id', 'VARCHAR(36) NULL');

-- Backfill courses to CCS
UPDATE courses 
SET department_id = (SELECT id FROM departments WHERE code = 'CCS')
WHERE department_id IS NULL;

-- Add FK on courses.department_id if not present
SET @fk_courses_dept = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'courses' AND CONSTRAINT_NAME = 'fk_courses_department');
SET @sql = IF(@fk_courses_dept = 0, 'ALTER TABLE courses ADD CONSTRAINT fk_courses_department FOREIGN KEY (department_id) REFERENCES departments(id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3. Alter faculties: add department_id
CALL AddColumnIfNotExists('faculties', 'department_id', 'VARCHAR(36) NULL');

-- Backfill existing faculties to CCS
UPDATE faculties 
SET department_id = (SELECT id FROM departments WHERE code = 'CCS')
WHERE department_id IS NULL;

-- Add FK on faculties.department_id if not present
SET @fk_fac_dept = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'faculties' AND CONSTRAINT_NAME = 'fk_faculties_department');
SET @sql = IF(@fk_fac_dept = 0, 'ALTER TABLE faculties ADD CONSTRAINT fk_faculties_department FOREIGN KEY (department_id) REFERENCES departments(id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 4. Alter subjects: add department_id, lecture_units, lab_units, open_to_all
CALL AddColumnIfNotExists('subjects', 'department_id', 'VARCHAR(36) NULL');
CALL AddColumnIfNotExists('subjects', 'lecture_units', 'INT NOT NULL DEFAULT 1');
CALL AddColumnIfNotExists('subjects', 'lab_units', 'INT NOT NULL DEFAULT 2');
CALL AddColumnIfNotExists('subjects', 'open_to_all', 'BOOLEAN NOT NULL DEFAULT FALSE');

-- Clean up helper procedure
DROP PROCEDURE IF EXISTS AddColumnIfNotExists;

-- Add FK on subjects.department_id if not present
SET @fk_subj_dept = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'subjects' AND CONSTRAINT_NAME = 'fk_subjects_department');
SET @sql = IF(@fk_subj_dept = 0, 'ALTER TABLE subjects ADD CONSTRAINT fk_subjects_department FOREIGN KEY (department_id) REFERENCES departments(id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 5. Backfill subjects based on legacy course field
-- GEN: GE department, openToAll=true, lectureUnits=units, labUnits=0
UPDATE subjects
SET department_id = (SELECT id FROM departments WHERE code = 'GE'),
    open_to_all = TRUE,
    lecture_units = units,
    lab_units = 0
WHERE course = 'GEN';

-- CSIT: CCS department, openToAll=false, lectureUnits=1, labUnits=2
UPDATE subjects
SET department_id = (SELECT id FROM departments WHERE code = 'CCS'),
    open_to_all = FALSE,
    lecture_units = 1,
    lab_units = 2
WHERE course = 'CSIT';

-- BSCS: CCS department, openToAll=false
-- Special case CS421: 12 units (labUnits=12, lectureUnits=0)
UPDATE subjects
SET department_id = (SELECT id FROM departments WHERE code = 'CCS'),
    open_to_all = FALSE,
    units = 12,
    lecture_units = 0,
    lab_units = 12
WHERE course = 'BSCS' AND subject_code = 'CS421';

-- Other BSCS: 1 lec, 2 lab
UPDATE subjects
SET department_id = (SELECT id FROM departments WHERE code = 'CCS'),
    open_to_all = FALSE,
    lecture_units = 1,
    lab_units = 2
WHERE course = 'BSCS' AND subject_code != 'CS421';

-- BSIT: CCS department, openToAll=false
-- Special case IT421: 12 units (labUnits=12, lectureUnits=0)
UPDATE subjects
SET department_id = (SELECT id FROM departments WHERE code = 'CCS'),
    open_to_all = FALSE,
    units = 12,
    lecture_units = 0,
    lab_units = 12
WHERE course = 'BSIT' AND subject_code = 'IT421';

-- Other BSIT: 1 lec, 2 lab
UPDATE subjects
SET department_id = (SELECT id FROM departments WHERE code = 'CCS'),
    open_to_all = FALSE,
    lecture_units = 1,
    lab_units = 2
WHERE course = 'BSIT' AND subject_code != 'IT421';

-- 6. Create curriculum_entries table
CREATE TABLE IF NOT EXISTS curriculum_entries (
    id VARCHAR(36) PRIMARY KEY,
    course_id VARCHAR(36) NOT NULL,
    subject_id VARCHAR(36) NOT NULL,
    year_level INT NOT NULL,
    semester VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_curriculum_course_subject UNIQUE (course_id, subject_id),
    CONSTRAINT fk_curriculum_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    CONSTRAINT fk_curriculum_subject FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
);

-- 7. Create subject_course_overrides table
CREATE TABLE IF NOT EXISTS subject_course_overrides (
    id VARCHAR(36) PRIMARY KEY,
    subject_id VARCHAR(36) NOT NULL,
    course_id VARCHAR(36) NOT NULL,
    override_type ENUM('ALLOW', 'DENY') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_override_subject_course UNIQUE (subject_id, course_id),
    CONSTRAINT fk_override_subject FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    CONSTRAINT fk_override_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- 8. Backfill curriculum_entries
-- BSCS real course ID & BSIT real course ID
SET @bscs_id = (SELECT id FROM courses WHERE code = 'BSCS');
SET @bsit_id = (SELECT id FROM courses WHERE code = 'BSIT');

-- (a) BSCS subjects -> curriculum for BSCS
INSERT INTO curriculum_entries (id, course_id, subject_id, year_level, semester)
SELECT UUID(), @bscs_id, s.id, s.year_level, s.semester
FROM subjects s
WHERE s.course = 'BSCS'
ON DUPLICATE KEY UPDATE year_level = VALUES(year_level), semester = VALUES(semester);

-- (b) BSIT subjects -> curriculum for BSIT
INSERT INTO curriculum_entries (id, course_id, subject_id, year_level, semester)
SELECT UUID(), @bsit_id, s.id, s.year_level, s.semester
FROM subjects s
WHERE s.course = 'BSIT'
ON DUPLICATE KEY UPDATE year_level = VALUES(year_level), semester = VALUES(semester);

-- (c) CSIT subjects -> curriculum for both BSCS and BSIT
INSERT INTO curriculum_entries (id, course_id, subject_id, year_level, semester)
SELECT UUID(), @bscs_id, s.id, s.year_level, s.semester
FROM subjects s
WHERE s.course = 'CSIT'
ON DUPLICATE KEY UPDATE year_level = VALUES(year_level), semester = VALUES(semester);

INSERT INTO curriculum_entries (id, course_id, subject_id, year_level, semester)
SELECT UUID(), @bsit_id, s.id, s.year_level, s.semester
FROM subjects s
WHERE s.course = 'CSIT'
ON DUPLICATE KEY UPDATE year_level = VALUES(year_level), semester = VALUES(semester);

-- (d) GEN subjects -> curriculum for both BSCS and BSIT
INSERT INTO curriculum_entries (id, course_id, subject_id, year_level, semester)
SELECT UUID(), @bscs_id, s.id, s.year_level, s.semester
FROM subjects s
WHERE s.course = 'GEN'
ON DUPLICATE KEY UPDATE year_level = VALUES(year_level), semester = VALUES(semester);

INSERT INTO curriculum_entries (id, course_id, subject_id, year_level, semester)
SELECT UUID(), @bsit_id, s.id, s.year_level, s.semester
FROM subjects s
WHERE s.course = 'GEN'
ON DUPLICATE KEY UPDATE year_level = VALUES(year_level), semester = VALUES(semester);
