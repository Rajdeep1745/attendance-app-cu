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
-- SUBJECTS
-- =====================================================

CREATE TABLE IF NOT EXISTS subjects (
    subject_id TEXT PRIMARY KEY,

    teacher_id UUID NOT NULL
        REFERENCES teachers(teacher_id)
        ON DELETE CASCADE,

    threshold INTEGER NOT NULL
        DEFAULT 75
        CHECK (threshold BETWEEN 0 AND 100),

    total_students INTEGER NOT NULL
        DEFAULT 0
        CHECK (total_students >= 0),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =====================================================
-- STUDENTS
-- =====================================================

CREATE TABLE IF NOT EXISTS students (
    student_id UUID PRIMARY KEY
        REFERENCES users(id)
        ON DELETE CASCADE,

    roll_no TEXT NOT NULL DEFAULT '-',

    face_registered BOOLEAN NOT NULL DEFAULT FALSE,

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

    subject_id TEXT NOT NULL
        REFERENCES subjects(subject_id)
        ON DELETE CASCADE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(student_id, subject_id)
);


-- =====================================================
-- SUBJECT ATTENDANCE
-- =====================================================

CREATE TABLE IF NOT EXISTS subject_attendances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    subject_id TEXT NOT NULL
        REFERENCES subjects(subject_id)
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

    UNIQUE(subject_id, date)
);


-- =====================================================
-- STUDENT ATTENDANCE
-- =====================================================

CREATE TABLE IF NOT EXISTS student_attendances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    student_id UUID NOT NULL
        REFERENCES students(student_id)
        ON DELETE CASCADE,

    subject_id TEXT NOT NULL
        REFERENCES subjects(subject_id)
        ON DELETE CASCADE,

    date DATE NOT NULL,

    present BOOLEAN NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(student_id, subject_id, date)
);


-- =====================================================
-- FACE DATA
--
-- One student can have up to TWO face templates.
--
-- sample_index:
--     1 = first registration photo
--     2 = second registration photo
--
-- embedding:
--     512-dimensional ArcFace embedding
--
-- image_url:
--     Kept nullable.
--     Current faceController intentionally does NOT
--     store the registration images here.
--
-- The first registration image is stored as users.avatar.
-- =====================================================

CREATE TABLE IF NOT EXISTS student_face_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    student_id UUID NOT NULL
        REFERENCES students(student_id)
        ON DELETE CASCADE,

    sample_index INTEGER NOT NULL
        CHECK (sample_index BETWEEN 1 AND 2),

    image_url TEXT,

    embedding JSONB NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(student_id, sample_index)
);


-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_enrollments_subject_id
ON enrollments(subject_id);


CREATE INDEX IF NOT EXISTS idx_student_attendances_subject_date
ON student_attendances(subject_id, date);


CREATE INDEX IF NOT EXISTS idx_student_attendances_student_subject
ON student_attendances(student_id, subject_id);


CREATE INDEX IF NOT EXISTS idx_subject_attendances_subject_date
ON subject_attendances(subject_id, date);


CREATE INDEX IF NOT EXISTS idx_student_face_data_student_id
ON student_face_data(student_id);


-- =====================================================
-- RPC: FREQUENT ABSENTEES
-- =====================================================

CREATE OR REPLACE FUNCTION frequent_absentees(subject_id_input TEXT)
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
        ON u.id = s.student_id
    WHERE sa.subject_id = subject_id_input
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