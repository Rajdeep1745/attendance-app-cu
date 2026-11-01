const db = require("../config/db");
const jwt = require("jsonwebtoken");

// All subject metadata is read from the database. subject_id is only a stable
// relational key; it is never decoded into a name, programme, or semester.
const getSubjectDetails = async (subjectId) => {
  const result = await db.query(
    `SELECT subject_id AS id, subject_id, name, program, semester
     FROM subjects
     WHERE subject_id = $1
     LIMIT 1`,
    [subjectId],
  );
  return result.rows[0] || null;
};

const isValidProgrammeSemester = async (program, semester) => {
  if (!program || semester === undefined || semester === null || semester === "") {
    return false;
  }
  const result = await db.query(
    `SELECT 1
     FROM academic_programme_semesters
     WHERE program = $1 AND semester = $2
     LIMIT 1`,
    [String(program).trim(), Number(semester)],
  );
  return result.rows.length > 0;
};

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is missing");
}

if (!process.env.ADMIN_EMAIL) {
  throw new Error("ADMIN_EMAIL is missing");
}

if (!process.env.ADMIN_PASSWORD) {
  throw new Error("ADMIN_PASSWORD is missing");
}

const JWT_SECRET = process.env.JWT_SECRET;

const ADMIN_EMAIL = process.env.ADMIN_EMAIL.trim().toLowerCase();

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

// =========================================================
// ADMIN LOGIN
// =========================================================

exports.login = async (req, res) => {
  const { email, password } = req.body;

  const normalizedEmail = email?.trim().toLowerCase();

  if (!normalizedEmail || !password) {
    return res.status(400).json({
      error: "Email and password are required",
    });
  }

  if (normalizedEmail !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
    return res.status(401).json({
      error: "Invalid admin credentials",
    });
  }

  const token = jwt.sign(
    {
      id: "admin",
      role: "admin",
    },
    JWT_SECRET,
    {
      expiresIn: "7d",
    },
  );

  return res.json({
    token,

    user: {
      id: "admin",
      email: ADMIN_EMAIL,
      role: "admin",
    },
  });
};

// =========================================================
// GET ALL STUDENTS
// =========================================================

exports.getStudents = async (req, res) => {
  try {
    const result = await db.query(
      `
          SELECT
            u.id,
            u.name,
            u.email,
            u.department,
            u.avatar,

            s.roll_no,
            s.program,
            s.semester,
            s.face_registered,
            s.attendance_percentage,
            s.created_at

          FROM students s

          INNER JOIN users u
            ON u.id = s.student_id

          ORDER BY
            s.program ASC,
            s.semester ASC,
            s.roll_no ASC,
            u.name ASC
        `,
    );

    return res.json({
      students: result.rows,
    });
  } catch (err) {
    console.error("ADMIN GET STUDENTS ERROR:", err);

    return res.status(500).json({
      error: "Failed to fetch students",
    });
  }
};

// =========================================================
// GET ONE STUDENT
// =========================================================

exports.getStudent = async (req, res) => {
  const { studentId } = req.params;

  try {
    const result = await db.query(
      `
          SELECT
            u.id,
            u.name,
            u.email,
            u.department,
            u.avatar,

            s.roll_no,
            s.program,
            s.semester,
            s.face_registered,
            s.attendance_percentage,
            s.created_at

          FROM students s

          INNER JOIN users u
            ON u.id = s.student_id

          WHERE s.student_id = $1
        `,
      [studentId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Student not found",
      });
    }

    return res.json({
      student: result.rows[0],
    });
  } catch (err) {
    console.error("ADMIN GET STUDENT ERROR:", err);

    return res.status(500).json({
      error: "Failed to fetch student",
    });
  }
};

// =========================================================
// UPDATE STUDENT ACADEMIC INFORMATION
// =========================================================
//
// Admin can change:
//
//     roll_no
//     program
//     semester
//
// Existing attendance/enrollments are NOT deleted.
// =========================================================

exports.updateStudent = async (req, res) => {
  const { studentId } = req.params;

  const { roll_no, program, semester } = req.body;

  // -------------------------------------------------------
  // Require all three values
  // -------------------------------------------------------

  if (
    roll_no === undefined ||
    program === undefined ||
    semester === undefined
  ) {
    return res.status(400).json({
      error: "roll_no, program, and semester are required",
    });
  }

  const studentProgram = String(program).trim();

  const studentRollNo = String(roll_no).trim();

  const studentSemester = Number(semester);

  // -------------------------------------------------------
  // Basic validation
  // -------------------------------------------------------

  if (!studentRollNo) {
    return res.status(400).json({
      error: "Roll number cannot be empty",
    });
  }

  if (!Number.isInteger(studentSemester)) {
    return res.status(400).json({
      error: "Semester must be a valid integer",
    });
  }

  // -------------------------------------------------------
  // Validate program + semester
  // against database academic programme options
  // -------------------------------------------------------

  if (!(await isValidProgrammeSemester(studentProgram, studentSemester))) {
    return res.status(400).json({
      error: "Invalid program and semester combination",
    });
  }

  try {
    const result = await db.query(
      `
        UPDATE students

        SET
          roll_no = $1,
          program = $2,
          semester = $3

        WHERE student_id = $4

        RETURNING
          student_id,
          roll_no,
          program,
          semester,
          face_registered,
          attendance_percentage,
          created_at
      `,
      [studentRollNo, studentProgram, studentSemester, studentId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Student not found",
      });
    }

    return res.json({
      message: "Student updated successfully",

      student: result.rows[0],
    });
  } catch (err) {
    console.error("ADMIN UPDATE STUDENT ERROR:", err);

    return res.status(500).json({
      error: "Failed to update student",
    });
  }
};

