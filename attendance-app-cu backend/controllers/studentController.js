const db = require("../config/db");
const bcrypt = require("bcryptjs");

const TEACHER_CREATED_STUDENT_PASSWORD = "12345678";

const ensureSubjectExists = async (subjectId) => {
  const result = await db.query(
    `SELECT subject_id
     FROM subjects
     WHERE subject_id = $1`,
    [subjectId],
  );

  return result.rows.length > 0;
};

const ensureStudentSubjectAccess = async (subjectId, studentId) => {
  const result = await db.query(
    `SELECT 1
     FROM enrollments
     WHERE subject_id = $1
       AND student_id = $2
     LIMIT 1`,
    [subjectId, studentId],
  );

  return result.rows.length > 0;
};

const ensureTeacherSubjectAccess = async (subjectId, userId) => {
  const result = await db.query(
    `SELECT 1
     FROM subjects
     WHERE subject_id = $1
       AND teacher_id = $2`,
    [subjectId, userId],
  );

  return result.rows.length > 0;
};

const ensureSubjectAccess = async (subjectId, user) => {
  if (user.role === "teacher") {
    return ensureTeacherSubjectAccess(subjectId, user.id);
  }

  if (user.role === "student") {
    return ensureStudentSubjectAccess(subjectId, user.id);
  }

  return false;
};

const incrementSubjectStudentCount = async (subjectId) => {
  await db.query(
    `UPDATE subjects
     SET total_students = total_students + 1
     WHERE subject_id = $1`,
    [subjectId],
  );
};

const decrementSubjectStudentCount = async (subjectId) => {
  await db.query(
    `UPDATE subjects
     SET total_students = GREATEST(total_students - 1, 0)
     WHERE subject_id = $1`,
    [subjectId],
  );
};

// Get student details
exports.getStudentsBySubject = async (req, res) => {
  const { subjectId } = req.params;

  try {
    if (!(await ensureSubjectExists(subjectId))) {
      return res.status(404).json({
        error: "Subject not found",
      });
    }

    const hasAccess = await ensureSubjectAccess(subjectId, req.user);

    if (!hasAccess) {
      return res.status(403).json({
        error: "Access denied",
      });
    }

    const { rows } = await db.query(
      `SELECT
        s.student_id,
        s.roll_no,
        s.face_registered,
        su.name,
        su.email,
        su.department,
        su.institution,
        su.avatar,
        tu.name AS teacher_name,

        COALESCE(
          ROUND(
            100.0 * COUNT(sa.student_id)
            FILTER (WHERE sa.present = true)
            / NULLIF(COUNT(sa.student_id), 0),
            1
          ),
          0
        ) AS subject_attendance

      FROM enrollments e

      JOIN students s
        ON e.student_id = s.student_id

      JOIN users su
        ON s.student_id = su.id

      JOIN subjects sub
        ON e.subject_id = sub.subject_id

      LEFT JOIN teachers t
        ON sub.teacher_id = t.teacher_id

      LEFT JOIN users tu
        ON t.teacher_id = tu.id

      LEFT JOIN student_attendances sa
        ON sa.student_id = s.student_id
        AND sa.subject_id = e.subject_id

      WHERE e.subject_id = $1

      GROUP BY
        s.student_id,
        s.roll_no,
        s.face_registered,
        su.name,
        su.email,
        su.department,
        su.institution,
        su.avatar,
        tu.name

      ORDER BY
        s.roll_no ASC`,
      [subjectId],
    );

    const formatted = rows.map((student) => ({
      id: student.student_id,
      name: student.name,
      email: student.email,
      roll: student.roll_no,
      department: student.department,
      institution: student.institution,
      avatar: student.avatar,
      subjectId,
      teacher: student.teacher_name,
      faceRegistered: student.face_registered,

      // Attendance is now calculated specifically
      // for this subject from student_attendances.
      attendance: Number(student.subject_attendance || 0),
    }));

    res.json(formatted);
  } catch (err) {
    console.error("GET STUDENTS ERROR:", err);

    res.status(500).json({
      error: "Server error",
    });
  }
};
