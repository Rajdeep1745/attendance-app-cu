const supabase = require("../config/supabaseClient");

// Generate code for batch
const generateCode = () =>
  Math.random().toString(36).substring(2, 8).toUpperCase();

// GET ALL BATCHES
exports.getBatches = async (req, res) => {
  const { data, error } = await supabase
    .from("batches")
    .select("*")
    .eq("teacher_id", req.user.id)
    .order("name", { ascending: true });

  if (error) return res.status(500).json({ error });

  res.json(data);
};

// GET SELECTED BATCH
exports.getSelectedBatches = async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from("batches")
    .select("*")
    .eq("id", id)
    .eq("teacher_id", req.user.id)
    .single();

  if (error) {
    console.log("FETCH ERROR:", error);
    return res.status(500).json({ error });
  }

  if (!data) {
    return res.status(404).json({ error: "Batch not found" });
  }

  res.json(data);
};

// ADD BATCH
exports.addBatch = async (req, res) => {
  const { name } = req.body;

  let data = null;
  let error = null;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const result = await supabase
      .from("batches")
      .insert([
        {
          name,
          batch_code: generateCode(),
          teacher_id: req.user.id,
          threshold: 75,
          total_students: 0,
        },
      ])
      .select();

    data = result.data;
    error = result.error;

    if (!error || error.code !== "23505") {
      break;
    }
  }

  if (error) {
    console.log(error);
    return res.status(500).json({ error });
  }

  res.json(data[0]);
};

// DELETE BATCH
exports.deleteBatch = async (req, res) => {
  const { id } = req.params;

  const { error } = await supabase
    .from("batches")
    .delete()
    .eq("id", id)
    .eq("teacher_id", req.user.id);

  if (error) {
    console.log("DELETE ERROR:", error);
    return res.status(500).json({ error });
  }

  res.json({ message: "Batch deleted successfully" });
};

// RENAME BATCH
exports.renameBatch = async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  // validation
  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Batch name is required" });
  }

  const { data, error } = await supabase
    .from("batches")
    .update({ name: name.trim() })
    .eq("id", id)
    .eq("teacher_id", req.user.id)
    .select();

  if (error) {
    console.log("RENAME ERROR:", error);
    return res.status(500).json({ error });
  }

  if (!data || data.length === 0) {
    return res.status(404).json({ error: "Batch not found" });
  }

  res.json(data[0]);
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
    .eq("teacher_id", req.user.id)
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
