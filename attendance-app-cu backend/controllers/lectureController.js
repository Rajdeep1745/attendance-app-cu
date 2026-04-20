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

const ensureBatchAccess = async (batchId, user) => {
  if (user.role === "teacher") {
    return ensureTeacherBatchAccess(batchId, user.id);
  }

  if (user.role === "student") {
    return ensureStudentBatchAccess(batchId, user.id);
  }

  return false;
};

// SAVE CURRICULUM (Units + Topics)
exports.saveCurriculum = async (req, res) => {
  const { batchId } = req.params;
  const { units } = req.body;
  // units = [{ name: "Unit 1", topics: [{ id?, name }] }]

  try {
    const hasAccess = await ensureBatchAccess(batchId, req.user);
    if (!hasAccess) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (!units || units.length === 0) {
      // delete all topics for this batch
      const { data: curriculum } = await supabase
        .from("lecture_curriculum")
        .select("id")
        .eq("batch_id", batchId)
        .single();

      if (curriculum) {
        await supabase
          .from("lecture_curriculum_topics")
          .delete()
          .eq("curriculum_id", curriculum.id);
      }

      return res.json({ message: "All topics deleted" });
    }

    // 1. Get or create curriculum
    let { data: curriculum } = await supabase
      .from("lecture_curriculum")
      .select("*")
      .eq("batch_id", batchId)
      .single();

    if (!curriculum) {
      const { data: newCurriculum, error } = await supabase
        .from("lecture_curriculum")
        .insert([{ batch_id: batchId }])
        .select()
        .single();

      if (error) throw error;
      curriculum = newCurriculum;
    }

    // 2. Get existing topics from DB
    const { data: existingTopics } = await supabase
      .from("lecture_curriculum_topics")
      .select("*")
      .eq("curriculum_id", curriculum.id);

    const existingMap = {};
    existingTopics.forEach((t) => {
      existingMap[t.id] = t;
    });

    const incomingTopicIds = [];

    // 3. Insert or Update
    for (const unit of units) {
      for (const topic of unit.topics) {
        if (topic.id && existingMap[topic.id]) {
          // UPDATE
          await supabase
            .from("lecture_curriculum_topics")
            .update({
              unit_name: unit.name,
              topic_name: topic.name,
            })
            .eq("id", topic.id);

          incomingTopicIds.push(topic.id);
        } else {
          // INSERT
          const { data: newTopic } = await supabase
            .from("lecture_curriculum_topics")
            .insert([
              {
                curriculum_id: curriculum.id,
                unit_name: unit.name,
                topic_name: topic.name,
              },
            ])
            .select()
            .single();

          incomingTopicIds.push(newTopic.id);
        }
      }
    }

    // 4. Delete removed topics
    for (const existing of existingTopics) {
      if (!incomingTopicIds.includes(existing.id)) {
        await supabase
          .from("lecture_curriculum_topics")
          .delete()
          .eq("id", existing.id);
      }
    }

    res.json({ message: "Curriculum synced successfully" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
};

// GET CURRICULUM
exports.getCurriculum = async (req, res) => {
  const { batchId } = req.params;

  try {
    const hasAccess = await ensureBatchAccess(batchId, req.user);
    if (!hasAccess) {
      return res.status(403).json({ error: "Access denied" });
    }

    const { data, error } = await supabase
      .from("lecture_curriculum")
      .select(
        `
        id,
        lecture_curriculum_topics (
          id,
          unit_name,
          topic_name
        )
      `,
      )
      .eq("batch_id", batchId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return res.json([]);
      }
      throw error;
    }

    // Convert to frontend format
    const unitsMap = {};

    data.lecture_curriculum_topics.forEach((t) => {
      if (!unitsMap[t.unit_name]) {
        unitsMap[t.unit_name] = [];
      }
      unitsMap[t.unit_name].push({
        id: t.id,
        name: t.topic_name,
      });
    });

    const formatted = Object.keys(unitsMap).map((unit) => ({
      name: unit,
      topics: unitsMap[unit],
    }));

    res.json(formatted);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
};

// SAVE TEACHING PLAN
exports.savePlan = async (req, res) => {
  const { batchId } = req.params;
  const { weeks } = req.body;

  try {
    const hasAccess = await ensureTeacherBatchAccess(batchId, req.user.id);
    if (!hasAccess) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (!Array.isArray(weeks) || weeks.length === 0) {
      return res.status(400).json({ error: "Weeks are required" });
    }

    // 1. Build new rows
    const rows = [];

    weeks.forEach((week, index) => {
      week.topics.forEach((topic) => {
        if (!topic.topicId) return;
        rows.push({
          batch_id: batchId,
          topic_id: topic.topicId,
          week_no: index + 1,
          objectives: topic.objectives,
          classes: topic.classes,
        });
      });
    });

    if (rows.length === 0) {
      return res.status(400).json({ error: "At least one topic is required" });
    }

    // 2. Backup old plan
    const { data: existingRows, error: existingError } = await supabase
      .from("lecture_schedule")
      .select("batch_id, topic_id, week_no, objectives, classes")
      .eq("batch_id", batchId);

    if (existingError) throw existingError;

    // 3. Replace old plan. If insert fails, restore previous rows.
    const { error: deleteError } = await supabase
      .from("lecture_schedule")
      .delete()
      .eq("batch_id", batchId);

    if (deleteError) throw deleteError;

    const { error: insertError } = await supabase.from("lecture_schedule").insert(rows);

    if (insertError) {
      if (existingRows?.length) {
        await supabase.from("lecture_schedule").insert(existingRows);
      }
      throw insertError;
    }

    res.json({ message: "Plan saved successfully" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
};

// GET TEACHING PLAN
exports.getPlan = async (req, res) => {
  const { batchId } = req.params;

  try {
    const hasAccess = await ensureTeacherBatchAccess(batchId, req.user.id);
    if (!hasAccess) {
      return res.status(403).json({ error: "Access denied" });
    }

    const { data, error } = await supabase
      .from("lecture_schedule")
      .select(
        `
        week_no,
        objectives,
        classes,
        lecture_curriculum_topics (
          id,
          topic_name
        )
      `,
      )
      .eq("batch_id", batchId)
      .order("week_no");

    if (error) throw error;

    // Convert to weeks format
    const weeksMap = {};

    data.forEach((row) => {
      if (!weeksMap[row.week_no]) {
        weeksMap[row.week_no] = [];
      }

      weeksMap[row.week_no].push({
        topicId: row.lecture_curriculum_topics.id,
        title: row.lecture_curriculum_topics.topic_name,
        objectives: row.objectives,
        classes: row.classes,
      });
    });

    const formatted = Object.keys(weeksMap).map((week) => ({
      week: Number(week),
      topics: weeksMap[week],
    }));

    res.json(formatted);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
};
