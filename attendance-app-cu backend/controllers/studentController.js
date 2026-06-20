const supabase = require("../config/supabaseClient");
const bcrypt = require("bcryptjs");

const TEACHER_CREATED_STUDENT_PASSWORD = "12345678";

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

const getStudentRecordByUserId = async (userId) => {
  const { data, error } = await supabase
    .from("students")
    .select("student_id, roll_no, attendance_percentage, face_registered")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
};

const ensureStudentBatchAccess = async (batchId, userId) => {
  const student = await getStudentRecordByUserId(userId);
  if (!student) return false;

  const { data, error } = await supabase
    .from("enrollments")
    .select("id")
    .eq("batch_id", batchId)
    .eq("student_id", student.student_id)
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
};

const ensureBatchAccess = async (batchId, user) => {
  if (user.role === "teacher") {
    return ensureTeacherBatchAccess(batchId, user.id);
  }

  if (user.role === "student") {
    return ensureStudentBatchAccess(batchId, user.id);
  }

  return false;
};

const incrementBatchStudentCount = async (batchId) => {
  const { error } = await supabase.rpc("increment_student_count", {
    batch_id: batchId,
  });

  if (!error) return;

  console.error("Error incrementing student count:", error);
  const { data: batch } = await supabase
    .from("batches")
    .select("total_students")
    .eq("id", batchId)
    .single();

  await supabase
    .from("batches")
    .update({ total_students: (batch?.total_students || 0) + 1 })
    .eq("id", batchId);
};

const decrementBatchStudentCount = async (batchId) => {
  const { error } = await supabase.rpc("decrement_student_count", {
    batch_id: batchId,
  });

  if (!error) return;

  console.error("Error decrementing student count:", error);
  const { data: batch } = await supabase
    .from("batches")
    .select("total_students")
    .eq("id", batchId)
    .single();

  await supabase
    .from("batches")
    .update({
      total_students: Math.max((batch?.total_students || 0) - 1, 0),
    })
    .eq("id", batchId);
};

const createGeneratedRollNo = (userId, attempt = 0) => {
  const base = `STU-${String(userId).replace(/-/g, "").slice(0, 8).toUpperCase()}`;
  return attempt === 0 ? base : `${base}-${attempt}`;
};

const getOrCreateStudentRecord = async (userId) => {
  const existingStudent = await getStudentRecordByUserId(userId);
  if (existingStudent) return existingStudent;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { data, error } = await supabase
      .from("students")
      .insert([
        {
          user_id: userId,
          roll_no: createGeneratedRollNo(userId, attempt),
          attendance_percentage: 0,
        },
      ])
      .select("student_id, roll_no, attendance_percentage, face_registered")
      .single();

    if (!error) return data;
    if (error.code !== "23505") throw error;
  }

  throw new Error("Failed to create student profile");
};

const formatJoinedOn = (value) =>
  new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));

const formatRecordedTime = (value) =>
  new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(value));

const getBatchAverageAttendance = async (batchId) => {
  const { data, error } = await supabase
    .from("batch_attendances")
    .select("attendance_percentage")
    .eq("batch_id", batchId);

  if (error) throw error;
  if (!data || data.length === 0) return 0;

  return Number(
    (
      data.reduce(
        (sum, row) => sum + Number(row.attendance_percentage || 0),
        0,
      ) / data.length
    ).toFixed(1),
  );
};

const getTeacherNameById = async (teacherId) => {
  if (!teacherId) return "Teacher";

  const { data, error } = await supabase
    .from("users")
    .select("name")
    .eq("id", teacherId)
    .maybeSingle();

  if (error) throw error;
  return data?.name || "Teacher";
};

