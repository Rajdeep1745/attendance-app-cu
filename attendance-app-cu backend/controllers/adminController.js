const db = require("../config/db");
const jwt = require("jsonwebtoken");

const {
  PROGRAMMES,
  isValidProgrammeSemester,
} = require("../config/programmes");

// =========================================================
// FIND SUBJECT DETAILS FROM PROGRAMMES.JS
// =========================================================

const getSubjectDetails = (subjectId) => {
  for (const [program, programData] of Object.entries(PROGRAMMES)) {
    for (const [semester, subjects] of Object.entries(programData.semesters)) {
      const subject = subjects.find((item) => item.id === subjectId);

      if (subject) {
        return {
          id: subject.id,
          name: subject.name,
          program,
          semester: Number(semester),
        };
      }
    }
  }

  return null;
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
  // against programmes.js
  // -------------------------------------------------------

  if (!isValidProgrammeSemester(studentProgram, studentSemester)) {
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
          u.avatar,

          t.default_mode,
          t.default_threshold

        FROM teachers t

        INNER JOIN users u
          ON u.id = t.teacher_id

        ORDER BY
          u.name ASC
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
// GET ALL SUBJECTS
// =========================================================

exports.getSubjects = async (req, res) => {
  try {
    const result = await db.query(
      `
        SELECT
          s.subject_id,
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
          s.subject_id ASC
      `,
    );

    const subjects = result.rows.map((subject) => {
      const details = getSubjectDetails(subject.subject_id);

      return {
        subject_id: subject.subject_id,

        // Comes from programmes.js
        name: details?.name || "Unknown Subject",
        program: details?.program || null,
        semester: details?.semester || null,

        teacher_id: subject.teacher_id,
        teacher_name: subject.teacher_name,
        teacher_email: subject.teacher_email,

        threshold: subject.threshold,
        total_students: subject.total_students,
      };
    });

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
  // Make sure subject exists in programmes.js
  // -------------------------------------------------------

  const subjectDetails = getSubjectDetails(subjectId);

  if (!subjectDetails) {
    return res.status(404).json({
      error: "Subject does not exist in programmes.js",
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

  const subjectDetails = getSubjectDetails(subjectId);

  if (!subjectDetails) {
    return res.status(404).json({
      error: "Subject does not exist in programmes.js",
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

  const subjectDetails = getSubjectDetails(subjectId);

  if (!subjectDetails) {
    return res.status(404).json({
      error: "Subject does not exist in programmes.js",
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

  const subjectDetails = getSubjectDetails(subjectId);

  if (!subjectDetails) {
    return res.status(404).json({
      error: "Subject does not exist in programmes.js",
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

  const subjectDetails = getSubjectDetails(subjectId);

  if (!subjectDetails) {
    return res.status(404).json({
      error: "Subject does not exist in programmes.js",
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
