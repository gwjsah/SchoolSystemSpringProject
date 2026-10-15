-- Migration 006: CLEANUP (Final schema tightening)
-- Run only after backend and frontend code no longer reference Subject.course, year_level, semester,
-- and Faculty.department text.

-- 1. Ensure department_id columns are NOT NULL
ALTER TABLE courses MODIFY department_id VARCHAR(36) NOT NULL;
ALTER TABLE faculties MODIFY department_id VARCHAR(36) NOT NULL;
ALTER TABLE subjects MODIFY department_id VARCHAR(36) NOT NULL;

-- 2. Drop legacy text department column on faculties
ALTER TABLE faculties DROP COLUMN department;

-- 3. Drop legacy course, year_level, semester columns on subjects
ALTER TABLE subjects DROP COLUMN course;
ALTER TABLE subjects DROP COLUMN year_level;
ALTER TABLE subjects DROP COLUMN semester;

-- 4. Delete obsolete pseudo-course rows 'GEN' and 'CSIT'
DELETE FROM courses WHERE code IN ('GEN', 'CSIT');

-- 5. Verification
SHOW COLUMNS FROM subjects;
SHOW COLUMNS FROM faculties;
SELECT id, code, name, department_id FROM courses;