const getTeacherNamesByIds = async (teacherIds) => {
  const uniqueIds = [...new Set((teacherIds || []).filter(Boolean))];
  if (uniqueIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from("users")
    .select("id, name")
    .in("id", uniqueIds);

  if (error) throw error;
  return new Map((data || []).map((teacher) => [teacher.id, teacher.name]));
};

// Get student details
exports.getStudentsByBatch = async (req, res) => {
  const { batchId } = req.params;

  try {
    const hasAccess = await ensureBatchAccess(batchId, req.user);
    if (!hasAccess) {
      return res.status(403).json({ error: "Access denied" });
    }

    const { data: batchInfo, error: batchError } = await supabase
      .from("batches")
      .select("name, teacher_id")
      .eq("id", batchId)
      .single();

    if (batchError) throw batchError;
    const teacherName = await getTeacherNameById(batchInfo.teacher_id);

    const { data, error } = await supabase
      .from("enrollments")
      .select(
        `
        student_id,
        students!enrollments_student_id_fkey (
          student_id,
          roll_no,
          face_registered,
          attendance_percentage,
          users!students_user_id_fkey (
            name,
            email,
            department,
            institution,
            avatar
          )
        )
      `,
      )
      .eq("batch_id", batchId);

    if (error) {
      console.log(error);
      return res.status(500).json({ error: error.message });
    }

    const formatted = data.map((e) => ({
      id: e.students.student_id,
      name: e.students.users?.name,
      email: e.students.users?.email,
      roll: e.students.roll_no,
      department: e.students.users?.department,
      institution: e.students.users?.institution,
      avatar: e.students.users?.avatar,
      batchName: batchInfo.name,
      teacher: teacherName,
      faceRegistered: e.students.face_registered,
      attendance: e.students.attendance_percentage || 0,
    }));

    res.json(formatted);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Server error" });
  }
};

// ADD STUDENT
exports.addStudent = async (req, res) => {
  const { name, email, roll, batchId, department, institution } = req.body;

  try {
    const hasAccess = await ensureTeacherBatchAccess(batchId, req.user.id);
    if (!hasAccess) {
      return res.status(403).json({ error: "Access denied" });
    }

    let userId, studentId;
    let isNewEnrollment = true;

    // 1. Check if user with email exists
    const { data: existingUser, error: userCheckError } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (userCheckError) throw userCheckError;

    if (existingUser) {
      // User exists - check if they have a student record
      userId = existingUser.id;

      const { data: existingStudent, error: studentCheckError } = await supabase
        .from("students")
        .select("student_id")
        .eq("user_id", userId)
        .maybeSingle();

      if (studentCheckError) throw studentCheckError;

      if (existingStudent) {
        // Student exists - just enroll them if not already enrolled
        studentId = existingStudent.student_id;

        // Check if already enrolled
        const { data: existingEnrollment, error: enrollCheckError } =
          await supabase
            .from("enrollments")
            .select("id")
            .eq("student_id", studentId)
            .eq("batch_id", batchId)
            .maybeSingle();

        if (enrollCheckError) throw enrollCheckError;

        if (existingEnrollment) {
          // Already enrolled
          isNewEnrollment = false;
          return res.json({
            id: studentId,
            name: existingUser.name,
            roll,
            attendance: 0,
            faceRegistered: false,
            message: "Student already enrolled in this batch",
          });
        }
      } else {
        // User exists but no student record - create student record
        const { data: newStudent, error: studentError } = await supabase
          .from("students")
          .insert([
            {
              user_id: userId,
              roll_no: roll,
              attendance_percentage: 0,
            },
          ])
          .select()
          .single();

        if (studentError) throw studentError;
        studentId = newStudent.student_id;
      }
    } else {
      // User doesn't exist - create new user and student
      const hashedPassword = await bcrypt.hash(
        TEACHER_CREATED_STUDENT_PASSWORD,
        10,
      );

      const { data: user, error: userError } = await supabase
        .from("users")
        .insert([
          {
            name,
            email,
            department,
            institution,
            role: "student",
            avatar: "https://i.pravatar.cc/150",
            password: hashedPassword,
          },
        ])
        .select()
        .single();

      if (userError) throw userError;
      userId = user.id;

      // 2. Create student
      const { data: student, error: studentError } = await supabase
        .from("students")
        .insert([
          {
            user_id: userId,
            roll_no: roll,
            attendance_percentage: 0,
          },
        ])
        .select()
        .single();

      if (studentError) throw studentError;
      studentId = student.student_id;
    }

    // 3. Enroll student in batch (if not already enrolled)
    if (isNewEnrollment) {
      const { error: enrollError } = await supabase.from("enrollments").insert([
        {
          student_id: studentId,
          batch_id: batchId,
        },
      ]);

      if (enrollError) {
        // Check if it's a duplicate error
        if (enrollError.code !== "23505") {
          throw enrollError;
        }
        // Already enrolled, no action needed
        isNewEnrollment = false;
      }
    }

    // 4. Increase batch student count (only if new enrollment)
    if (isNewEnrollment) {
      await incrementBatchStudentCount(batchId);
    }

    // Get student data to return
    const { data: userData } = await supabase
      .from("users")
      .select("name, email, department, institution, avatar")
      .eq("id", userId)
      .single();

    res.json({
      id: studentId,
      name: userData?.name || name,
      roll,
      avatar: userData?.avatar,
      attendance: 0,
      faceRegistered: false,
      isNew: isNewEnrollment,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
};

// Remove student from batch
exports.removeStudentFromBatch = async (req, res) => {
  const { id, batchId } = req.params;

  try {
    const hasAccess = await ensureTeacherBatchAccess(batchId, req.user.id);
    if (!hasAccess) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Delete enrollment only
    const { data: deletedEnrollment, error } = await supabase
      .from("enrollments")
      .delete()
      .select("id")
      .eq("student_id", id)
      .eq("batch_id", batchId)
      .maybeSingle();

    if (error) throw error;
    if (!deletedEnrollment) {
      return res.status(404).json({ error: "Enrollment not found" });
    }

    // Decrement batch student count
    await decrementBatchStudentCount(batchId);

    res.json({ message: "Student removed from batch" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete student completely
exports.deleteStudent = async (req, res) => {
  const { id } = req.params;

  try {
    // Get user_id
    const { data: student } = await supabase
      .from("students")
      .select("user_id")
      .eq("student_id", id)
      .single();

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    const userId = student.user_id;

    // Delete from users → cascade deletes everything
    await supabase.from("users").delete().eq("id", userId);

    res.json({ message: "Student deleted completely" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getMyBatches = async (req, res) => {
  try {
    const student = await getStudentRecordByUserId(req.user.id);
    if (!student) {
      return res.json([]);
    }

    const { data, error } = await supabase
      .from("enrollments")
      .select(
        `
        batch_id,
        created_at,
        batches!inner (
          id,
          name,
          batch_code,
          teacher_id,
          threshold,
          total_students
        )
      `,
      )
      .eq("student_id", student.student_id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    const teacherNames = await getTeacherNamesByIds(
      (data || []).map((row) => row.batches?.teacher_id),
    );

    res.json(
      (data || []).map((row) => ({
        id: row.batches.id,
        name: row.batches.name,
        code: row.batches.batch_code,
        threshold: row.batches.threshold,
        totalStudents: row.batches.total_students,
        teacher: teacherNames.get(row.batches.teacher_id) || "Teacher",
        joinedOn: formatJoinedOn(row.created_at),
        joinedAt: row.created_at,
      })),
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

exports.joinBatchByCode = async (req, res) => {
  const batchCode = req.body?.batchCode?.trim()?.toUpperCase();

  if (!batchCode) {
    return res.status(400).json({ error: "Batch code is required" });
  }

  try {
    const { data: batch, error: batchError } = await supabase
      .from("batches")
      .select(
        `
        id,
        name,
        batch_code,
        threshold,
        total_students,
        teacher_id
      `,
      )
      .eq("batch_code", batchCode)
      .maybeSingle();

    if (batchError) throw batchError;
    if (!batch) {
      return res.status(404).json({ error: "Invalid batch code" });
    }
    const teacherName = await getTeacherNameById(batch.teacher_id);

    const student = await getOrCreateStudentRecord(req.user.id);

    const { data: existingEnrollment, error: enrollmentCheckError } =
      await supabase
        .from("enrollments")
        .select("id, created_at")
        .eq("student_id", student.student_id)
        .eq("batch_id", batch.id)
        .maybeSingle();

    if (enrollmentCheckError) throw enrollmentCheckError;

    if (existingEnrollment) {
      return res.json({
        message: "You have already joined this class",
        batch: {
          id: batch.id,
          name: batch.name,
          code: batch.batch_code,
          threshold: batch.threshold,
          totalStudents: batch.total_students,
          teacher: teacherName,
          joinedOn: formatJoinedOn(existingEnrollment.created_at),
          joinedAt: existingEnrollment.created_at,
        },
      });
    }

    const { data: createdEnrollment, error: enrollError } = await supabase
      .from("enrollments")
      .insert([
        {
          student_id: student.student_id,
          batch_id: batch.id,
        },
      ])
      .select("created_at")
      .single();

    if (enrollError) throw enrollError;

    await incrementBatchStudentCount(batch.id);

    res.json({
      message: "Class joined successfully",
      batch: {
        id: batch.id,
        name: batch.name,
        code: batch.batch_code,
        threshold: batch.threshold,
        totalStudents: batch.total_students + 1,
        teacher: teacherName,
        joinedOn: formatJoinedOn(createdEnrollment.created_at),
        joinedAt: createdEnrollment.created_at,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

exports.leaveMyBatch = async (req, res) => {
  const { batchId } = req.params;

  try {
    const student = await getStudentRecordByUserId(req.user.id);
    if (!student) {
      return res.status(404).json({ error: "Student profile not found" });
    }

    const { data: deletedEnrollment, error } = await supabase
      .from("enrollments")
      .delete()
      .select("id")
      .eq("student_id", student.student_id)
      .eq("batch_id", batchId)
      .maybeSingle();

    if (error) throw error;
    if (!deletedEnrollment) {
      return res.status(404).json({ error: "Enrollment not found" });
    }

    await decrementBatchStudentCount(batchId);
    res.json({ message: "You left the batch successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

exports.getMyBatchOverview = async (req, res) => {
  const { batchId } = req.params;

  try {
    const student = await getStudentRecordByUserId(req.user.id);
    if (!student) {
      return res.status(404).json({ error: "Student profile not found" });
    }

    const { data: enrollment, error: enrollmentError } = await supabase
      .from("enrollments")
      .select(
        `
        created_at,
        batches!inner (
          id,
          name,
          batch_code,
          teacher_id,
          threshold,
          total_students
        )
      `,
      )
      .eq("student_id", student.student_id)
      .eq("batch_id", batchId)
      .maybeSingle();

    if (enrollmentError) throw enrollmentError;
    if (!enrollment) {
      return res.status(403).json({ error: "Access denied" });
    }
    const teacherName = await getTeacherNameById(enrollment.batches.teacher_id);

    const avgAttendance = await getBatchAverageAttendance(batchId);
    const myAttendance = Number(student.attendance_percentage || 0);
    const threshold = Number(enrollment.batches.threshold || 0);
    const thresholdGap = Number((myAttendance - threshold).toFixed(1));

    res.json({
      batchId: enrollment.batches.id,
      name: enrollment.batches.name,
      teacher: teacherName,
      code: enrollment.batches.batch_code,
      totalStudents: enrollment.batches.total_students || 0,
      avgAttendance,
      myAttendance,
      threshold,
      joinedOn: formatJoinedOn(enrollment.created_at),
      thresholdNote:
        "Stay above this mark to avoid low-attendance warnings from your teacher.",
      currentStanding: `${thresholdGap >= 0 ? "+" : ""}${thresholdGap}% vs threshold`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

exports.getMyBatchReports = async (req, res) => {
  const { batchId } = req.params;

  try {
    const student = await getStudentRecordByUserId(req.user.id);
    if (!student) {
      return res.status(404).json({ error: "Student profile not found" });
    }

    const hasAccess = await ensureStudentBatchAccess(batchId, req.user.id);
    if (!hasAccess) {
      return res.status(403).json({ error: "Access denied" });
    }

    const { data: batch, error: batchError } = await supabase
      .from("batches")
      .select("name, threshold")
      .eq("id", batchId)
      .single();

    if (batchError) throw batchError;

    const { data: batchAttendanceRows, error: batchAttendanceError } =
      await supabase
        .from("batch_attendances")
        .select("date")
        .eq("batch_id", batchId)
        .order("date", { ascending: false });

    if (batchAttendanceError) throw batchAttendanceError;

    const { data: classRows, error: classError } = await supabase
      .from("student_attendances")
      .select("date, present")
      .eq("batch_id", batchId)
      .eq("student_id", student.student_id);

    if (classError) throw classError;

    const attendanceByDate = new Map(
      (classRows || []).map((row) => [row.date, row.present]),
    );
    const recentAttendance = (batchAttendanceRows || []).map((row) => {
      const present = attendanceByDate.get(row.date);

      return {
        date: row.date,
        status:
          present === true
            ? "Present"
            : present === false
              ? "Absent"
              : "No Class",
      };
    });

    const avgAttendance = await getBatchAverageAttendance(batchId);
    const attendedClasses = (classRows || []).filter(
      (row) => row.present === true,
    ).length;

    res.json({
      batchId,
      batchName: batch.name,
      myAttendance: Number(student.attendance_percentage || 0),
      batchAverage: avgAttendance,
      totalClasses: batchAttendanceRows?.length || 0,
      attendedClasses,
      threshold: Number(batch.threshold || 0),
      recentAttendance,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

exports.getMyAttendanceByDate = async (req, res) => {
  const { date } = req.query;

  if (!date) {
    return res.status(400).json({ error: "Date is required" });
  }

  try {
    const student = await getStudentRecordByUserId(req.user.id);
    if (!student) {
      return res.json([]);
    }

    const { data: joinedBatches, error: joinedError } = await supabase
      .from("enrollments")
      .select(
        `
        batch_id,
        batches!inner (
          id,
          name
        )
      `,
      )
      .eq("student_id", student.student_id)
      .order("batch_id", { ascending: true });

    if (joinedError) throw joinedError;

    const { data: attendanceRows, error: attendanceError } = await supabase
      .from("student_attendances")
      .select("batch_id, present, created_at")
      .eq("student_id", student.student_id)
      .eq("date", date);

    if (attendanceError) throw attendanceError;

    const attendanceMap = new Map(
      (attendanceRows || []).map((row) => [row.batch_id, row]),
    );

    res.json(
      (joinedBatches || []).map((row) => {
        const attendance = attendanceMap.get(row.batch_id);
        return {
          batchId: row.batches.id,
          batchName: row.batches.name,
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
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
