const supabase = require("../config/supabaseClient");

// Generate code for batch
const generateCode = () =>
  Math.random().toString(36).substring(2, 8).toUpperCase();

const ensureStudentBatchAccess = async (batchId, userId) => {
  const { data: student, error: studentError } = await supabase
    .from("students")
    .select("student_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (studentError) throw studentError;
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

// GET ALL BATCHES
exports.getBatches = async (req, res) => {
  const { data, error } = await supabase
    .from("batches")
    .select("*")
    .order("subject_id");

  if (error) return res.status(500).json({ error });

  res.json(data);
};

// GET SELECTED BATCH
exports.getSelectedBatches = async (req, res) => {
  const { id } = req.params;

  try {
    const hasAccess =
      req.user.role === "teacher"
        ? true
        : await ensureStudentBatchAccess(id, req.user.id);

    if (!hasAccess) {
      return res.status(403).json({ error: "Access denied" });
    }

    let query = supabase.from("batches").select("*").eq("id", id);

    const { data, error } = await query.single();

    if (error) {
      console.log("FETCH ERROR:", error);
      return res.status(500).json({ error });
    }

    if (!data) {
      return res.status(404).json({ error: "Batch not found" });
    }

    res.json(data);
  } catch (err) {
    console.log("FETCH ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
};

// UPDATE THRESHOLD
exports.updateThreshold = async (req, res) => {
  const { id } = req.params;
  const { threshold } = req.body;

  if (threshold === undefined) {
    return res.status(400).json({ error: "Threshold is required" });
  }

  const { data, error } = await supabase
    .from("batches")
    .update({ threshold })
    .eq("id", id)
    .select();

  if (error) {
    console.log("THRESHOLD UPDATE ERROR:", error);
    return res.status(500).json({ error });
  }

  if (!data || data.length === 0) {
    return res.status(404).json({ error: "Batch not found" });
  }

  res.json(data[0]);
};

// GET BATCH BY SUBJECT ID
exports.getBatchBySubject = async (req, res) => {
  const { subjectId } = req.params;

  try {
    const { data, error } = await supabase
      .from("batches")
      .select("*")
      .eq("subject_id", subjectId)
      .maybeSingle();

    if (error) {
      return res.status(500).json({ error });
    }

    if (!data) {
      return res.status(404).json({
        error: "Subject batch not found",
      });
    }

    res.json(data);
  } catch (err) {
    console.log(err);
    res.status(500).json({
      error: err.message,
    });
  }
};
