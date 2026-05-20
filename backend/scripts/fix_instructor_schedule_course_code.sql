-- instructor_schedule: EF Core / API `course_code` kolonunu garanti eder.
-- Eski şemada yalnızca `course_name` varsa yeniden adlandırır; veri korunur.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'instructor_schedule' AND column_name = 'course_name'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'instructor_schedule' AND column_name = 'course_code'
  ) THEN
    ALTER TABLE instructor_schedule RENAME COLUMN course_name TO course_code;
  END IF;
END $$;

ALTER TABLE instructor_schedule ADD COLUMN IF NOT EXISTS course_code TEXT NULL;
ALTER TABLE instructor_schedule ALTER COLUMN course_code DROP NOT NULL;