// =========================================================
// GET ALL TEACHERS
// =========================================================

exports.getTeachers = async (req, res) => {
  try {
    const result = await db.query(
      `
        SELECT
          u.id,
          u.name,
          u.email,
          u.department,
          u.institution,
          u.avatar,
          t.default_mode,
          t.default_threshold
        FROM teachers t
        INNER JOIN users u ON u.id = t.teacher_id
        ORDER BY u.name ASC
      `,
    );

    return res.json({
      teachers: result.rows,
    });
  } catch (err) {
    console.error("ADMIN GET TEACHERS ERROR:", err);

    return res.status(500).json({
      error: "Failed to fetch teachers",
    });
  }
};


// =========================================================
// CREATE / UPDATE / DELETE SUBJECTS (DATABASE-DRIVEN)
// =========================================================
const crypto = require("crypto");

exports.createSubject = async (req, res) => {
  const { name, program, semester, subjectId } = req.body;
  const cleanName = String(name || "").trim();
  const cleanProgram = String(program || "").trim();
  const cleanSemester = Number(semester);
  const id = String(subjectId || crypto.randomUUID()).trim();

  if (!cleanName || !cleanProgram || !Number.isInteger(cleanSemester)) {
    return res.status(400).json({ error: "Subject name, programme, and semester are required" });
  }

  try {
    if (!(await isValidProgrammeSemester(cleanProgram, cleanSemester))) {
      return res.status(400).json({ error: "Select a programme and semester configured in the database" });
    }

    const result = await db.query(
      `INSERT INTO subjects (subject_id, name, program, semester)
       VALUES ($1, $2, $3, $4)
       RETURNING subject_id, name, program, semester, teacher_id, threshold, total_students`,
      [id, cleanName, cleanProgram, cleanSemester],
    );

    await db.query(
      `INSERT INTO enrollments (student_id, subject_id)
       SELECT s.student_id, $1 FROM students s
       WHERE s.program = $2 AND s.semester = $3
       ON CONFLICT (student_id, subject_id) DO NOTHING`,
      [id, cleanProgram, cleanSemester],
    );

    const count = await db.query(`SELECT COUNT(*)::int AS count FROM enrollments WHERE subject_id = $1`, [id]);
    await db.query(`UPDATE subjects SET total_students = $1 WHERE subject_id = $2`, [count.rows[0].count, id]);

    return res.status(201).json({ subject: { ...result.rows[0], total_students: count.rows[0].count } });
  } catch (err) {
    console.error("ADMIN CREATE SUBJECT ERROR:", err);
    return res.status(err.code === "23505" ? 409 : 500).json({
      error: err.code === "23505" ? "That subject ID already exists" : "Failed to create subject",
    });
  }
};

exports.updateSubject = async (req, res) => {
  const { subjectId } = req.params;
  const { name, program, semester } = req.body;
  const cleanName = String(name || "").trim();
  const cleanProgram = String(program || "").trim();
  const cleanSemester = Number(semester);

  if (!cleanName || !cleanProgram || !Number.isInteger(cleanSemester)) {
    return res.status(400).json({ error: "Subject name, programme, and semester are required" });
  }

  try {
    if (!(await isValidProgrammeSemester(cleanProgram, cleanSemester))) {
      return res.status(400).json({ error: "Select a programme and semester configured in the database" });
    }

    const result = await db.query(
      `UPDATE subjects SET name = $1, program = $2, semester = $3
       WHERE subject_id = $4
       RETURNING subject_id, name, program, semester, teacher_id, threshold, total_students`,
      [cleanName, cleanProgram, cleanSemester, subjectId],
    );
    if (!result.rows.length) return res.status(404).json({ error: "Subject not found" });

    // Keep enrollment membership synchronized with the database programme/semester.
    await db.query(
      `DELETE FROM enrollments e
       USING students s
       WHERE e.student_id = s.student_id
         AND e.subject_id = $1
         AND (s.program <> $2 OR s.semester <> $3)`,
      [subjectId, cleanProgram, cleanSemester],
    );
    await db.query(
      `INSERT INTO enrollments (student_id, subject_id)
       SELECT s.student_id, $1 FROM students s
       WHERE s.program = $2 AND s.semester = $3
       ON CONFLICT (student_id, subject_id) DO NOTHING`,
      [subjectId, cleanProgram, cleanSemester],
    );
    const count = await db.query(`SELECT COUNT(*)::int AS count FROM enrollments WHERE subject_id = $1`, [subjectId]);
    await db.query(`UPDATE subjects SET total_students = $1 WHERE subject_id = $2`, [count.rows[0].count, subjectId]);

    return res.json({ subject: { ...result.rows[0], total_students: count.rows[0].count } });
  } catch (err) {
    console.error("ADMIN UPDATE SUBJECT ERROR:", err);
    return res.status(500).json({ error: "Failed to update subject" });
  }
};

