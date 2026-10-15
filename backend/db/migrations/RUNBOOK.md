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

