USE `school_management`;

START TRANSACTION;

UPDATE enrollment_periods
SET is_open = 1
WHERE id = 'e66d66dd-b676-41d9-82dd-0adc42c51828';

UPDATE grading_periods
SET is_open = 1
WHERE id = 'a5589d9b-f88f-42b0-bfa4-572b6860accb';

UPDATE evaluation_periods
SET is_open = 1
WHERE id = '68dfd3c6-9a3f-40d9-a9cc-5b41277a72cf';

UPDATE admission_periods
SET is_open = 1
WHERE id = 'c075705d-3c7f-445f-b182-abb4e6609fc2';

UPDATE term_calendars
SET is_active = 1
WHERE id = '37a645c5-691a-4542-af3d-ce94a2820f3c';

COMMIT;