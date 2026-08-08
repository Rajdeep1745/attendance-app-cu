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

const ensureStudentExists = async (studentId) => {
  const { rows } = await db.query(
    `SELECT EXISTS (
        SELECT 1
        FROM students
        WHERE student_id = $1
    ) AS exists`,
    [studentId],
  );

  return rows[0].exists;
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

const formatJoinedOn = (value) => {
  if (!value) return "-";

  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
};

const formatRecordedTime = (value) =>
  new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(value));

// Get student details
exports.getStudentsBySubject = async (req, res) => {
  const { subjectId } = req.params;

  try {
    if (!(await ensureSubjectExists(subjectId))) {
      return res.status(404).json({ error: "Subject not found" });
    }

    const hasAccess = await ensureSubjectAccess(subjectId, req.user);

    if (!hasAccess) {
      return res.status(403).json({ error: "Access denied" });
    }

    const { rows } = await db.query(
      `SELECT
        s.student_id,
        s.roll_no,
        s.face_registered,
        s.attendance_percentage,
        su.name,
        su.email,
        su.department,
        su.institution,
        su.avatar,
        tu.name AS teacher_name
      FROM enrollments e
      JOIN students s
        ON e.student_id = s.student_id
      JOIN users su
        ON s.student_id = su.id
      JOIN subjects sub
        ON e.subject_id = sub.subject_id
      JOIN teachers t
        ON sub.teacher_id = t.teacher_id
      JOIN users tu
        ON t.teacher_id = tu.id
      WHERE e.subject_id = $1`,
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
      attendance: student.attendance_percentage || 0,
    }));

    res.json(formatted);
  } catch (err) {
    console.error("GET STUDENTS ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// ADD STUDENT
exports.addStudentToSubject = async (req, res) => {
  const { name, email, roll, subjectId, department, institution } = req.body;
  const userId = req.user.id;

  const client = await db.pool.connect();

  try {
    const hasAccess = await ensureTeacherSubjectAccess(subjectId, userId);

    if (!hasAccess) {
      client.release();
      return res.status(403).json({ error: "Access denied" });
    }

    await client.query("BEGIN");

    let studentId;

    // Find existing user
    const { rows: existingUsers } = await client.query(
      `SELECT id, name, avatar
       FROM users
       WHERE email = $1`,
      [email],
    );

    if (existingUsers.length > 0) {
      studentId = existingUsers[0].id;
    } else {
      // Create user
      const hashedPassword = await bcrypt.hash(
        TEACHER_CREATED_STUDENT_PASSWORD,
        10,
      );

      const { rows: newUsers } = await client.query(
        `INSERT INTO users (
            name,
            email,
            department,
            institution,
            role,
            avatar,
            password
         )
         VALUES ($1, $2, $3, $4, 'student', $5, $6)
         RETURNING id, name, avatar`,
        [
          name,
          email,
          department,
          institution,
          "https://i.pravatar.cc/150",
          hashedPassword,
        ],
      );

      studentId = newUsers[0].id;

      // Create student
      await client.query(
        `INSERT INTO students (
            student_id,
            roll_no,
            attendance_percentage
         )
         VALUES ($1, $2, 0)`,
        [studentId, roll],
      );
    }

    // Check if already enrolled
    const { rows: existingEnrollment } = await client.query(
      `SELECT id
       FROM enrollments
       WHERE student_id = $1
         AND subject_id = $2`,
      [studentId, subjectId],
    );

    if (existingEnrollment.length > 0) {
      await client.query("ROLLBACK");
      client.release();

      return res.json({
        message: "Student already enrolled in this subject",
      });
    }

    // Enroll student
    await client.query(
      `INSERT INTO enrollments (
          student_id,
          subject_id
       )
       VALUES ($1, $2)`,
      [studentId, subjectId],
    );

    // Increase subject student count
    await incrementSubjectStudentCount(subjectId);

    await client.query("COMMIT");
    client.release();

    res.json({
      id: studentId,
      name: existingUsers[0]?.name || name,
      roll,
      avatar: existingUsers[0]?.avatar,
      attendance: 0,
      faceRegistered: false,
      isNew: true,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    client.release();

    res.status(500).json({ error: err.message });
  }
};

// Remove student from subject
exports.removeStudentFromSubject = async (req, res) => {
  const { studentId, subjectId } = req.params;
  const userId = req.user.id;

  try {
    const hasAccess = await ensureTeacherSubjectAccess(subjectId, userId);

    if (!hasAccess) {
      return res.status(403).json({ error: "Access denied" });
    }

    const { rows } = await db.query(
      `DELETE FROM enrollments
        WHERE student_id = $1
        AND subject_id = $2
        RETURNING id`,
      [studentId, subjectId],
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Enrollment not found" });
    }

    await decrementSubjectStudentCount(subjectId);

    res.json({ message: "Student removed from subject" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