exports.deleteSubject = async (req, res) => {
  try {
    const result = await db.query(
      `DELETE FROM subjects WHERE subject_id = $1 RETURNING subject_id, name`,
      [req.params.subjectId],
    );
    if (!result.rows.length) return res.status(404).json({ error: "Subject not found" });
    return res.json({ message: "Subject deleted", subject: result.rows[0] });
  } catch (err) {
    console.error("ADMIN DELETE SUBJECT ERROR:", err);
    return res.status(500).json({ error: "Failed to delete subject" });
  }
};

// =========================================================
// GET ALL SUBJECTS
// =========================================================

exports.getSubjects = async (req, res) => {
  try {
    const result = await db.query(
      `
        SELECT
          s.subject_id,
          s.name,
          s.program,
          s.semester,
          s.teacher_id,
          u.name AS teacher_name,
          u.email AS teacher_email,
          s.threshold,
          s.total_students

        FROM subjects s

        LEFT JOIN teachers t
          ON t.teacher_id = s.teacher_id

        LEFT JOIN users u
          ON u.id = t.teacher_id

        ORDER BY
          s.program ASC, s.semester ASC, s.name ASC
      `,
    );

    const subjects = result.rows;

    return res.json({
      subjects,
    });
  } catch (err) {
    console.error("ADMIN GET SUBJECTS ERROR:", err);

    return res.status(500).json({
      error: "Failed to fetch subjects",
    });
  }
};

// =========================================================
// ASSIGN TEACHER TO SUBJECT
// =========================================================

exports.assignTeacherToSubject = async (req, res) => {
  const { subjectId } = req.params;

  const { teacherId } = req.body;

  if (!teacherId) {
    return res.status(400).json({
      error: "teacherId is required",
    });
  }

  // -------------------------------------------------------
  // Make sure subject exists in the database
  // -------------------------------------------------------

  const subjectDetails = await getSubjectDetails(subjectId);

  if (!subjectDetails) {
    return res.status(404).json({
      error: "Subject not found in database",
    });
  }

  try {
    // -----------------------------------------------------
    // Verify teacher exists
    // -----------------------------------------------------

    const teacherResult = await db.query(
      `
          SELECT
            t.teacher_id,
            u.name,
            u.email

          FROM teachers t

          INNER JOIN users u
            ON u.id = t.teacher_id

          WHERE t.teacher_id = $1
        `,
      [teacherId],
    );

    if (teacherResult.rows.length === 0) {
      return res.status(404).json({
        error: "Teacher not found",
      });
    }

    const teacher = teacherResult.rows[0];

    // -----------------------------------------------------
    // Assign teacher
    // -----------------------------------------------------

    const result = await db.query(
      `
          UPDATE subjects

          SET teacher_id = $1

          WHERE subject_id = $2

          RETURNING
            subject_id,
            teacher_id,
            threshold,
            total_students
        `,
      [teacherId, subjectId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Subject is not initialized in the database",
      });
    }

    return res.json({
      message: "Teacher assigned successfully",

      subject: {
        subject_id: subjectId,

        name: subjectDetails.name,

        program: subjectDetails.program,

        semester: subjectDetails.semester,

        teacher_id: teacher.teacher_id,

        teacher_name: teacher.name,

        teacher_email: teacher.email,

        threshold: result.rows[0].threshold,

        total_students: result.rows[0].total_students,
      },
    });
  } catch (err) {
    console.error("ADMIN ASSIGN TEACHER ERROR:", err);

    return res.status(500).json({
      error: "Failed to assign teacher",
    });
  }
};

// =========================================================
// REMOVE TEACHER FROM SUBJECT
// =========================================================

exports.removeTeacherFromSubject = async (req, res) => {
  const { subjectId } = req.params;

  const subjectDetails = await getSubjectDetails(subjectId);

  if (!subjectDetails) {
    return res.status(404).json({
      error: "Subject not found in database",
    });
  }

  try {
    const result = await db.query(
      `
          UPDATE subjects

          SET teacher_id = NULL

          WHERE subject_id = $1

          RETURNING
            subject_id,
            threshold,
            total_students
        `,
      [subjectId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Subject is not initialized in the database",
      });
    }

    return res.json({
      message: "Teacher removed successfully",

      subject: {
        subject_id: subjectId,

        name: subjectDetails.name,

        program: subjectDetails.program,

        semester: subjectDetails.semester,

        teacher_id: null,

        teacher_name: null,

        teacher_email: null,

        threshold: result.rows[0].threshold,

        total_students: result.rows[0].total_students,
      },
    });
  } catch (err) {
    console.error("ADMIN REMOVE TEACHER ERROR:", err);

    return res.status(500).json({
      error: "Failed to remove teacher",
    });
  }
};

