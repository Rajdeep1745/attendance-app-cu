const db = require("../config/db");

const formatJoinedOn = (value) => {
  if (!value) return "-";

  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
};

const ensureStudentSubjectAccess = async (subjectId, userId) => {
  const result = await db.query(
    `SELECT 1
     FROM enrollments
     WHERE subject_id = $1
       AND student_id = $2
     LIMIT 1`,
    [subjectId, userId],
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

const getStudentRecordByStudentId = async (studentId) => {
  const result = await db.query(
    `SELECT
        roll_no,
        attendance_percentage,
        face_registered
     FROM students
     WHERE student_id = $1`,
    [studentId],
  );

  return result.rows[0] || null;
};

const getStudentSubjectAttendance = async (studentId, subjectId) => {
  const { rows } = await db.query(
    `SELECT
        COUNT(*)::int AS total_classes,
        COUNT(*) FILTER (
          WHERE present = true
        )::int AS attended_classes
     FROM student_attendances
     WHERE student_id = $1
       AND subject_id = $2`,
    [studentId, subjectId],
  );

  const totalClasses = rows[0]?.total_classes || 0;
  const attendedClasses = rows[0]?.attended_classes || 0;

  if (totalClasses === 0) {
    return {
      totalClasses: 0,
      attendedClasses: 0,
      percentage: 0,
    };
  }

  return {
    totalClasses,
    attendedClasses,
    percentage: Number(((attendedClasses / totalClasses) * 100).toFixed(1)),
  };
};

const getSubjectAverageAttendance = async (subjectId) => {
  const { rows } = await db.query(
    `SELECT attendance_percentage
     FROM subject_attendances
     WHERE subject_id = $1`,
    [subjectId],
  );

  if (rows.length === 0) return 0;

  const total = rows.reduce(
    (sum, row) => sum + Number(row.attendance_percentage || 0),
    0,
  );

  return Number((total / rows.length).toFixed(1));
};

// GET ALL SUBJECTS
exports.getTeacherSubjects = async (req, res) => {
  const teacher_id = req.user.id;
  try {
    const result = await db.query(
      `SELECT *
      FROM subjects
      WHERE teacher_id = $1
      ORDER BY subject_id`,
      [teacher_id],
    );

    res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// GET SELECTED SUBJECT
exports.getSelectedSubjects = async (req, res) => {
  const { subjectId } = req.params;
  const userId = req.user.id;
  const userRole = req.user.role;

  try {
    const hasAccess =
      userRole === "teacher"
        ? await ensureTeacherSubjectAccess(subjectId, userId)
        : await ensureStudentSubjectAccess(subjectId, userId);

    if (!hasAccess) {
      return res.status(403).json({ error: "Access denied" });
    }

    const result = await db.query(
      `SELECT *
       FROM subjects
       WHERE subject_id = $1`,
      [subjectId],
    );

    const data = result.rows[0];

    if (!data) {
      return res.status(404).json({ error: "Subject not found" });
    }

    res.json(data);
  } catch (err) {
    console.log("FETCH ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
};

// UPDATE THRESHOLD
exports.updateThreshold = async (req, res) => {
  const { subjectId } = req.params;
  const { threshold } = req.body;
  const teacherId = req.user.id;

  if (threshold === undefined) {
    return res.status(400).json({ error: "Threshold is required" });
  }

  try {
    const result = await db.query(
      `UPDATE subjects
       SET threshold = $1
       WHERE subject_id = $2
       AND teacher_id = $3
       RETURNING *`,
      [threshold, subjectId, teacherId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Subject not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.log("THRESHOLD UPDATE ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
};

// GET STUDENT'S SUBJECT
exports.getStudentSubjects = async (req, res) => {
  try {
    const studentId = req.user.id;
    const student = await getStudentRecordByStudentId(studentId);

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    const { rows } = await db.query(
      `SELECT
          e.subject_id,
          e.created_at,
          s.threshold,
          s.total_students,
          u.name AS teacher_name
      FROM enrollments e
      JOIN subjects s
          ON s.subject_id = e.subject_id
      JOIN teachers t
          ON s.teacher_id = t.teacher_id
      JOIN users u
          ON t.teacher_id = u.id
      WHERE e.student_id = $1
      ORDER BY e.created_at DESC`,
      [studentId],
    );

    res.json(
      rows.map((row) => ({
        subjectId: row.subject_id,
        threshold: row.threshold,
        totalStudents: row.total_students,
        teacher: row.teacher_name,
        joinedOn: formatJoinedOn(row.created_at),
      })),
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// GET SUBJECT OVERVIEW
exports.getStudentSubjectOverview = async (req, res) => {
  const { subjectId } = req.params;
  const studentId = req.user.id;

  try {
    // Get the student's profile.
    // This contains the overall attendance_percentage
    // stored in the students table.
    const student = await getStudentRecordByStudentId(studentId);

    if (!student) {
      return res.status(404).json({
        error: "Student profile not found",
      });
    }

    // Verify that this student is actually enrolled
    // in the requested subject and get subject details.
    const { rows } = await db.query(
      `SELECT
          e.created_at,
          s.subject_id,
          s.threshold,
          s.total_students,
          u.name AS teacher_name
       FROM enrollments e
       JOIN subjects s
         ON s.subject_id = e.subject_id
       JOIN teachers t
         ON s.teacher_id = t.teacher_id
       JOIN users u
         ON t.teacher_id = u.id
       WHERE e.student_id = $1
         AND e.subject_id = $2`,
      [studentId, subjectId],
    );

    if (rows.length === 0) {
      return res.status(403).json({
        error: "Access denied",
      });
    }

    const enrollment = rows[0];

    // Subject-level average attendance
    const avgAttendance =
      Number(
      student.attendance_percentage || 0,
    );

    /*
     * IMPORTANT:
     * Use the overall attendance_percentage stored
     * in the student's students table.
     *
     * Do NOT calculate this from the selected subject.
     */
    const myAttendanceData = await getStudentSubjectAttendance( studentId, subjectId, ); 
    const myAttendance = myAttendanceData.percentage;

    const threshold = Number(
      enrollment.threshold || 0,
    );

    const thresholdGap = Number(
      (myAttendance - threshold).toFixed(1),
    );

    return res.json({
      subjectId: enrollment.subject_id,

      teacher: enrollment.teacher_name,

      totalStudents: enrollment.total_students,

      // Average attendance of this subject
      avgAttendance,

      // Overall attendance percentage of this student
      myAttendance,

      // Also expose it explicitly if the frontend
      // wants to distinguish it from subject attendance.
      overallAttendance: avgAttendance,

      threshold,

      joinedOn: formatJoinedOn(
        enrollment.created_at,
      ),

      thresholdGap,
    });
  } catch (err) {
    console.error(
      "GET STUDENT SUBJECT OVERVIEW ERROR:",
      err,
    );

    return res.status(500).json({
      error: err.message,
    });
  }
};


// =========================================================
// GET STUDENT'S SUBJECT REPORT
// =========================================================

exports.getStudentSubjectReports = async (req, res) => {
  const { subjectId } = req.params;
  const studentId = req.user.id;

  try {
    // -------------------------------------------------------
    // 1. Verify student exists
    // -------------------------------------------------------

    const student = await getStudentRecordByStudentId(studentId);

    if (!student) {
      return res.status(404).json({
        error: "Student profile not found",
      });
    }

    // -------------------------------------------------------
    // 2. Verify enrollment
    //
    // IMPORTANT:
    // Enrollment is the source of truth.
    // -------------------------------------------------------

    const hasAccess = await ensureStudentSubjectAccess(subjectId, studentId);

    if (!hasAccess) {
      return res.status(403).json({
        error: "Access denied",
      });
    }

    // -------------------------------------------------------
    // 3. Get subject threshold
    // -------------------------------------------------------

    const { rows: subjectRows } = await db.query(
      `
          SELECT
            subject_id,
            threshold
          FROM subjects
          WHERE subject_id = $1
        `,
      [subjectId],
    );

    if (subjectRows.length === 0) {
      return res.status(404).json({
        error: "Subject not found",
      });
    }

    const subject = subjectRows[0];

    // -------------------------------------------------------
    // 4. Get every class conducted for this subject
    //
    // DATE is explicitly converted to text so Flutter
    // receives:
    //
    //     2026-08-14
    //
    // instead of a timestamp-like value.
    // -------------------------------------------------------

    const { rows: recentAttendance } = await db.query(
      `
          SELECT
            sa.date::text AS date,

            CASE
              WHEN sta.present = TRUE
                THEN 'Present'

              WHEN sta.present = FALSE
                THEN 'Absent'

              ELSE 'Attendance not recorded'
            END AS status

          FROM subject_attendances sa

          LEFT JOIN student_attendances sta
            ON sta.student_id = $2
           AND sta.subject_id = sa.subject_id
           AND sta.date = sa.date

          WHERE sa.subject_id = $1

          ORDER BY sa.date DESC
        `,
      [subjectId, studentId],
    );

    // -------------------------------------------------------
    // 5. Calculate THIS student's attendance for THIS subject
    //
    // Do NOT use students.attendance_percentage here.
    // That field is the student's OVERALL attendance.
    // -------------------------------------------------------

    const myAttendanceData = await getStudentSubjectAttendance(
      studentId,
      subjectId,
    );

    // -------------------------------------------------------
    // 6. Calculate average attendance of the subject
    // -------------------------------------------------------

    const avgAttendance = await getSubjectAverageAttendance(subjectId);

    // -------------------------------------------------------
    // 7. Send response
    // -------------------------------------------------------

    return res.json({
      subjectId,

      // This is SUBJECT-SPECIFIC attendance.
      myAttendance: myAttendanceData.percentage,

      subjectAverage: avgAttendance,

      totalClasses: myAttendanceData.totalClasses,

      attendedClasses: myAttendanceData.attendedClasses,

      threshold: Number(subject.threshold || 0),

      recentAttendance: recentAttendance.map((row) => ({
        date: row.date,
        status: row.status,
      })),
    });
  } catch (err) {
    console.error("GET STUDENT SUBJECT REPORT ERROR:", err);

    return res.status(500).json({
      error: err.message,
    });
  }
};
