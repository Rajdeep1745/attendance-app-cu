const db = require("../config/db");
const { extractEmbedding } = require("../utils/faceService");

const teacherOwnsStudent = async (studentId, teacherId) => {
  const result = await db.query(
    `SELECT 1
     FROM enrollments e
     JOIN subjects s
       ON s.subject_id = e.subject_id
     WHERE e.student_id = $1
       AND s.teacher_id = $2
     LIMIT 1`,
    [studentId, teacherId],
  );

  return result.rows.length > 0;
};

const getStudentById = async (studentId) => {
  const result = await db.query(
    `SELECT
        student_id
     FROM students
     WHERE student_id = $1`,
    [studentId],
  );

  return result.rows[0] || null;
};

const getStudentByUserId = async (userId) => {
  const result = await db.query(
    `SELECT
        student_id
     FROM students
     WHERE student_id = $1`,
    [userId],
  );

  return result.rows[0] || null;
};

const buildInlineImageUrl = (file) =>
  `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;

const persistRegisteredFace = async (student, file) => {
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

    if (code === "invalid_image") {
      const error = new Error(
        "Could not read this image. Please upload a valid JPEG, PNG, or WebP photo.",
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

  const client = await db.pool.connect();

  try {
    await client.query("BEGIN");

    // Save/update face data.
    await client.query(
      `INSERT INTO student_face_data (
         student_id,
         image_url,
         embedding,
         updated_at
       )
       VALUES ($1, $2, $3::jsonb, NOW())
       ON CONFLICT (student_id)
       DO UPDATE SET
         image_url = EXCLUDED.image_url,
         embedding = EXCLUDED.embedding,
         updated_at = NOW()`,
      [student.student_id, imageUrl, JSON.stringify(embedding)],
    );

    // Update user's avatar.
    await client.query(
      `UPDATE users
       SET avatar = $1
       WHERE id = $2`,
      [imageUrl, student.student_id],
    );

    // Mark face as registered.
    await client.query(
      `UPDATE students
       SET face_registered = TRUE
       WHERE student_id = $1`,
      [student.student_id],
    );

    await client.query("COMMIT");

    return {
      message: "Face registered successfully",
      studentId: student.student_id,
      avatar: imageUrl,
      imageUrl,
    };
  } catch (err) {
    await client.query("ROLLBACK");

    console.error("[faceController] database error:", err.message);

    const error = new Error("Failed to save face data");
    error.statusCode = 500;
    throw error;
  } finally {
    client.release();
  }
};

// ---------------------------------------------------------
// TEACHER REGISTERS A STUDENT'S FACE
// ---------------------------------------------------------

exports.registerStudentFace = async (req, res) => {
  const { id: studentId } = req.params;
  const teacherId = req.user.id;
  const file = req.file;

  if (!file) {
    return res.status(400).json({
      error: "No image file provided",
    });
  }

  try {
    const student = await getStudentById(studentId);

    if (!student) {
      return res.status(404).json({
        error: "Student not found",
      });
    }

    const hasAccess = await teacherOwnsStudent(studentId, teacherId);

    if (!hasAccess) {
      return res.status(403).json({
        error: "Access denied for this student",
      });
    }

    const payload = await persistRegisteredFace(student, file);

    return res.json(payload);
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      error: err.message || "Failed to register face",
    });
  }
};

// ---------------------------------------------------------
// STUDENT REGISTERS THEIR OWN FACE
// ---------------------------------------------------------

exports.registerMyFace = async (req, res) => {
  const file = req.file;

  if (!file) {
    return res.status(400).json({
      error: "No image file provided",
    });
  }

  try {
    const student = await getStudentByUserId(req.user.id);

    if (!student) {
      return res.status(404).json({
        error: "Student profile not found",
      });
    }

    const payload = await persistRegisteredFace(student, file);

    return res.json(payload);
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      error: err.message || "Failed to register face",
    });
  }
};