// =========================================================
// GET STUDENTS FOR A SUBJECT
// =========================================================
//
// Returns students matching the subject's
// program + semester.
//
// Also tells whether each student is enrolled.
// =========================================================

exports.getSubjectStudents = async (req, res) => {
  const { subjectId } = req.params;

  const subjectDetails = await getSubjectDetails(subjectId);

  if (!subjectDetails) {
    return res.status(404).json({
      error: "Subject not found in database",
    });
  }

  try {
    const result = await db.query(
      `
        SELECT
          u.id,
          u.name,
          u.email,
          u.department,
          u.avatar,

          s.roll_no,
          s.program,
          s.semester,
          s.face_registered,

          CASE
            WHEN e.id IS NOT NULL
            THEN TRUE
            ELSE FALSE
          END AS enrolled

        FROM students s

        INNER JOIN users u
          ON u.id = s.student_id

        LEFT JOIN enrollments e
          ON e.student_id = s.student_id
         AND e.subject_id = $1

        WHERE s.program = $2
          AND s.semester = $3

        ORDER BY
          s.roll_no ASC,
          u.name ASC
      `,
      [subjectId, subjectDetails.program, subjectDetails.semester],
    );

    return res.json({
      subject: {
        subject_id: subjectDetails.id,
        name: subjectDetails.name,
        program: subjectDetails.program,
        semester: subjectDetails.semester,
      },

      students: result.rows,
    });
  } catch (err) {
    console.error("ADMIN GET SUBJECT STUDENTS ERROR:", err);

    return res.status(500).json({
      error: "Failed to fetch subject students",
    });
  }
};

// =========================================================
// ENROLL STUDENT IN SUBJECT
// =========================================================

exports.enrollStudent = async (req, res) => {
  const { subjectId } = req.params;
  const { studentId } = req.body;

  if (!studentId) {
    return res.status(400).json({
      error: "studentId is required",
    });
  }

  const subjectDetails = await getSubjectDetails(subjectId);

  if (!subjectDetails) {
    return res.status(404).json({
      error: "Subject not found in database",
    });
  }

  try {
    // -----------------------------------------------------
    // Verify student exists
    // -----------------------------------------------------

    const studentResult = await db.query(
      `
        SELECT
          s.student_id,
          s.roll_no,
          s.program,
          s.semester,
          u.name,
          u.email

        FROM students s

        INNER JOIN users u
          ON u.id = s.student_id

        WHERE s.student_id = $1
      `,
      [studentId],
    );

    if (studentResult.rows.length === 0) {
      return res.status(404).json({
        error: "Student not found",
      });
    }

    const student = studentResult.rows[0];

    // -----------------------------------------------------
    // Student must belong to the subject's
    // program + semester
    // -----------------------------------------------------

    if (
      student.program !== subjectDetails.program ||
      Number(student.semester) !== Number(subjectDetails.semester)
    ) {
      return res.status(400).json({
        error: "Student does not belong to this subject's program and semester",
      });
    }

    // -----------------------------------------------------
    // Create enrollment
    //
    // UNIQUE(student_id, subject_id) prevents duplicates.
    // -----------------------------------------------------

    const enrollmentResult = await db.query(
      `
        INSERT INTO enrollments (
          student_id,
          subject_id
        )

        VALUES ($1, $2)

        ON CONFLICT (
          student_id,
          subject_id
        )
        DO NOTHING

        RETURNING
          id,
          student_id,
          subject_id,
          created_at
      `,
      [studentId, subjectId],
    );

    // -----------------------------------------------------
    // Already enrolled
    // -----------------------------------------------------

    if (enrollmentResult.rows.length === 0) {
      return res.status(409).json({
        error: "Student is already enrolled in this subject",
      });
    }

    // -----------------------------------------------------
    // Update subject student count
    // -----------------------------------------------------

    await db.query(
      `
        UPDATE subjects

        SET total_students = (
          SELECT COUNT(*)
          FROM enrollments
          WHERE subject_id = $1
        )

        WHERE subject_id = $1
      `,
      [subjectId],
    );

    return res.status(201).json({
      message: "Student enrolled successfully",

      enrollment: enrollmentResult.rows[0],

      student: {
        student_id: student.student_id,
        name: student.name,
        email: student.email,
        roll_no: student.roll_no,
        program: student.program,
        semester: student.semester,
      },

      subject: {
        subject_id: subjectDetails.id,
        name: subjectDetails.name,
        program: subjectDetails.program,
        semester: subjectDetails.semester,
      },
    });
  } catch (err) {
    console.error("ADMIN ENROLL STUDENT ERROR:", err);

    return res.status(500).json({
      error: "Failed to enroll student",
    });
  }
};

