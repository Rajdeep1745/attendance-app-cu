CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =====================================================
-- USERS
-- =====================================================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT,
    department TEXT,
    institution TEXT,
    role TEXT NOT NULL DEFAULT 'student',
    avatar TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- TEACHERS
-- =====================================================

CREATE TABLE IF NOT EXISTS teachers (
    teacher_id UUID PRIMARY KEY
        REFERENCES users(id)
        ON DELETE CASCADE,

    default_mode TEXT NOT NULL DEFAULT 'manual',

    default_threshold INTEGER NOT NULL
        DEFAULT 75
        CHECK (default_threshold BETWEEN 0 AND 100),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- BATCHES
-- =====================================================

CREATE TABLE IF NOT EXISTS batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    teacher_id UUID
        REFERENCES teachers(teacher_id)
        ON DELETE CASCADE,

    subject_id TEXT UNIQUE,

    -- kept for backend compatibility
    name TEXT,

    batch_code TEXT NOT NULL UNIQUE
        DEFAULT UPPER(
            SUBSTRING(
                REPLACE(gen_random_uuid()::TEXT,'-',''),
                1,
                6
            )
        ),

    threshold INTEGER NOT NULL
        DEFAULT 75
        CHECK (threshold BETWEEN 0 AND 100),

    total_students INTEGER NOT NULL
        DEFAULT 0
        CHECK (total_students >= 0),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CHECK (
        COALESCE(
            NULLIF(subject_id,''),
            NULLIF(name,'')
        ) IS NOT NULL
    )
);

-- =====================================================
-- STUDENTS
-- =====================================================

CREATE TABLE IF NOT EXISTS students (
    student_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL UNIQUE
        REFERENCES users(id)
        ON DELETE CASCADE,

    roll_no TEXT NOT NULL UNIQUE,

    face_registered BOOLEAN NOT NULL DEFAULT FALSE,

    alert_threshold INTEGER NOT NULL
        DEFAULT 75
        CHECK (alert_threshold BETWEEN 0 AND 100),

    preferred_view TEXT NOT NULL
        DEFAULT 'dashboard',

    attendance_percentage NUMERIC(5,2)
        NOT NULL
        DEFAULT 0
        CHECK (attendance_percentage BETWEEN 0 AND 100),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- ENROLLMENTS
-- =====================================================

CREATE TABLE IF NOT EXISTS enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    student_id UUID NOT NULL
        REFERENCES students(student_id)
        ON DELETE CASCADE,

    batch_id UUID NOT NULL
        REFERENCES batches(id)
        ON DELETE CASCADE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(student_id, batch_id)
);

-- =====================================================
-- BATCH ATTENDANCE
-- =====================================================

CREATE TABLE IF NOT EXISTS batch_attendances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    batch_id UUID NOT NULL
        REFERENCES batches(id)
        ON DELETE CASCADE,

    date DATE NOT NULL,

    attendance_percentage NUMERIC(5,2)
        NOT NULL
        DEFAULT 0
        CHECK (attendance_percentage BETWEEN 0 AND 100),

    presences INTEGER NOT NULL
        DEFAULT 0
        CHECK (presences >= 0),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(batch_id, date)
);

-- =====================================================
-- STUDENT ATTENDANCE
-- =====================================================

CREATE TABLE IF NOT EXISTS student_attendances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    student_id UUID NOT NULL
        REFERENCES students(student_id)
        ON DELETE CASCADE,

    batch_id UUID NOT NULL
        REFERENCES batches(id)
        ON DELETE CASCADE,

    date DATE NOT NULL,

    present BOOLEAN NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(student_id, batch_id, date)
);

-- =====================================================
-- LECTURE CURRICULUM
-- =====================================================

