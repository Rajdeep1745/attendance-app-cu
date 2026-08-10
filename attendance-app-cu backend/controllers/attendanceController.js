const db = require("../config/db");
const { recognizeFaces } = require("../utils/faceService");

const ensureTeacherSubjectAccess = async (subjectId, teacherId) => {
  const result = await db.query(
    `SELECT 1
     FROM subjects
     WHERE subject_id = $1
       AND teacher_id = $2
     LIMIT 1`,
    [subjectId, teacherId],
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

// Recalculate and store a student's overall attendance across ALL subjects.
async function recalcStudentOverallAttendance(studentId) {
  const { rows } = await db.query(
    `SELECT
        COUNT(*)::int AS total_classes,
        COUNT(*) FILTER (
          WHERE present = true
        )::int AS attended_classes
     FROM student_attendances
     WHERE student_id = $1`,
    [studentId],
  );

  const totalClasses = rows[0]?.total_classes || 0;
  const attendedClasses = rows[0]?.attended_classes || 0;

  const percentage =
    totalClasses === 0
      ? 0
      : Number(((attendedClasses / totalClasses) * 100).toFixed(1));

  await db.query(
    `UPDATE students
     SET attendance_percentage = $1
     WHERE student_id = $2`,
    [percentage, studentId],
  );

  return percentage;
}

function normalizeFaceEmbedding(rawEmbedding) {
  let embedding = rawEmbedding;

  if (typeof embedding === "string") {
    try {
      embedding = JSON.parse(embedding);
    } catch {
      return null;
    }
  }

  if (!Array.isArray(embedding) || embedding.length === 0) {
    return null;
  }

  const numericEmbedding = embedding.map((value) => Number(value));

  return numericEmbedding.every(Number.isFinite) ? numericEmbedding : null;
}

// function getStudentFaceEmbedding(studentRow) {
//   const faceData = studentRow?.student_face_data;

//   const rawEmbedding = Array.isArray(faceData)
//     ? faceData[0]?.embedding
//     : faceData?.embedding;

//   return normalizeFaceEmbedding(rawEmbedding);
// }

// Recalculate subject attendance for one date
async function recalcSubjectDate(subjectId, date) {
  const { rows } = await db.query(
    `SELECT present
     FROM student_attendances
     WHERE subject_id = $1
       AND date = $2`,
    [subjectId, date],
  );

  if (rows.length === 0) {
    return;
  }

  const presentCount = rows.filter((row) => row.present === true).length;

  const totalStudents = rows.length;

  const percentage = Math.round((presentCount / totalStudents) * 100);

  await db.query(
    `INSERT INTO subject_attendances (
       subject_id,
       date,
       attendance_percentage,
       presences
     )
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (subject_id, date)
     DO UPDATE SET
       attendance_percentage = EXCLUDED.attendance_percentage,
       presences = EXCLUDED.presences`,
    [subjectId, date, percentage, presentCount],
  );
}

const formatRecordedTime = (value) => {
  if (!value) return "-";

  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(value));
};

// GET ATTENDANCE STATS
exports.getAttendanceStats = async (req, res) => {
  const { subjectId } = req.params;
  const teacherId = req.user.id;

  try {
    const hasAccess = await ensureTeacherSubjectAccess(subjectId, teacherId);

    if (!hasAccess) {
      return res.status(403).json({ error: "Access denied" });
    }

    const { rows } = await db.query(
      `SELECT attendance_percentage, date
       FROM subject_attendances
       WHERE subject_id = $1
       ORDER BY date ASC`,
      [subjectId],
    );

    if (rows.length === 0) {
      return res.json({
        totalClasses: 0,
        avgAttendance: 0,
        bestAttendance: {
          percentage: 0,
          date: null,
        },
        worstAttendance: {
          percentage: 0,
          date: null,
        },
      });
    }

    const totalClasses = rows.length;

    const avgAttendance = (
      rows.reduce(
        (sum, row) => sum + Number(row.attendance_percentage || 0),
        0,
      ) / totalClasses
    ).toFixed(1);

    let best = rows[0];
    let worst = rows[0];

    rows.forEach((row) => {
      const attendance = Number(row.attendance_percentage || 0);

      if (attendance > Number(best.attendance_percentage || 0)) {
        best = row;
      }

      if (attendance < Number(worst.attendance_percentage || 0)) {
        worst = row;
      }
    });

    return res.json({
      totalClasses,
      avgAttendance,
      bestAttendance: {
        percentage: Number(best.attendance_percentage || 0),
        date: best.date,
      },
      worstAttendance: {
        percentage: Number(worst.attendance_percentage || 0),
        date: worst.date,
      },
    });
  } catch (err) {
    console.error("GET ATTENDANCE STATS ERROR:", err);

    return res.status(500).json({
      error: err.message,
    });
  }
};

// GET WEEKLY ATTENDANCE GRAPH
exports.getAttendanceGraph = async (req, res) => {
  const { subjectId } = req.params;
  const teacherId = req.user.id;

  try {
    const hasAccess = await ensureTeacherSubjectAccess(subjectId, teacherId);

    if (!hasAccess) {
      return res.status(403).json({ error: "Access denied" });
    }

    const { rows } = await db.query(
      `SELECT attendance_percentage, date
       FROM subject_attendances
       WHERE subject_id = $1
       ORDER BY date ASC`,
      [subjectId],
    );

    return res.json(rows);
  } catch (err) {
    console.error("GET ATTENDANCE GRAPH ERROR:", err);

    return res.status(500).json({
      error: err.message,
    });
  }
};

// GET DAILY ATTENDANCE FOR A SUBJECT ON A SPECIFIC DATE
exports.getDailyAttendance = async (req, res) => {
  const { subjectId } = req.params;
  const { date } = req.query;
  const teacherId = req.user.id;

  if (!date) {
    return res.status(400).json({
      error: "Date is required",
    });
  }

  try {
    // 1. Verify that the logged-in teacher owns this subject
    const hasAccess = await ensureTeacherSubjectAccess(subjectId, teacherId);

    if (!hasAccess) {
      return res.status(403).json({
        error: "Access denied",
      });
    }

    // 2. Get all students enrolled in this subject
    //    and their attendance status for the requested date.
    const { rows } = await db.query(
      `SELECT
          s.student_id,
          s.roll_no,
          u.name,
          u.avatar,
          sa.present,
          COALESCE(s.attendance_percentage, 0)::numeric AS percentage
      FROM enrollments e
      JOIN students s
        ON s.student_id = e.student_id
      JOIN users u
        ON u.id = s.student_id
      LEFT JOIN student_attendances sa
        ON sa.student_id = s.student_id
        AND sa.subject_id = e.subject_id
        AND sa.date = $2
      WHERE e.subject_id = $1
      ORDER BY s.roll_no ASC`,
      [subjectId, date],
    );

    // 3. Convert database rows into the response
    //    expected by the frontend.
    const formatted = rows.map((row) => ({
      studentId: row.student_id,
      name: row.name,
      avatar: row.avatar,
      roll: row.roll_no,
      percentage: Number(row.percentage || 0),
      present: row.present === null ? null : Boolean(row.present),
    }));

    return res.json(formatted);
  } catch (err) {
    console.error("GET DAILY ATTENDANCE ERROR:", err);

    return res.status(500).json({
      error: err.message,
    });
  }
};

// GET FREQUENT ABSENTEES
exports.getFrequentAbsentees = async (req, res) => {
  const { subjectId } = req.params;
  const teacherId = req.user.id;

  try {
    // 1. Verify that the logged-in teacher owns this subject
    const hasAccess = await ensureTeacherSubjectAccess(subjectId, teacherId);

    if (!hasAccess) {
      return res.status(403).json({
        error: "Access denied",
      });
    }

    // 2. Find students who were absent and count
    //    how many times each student was absent.
    const { rows } = await db.query(
      `SELECT
          sa.student_id AS id,
          u.name,
          COUNT(*)::int AS absences
       FROM student_attendances sa
       JOIN students s
         ON s.student_id = sa.student_id
       JOIN users u
         ON u.id = s.student_id
       WHERE sa.subject_id = $1
         AND sa.present = false
       GROUP BY
          sa.student_id,
          u.name
       ORDER BY
          absences DESC,
          u.name ASC`,
      [subjectId],
    );

    return res.json(rows);
  } catch (err) {
    console.error("GET FREQUENT ABSENTEES ERROR:", err);

    return res.status(500).json({
      error: err.message,
    });
  }
};

// GET STUDENT ATTENDANCE BY DATE
exports.getStudentAttendanceByDate = async (req, res) => {
  const { date } = req.query;
  const studentId = req.user.id;

  if (!date) {
    return res.status(400).json({ error: "Date is required" });
  }

  try {
    const student = await getStudentRecordByStudentId(studentId);

    if (!student) {
      return res.json([]);
    }

    // Subjects joined by the student
    const { rows: joinedSubjects } = await db.query(
      `SELECT subject_id
        FROM enrollments
        WHERE student_id = $1
        ORDER BY subject_id`,
      [studentId],
    );

    // Attendance for the requested date
    const { rows: attendanceRows } = await db.query(
      `SELECT
          subject_id,
          present,
          created_at
       FROM student_attendances
       WHERE student_id = $1
         AND date = $2`,
      [studentId, date],
    );

    const attendanceMap = new Map(
      attendanceRows.map((row) => [row.subject_id, row]),
    );

    res.json(
      joinedSubjects.map((row) => {
        const attendance = attendanceMap.get(row.subject_id);

        return {
          subjectId: row.subject_id,
          status: attendance
            ? attendance.present
              ? "Present"
              : "Absent"
            : "No Class",
          recordedAt: attendance?.created_at
            ? formatRecordedTime(attendance.created_at)
            : "-",
        };
      }),
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// async function recalcStudentPercentages(subjectId) {
//   const { data: records, error } = await supabase
//     .from("student_attendances")
//     .select("student_id, present")
//     .eq("subject_id", subjectId);

//   if (error || !records || records.length === 0) return;

//   // Group totals by student
//   const totals = {};
//   for (const row of records) {
//     if (!totals[row.student_id]) {
//       totals[row.student_id] = { total: 0, present: 0 };
//     }
//     totals[row.student_id].total++;
//     if (row.present) totals[row.student_id].present++;
//   }

//   // Update each student's cached attendance_percentage
//   await Promise.all(
//     Object.entries(totals).map(([studentId, counts]) => {
//       const pct = Math.round((counts.present / counts.total) * 100);

//       return supabase
//         .from("students")
//         .update({
//           attendance_percentage: pct,
//         })
//         .eq("student_id", studentId);
//     }),
//   );
// }

exports.markAttendanceByFace = async (req, res) => {
  const { subjectId } = req.params;
  const { date } = req.body;
  const teacherId = req.user.id;
  const file = req.file;

  if (!file) {
    return res.status(400).json({
      error: "No file provided",
    });
  }

  if (!date) {
    return res.status(400).json({
      error: "date is required (YYYY-MM-DD)",
    });
  }

  try {
    // 1. Verify that the logged-in teacher owns this subject
    const hasAccess = await ensureTeacherSubjectAccess(subjectId, teacherId);

    if (!hasAccess) {
      return res.status(404).json({
        error: "Subject not found",
      });
    }

    // 2. Load all students enrolled in this subject
    //    together with their face registration data.
    const { rows: enrolled } = await db.query(
      `SELECT
          e.student_id,
          s.face_registered,
          sfd.embedding
       FROM enrollments e
       JOIN students s
         ON s.student_id = e.student_id
       LEFT JOIN student_face_data sfd
         ON sfd.student_id = s.student_id
       WHERE e.subject_id = $1
       ORDER BY e.student_id`,
      [subjectId],
    );

    // 3. Get every enrolled student ID
    const allStudentIds = enrolled.map((row) => row.student_id);

    if (allStudentIds.length === 0) {
      return res.status(400).json({
        error: "No students are enrolled in this subject",
      });
    }

    // 4. Build the list of students who actually have
    //    a usable face embedding.
    const studentsWithFaces = enrolled
      .map((row) => ({
        id: row.student_id,
        embedding: normalizeFaceEmbedding(row.embedding),
      }))
      .filter((student) => student.embedding);

    let recognizedIds = [];
    let framesProcessed = 0;

    // 5. Run face recognition only if there are
    //    registered faces available.
    if (studentsWithFaces.length > 0) {
      try {
        const result = await recognizeFaces(
          file.buffer,
          file.mimetype,
          studentsWithFaces,
          0.5,
        );

        recognizedIds = result.recognized.map((row) => row.id);

        framesProcessed = result.frames_processed || 0;
      } catch (err) {
        console.error(
          "[attendanceController] recognizeFaces error:",
          err.message,
        );

        return res.status(503).json({
          error:
            "Face recognition service unavailable. Is the Python service running on port 5001?",
        });
      }
    }

    // 6. Convert recognized IDs into a Set for fast lookup.
    const recognizedSet = new Set(recognizedIds);

    // 7. Every enrolled student gets an attendance row.
    //    Recognized students = Present.
    //    Everyone else = Absent.
    const attendanceRows = allStudentIds.map((studentId) => ({
      student_id: studentId,
      subject_id: subjectId,
      date,
      present: recognizedSet.has(studentId),
    }));

    // 8. Insert/update attendance records.
    //
    //    The unique key is:
    //    (student_id, subject_id, date)
    //
    //    so ON CONFLICT updates an existing attendance
    //    record instead of creating a duplicate.
    for (const row of attendanceRows) {
      await db.query(
        `INSERT INTO student_attendances (
           student_id,
           subject_id,
           date,
           present
         )
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (
           student_id,
           subject_id,
           date
         )
         DO UPDATE SET
           present = EXCLUDED.present`,
        [row.student_id, row.subject_id, row.date, row.present],
      );
    }

    // 9. Recalculate the subject's attendance
    //    summary for this date.
    await recalcSubjectDate(subjectId, date);

    // Recalculate overall attendance for every affected student.
    for (const studentId of allStudentIds) {
      await recalcStudentOverallAttendance(studentId);
    }

    const unregisteredCount = allStudentIds.length - studentsWithFaces.length;

    // 10. Return the result to the frontend.
    return res.json({
      message: "Attendance marked",
      present_count: recognizedIds.length,
      total_count: allStudentIds.length,
      unregistered_count: unregisteredCount,
      frames_processed: framesProcessed,

      attendance: attendanceRows.map((row) => ({
        student_id: row.student_id,
        present: row.present,
        auto_recognized: recognizedSet.has(row.student_id),
        has_face: studentsWithFaces.some(
          (student) => student.id === row.student_id,
        ),
      })),
    });
  } catch (err) {
    console.error("MARK ATTENDANCE BY FACE ERROR:", err);

    return res.status(500).json({
      error: err.message,
    });
  }
};

exports.overrideAttendance = async (req, res) => {
  const { subjectId } = req.params;
  const { date, overrides } = req.body;
  const teacherId = req.user.id;

  if (!date || !Array.isArray(overrides) || overrides.length === 0) {
    return res.status(400).json({
      error: "date and overrides[] are required",
    });
  }

  try {
    // 1. Verify that the logged-in teacher owns this subject
    const hasAccess = await ensureTeacherSubjectAccess(subjectId, teacherId);

    if (!hasAccess) {
      return res.status(404).json({
        error: "Subject not found",
      });
    }

    // 2. Make sure every student being overridden
    //    is actually enrolled in this subject.
    const studentIds = overrides.map((override) => override.student_id);

    const { rows: enrolledStudents } = await db.query(
      `SELECT student_id
       FROM enrollments
       WHERE subject_id = $1
         AND student_id = ANY($2::text[])`,
      [subjectId, studentIds],
    );

    const enrolledIds = new Set(enrolledStudents.map((row) => row.student_id));

    const invalidStudentIds = studentIds.filter(
      (studentId) => !enrolledIds.has(studentId),
    );

    if (invalidStudentIds.length > 0) {
      return res.status(400).json({
        error: "One or more students are not enrolled in this subject",
        student_ids: invalidStudentIds,
      });
    }

    // 3. Save each override.
    for (const override of overrides) {
      await db.query(
        `INSERT INTO student_attendances (
           student_id,
           subject_id,
           date,
           present
         )
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (
           student_id,
           subject_id,
           date
         )
         DO UPDATE SET
           present = EXCLUDED.present`,
        [override.student_id, subjectId, date, Boolean(override.present)],
      );
    }

    // 4. Recalculate the subject-level attendance
    //    for this date.
    await recalcSubjectDate(subjectId, date);

    // Recalculate overall attendance for every affected student.
    for (const override of overrides) {
      await recalcStudentOverallAttendance(override.student_id);
    }

    return res.json({
      message: "Overrides saved",
    });
  } catch (err) {
    console.error("OVERRIDE ATTENDANCE ERROR:", err);

    return res.status(500).json({
      error: err.message,
    });
  }
};

exports.markManualAttendance = async (req, res) => {
  const { subjectId } = req.params;
  const { date, attendance } = req.body;
  const teacherId = req.user.id;

  if (!date || !Array.isArray(attendance) || attendance.length === 0) {
    return res.status(400).json({
      error: "date and attendance[] are required",
    });
  }

  try {
    // 1. Verify that the logged-in teacher owns this subject.
    const hasAccess = await ensureTeacherSubjectAccess(subjectId, teacherId);

    if (!hasAccess) {
      return res.status(404).json({
        error: "Subject not found",
      });
    }

    // 2. Get all students enrolled in this subject.
    const { rows: enrolledStudents } = await db.query(
      `SELECT student_id
       FROM enrollments
       WHERE subject_id = $1`,
      [subjectId],
    );

    const enrolledIds = new Set(enrolledStudents.map((row) => row.student_id));

    // 3. Make sure the submitted students actually
    //    belong to this subject.
    const submittedIds = attendance.map((row) => row.student_id);

    const invalidStudentIds = submittedIds.filter(
      (studentId) => !enrolledIds.has(studentId),
    );

    if (invalidStudentIds.length > 0) {
      return res.status(400).json({
        error: "One or more students are not enrolled in this subject",
        student_ids: invalidStudentIds,
      });
    }

    // 4. Make sure attendance has been supplied for
    //    every enrolled student.
    const submittedIdSet = new Set(submittedIds);

    const missingStudentIds = enrolledStudents
      .map((row) => row.student_id)
      .filter((studentId) => !submittedIdSet.has(studentId));

    if (missingStudentIds.length > 0) {
      return res.status(400).json({
        error: "Attendance must be provided for every enrolled student",
        missing_student_ids: missingStudentIds,
      });
    }

    // 5. Save attendance records.
    for (const record of attendance) {
      await db.query(
        `INSERT INTO student_attendances (
           student_id,
           subject_id,
           date,
           present
         )
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (
           student_id,
           subject_id,
           date
         )
         DO UPDATE SET
           present = EXCLUDED.present`,
        [record.student_id, subjectId, date, Boolean(record.present)],
      );
    }

    // 6. Recalculate subject-level attendance.
    await recalcSubjectDate(subjectId, date);

    // Recalculate overall attendance for every affected student.
    for (const record of attendance) {
      await recalcStudentOverallAttendance(record.student_id);
    }

    // 7. Calculate the percentage from the submitted
    //    attendance records.
    const presentCount = attendance.filter((record) =>
      Boolean(record.present),
    ).length;

    const totalCount = attendance.length;

    const percentage = Math.round((presentCount / totalCount) * 100);

    return res.json({
      message: "Attendance saved",
      percentage,
    });
  } catch (err) {
    console.error("MARK MANUAL ATTENDANCE ERROR:", err);

    return res.status(500).json({
      error: err.message,
    });
  }
};