// =========================================================
// REMOVE STUDENT FROM SUBJECT
// =========================================================

exports.removeStudentFromSubject = async (req, res) => {
  const { subjectId, studentId } = req.params;

  const subjectDetails = await getSubjectDetails(subjectId);

  if (!subjectDetails) {
    return res.status(404).json({
      error: "Subject not found in database",
    });
  }

  try {
    const result = await db.query(
      `
          DELETE FROM enrollments

          WHERE student_id = $1
            AND subject_id = $2

          RETURNING
            id,
            student_id,
            subject_id
        `,
      [studentId, subjectId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Student is not enrolled in this subject",
      });
    }

    // -----------------------------------------------------
    // Recalculate total students
    // -----------------------------------------------------

    await db.query(
      `
        UPDATE subjects

        SET total_students = (
          SELECT COUNT(*)
          FROM enrollments
          WHERE subject_id = $1
        )

        WHERE subject_id = $1
      `,
      [subjectId],
    );

    return res.json({
      message: "Student removed successfully",

      subject: {
        subject_id: subjectDetails.id,

        name: subjectDetails.name,

        program: subjectDetails.program,

        semester: subjectDetails.semester,
      },

      student_id: studentId,
    });
  } catch (err) {
    console.error("ADMIN REMOVE STUDENT ERROR:", err);

    return res.status(500).json({
      error: "Failed to remove student",
    });
  }
};

// =========================================================

/** Delete a student account from the admin student list. */
exports.deleteStudent = async (req, res) => {
  const studentId = String(req.params.studentId || "").trim();
  if (!studentId) return res.status(400).json({ error: "Student ID is required." });
  let client;
  try {
    client = await db.pool.connect();
    await client.query("BEGIN");
    const result = await client.query(
      `DELETE FROM users WHERE id = $1 AND role = 'student' RETURNING id, name`,
      [studentId],
    );
    if (!result.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Student not found." });
    }
    await client.query("COMMIT");
    return res.json({ message: `Student ${result.rows[0].name} deleted successfully.` });
  } catch (err) {
    if (client) { try { await client.query("ROLLBACK"); } catch (_) {} }
    console.error("ADMIN DELETE STUDENT ERROR:", err);
    return res.status(500).json({ error: "Failed to delete student. Related records may prevent deletion." });
  } finally {
    if (client) client.release();
  }
};

// STUDENT SPREADSHEET IMPORT / EXPORT
// =========================================================

const bcrypt = require("bcryptjs");

