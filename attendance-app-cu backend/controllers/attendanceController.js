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
