-- UNCOMMENT ONLY WHEN NECESSARY

-- DROP SCHEMA public CASCADE;

-- CREATE SCHEMA public;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =====================================================
-- USERS
-- =====================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name TEXT NOT NULL,

    email TEXT NOT NULL UNIQUE,

    password TEXT,

    department TEXT,

    institution TEXT,

    role TEXT NOT NULL DEFAULT 'student'
        CHECK (role IN ('teacher', 'student')),

    avatar TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =====================================================
-- TEACHERS
-- =====================================================

CREATE TABLE teachers (
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
--
-- IMPORTANT:
--
-- Subject IDs come from programmes.js.
--
-- The subject name is NOT stored here.
--
-- Example:
--
--     bt5_ml
--
-- programmes.js knows that this means:
--
--     Machine Learning
--
-- teacher_id is nullable because a subject may exist
-- before the admin assigns a teacher.
-- =====================================================

CREATE TABLE subjects (
    subject_id TEXT PRIMARY KEY,

    teacher_id UUID
        REFERENCES teachers(teacher_id)
        ON DELETE SET NULL,

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
--
-- Program and semester are the student's CURRENT
-- academic information.
--
-- Initial values are supplied during signup.
--
-- Admin is allowed to change them later.
--
-- Valid program + semester combinations are validated
-- by the backend against programmes.js.
-- =====================================================

CREATE TABLE students (
    student_id UUID PRIMARY KEY
        REFERENCES users(id)
        ON DELETE CASCADE,

    roll_no TEXT NOT NULL DEFAULT '-',

    program TEXT NOT NULL,

    semester INTEGER NOT NULL
        CHECK (semester BETWEEN 1 AND 8),

    face_registered BOOLEAN NOT NULL DEFAULT FALSE,

    attendance_percentage NUMERIC(5,2)
        NOT NULL
        DEFAULT 0
        CHECK (attendance_percentage BETWEEN 0 AND 100),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =====================================================
-- ENROLLMENTS
--
-- Defines:
--
--     Student <-> Subject
--
-- Admin will manage these relationships.
-- =====================================================

CREATE TABLE enrollments (
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

CREATE TABLE subject_attendances (
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

CREATE TABLE student_attendances (
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
--     Nullable.
--
-- Current faceController stores the first registration
-- image as users.avatar and does not store the second
-- registration image.
-- =====================================================

CREATE TABLE student_face_data (
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

CREATE INDEX idx_enrollments_subject_id
ON enrollments(subject_id);


CREATE INDEX idx_enrollments_student_id
ON enrollments(student_id);


CREATE INDEX idx_student_attendances_subject_date
ON student_attendances(subject_id, date);


CREATE INDEX idx_student_attendances_student_subject
ON student_attendances(student_id, subject_id);


CREATE INDEX idx_subject_attendances_subject_date
ON subject_attendances(subject_id, date);


CREATE INDEX idx_student_face_data_student_id
ON student_face_data(student_id);


CREATE INDEX idx_students_program_semester
ON students(program, semester);


CREATE INDEX idx_subjects_teacher_id
ON subjects(teacher_id);


-- =====================================================
-- RPC: FREQUENT ABSENTEES
-- =====================================================

CREATE OR REPLACE FUNCTION frequent_absentees(
    subject_id_input TEXT
)
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
-- UPDATED_AT FUNCTION
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


-- =====================================================
-- FACE DATA UPDATED_AT TRIGGER
-- =====================================================

CREATE TRIGGER trg_student_face_updated_at
BEFORE UPDATE
ON student_face_data
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- =====================================================
-- INSERT SUBJECTS DATA INTO DB
-- =====================================================

-- =====================================================
-- FIXED SUBJECTS FROM programmes.js
-- =====================================================

INSERT INTO subjects (subject_id)
VALUES

-- B.Tech
('bt1_phy'),
('bt1_math'),
('bt1_prog'),

('bt2_oop'),
('bt2_dsa'),
('bt2_ele'),

('bt3_dbms'),
('bt3_os'),
('bt3_cn'),

('bt4_ai'),
('bt4_comp'),
('bt4_cloud'),

('bt5_os'),
('bt5_ml'),
('bt5_se'),

('bt6_bd'),
('bt6_cs'),
('bt6_bc'),

('bt7_proj'),
('bt7_dl'),

('bt8_intern'),
('bt8_seminar'),

-- M.Tech
('mt1_aai'),
('mt1_ds'),

('mt2_rm'),
('mt2_ml'),

('mt3_thesis'),

('mt4_dissertation'),

-- MSc
('msc1_stats'),
('msc1_py'),

('msc2_dm'),
('msc2_net'),

('msc3_ml'),

('msc4_proj'),

-- MCA
('mca1_stats'),
('mca1_py'),

('mca2_dm'),
('mca2_net'),

('mca3_ml'),

('mca4_proj')

ON CONFLICT (subject_id) DO NOTHING;