exports.importStudents = async (req, res) => {
  const rows = req.body?.students;

  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({
      error: "Upload a CSV template containing at least one student row.",
    });
  }

  if (rows.length > 2000) {
    return res.status(400).json({
      error: "A maximum of 2,000 students can be imported at once.",
    });
  }

  const normalizeEmail = (value) =>
    String(value || "")
      .trim()
      .toLowerCase();
  const seenEmails = new Map();
  const duplicateRows = [];

  rows.forEach((row, index) => {
    const email = normalizeEmail(row?.email);
    if (!email) return;
    if (seenEmails.has(email)) {
      duplicateRows.push({
        row: index + 2,
        email,
        error: `Email is repeated in this file (first appears on row ${seenEmails.get(email)}).`,
      });
    } else {
      seenEmails.set(email, index + 2);
    }
  });

  if (duplicateRows.length) {
    return res.status(400).json({
      error:
        "The file contains duplicate email addresses. Correct these rows and import again.",
      rowErrors: duplicateRows,
    });
  }

  const results = {
    created: 0,
    updated: 0,
    failed: 0,
    rows: [],
  };

  for (let index = 0; index < rows.length; index += 1) {
    const rowNumber = index + 2;
    const row = rows[index] || {};
    const name = String(row.name || "").trim();
    const email = normalizeEmail(row.email);
    const department = String(row.department || "").trim() || null;
    const institution = String(row.institution || "").trim() || null;
    const rollNo = String(row.roll_no || "").trim();
    const program = String(row.program || "").trim();
    const semester = Number(row.semester);
    const avatar = String(row.avatar || "").trim() || null;

    const fail = (message) => {
      results.failed += 1;
      results.rows.push({
        row: rowNumber,
        email: email || null,
        status: "failed",
        message,
      });
    };

    if (!name || !email || !rollNo || !program || !row.semester) {
      fail("name, email, roll_no, program, and semester are required.");
      continue;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      fail("Email address is not valid.");
      continue;
    }

    if (
      !Number.isInteger(semester) ||
      !(await isValidProgrammeSemester(program, semester))
    ) {
      fail(
        "Invalid program and semester combination. Use the exact program names and valid semesters configured in the database.",
      );
      continue;
    }

    const client = await db.pool.connect();

    try {
      await client.query("BEGIN");

      const existing = await client.query(
        `SELECT id, role FROM users WHERE LOWER(email) = $1 FOR UPDATE`,
        [email],
      );

      if (existing.rows.length) {
        const user = existing.rows[0];

        if (user.role !== "student") {
          await client.query("ROLLBACK");
          fail(
            "This email belongs to a non-student account; it was not changed.",
          );
          continue;
        }

        const profile = await client.query(
          `SELECT student_id FROM students WHERE student_id = $1`,
          [user.id],
        );

        if (!profile.rows.length) {
          await client.query("ROLLBACK");
          fail(
            "The account is marked as a student but has no student profile.",
          );
          continue;
        }

        // Deliberately never update users.email or users.password.
        await client.query(
          `UPDATE users
             SET name = $1,
                 department = $2,
                 institution = $3,
                 avatar = COALESCE($4, avatar)
           WHERE id = $5`,
          [name, department, institution, avatar, user.id],
        );

        // Only the student's academic fields are updated. Face data,
        // attendance, enrollments, account email and password are preserved.
        await client.query(
          `UPDATE students
              SET roll_no = $1, program = $2, semester = $3
            WHERE student_id = $4`,
          [rollNo, program, semester, user.id],
        );

        await client.query("COMMIT");
        results.updated += 1;
        results.rows.push({
          row: rowNumber,
          email,
          status: "updated",
          message: "Existing student updated; email and password preserved.",
        });
      } else {
        const hashedPassword = await bcrypt.hash("12345678", 10);
        const userResult = await client.query(
          `INSERT INTO users (name, email, password, department, institution, role, avatar)
           VALUES ($1, $2, $3, $4, $5, 'student', $6)
           RETURNING id`,
          [
            name,
            email,
            hashedPassword,
            department,
            institution,
            avatar || "https://i.pravatar.cc/150",
          ],
        );

        const studentId = userResult.rows[0].id;

        await client.query(
          `INSERT INTO students (student_id, roll_no, program, semester)
           VALUES ($1, $2, $3, $4)`,
          [studentId, rollNo, program, semester],
        );

        await client.query("COMMIT");
        results.created += 1;
        results.rows.push({
          row: rowNumber,
          email,
          status: "created",
          message: "New student created with the default password 12345678.",
        });
      }
    } catch (err) {
      try {
        await client.query("ROLLBACK");
      } catch (_) {}
      console.error(`ADMIN STUDENT IMPORT ROW ${rowNumber} ERROR:`, err);
      fail(
        err.code === "23505"
          ? "A unique field conflicts with another record."
          : "Database error while processing this row.",
      );
    } finally {
      client.release();
    }
  }

  return res.json({
    message: "Student import processed.",
    summary: {
      total: rows.length,
      created: results.created,
      updated: results.updated,
      failed: results.failed,
    },
    rows: results.rows,
  });
};

