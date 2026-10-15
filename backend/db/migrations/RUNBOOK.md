# Migration Runbook: Section Block Composite Uniqueness

## Migration: 003_section_block_composite_unique.sql

### Purpose
Allows sections with the same code (e.g. `CS-F1`, `CS-F2`) to exist across different academic year levels (e.g. Year 1 and Year 2 of BSCS).
Section codes are now scoped and unique within a **(course_code, year_level)** pair.

---

### Step 1: Backup Database First
Before running any migration, take a database dump:
```powershell
mysqldump -u root -proot school_management > "backend/db/migrations/backup_before_003.sql"
```

---

### Step 2: Run Migration SQL
Execute the SQL statements in `003_section_block_composite_unique.sql`:
```powershell
& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -proot school_management < backend/db/migrations/003_section_block_composite_unique.sql
```

Statements executed:
1. Verify no duplicate triples currently exist:
   ```sql
   SELECT course_code, year_level, section_code, COUNT(*)
   FROM section_blocks
   GROUP BY course_code, year_level, section_code
   HAVING COUNT(*) > 1;
   ```
2. Drop the old global unique index:
   ```sql
   ALTER TABLE section_blocks DROP INDEX UK_aaqdspgm4jjpcyx8bk9csn962;
   ```
3. Add the composite unique constraint:
   ```sql
   ALTER TABLE section_blocks
     ADD CONSTRAINT uk_block_course_year_code UNIQUE (course_code, year_level, section_code);
   ```

---

### Step 3: Verify Output
Check indexes on `section_blocks`:
```sql
SHOW INDEX FROM section_blocks;
```
Expected result:
- `PRIMARY` on `id`
- `uk_block_course_year_code` on `(course_code, year_level, section_code)`
- `UK_aaqdspgm4jjpcyx8bk9csn962` is completely removed.

---

### Rollback Procedure
If needed, restore the backup taken in Step 1:
```powershell
& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -proot school_management < backend/db/migrations/backup_before_003.sql
```

---

## Migration 004: Departments, Curriculum, Subject Overrides, and Lecture/Lab Units (004_departments_and_curriculum.sql)

### Purpose
Introduces the Department and Curriculum architecture:
1. Creates `departments` table with initial rows: `CCS` ("College of Computer Studies") and `GE` ("General Education").
2. Connects `courses`, `faculties`, and `subjects` to `departments`.
3. Adds `lecture_units`, `lab_units`, and `open_to_all` to `subjects`.
4. Creates `curriculum_entries` and `subject_course_overrides`.
5. Backfills curriculum recommendations for BSCS and BSIT from old subject course/year/semester data.

### Step 1: Backup
```powershell
& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe" -u root -proot school_management > backend/db/migrations/backup_before_004.sql
```

### Step 2: Run Migration 004
```powershell
& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -proot school_management < backend/db/migrations/004_departments_and_curriculum.sql
```

### Step 3: Verification
```sql
SELECT code, name FROM departments;
SELECT course, count(*), sum(lecture_units), sum(lab_units) FROM subjects GROUP BY course;
SELECT c.code, count(ce.id) FROM curriculum_entries ce JOIN courses c ON ce.course_id = c.id GROUP BY c.code;
```

---

## Migration 005: Wipe Test Data and Reset Student Eligibility (005_wipe_test_data.sql)

### Purpose
Safely wipes all sections, schedules, blocks, enrollments, grades, payments, balances, cart items, and attendance records. Resets student enrollment flags and purges invalid cross-department faculty assignments.

### Step 1: Run Migration 005
```powershell
& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -proot school_management < backend/db/migrations/005_wipe_test_data.sql
```

### Step 2: Verification
All section, schedule, and transaction tables should report 0 rows. Students have `has_pending_balance = 0` and `enrollment_confirmed = 0`. Zero cross-department faculty assignments remain.

---

## Migration 006: Cleanup Legacy Columns and Pseudo-Courses (006_cleanup_subject_course.sql)

### Purpose
Drops old `Subject.course`, `Subject.year_level`, `Subject.semester`, and `Faculty.department` text column after code changes are deployed. Removes obsolete `GEN` and `CSIT` rows from `courses`. Tightens `department_id` to `NOT NULL`.

### Step 1: Run Migration 006
```powershell
& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -proot school_management < backend/db/migrations/006_cleanup_subject_course.sql
```


