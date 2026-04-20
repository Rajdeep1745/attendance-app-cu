const supabase = require('../config/supabaseClient');
const { extractEmbedding } = require('../utils/faceService');

/**
 * Check that the logged-in teacher has at least one batch containing this student.
 * enrollments.student_id → students.student_id (PK)
 */
async function teacherOwnsStudent(studentId, teacherId) {
  const { data, error } = await supabase
    .from('enrollments')
    .select('batch_id, batches!inner(teacher_id)')
    .eq('student_id', studentId)           // enrollments.student_id — correct
    .eq('batches.teacher_id', teacherId)
    .limit(1);

  return !error && data && data.length > 0;
}

/**
 * POST /api/students/:id/register-face
 * :id = students.student_id
 * Multipart field: faceImage (JPEG / PNG / WebP, single person only)
 */
exports.registerStudentFace = async (req, res) => {
  const { id: studentId } = req.params;   // students.student_id
  const teacherId = req.user.id;          // users.id
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: 'No image file provided' });
  }

  const hasAccess = await teacherOwnsStudent(studentId, teacherId);
  if (!hasAccess) {
    return res.status(403).json({ error: 'Access denied for this student' });
  }

  // ── Call Python service to get 128-dim embedding ───────────────────
  let embedding;
  try {
    embedding = await extractEmbedding(file.buffer);
  } catch (err) {
    const code = err.response?.data?.error;
    if (code === 'no_face_detected') {
      return res.status(400).json({
        error: 'No face detected. Use a clear, well-lit, frontal photo.'
      });
    }
    if (code === 'multiple_faces_detected') {
      return res.status(400).json({
        error: 'Multiple faces found. The registration photo must show only one person.'
      });
    }
    console.error('[faceController] extractEmbedding error:', err.message);
    return res.status(503).json({
      error: 'Face recognition service unavailable. Is the Python service running on port 5001?'
    });
  }

  // ── Store embedding in student_face_data ───────────────────────────
  // student_face_data.student_id is a unique FK to students.student_id
  const { error: upsertError } = await supabase
    .from('student_face_data')
    .upsert(
      {
        student_id: studentId,                      // FK → students.student_id
        embedding,                                  // jsonb array of 128 numbers
        updated_at: new Date().toISOString()
      },
      { onConflict: 'student_id' }                  // requires UNIQUE on student_id
    );

  if (upsertError) {
    console.error('[faceController] upsert error:', upsertError);
    return res.status(500).json({ error: 'Failed to save face data' });
  }

  // ── Set students.face_registered = true ────────────────────────────
  // BUG FIX: students PK is student_id, NOT id
  const { error: flagError } = await supabase
    .from('students')
    .update({ face_registered: true })
    .eq('student_id', studentId);           // ✅ FIXED: was .eq('id', studentId)

  if (flagError) {
    // Non-fatal — embedding saved, log and continue
    console.error('[faceController] face_registered flag error:', flagError);
  }

  return res.json({ message: 'Face registered successfully' });
};