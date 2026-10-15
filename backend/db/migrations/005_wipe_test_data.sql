-- Migration 005: WIPE TEST DATA (Destructive)
-- Empties sections, schedules, blocks, enrollments, grades, payments, balances, carts, and attendance.
-- Resets student enrollment flags and purges invalid cross-department faculty assignments.

-- 1. Display counts before wipe
SELECT 'BEFORE WIPE' AS status;
SELECT 'attendance_records' AS tbl, count(*) AS count FROM attendance_records
UNION ALL SELECT 'attendance_sessions', count(*) FROM attendance_sessions
UNION ALL SELECT 'faculty_evaluations', count(*) FROM faculty_evaluations
UNION ALL SELECT 'cart_items', count(*) FROM cart_items
UNION ALL SELECT 'grades', count(*) FROM grades
UNION ALL SELECT 'quarterly_schedules', count(*) FROM quarterly_schedules
UNION ALL SELECT 'payments', count(*) FROM payments
UNION ALL SELECT 'balances', count(*) FROM balances
UNION ALL SELECT 'enrollments', count(*) FROM enrollments
UNION ALL SELECT 'schedules', count(*) FROM schedules
UNION ALL SELECT 'sections', count(*) FROM sections
UNION ALL SELECT 'section_blocks', count(*) FROM section_blocks;

-- 2. FK-safe leaf-to-root deletion
DELETE FROM attendance_records;
DELETE FROM attendance_sessions;
DELETE FROM faculty_evaluations;
DELETE FROM cart_items;
DELETE FROM grades;
DELETE FROM quarterly_schedules;
DELETE FROM payments;
DELETE FROM balances;
DELETE FROM enrollments;
DELETE FROM schedules;
DELETE FROM sections;
DELETE FROM section_blocks;

-- 3. Reset student enrollment status so all students are eligible to enroll fresh
UPDATE students 
SET has_pending_balance = FALSE, 
    enrollment_confirmed = FALSE;

-- 4. Purge invalid cross-department assigned faculty links
-- (Removes the 14 assignments linking CCS faculty to GE subjects)
DELETE saf 
FROM subject_assigned_faculty saf
JOIN subjects s ON saf.subject_id = s.id
JOIN faculties f ON saf.faculty_id = f.id
WHERE s.department_id != f.department_id;

-- 5. Display counts after wipe
SELECT 'AFTER WIPE' AS status;
SELECT 'attendance_records' AS tbl, count(*) AS count FROM attendance_records
UNION ALL SELECT 'attendance_sessions', count(*) FROM attendance_sessions
UNION ALL SELECT 'faculty_evaluations', count(*) FROM faculty_evaluations
UNION ALL SELECT 'cart_items', count(*) FROM cart_items
UNION ALL SELECT 'grades', count(*) FROM grades
UNION ALL SELECT 'quarterly_schedules', count(*) FROM quarterly_schedules
UNION ALL SELECT 'payments', count(*) FROM payments
UNION ALL SELECT 'balances', count(*) FROM balances
UNION ALL SELECT 'enrollments', count(*) FROM enrollments
UNION ALL SELECT 'schedules', count(*) FROM schedules
UNION ALL SELECT 'sections', count(*) FROM sections
UNION ALL SELECT 'section_blocks', count(*) FROM section_blocks
UNION ALL SELECT 'invalid_cross_dept_faculty_links', count(*) 
    FROM subject_assigned_faculty saf 
    JOIN subjects s ON saf.subject_id = s.id 
    JOIN faculties f ON saf.faculty_id = f.id 
    WHERE s.department_id != f.department_id;