// Export endpoint intentionally returns only safe student fields; password hashes
// and internal authentication data are never exposed.
exports.exportStudents = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT
         u.name, u.email, u.department, u.institution, u.avatar,
         s.roll_no, s.program, s.semester
       FROM students s
       INNER JOIN users u ON u.id = s.student_id
       ORDER BY s.program ASC, s.semester ASC, s.roll_no ASC, u.name ASC`,
    );

    return res.json({ students: result.rows });
  } catch (err) {
    console.error("ADMIN EXPORT STUDENTS ERROR:", err);
    return res.status(500).json({ error: "Failed to export students." });
  }
};

// =========================================================
// TEACHER SPREADSHEET IMPORT / EXPORT
// Columns: name, email, department, institution
// Existing teacher email/password are never changed.
// =========================================================

exports.importTeachers = async (req, res) => {
  const rows = req.body?.teachers;
  if (!Array.isArray(rows) || rows.length === 0) {
    return res
      .status(400)
      .json({ error: "Upload a CSV with at least one teacher row." });
  }
  if (rows.length > 2000) {
    return res
      .status(400)
      .json({ error: "A maximum of 2,000 teachers can be imported at once." });
  }

  const normalizeEmail = (value) =>
    String(value || "")
      .trim()
      .toLowerCase();
  const seen = new Map();
  const duplicateErrors = [];
  rows.forEach((row, i) => {
    const email = normalizeEmail(row?.email);
    if (!email) return;
    if (seen.has(email))
      duplicateErrors.push({
        row: i + 2,
        email,
        error: `Email is repeated in this file (first appears on row ${seen.get(email)}).`,
      });
    else seen.set(email, i + 2);
  });
  if (duplicateErrors.length) {
    return res.status(400).json({
      error: "Duplicate emails found. Correct the listed rows and retry.",
      rowErrors: duplicateErrors,
    });
  }

  const summary = { total: rows.length, created: 0, updated: 0, failed: 0 };
  const results = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] || {};
    const rowNumber = i + 2;
    const name = String(row.name || "").trim();
    const email = normalizeEmail(row.email);
    const department = String(row.department || "").trim() || null;
    const institution = String(row.institution || "").trim() || null;
    const fail = (message) => {
      summary.failed++;
      results.push({
        row: rowNumber,
        email: email || null,
        status: "failed",
        message,
      });
    };

    if (!name || !email) {
      fail("name and email are required.");
      continue;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      fail("Email address is invalid.");
      continue;
    }

    const client = await db.pool.connect();
    try {
      await client.query("BEGIN");
      const existing = await client.query(
        "SELECT id, role FROM users WHERE LOWER(email) = $1 FOR UPDATE",
        [email],
      );
      if (existing.rows.length) {
        const user = existing.rows[0];
        if (user.role !== "teacher") {
          await client.query("ROLLBACK");
          fail(
            "This email belongs to a non-teacher account; it was not changed.",
          );
          continue;
        }
        const profile = await client.query(
          "SELECT teacher_id FROM teachers WHERE teacher_id = $1",
          [user.id],
        );
        if (!profile.rows.length) {
          await client.query("ROLLBACK");
          fail("Teacher account has no teacher profile.");
          continue;
        }
        await client.query(
          "UPDATE users SET name = $1, department = $2, institution = $3 WHERE id = $4",
          [name, department, institution, user.id],
        );
        await client.query("COMMIT");
        summary.updated++;
        results.push({
          row: rowNumber,
          email,
          status: "updated",
          message: "Teacher details updated; email and password preserved.",
        });
      } else {
        const passwordHash = await bcrypt.hash("12345678", 10);
        const userResult = await client.query(
          `INSERT INTO users (name, email, password, department, institution, role)
           VALUES ($1, $2, $3, $4, $5, 'teacher') RETURNING id`,
          [name, email, passwordHash, department, institution],
        );
        const teacherId = userResult.rows[0].id;
        await client.query("INSERT INTO teachers (teacher_id) VALUES ($1)", [
          teacherId,
        ]);
        await client.query("COMMIT");
        summary.created++;
        results.push({
          row: rowNumber,
          email,
          status: "created",
          message: "Teacher account created with default password 12345678.",
        });
      }
    } catch (err) {
      try {
        await client.query("ROLLBACK");
      } catch (_) {}
      console.error(`ADMIN TEACHER IMPORT ROW ${rowNumber} ERROR:`, err);
      fail(
        err.code === "23505"
          ? "A unique field conflicts with another record."
          : "Database error while processing this row.",
      );
    } finally {
      client.release();
    }
  }
  return res.json({
    message: "Teacher import processed.",
    summary,
    rows: results,
  });
};

exports.exportTeachers = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT u.name, u.email, u.department, u.institution
       FROM teachers t
       INNER JOIN users u ON u.id = t.teacher_id
       ORDER BY u.name ASC`,
    );
    return res.json({ teachers: result.rows });
  } catch (err) {
    console.error("ADMIN EXPORT TEACHERS ERROR:", err);
    return res.status(500).json({ error: "Failed to export teachers." });
  }
};

/**
 * Import teachers from spreadsheet data.
 * Expected columns: name, email, department, institution
 */