CREATE TABLE IF NOT EXISTS lecture_curriculum (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    batch_id UUID NOT NULL UNIQUE
        REFERENCES batches(id)
        ON DELETE CASCADE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- CURRICULUM TOPICS
-- =====================================================

CREATE TABLE IF NOT EXISTS lecture_curriculum_topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    curriculum_id UUID NOT NULL
        REFERENCES lecture_curriculum(id)
        ON DELETE CASCADE,

    unit_name TEXT NOT NULL,

    topic_name TEXT NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- LECTURE SCHEDULE
-- =====================================================

CREATE TABLE IF NOT EXISTS lecture_schedule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    batch_id UUID NOT NULL
        REFERENCES batches(id)
        ON DELETE CASCADE,

    topic_id UUID NOT NULL
        REFERENCES lecture_curriculum_topics(id)
        ON DELETE CASCADE,

    week_no INTEGER NOT NULL
        CHECK (week_no > 0),

    objectives TEXT,

    classes INTEGER NOT NULL
        DEFAULT 1
        CHECK (classes >= 0),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- FACE DATA
-- =====================================================

CREATE TABLE IF NOT EXISTS student_face_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    student_id UUID NOT NULL UNIQUE
        REFERENCES students(student_id)
        ON DELETE CASCADE,

    image_url TEXT,

    embedding JSONB,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_enrollments_batch_id
ON enrollments(batch_id);

CREATE INDEX IF NOT EXISTS idx_student_attendances_batch_date
ON student_attendances(batch_id, date);

CREATE INDEX IF NOT EXISTS idx_batch_attendances_batch_date
ON batch_attendances(batch_id, date);

CREATE INDEX IF NOT EXISTS idx_lecture_schedule_batch_id
ON lecture_schedule(batch_id);

CREATE INDEX IF NOT EXISTS idx_curriculum_topics_curriculum_id
ON lecture_curriculum_topics(curriculum_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_batches_subject_id
ON batches(subject_id);

-- =====================================================
-- TRIGGER: KEEP subject_id AND name IN SYNC
-- =====================================================

CREATE OR REPLACE FUNCTION sync_batch_subject_name()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- If only name is supplied
    IF NEW.subject_id IS NULL OR TRIM(NEW.subject_id) = '' THEN
        NEW.subject_id := NEW.name;
    END IF;

    -- If only subject_id is supplied
    IF NEW.name IS NULL OR TRIM(NEW.name) = '' THEN
        NEW.name := NEW.subject_id;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_batch_subject_name
ON batches;

CREATE TRIGGER trg_sync_batch_subject_name
BEFORE INSERT OR UPDATE
ON batches
FOR EACH ROW
EXECUTE FUNCTION sync_batch_subject_name();

-- =====================================================
-- RPC: INCREMENT STUDENT COUNT
-- =====================================================

CREATE OR REPLACE FUNCTION increment_student_count(batch_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE batches
    SET total_students = total_students + 1
    WHERE id = batch_id;
END;
$$;

-- =====================================================
-- RPC: DECREMENT STUDENT COUNT
-- =====================================================

CREATE OR REPLACE FUNCTION decrement_student_count(batch_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE batches
    SET total_students = GREATEST(total_students - 1, 0)
    WHERE id = batch_id;
END;
$$;

-- =====================================================
-- RPC: FREQUENT ABSENTEES
-- =====================================================

CREATE OR REPLACE FUNCTION frequent_absentees(batch_id_input UUID)
RETURNS TABLE (
    id UUID,
    name TEXT,
    absences BIGINT
)
LANGUAGE SQL
AS $$
    SELECT
        s.student_id AS id,
        u.name,
        COUNT(*) AS absences
    FROM student_attendances sa
    INNER JOIN students s
        ON s.student_id = sa.student_id
    INNER JOIN users u
        ON u.id = s.user_id
    WHERE sa.batch_id = batch_id_input
      AND sa.present = FALSE
    GROUP BY
        s.student_id,
        u.name
    ORDER BY
        absences DESC,
        u.name ASC;
$$;

-- =====================================================
-- AUTOMATICALLY UPDATE updated_at FOR FACE DATA
-- =====================================================

CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_student_face_updated_at
ON student_face_data;

CREATE TRIGGER trg_student_face_updated_at
BEFORE UPDATE
ON student_face_data
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE users IS
'Application users';

COMMENT ON TABLE teachers IS
'Teacher-specific preferences';

COMMENT ON TABLE students IS
'Student profile linked to a user';

COMMENT ON TABLE batches IS
'One runtime batch for every subject';

COMMENT ON TABLE enrollments IS
'Student to subject mapping';

COMMENT ON TABLE batch_attendances IS
'Attendance summary for each class date';

COMMENT ON TABLE student_attendances IS
'Attendance record of every student';

COMMENT ON TABLE lecture_curriculum IS
'Syllabus container for a subject';

COMMENT ON TABLE lecture_curriculum_topics IS
'Topics grouped by unit';

COMMENT ON TABLE lecture_schedule IS
'Weekly teaching plan';

COMMENT ON TABLE student_face_data IS
'Stored face embedding used for recognition';