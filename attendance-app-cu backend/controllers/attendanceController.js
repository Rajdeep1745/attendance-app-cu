const supabase = require("../config/supabaseClient");

const ensureTeacherBatchAccess = async (batchId, teacherId) => {
  const { data, error } = await supabase
    .from("batches")
    .select("id")
    .eq("id", batchId)
    .eq("teacher_id", teacherId)
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
};

// Get attendance stats
exports.getAttendanceStats = async (req, res) => {
  const { id } = req.params;

  const hasAccess = await ensureTeacherBatchAccess(id, req.user.id);
  if (!hasAccess) {
    return res.status(403).json({ error: "Access denied" });
  }

  const { data, error } = await supabase
    .from("batch_attendances")
    .select("attendance_percentage, date")
    .eq("batch_id", id)
    .order("date", { ascending: true });

  if (error) {
    console.log("FETCH ERROR:", error);
    return res.status(500).json({ error });
  }

  if (!data || data.length === 0) {
    return res.json({
      totalClasses: 0,
      avgAttendance: 0,
      bestAttendance: { percentage: 0, date: null },
      worstAttendance: { percentage: 0, date: null },
    });
  }

  const totalClasses = data.length;

  const avgAttendance = (
    data.reduce((sum, row) => sum + row.attendance_percentage, 0) / totalClasses
  ).toFixed(1);

  // Find best
  let best = data[0];
  let worst = data[0];

  data.forEach((row) => {
    if (row.attendance_percentage > best.attendance_percentage) {
      best = row;
    }
    if (row.attendance_percentage < worst.attendance_percentage) {
      worst = row;
    }
  });

  res.json({
    totalClasses,
    avgAttendance,
    bestAttendance: {
      percentage: best.attendance_percentage,
      date: best.date,
    },
    worstAttendance: {
      percentage: worst.attendance_percentage,
      date: worst.date,
    },
  });
};

// GET WEEKLY ATTENDANCE GRAPH
exports.getAttendanceGraph = async (req, res) => {
  const { id } = req.params;

  const hasAccess = await ensureTeacherBatchAccess(id, req.user.id);
  if (!hasAccess) {
    return res.status(403).json({ error: "Access denied" });
  }

  const { data, error } = await supabase
    .from("batch_attendances")
    .select("attendance_percentage, date")
    .eq("batch_id", id)
    .order("date", { ascending: true });

  if (error) {
    console.log(error);
    return res.status(500).json({ error });
  }

  res.json(data);
};