exports.importTeachers = async (req, res) => {
  const rows = req.body?.teachers;

  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({
      error: "Upload a CSV with at least one teacher row.",
    });
  }

  if (rows.length > 2000) {
    return res.status(400).json({
      error: "A maximum of 2,000 teachers can be imported at once.",
    });
  }

  const normalizeEmail = (value) =>
    String(value || "")
      .trim()
      .toLowerCase();

  const seen = new Set();

  for (let i = 0; i < rows.length; i++) {
    const email = normalizeEmail(rows[i]?.email);

    if (!rows[i]?.name?.trim?.() || !email) {
      return res.status(400).json({
        error: `Row ${i + 2}: name and email are required.`,
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        error: `Row ${i + 2}: invalid email address.`,
      });
    }

    if (seen.has(email)) {
      return res.status(400).json({
        error: `Duplicate email in uploaded file: ${email}`,
      });
    }

    seen.add(email);
  }

  const summary = {
    total: rows.length,
    created: 0,
    updated: 0,
    failed: 0,
  };

  const results = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 2;
    const name = String(row.name || "").trim();
    const email = normalizeEmail(row.email);
    const department = String(row.department || "").trim() || null;
    const institution = String(row.institution || "").trim() || null;

    let client;

    try {
      client = await db.pool.connect();
      await client.query("BEGIN");

      const existing = await client.query(
        `SELECT id, role
         FROM users
         WHERE LOWER(email) = $1
         FOR UPDATE`,
        [email],
      );

      if (existing.rows.length) {
        const user = existing.rows[0];

        if (user.role !== "teacher") {
          await client.query("ROLLBACK");
          summary.failed++;
          results.push({
            row: rowNumber,
            email,
            status: "failed",
            message: "Email belongs to a non-teacher account.",
          });
          continue;
        }

        const profile = await client.query(
          `SELECT teacher_id
           FROM teachers
           WHERE teacher_id = $1`,
          [user.id],
        );

        if (!profile.rows.length) {
          await client.query("ROLLBACK");
          summary.failed++;
          results.push({
            row: rowNumber,
            email,
            status: "failed",
            message: "Teacher profile not found.",
          });
          continue;
        }

        // Preserve the existing email and password.
        await client.query(
          `UPDATE users
           SET name = $1,
               department = $2,
               institution = $3
           WHERE id = $4`,
          [name, department, institution, user.id],
        );

        await client.query("COMMIT");
        summary.updated++;

        results.push({
          row: rowNumber,
          email,
          status: "updated",
          message: "Teacher details updated.",
        });
      } else {
        const passwordHash = await bcrypt.hash("12345678", 10);

        const userResult = await client.query(
          `INSERT INTO users
             (name, email, password, department, institution, role)
           VALUES ($1, $2, $3, $4, $5, 'teacher')
           RETURNING id`,
          [name, email, passwordHash, department, institution],
        );

        const teacherId = userResult.rows[0].id;

        await client.query(
          `INSERT INTO teachers (teacher_id)
           VALUES ($1)`,
          [teacherId],
        );

        await client.query("COMMIT");
        summary.created++;

        results.push({
          row: rowNumber,
          email,
          status: "created",
          message: "Teacher created with default password 12345678.",
        });
      }
    } catch (err) {
      if (client) {
        try {
          await client.query("ROLLBACK");
        } catch (_) {}
      }

      console.error("ADMIN TEACHER IMPORT ERROR:", err);
      summary.failed++;

      results.push({
        row: rowNumber,
        email,
        status: "failed",
        message:
          err.code === "23505"
            ? "A unique field conflicts with another record."
            : "Database error while processing this teacher.",
      });
    } finally {
      if (client) client.release();
    }
  }

  return res.json({
    message: "Teacher import processed.",
    summary,
    rows: results,
  });
};

/**
 * Export teacher details.
 * Never return password hashes.
 */
exports.exportTeachers = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT u.name, u.email, u.department, u.institution
       FROM teachers t
       INNER JOIN users u ON u.id = t.teacher_id
       ORDER BY u.name ASC`,
    );

    return res.json({ teachers: result.rows });
  } catch (err) {
    console.error("ADMIN EXPORT TEACHERS ERROR:", err);

    return res.status(500).json({
      error: "Failed to export teachers.",
    });
  }
};

/**
 * Delete a teacher account.
 */
exports.deleteTeacher = async (req, res) => {
  const teacherId = String(req.params.teacherId || "").trim();

  if (!teacherId) {
    return res.status(400).json({
      error: "Teacher ID is required.",
    });
  }

  let client;

  try {
    client = await db.pool.connect();
    await client.query("BEGIN");

    const result = await client.query(
      `DELETE FROM users
       WHERE id = $1
         AND role = 'teacher'
       RETURNING id, name`,
      [teacherId],
    );

    if (!result.rows.length) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        error: "Teacher not found.",
      });
    }

    await client.query("COMMIT");

    return res.json({
      message: `Teacher ${result.rows[0].name} deleted successfully.`,
    });
  } catch (err) {
    if (client) {
      try {
        await client.query("ROLLBACK");
      } catch (_) {}
    }

    console.error("ADMIN DELETE TEACHER ERROR:", err);

    return res.status(500).json({
      error: "Failed to delete teacher.",
    });
  } finally {
    if (client) client.release();
  }
};

exports.updateTeacher = async (req, res) => {
  const { teacherId } = req.params;
  const { name, email, department, institution } = req.body;

  const cleanName = String(name || "").trim();
  const cleanEmail = String(email || "")
    .trim()
    .toLowerCase();

  if (!cleanName || !cleanEmail) {
    return res.status(400).json({
      error: "Name and email are required.",
    });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return res.status(400).json({
      error: "Enter a valid email address.",
    });
  }

  try {
    const result = await db.query(
      `UPDATE users
       SET name = $1,
           email = $2,
           department = $3,
           institution = $4
       WHERE id = $5
         AND role = 'teacher'
         AND EXISTS (
           SELECT 1 FROM teachers
           WHERE teachers.teacher_id = users.id
         )
       RETURNING id, name, email, department, institution`,
      [
        cleanName,
        cleanEmail,
        String(department || "").trim() || null,
        String(institution || "").trim() || null,
        teacherId,
      ],
    );

    if (!result.rows.length) {
      return res.status(404).json({
        error: "Teacher not found.",
      });
    }

    return res.json({
      message: "Teacher updated successfully.",
      teacher: result.rows[0],
    });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({
        error: "That email address is already in use.",
      });
    }

    console.error("ADMIN UPDATE TEACHER ERROR:", err);

    return res.status(500).json({
      error: "Failed to update teacher.",
    });
  }
};
