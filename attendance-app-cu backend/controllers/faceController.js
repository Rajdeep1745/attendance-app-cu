const supabase = require("../config/supabaseClient");
const { extractEmbedding } = require("../utils/faceService");

async function teacherOwnsStudent(studentId, teacherId) {
  const { data, error } = await supabase
    .from("enrollments")
    .select("batch_id, batches!inner(teacher_id)")
    .eq("student_id", studentId)
    .eq("batches.teacher_id", teacherId)
    .limit(1);

  return !error && data && data.length > 0;
}

async function getStudentById(studentId) {
  const { data, error } = await supabase
    .from("students")
    .select("student_id, user_id")
    .eq("student_id", studentId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function getStudentByUserId(userId) {
  const { data, error } = await supabase
    .from("students")
    .select("student_id, user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

function buildInlineImageUrl(file) {
  return `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
}

async function persistRegisteredFace(student, file) {
  let embedding;

  try {
    embedding = await extractEmbedding(file.buffer);
  } catch (err) {
    const code = err.response?.data?.error;

    if (code === "no_face_detected") {
      const error = new Error(
        "No face detected. Use a clear, well-lit, frontal photo.",
      );
      error.statusCode = 400;
      throw error;
    }

    if (code === "multiple_faces_detected") {
      const error = new Error(
        "Multiple faces found. The registration photo must show only one person.",
      );
      error.statusCode = 400;
      throw error;
    }

    console.error("[faceController] extractEmbedding error:", err.message);
    const error = new Error(
      "Face recognition service unavailable. Is the Python service running on port 5001?",
    );
    error.statusCode = 503;
    throw error;
  }

  const imageUrl = buildInlineImageUrl(file);

  const { error: upsertError } = await supabase
    .from("student_face_data")
    .upsert(
      {
        student_id: student.student_id,
        image_url: imageUrl,
        embedding,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "student_id" },
    );

  if (upsertError) {
    console.error("[faceController] upsert error:", upsertError);
    const error = new Error("Failed to save face data");
    error.statusCode = 500;
    throw error;
  }

  const { error: avatarError } = await supabase
    .from("users")
    .update({ avatar: imageUrl })
    .eq("id", student.user_id);

  if (avatarError) {
    console.error("[faceController] avatar update error:", avatarError);
    const error = new Error("Failed to save profile picture");
    error.statusCode = 500;
    throw error;
  }

  const { error: flagError } = await supabase
    .from("students")
    .update({ face_registered: true })
    .eq("student_id", student.student_id);

  if (flagError) {
    console.error("[faceController] face_registered flag error:", flagError);
  }

  return {
    message: "Face registered successfully",
    studentId: student.student_id,
    avatar: imageUrl,
    imageUrl,
  };
}

exports.registerStudentFace = async (req, res) => {
  const { id: studentId } = req.params;
  const teacherId = req.user.id;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: "No image file provided" });
  }

  try {
    const student = await getStudentById(studentId);
    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    const hasAccess = await teacherOwnsStudent(studentId, teacherId);
    if (!hasAccess) {
      return res.status(403).json({ error: "Access denied for this student" });
    }

    const payload = await persistRegisteredFace(student, file);
    return res.json(payload);
  } catch (err) {
    return res
      .status(err.statusCode || 500)
      .json({ error: err.message || "Failed to register face" });
  }
};

exports.registerMyFace = async (req, res) => {
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: "No image file provided" });
  }

  try {
    const student = await getStudentByUserId(req.user.id);
    if (!student) {
      return res.status(404).json({ error: "Student profile not found" });
    }

    const payload = await persistRegisteredFace(student, file);
    return res.json(payload);
  } catch (err) {
    return res
      .status(err.statusCode || 500)
      .json({ error: err.message || "Failed to register face" });
  }
};