// GET daily attendance for a batch on a specific date
exports.getDailyAttendance = async (req, res) => {
  const { batchId } = req.params;
  const { date } = req.query; // YYYY-MM-DD

  if (!date) {
    return res.status(400).json({ error: "Date is required" });
  }

  try {
    const hasAccess = await ensureTeacherBatchAccess(batchId, req.user.id);
    if (!hasAccess) {
      return res.status(403).json({ error: "Access denied" });
    }

    // 1. Get all students in batch
    const { data: students, error: studentsError } = await supabase
      .from("enrollments")
      .select(
        `
        student_id,
        students!enrollments_student_id_fkey (
          student_id,
          roll_no,
          attendance_percentage,
          users!students_user_id_fkey (
            name,
            avatar
          )
        )
      `,
      )
      .eq("batch_id", batchId);

    if (studentsError) throw studentsError;

    // 2. Get attendance for that date
    const { data: attendance, error: attendanceError } = await supabase
      .from("student_attendances")
      .select("student_id, present")
      .eq("batch_id", batchId)
      .eq("date", date);

    if (attendanceError) throw attendanceError;

    // 3. Map attendance
    const attendanceMap = {};
    attendance.forEach((a) => {
      attendanceMap[a.student_id] = a.present;
    });

    // 4. Format response
    const formatted = students.map((s) => ({
      id: s.students.student_id,
      name: s.students.users.name,
      avatar: s.students.users.avatar,
      roll: s.students.roll_no,
      percentage: s.students.attendance_percentage || 0,
      present: attendanceMap[s.students.student_id] ?? null,
    }));

    res.json(formatted);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
};

// Get frequent absentees
exports.getFrequentAbsentees = async (req, res) => {
  const { id } = req.params; // batchId

  try {
    const hasAccess = await ensureTeacherBatchAccess(id, req.user.id);
    if (!hasAccess) {
      return res.status(403).json({ error: "Access denied" });
    }

    const { data, error } = await supabase
      .from("student_attendances")
      .select(
        `
        student_id,
        students!student_attendances_student_id_fkey (
          student_id,
          users!students_user_id_fkey (
            name
          )
        )
      `,
      )
      .eq("batch_id", id)
      .eq("present", false);

    if (error) throw error;

    const absencesByStudent = new Map();

    (data || []).forEach((row) => {
      const studentId = row.student_id;
      const name = row.students?.users?.name || "Unknown Student";
      const current = absencesByStudent.get(studentId);

      absencesByStudent.set(studentId, {
        id: studentId,
        name,
        absences: (current?.absences || 0) + 1,
      });
    });

    const frequentAbsentees = Array.from(absencesByStudent.values()).sort(
      (a, b) => b.absences - a.absences || a.name.localeCompare(b.name),
    );

    res.json(frequentAbsentees);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
};

// ═══════════════════════════════════════════════════════════════════════
// NEW EXPORTS
// ═══════════════════════════════════════════════════════════════════════

const { recognizeFaces } = require('../utils/faceService');

function normalizeFaceEmbedding(rawEmbedding) {
  let embedding = rawEmbedding;

  if (typeof embedding === 'string') {
    try {
      embedding = JSON.parse(embedding);
    } catch {
      return null;
    }
  }

  if (!Array.isArray(embedding) || embedding.length === 0) {
    return null;
  }

  const numericEmbedding = embedding.map(value => Number(value));
  return numericEmbedding.every(Number.isFinite) ? numericEmbedding : null;
}

function getStudentFaceEmbedding(studentRow) {
  const faceData = studentRow?.student_face_data;
  const rawEmbedding = Array.isArray(faceData)
    ? faceData[0]?.embedding
    : faceData?.embedding;

  return normalizeFaceEmbedding(rawEmbedding);
}

// ── Helper: recalculate batch_attendances for one date ────────────────
// BUG FIX: now also writes presences (int4) which is a real column in schema
async function recalcBatchDate(batchId, date) {
  const { data: rows, error } = await supabase
    .from('student_attendances')
    .select('present')
    .eq('batch_id', batchId)
    .eq('date', date);

  if (error || !rows || rows.length === 0) return;

  const presentCount = rows.filter(r => r.present).length;
  const pct = Math.round((presentCount / rows.length) * 100);

  await supabase
    .from('batch_attendances')
    .upsert(
      {
        batch_id: batchId,
        date,
        attendance_percentage: pct,
        presences: presentCount           // ✅ FIXED: was missing, presences is int4 column
      },
      { onConflict: 'batch_id,date' }
    );
}

// ── Helper: recalculate students.attendance_percentage for a batch ────
// BUG FIX: was a no-op placeholder — now actually updates students table
// BUG FIX: uses .eq('student_id', ...) — students PK is student_id not id
async function recalcStudentPercentages(batchId) {
  const { data: records, error } = await supabase
    .from('student_attendances')
    .select('student_id, present')
    .eq('batch_id', batchId);

  if (error || !records || records.length === 0) return;

  // Group totals by student
  const totals = {};
  for (const row of records) {
    if (!totals[row.student_id]) {
      totals[row.student_id] = { total: 0, present: 0 };
    }
    totals[row.student_id].total++;
    if (row.present) totals[row.student_id].present++;
  }

  // Update each student's cached attendance_percentage
  for (const [studentId, counts] of Object.entries(totals)) {
    const pct = Math.round((counts.present / counts.total) * 100);

    // ✅ FIXED: students PK is student_id, NOT id
    await supabase
      .from('students')
      .update({ attendance_percentage: pct })
      .eq('student_id', studentId);      // ✅ FIXED: was the wrong column name
  }
}

/**
 * POST /api/attendance/:batchId/face
 * Multipart field: faceMedia (image or video)
 * Body field:      date (YYYY-MM-DD string)
 */
exports.markAttendanceByFace = async (req, res) => {
  const { batchId } = req.params;
  const { date } = req.body;
  const teacherId = req.user.id;         // users.id
  const file = req.file;

  if (!file)  return res.status(400).json({ error: 'No file provided' });
  if (!date)  return res.status(400).json({ error: 'date is required (YYYY-MM-DD)' });

  // ── Verify teacher owns this batch ─────────────────────────────────
  const { data: batch, error: batchErr } = await supabase
    .from('batches')
    .select('id')
    .eq('id', batchId)
    .eq('teacher_id', teacherId)         // batches.teacher_id = users.id
    .single();

  if (batchErr || !batch) {
    return res.status(403).json({ error: 'Access denied' });
  }

  // Load enrolled students with their face data
  const { data: enrolled, error: enrollErr } = await supabase
    .from('enrollments')
    .select(`
      student_id,
      students (
        student_id,
        face_registered,
        student_face_data ( embedding )
      )
    `)
    .eq('batch_id', batchId);

  if (enrollErr || !enrolled) {
    return res.status(500).json({ error: 'Failed to load student roster' });
  }

  // All student IDs enrolled in this batch
  const allStudentIds = enrolled.map(e => e.student_id);

  // Accept both one-to-one object and array relation shapes from Supabase.
  const studentsWithFaces = enrolled
    .map(e => ({
      id: e.student_id,
      embedding: getStudentFaceEmbedding(e.students)
    }))
    .filter(student => student.embedding);

  let recognizedIds = [];
  let framesProcessed = 0;

  if (studentsWithFaces.length > 0) {
    try {
      const result = await recognizeFaces(
        file.buffer,
        file.mimetype,
        studentsWithFaces,
        0.5
      );
      recognizedIds  = result.recognized.map(r => r.id);
      framesProcessed = result.frames_processed;
    } catch (err) {
      console.error('[attendanceController] recognizeFaces error:', err.message);
      return res.status(503).json({
        error: 'Face recognition service unavailable. Is the Python service running on port 5001?'
      });
    }
  }

  // ── Write student_attendances rows ────────────────────────────────
  const attendanceRows = allStudentIds.map(sid => ({
    student_id: sid,
    batch_id:   batchId,
    date,
    present:    recognizedIds.includes(sid)
  }));

  const { error: saveErr } = await supabase
    .from('student_attendances')
    .upsert(attendanceRows, { onConflict: 'student_id,batch_id,date' });

  if (saveErr) {
    console.error('[attendanceController] upsert error:', saveErr);
    return res.status(500).json({ error: 'Failed to save attendance' });
  }

  // ── Recalculate stats (non-blocking) ─────────────────────────────
  recalcBatchDate(batchId, date).catch(console.error);
  recalcStudentPercentages(batchId).catch(console.error);

  const unregisteredCount = allStudentIds.length - studentsWithFaces.length;

  return res.json({
    message: 'Attendance marked',
    present_count:      recognizedIds.length,
    total_count:        allStudentIds.length,
    unregistered_count: unregisteredCount,
    frames_processed:   framesProcessed,
    // Full list so frontend can render the override UI immediately
    attendance: attendanceRows.map(row => ({
      student_id:       row.student_id,
      present:          row.present,
      auto_recognized:  recognizedIds.includes(row.student_id),
      has_face:         studentsWithFaces.some(s => s.id === row.student_id)
    }))
  });
};

/**
 * PATCH /api/attendance/:batchId/override
 * Body: { date: "YYYY-MM-DD", overrides: [{ student_id, present }] }
 * Teacher corrects individual student status after face recognition.
 */
exports.overrideAttendance = async (req, res) => {
  const { batchId } = req.params;
  const { date, overrides } = req.body;
  const teacherId = req.user.id;

  if (!date || !Array.isArray(overrides) || overrides.length === 0) {
    return res.status(400).json({ error: 'date and overrides[] are required' });
  }

  // Verify teacher owns batch
  const { data: batch, error: batchErr } = await supabase
    .from('batches')
    .select('id')
    .eq('id', batchId)
    .eq('teacher_id', teacherId)
    .single();

  if (batchErr || !batch) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const rows = overrides.map(o => ({
    student_id: o.student_id,
    batch_id:   batchId,
    date,
    present:    Boolean(o.present)
  }));

  const { error } = await supabase
    .from('student_attendances')
    .upsert(rows, { onConflict: 'student_id,batch_id,date' });

  if (error) {
    console.error('[attendanceController] override error:', error);
    return res.status(500).json({ error: 'Failed to save overrides' });
  }

  // Recalculate — now also writes presences column correctly
  await recalcBatchDate(batchId, date).catch(console.error);
  await recalcStudentPercentages(batchId).catch(console.error);

  return res.json({ message: 'Overrides saved' });
};

/**
 * POST /api/attendance/:batchId/mark
 * Body: { date: "YYYY-MM-DD", attendance: [{ student_id, present }] }
 * Fully manual attendance — no face recognition.
 * This also fills the missing endpoint the project guide flagged.
 */
exports.markManualAttendance = async (req, res) => {
  const { batchId } = req.params;
  const { date, attendance } = req.body;
  const teacherId = req.user.id;

  if (!date || !Array.isArray(attendance) || attendance.length === 0) {
    return res.status(400).json({ error: 'date and attendance[] are required' });
  }

  const { data: batch, error: batchErr } = await supabase
    .from('batches')
    .select('id')
    .eq('id', batchId)
    .eq('teacher_id', teacherId)
    .single();

  if (batchErr || !batch) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const rows = attendance.map(a => ({
    student_id: a.student_id,
    batch_id:   batchId,
    date,
    present:    Boolean(a.present)
  }));

  const { error } = await supabase
    .from('student_attendances')
    .upsert(rows, { onConflict: 'student_id,batch_id,date' });

  if (error) {
    return res.status(500).json({ error: 'Failed to save attendance' });
  }

  await recalcBatchDate(batchId, date).catch(console.error);
  await recalcStudentPercentages(batchId).catch(console.error);

  const presentCount = rows.filter(r => r.present).length;
  const pct = Math.round((presentCount / rows.length) * 100);

  return res.json({ message: 'Attendance saved', percentage: pct });
};
