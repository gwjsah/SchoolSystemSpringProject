-- Migration 003: Change SectionBlock unique constraint from global section_code to composite (course_code, year_level, section_code)

-- 1. Pre-flight verification: Ensure no duplicate triples exist
SELECT course_code, year_level, section_code, COUNT(*) AS count
FROM section_blocks
GROUP BY course_code, year_level, section_code
HAVING count > 1;

-- 2. Drop the old global unique index on section_code
ALTER TABLE section_blocks DROP INDEX UK_aaqdspgm4jjpcyx8bk9csn962;

-- 3. Add composite unique constraint on (course_code, year_level, section_code)
ALTER TABLE section_blocks
  ADD CONSTRAINT uk_block_course_year_code UNIQUE (course_code, year_level, section_code);

-- 4. Clean up legacy single-column unique index on sections(subject_id) if present
-- and ensure foreign key FK3oa9vsd2t0fe6w612jujape12 is supported by non-unique index
CREATE INDEX IF NOT EXISTS idx_sections_subject_id ON sections(subject_id);
-- Drop legacy unique constraint that incorrectly prevented same subject across multiple blocks
-- (only uk_block_subject on (block_id, subject_id) should be unique)
-- ALTER TABLE sections DROP INDEX uk_section_code_subject;

-- 5. Post-migration verification
SHOW INDEX FROM section_blocks;
SHOW INDEX FROM sections;
