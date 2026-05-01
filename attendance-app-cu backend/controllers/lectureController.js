const axios = require("axios");
const supabase = require("../config/supabaseClient");

const naturalCompare = (left, right) =>
  String(left || "").localeCompare(String(right || ""), undefined, {
    numeric: true,
    sensitivity: "base",
  });

const normalizeKey = (value) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

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

const getOrCreateCurriculum = async (batchId) => {
  const { data: existing, error: existingError } = await supabase
    .from("lecture_curriculum")
    .select("*")
    .eq("batch_id", batchId)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing) return existing;

  const { data, error } = await supabase
    .from("lecture_curriculum")
    .insert([{ batch_id: batchId }])
    .select()
    .single();

  if (error) throw error;
  return data;
};

const loadCurriculumRows = async (batchId) => {
  const { data, error } = await supabase
    .from("lecture_curriculum")
    .select(
      `
      id,
      lecture_curriculum_topics (
        id,
        unit_name,
        topic_name,
        created_at
      )
    `,
    )
    .eq("batch_id", batchId)
    .maybeSingle();

  if (error) throw error;
  return data;
};

const formatCurriculumRows = (row) => {
  if (!row?.lecture_curriculum_topics?.length) {
    return [];
  }

  const unitMap = new Map();

  [...row.lecture_curriculum_topics]
    .sort((left, right) => {
      const leftTime = new Date(left.created_at || 0).getTime();
      const rightTime = new Date(right.created_at || 0).getTime();
      return leftTime - rightTime;
    })
    .forEach((topicRow) => {
    const unitName = topicRow.unit_name || "General Topics";

    if (!unitMap.has(unitName)) {
      unitMap.set(unitName, []);
    }

    unitMap.get(unitName).push({
      id: topicRow.id,
      name: topicRow.topic_name,
    });
  });

  return Array.from(unitMap.entries()).map(([name, topics]) => ({
    name,
    topics,
  }));
};

const getFormattedCurriculum = async (batchId) => {
  const curriculumRow = await loadCurriculumRows(batchId);
  return formatCurriculumRows(curriculumRow);
};

const flattenCurriculumTopics = (units) =>
  units.flatMap((unit, unitIndex) =>
    (unit.topics || []).map((topic, topicIndex) => ({
      id: topic.id,
      name: topic.name,
      unitName: unit.name,
      unitIndex,
      topicIndex,
    })),
  );

const createFallbackObjectives = (topicName, unitName) =>
  `Cover ${topicName} from ${unitName} with explanation, discussion, guided examples, and practice during class.`;

const buildTopicEntry = (topic, classes, objectives, hoursPerClass) => ({
  topicId: topic.id,
  title: topic.name,
  unitName: topic.unitName,
  classes,
  estimatedHours: Number((classes * hoursPerClass).toFixed(2)),
  objectives: String(objectives || createFallbackObjectives(topic.name, topic.unitName)).trim(),
});

const normalizeGeneratedPlan = ({
  generatedWeeks,
  workingWeeks,
  classesPerWeek,
  hoursPerClass,
  flatTopics,
}) => {
  const topicsById = new Map(flatTopics.map((topic) => [String(topic.id), topic]));
  const defaultTopics = flatTopics.length
    ? flatTopics
    : [{ id: "general-topic", name: "General Topic", unitName: "General" }];

  const normalizedWeeks = Array.from({ length: workingWeeks }, (_, index) => ({
    week: index + 1,
    topics: [],
  }));

  (Array.isArray(generatedWeeks) ? generatedWeeks : []).forEach((week, weekIndex) => {
    const requestedWeek = Number(week?.week);
    const targetIndex =
      Number.isInteger(requestedWeek) && requestedWeek >= 1 && requestedWeek <= workingWeeks
        ? requestedWeek - 1
        : weekIndex < workingWeeks
          ? weekIndex
          : -1;

    if (targetIndex < 0) return;

    normalizedWeeks[targetIndex].topics = (Array.isArray(week?.topics) ? week.topics : [])
      .map((topic) => {
        const matchedTopic = topicsById.get(String(topic?.topicId));
        if (!matchedTopic) return null;

        const classes = Math.max(1, Number.parseInt(topic?.classes, 10) || 1);
        return buildTopicEntry(
          matchedTopic,
          classes,
          topic?.objectives,
          hoursPerClass,
        );
      })
      .filter(Boolean);
  });

  let topicCursor = 0;

  normalizedWeeks.forEach((week) => {
    if (!week.topics.length) {
      const fallbackTopic = defaultTopics[topicCursor % defaultTopics.length];
      topicCursor += 1;
      week.topics = [
        buildTopicEntry(
          fallbackTopic,
          classesPerWeek,
          createFallbackObjectives(fallbackTopic.name, fallbackTopic.unitName),
          hoursPerClass,
        ),
      ];
      return;
    }

    let totalClasses = week.topics.reduce((sum, topic) => sum + topic.classes, 0);

    while (totalClasses > classesPerWeek && week.topics.length > 0) {
      const lastTopic = week.topics[week.topics.length - 1];

      if (lastTopic.classes > 1) {
        lastTopic.classes -= 1;
        lastTopic.estimatedHours = Number((lastTopic.classes * hoursPerClass).toFixed(2));
        totalClasses -= 1;
        continue;
      }

      week.topics.pop();
      totalClasses -= 1;
    }

    if (!week.topics.length) {
      const fallbackTopic = defaultTopics[topicCursor % defaultTopics.length];
      topicCursor += 1;
      week.topics = [
        buildTopicEntry(
          fallbackTopic,
          classesPerWeek,
          createFallbackObjectives(fallbackTopic.name, fallbackTopic.unitName),
          hoursPerClass,
        ),
      ];
      return;
    }

    if (totalClasses < classesPerWeek) {
      const remainingClasses = classesPerWeek - totalClasses;
      const lastTopic = week.topics[week.topics.length - 1];
      lastTopic.classes += remainingClasses;
      lastTopic.estimatedHours = Number((lastTopic.classes * hoursPerClass).toFixed(2));
    }
  });

  const totalCapacity = workingWeeks * classesPerWeek;
  if (flatTopics.length > 0 && totalCapacity >= flatTopics.length) {
    const assignedTopicIds = new Set(
      normalizedWeeks.flatMap((week) => week.topics.map((topic) => String(topic.topicId))),
    );

    const missingTopics = flatTopics.filter((topic) => !assignedTopicIds.has(String(topic.id)));

    missingTopics.forEach((missingTopic) => {
      let inserted = false;

      for (const week of normalizedWeeks) {
        const donor = week.topics.find((topic) => topic.classes > 1);

        if (!donor) continue;

        donor.classes -= 1;
        donor.estimatedHours = Number((donor.classes * hoursPerClass).toFixed(2));
        week.topics.push(
          buildTopicEntry(
            missingTopic,
            1,
            createFallbackObjectives(missingTopic.name, missingTopic.unitName),
            hoursPerClass,
          ),
        );
        inserted = true;
        break;
      }

      if (inserted) return;

      for (const week of normalizedWeeks) {
        const duplicateIndex = week.topics.findIndex(
          (topic, index) =>
            week.topics.findIndex(
              (candidate) => String(candidate.topicId) === String(topic.topicId),
            ) !== index,
        );

        if (duplicateIndex < 0) continue;

        week.topics.splice(
          duplicateIndex,
          1,
          buildTopicEntry(
            missingTopic,
            1,
            createFallbackObjectives(missingTopic.name, missingTopic.unitName),
            hoursPerClass,
          ),
        );
        inserted = true;
        break;
      }

      if (!inserted) {
        const targetWeek = normalizedWeeks[(topicCursor += 1) % normalizedWeeks.length];
        const targetIndex = targetWeek.topics.length - 1;
        targetWeek.topics[targetIndex] = buildTopicEntry(
          missingTopic,
          targetWeek.topics[targetIndex].classes,
          createFallbackObjectives(missingTopic.name, missingTopic.unitName),
          hoursPerClass,
        );
      }
    });
  }

  return normalizedWeeks.map((week) => ({
    week: week.week,
    topics: week.topics.map((topic) => ({
      topicId: topic.topicId,
      title: topic.title,
      unitName: topic.unitName,
      classes: topic.classes,
      estimatedHours: topic.estimatedHours,
      objectives: topic.objectives,
    })),
  }));
};

const extractGeminiResponseText = (responseData) => {
  const candidates = Array.isArray(responseData?.candidates)
    ? responseData.candidates
    : [];

  const text = candidates
    .flatMap((candidate) => candidate?.content?.parts || [])
    .map((part) => part?.text)
    .filter(Boolean)
    .join("")
    .trim();

  if (!text) {
    const blockedReason = responseData?.promptFeedback?.blockReason;
    if (blockedReason) {
      throw new Error(`Gemini blocked the request: ${blockedReason}`);
    }

    throw new Error("The Gemini API returned an empty teaching plan");
  }

  return text;
};

const parseJsonObjectFromText = (text) => {
  const normalizedText = String(text || "").trim();

  if (!normalizedText) {
    throw new Error("The Gemini API returned an empty teaching plan");
  }

  try {
    return JSON.parse(normalizedText);
  } catch (error) {
    const fencedMatch = normalizedText.match(/```json\s*([\s\S]*?)```/i);
    if (fencedMatch?.[1]) {
      return JSON.parse(fencedMatch[1].trim());
    }

    const objectMatch = normalizedText.match(/\{[\s\S]*\}/);
    if (objectMatch?.[0]) {
      return JSON.parse(objectMatch[0]);
    }

    throw error;
  }
};

const buildGeminiPlanningPrompt = ({
  curriculumUnits,
  flatTopics,
  workingWeeks,
  classesPerWeek,
  hoursPerClass,
  requireStrictJsonSchema,
}) =>
  JSON.stringify(
    {
      role:
        "You are an expert academic planner creating a productive semester teaching plan.",
      instructions: [
        "Analyze the topics conceptually and pedagogically before planning.",
        "Do not blindly follow the input order. Reorder topics when prerequisite understanding requires a different sequence.",
        "Teach foundational concepts before advanced, applied, or dependent concepts.",
        "Return exactly the requested number of weeks.",
        "For every week, the sum of classes across that week's topics must equal the requested classesPerWeek.",
        "Use only topicId values from the provided curriculum list.",
        "Write clear, teacher-facing objectives for each topic allocation.",
        "If extra class slots remain after coverage, use suitable topics for reinforcement, revision, practice, problem solving, recap, or assessment preparation.",
        "Make the semester progression systematic and realistic for classroom teaching.",
        requireStrictJsonSchema
          ? "Follow the provided JSON schema exactly."
          : "Return valid JSON only, with no markdown, no explanation, and no text outside the JSON object.",
      ],
      semester: {
        workingWeeks,
        classesPerWeek,
        hoursPerClass,
        totalClassMeetings: workingWeeks * classesPerWeek,
        totalTeachingHours: Number((workingWeeks * classesPerWeek * hoursPerClass).toFixed(2)),
      },
      curriculum: curriculumUnits.map((unit) => ({
        unitName: unit.name,
        topics: (unit.topics || []).map((topic) => ({
          topicId: String(topic.id),
          topicName: topic.name,
        })),
      })),
      flatTopics: flatTopics.map((topic) => ({
        topicId: String(topic.id),
        topicName: topic.name,
        unitName: topic.unitName,
      })),
      outputRequirements: {
        weeksField: "weeks",
        topicsPerWeekField: "topics",
        allowedTopicFields: ["topicId", "classes", "objectives"],
      },
    },
    null,
    2,
  );

const getGeminiModel = () =>
  process.env.GEMINI_PLAN_MODEL || "gemini-2.5-flash-lite";

const buildGeminiSchema = () => ({
  type: "object",
  required: ["weeks"],
  properties: {
    weeks: {
      type: "array",
      items: {
        type: "object",
        required: ["week", "topics"],
        properties: {
          week: {
            type: "integer",
          },
          topics: {
            type: "array",
            items: {
              type: "object",
              required: ["topicId", "classes", "objectives"],
              properties: {
                topicId: {
                  type: "string",
                },
                classes: {
                  type: "integer",
                },
                objectives: {
                  type: "string",
                },
              },
            },
          },
        },
      },
    },
  },
});

const buildGeminiErrorMessage = (error) =>
  error?.response?.data?.error?.message ||
  error?.response?.data?.error?.status ||
  error?.message ||
  "Gemini request failed";

const isGeminiInvalidArgument = (error) =>
  error?.response?.status === 400 ||
  error?.response?.data?.error?.status === "INVALID_ARGUMENT";

const generateTeachingPlanWithGeminiStructured = async ({
  curriculumUnits,
  workingWeeks,
  classesPerWeek,
  hoursPerClass,
}) => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured on the server");
  }

  const flatTopics = flattenCurriculumTopics(curriculumUnits);

  const response = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/${
      getGeminiModel()
    }:generateContent`,
    {
      system_instruction: {
        parts: [
          {
            text: "You are an expert academic planner. Build realistic weekly teaching plans that teach prerequisite concepts before advanced ones and keep the semester productive and well-sequenced.",
          },
        ],
      },
      contents: [
        {
          parts: [
            {
              text: buildGeminiPlanningPrompt({
                curriculumUnits,
                flatTopics,
                workingWeeks,
                classesPerWeek,
                hoursPerClass,
                requireStrictJsonSchema: true,
              }),
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseJsonSchema: buildGeminiSchema(),
      },
    },
    {
      headers: {
        "x-goog-api-key": process.env.GEMINI_API_KEY,
        "Content-Type": "application/json",
      },
      timeout: 45000,
    },
  );

  const responseText = extractGeminiResponseText(response.data);
  return parseJsonObjectFromText(responseText);
};

const generateTeachingPlanWithGeminiPlainJson = async ({
  curriculumUnits,
  workingWeeks,
  classesPerWeek,
  hoursPerClass,
}) => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured on the server");
  }

  const flatTopics = flattenCurriculumTopics(curriculumUnits);

  const response = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/${
      getGeminiModel()
    }:generateContent`,
    {
      system_instruction: {
        parts: [
          {
            text: "You are an expert academic planner. Return only a valid JSON object. No markdown, no commentary, no explanation.",
          },
        ],
      },
      contents: [
        {
          parts: [
            {
              text: buildGeminiPlanningPrompt({
                curriculumUnits,
                flatTopics,
                workingWeeks,
                classesPerWeek,
                hoursPerClass,
                requireStrictJsonSchema: false,
              }),
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
      },
    },
    {
      headers: {
        "x-goog-api-key": process.env.GEMINI_API_KEY,
        "Content-Type": "application/json",
      },
      timeout: 45000,
    },
  );

  const responseText = extractGeminiResponseText(response.data);
  return parseJsonObjectFromText(responseText);
};

const syncCurriculumUnits = async (batchId, units) => {
  const sanitizedUnits = Array.isArray(units)
    ? units
        .map((unit) => ({
          name: String(unit?.name || "").trim(),
          topics: Array.isArray(unit?.topics)
            ? unit.topics
                .map((topic) => ({
                  id: topic?.id,
                  name: String(topic?.name || "").trim(),
                }))
                .filter((topic) => topic.name)
            : [],
        }))
        .filter((unit) => unit.name)
    : [];

  const curriculum = await getOrCreateCurriculum(batchId);

  if (sanitizedUnits.length === 0) {
    const { error } = await supabase
      .from("lecture_curriculum_topics")
      .delete()
      .eq("curriculum_id", curriculum.id);

    if (error) throw error;

    return [];
  }

  const { data: existingTopics, error: existingError } = await supabase
    .from("lecture_curriculum_topics")
    .select("*")
    .eq("curriculum_id", curriculum.id);

  if (existingError) throw existingError;

  const existingById = new Map();
  const existingByKey = new Map();
  const consumedExistingIds = new Set();
  const retainedIds = new Set();

  (existingTopics || []).forEach((topic) => {
    existingById.set(topic.id, topic);
    const key = `${normalizeKey(topic.unit_name)}::${normalizeKey(topic.topic_name)}`;
    if (!existingByKey.has(key)) {
      existingByKey.set(key, []);
    }
    existingByKey.get(key).push(topic);
  });

  let sortIndex = 0;

  for (const unit of sanitizedUnits) {
    for (const topic of unit.topics) {
      sortIndex += 1;
      const payload = {
        curriculum_id: curriculum.id,
        unit_name: unit.name,
        topic_name: topic.name,
        created_at: new Date(Date.now() + sortIndex).toISOString(),
      };

      if (topic.id && existingById.has(topic.id)) {
        const { error } = await supabase
          .from("lecture_curriculum_topics")
          .update(payload)
          .eq("id", topic.id);

        if (error) throw error;
        retainedIds.add(topic.id);
        consumedExistingIds.add(topic.id);
        continue;
      }

      const matchKey = `${normalizeKey(unit.name)}::${normalizeKey(topic.name)}`;
      const candidate = (existingByKey.get(matchKey) || []).find(
        (item) => !consumedExistingIds.has(item.id),
      );

      if (candidate) {
        const { error } = await supabase
          .from("lecture_curriculum_topics")
          .update(payload)
          .eq("id", candidate.id);

        if (error) throw error;
        retainedIds.add(candidate.id);
        consumedExistingIds.add(candidate.id);
        continue;
      }

      const { data: inserted, error } = await supabase
        .from("lecture_curriculum_topics")
        .insert([payload])
        .select("id")
        .single();

      if (error) throw error;
      retainedIds.add(inserted.id);
    }
  }

  for (const existingTopic of existingTopics || []) {
    if (!retainedIds.has(existingTopic.id)) {
      const { error } = await supabase
        .from("lecture_curriculum_topics")
        .delete()
        .eq("id", existingTopic.id);

      if (error) throw error;
    }
  }

  return getFormattedCurriculum(batchId);
};

exports.saveCurriculum = async (req, res) => {
  const { batchId } = req.params;
  const { units } = req.body;

  try {
    const hasAccess = await ensureTeacherBatchAccess(batchId, req.user.id);
    if (!hasAccess) {
      return res.status(403).json({ error: "Access denied" });
    }

    const formattedUnits = await syncCurriculumUnits(batchId, units);
    return res.json({
      message:
        formattedUnits.length > 0
          ? "Curriculum synced successfully"
          : "All topics deleted",
      units: formattedUnits,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: err.message });
  }
};

exports.getCurriculum = async (req, res) => {
  const { batchId } = req.params;

  try {
    const hasAccess = await ensureBatchAccess(batchId, req.user);
    if (!hasAccess) {
      return res.status(403).json({ error: "Access denied" });
    }

    const formattedUnits = await getFormattedCurriculum(batchId);
    return res.json(formattedUnits);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: err.message });
  }
};

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

    const { data: existingRows, error: existingError } = await supabase
      .from("lecture_schedule")
      .select("batch_id, topic_id, week_no, objectives, classes")
      .eq("batch_id", batchId);

    if (existingError) throw existingError;

    const { error: deleteError } = await supabase
      .from("lecture_schedule")
      .delete()
      .eq("batch_id", batchId);

    if (deleteError) throw deleteError;

    const { error: insertError } = await supabase
      .from("lecture_schedule")
      .insert(rows);

    if (insertError) {
      if (existingRows?.length) {
        await supabase.from("lecture_schedule").insert(existingRows);
      }
      throw insertError;
    }

    return res.json({ message: "Plan saved successfully" });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: err.message });
  }
};

exports.generatePlan = async (req, res) => {
  const { batchId } = req.params;
  const workingWeeks = Number.parseInt(req.body?.workingWeeks, 10);
  const classesPerWeek = Number.parseInt(req.body?.classesPerWeek, 10);
  const hoursPerClass = Number(req.body?.hoursPerClass);

  try {
    const hasAccess = await ensureTeacherBatchAccess(batchId, req.user.id);
    if (!hasAccess) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (!Number.isInteger(workingWeeks) || workingWeeks <= 0) {
      return res.status(400).json({ error: "Working weeks must be a positive number" });
    }

    if (!Number.isInteger(classesPerWeek) || classesPerWeek <= 0) {
      return res.status(400).json({ error: "Classes per week must be a positive number" });
    }

    if (!Number.isFinite(hoursPerClass) || hoursPerClass <= 0) {
      return res.status(400).json({ error: "Hours per class must be a positive number" });
    }

    const curriculumUnits = await getFormattedCurriculum(batchId);
    const flatTopics = flattenCurriculumTopics(curriculumUnits);

    if (!flatTopics.length) {
      return res.status(400).json({
        error: "Please save syllabus topics and subtopics before generating a teaching plan",
      });
    }

    let aiDraft;

    try {
      aiDraft = await generateTeachingPlanWithGeminiStructured({
        curriculumUnits,
        workingWeeks,
        classesPerWeek,
        hoursPerClass,
      });
    } catch (structuredError) {
      console.log("Structured Gemini generation failed.");
      console.log(structuredError);

      if (!isGeminiInvalidArgument(structuredError)) {
        throw new Error(buildGeminiErrorMessage(structuredError));
      }

      aiDraft = await generateTeachingPlanWithGeminiPlainJson({
        curriculumUnits,
        workingWeeks,
        classesPerWeek,
        hoursPerClass,
      });
    }

    const weeks = normalizeGeneratedPlan({
      generatedWeeks: aiDraft?.weeks,
      workingWeeks,
      classesPerWeek,
      hoursPerClass,
      flatTopics,
    });

    return res.json({
      message: "Teaching plan draft generated successfully",
      source: "gemini",
      settings: {
        workingWeeks,
        classesPerWeek,
        hoursPerClass,
        totalTeachingHours: Number((workingWeeks * classesPerWeek * hoursPerClass).toFixed(2)),
      },
      weeks,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      error: buildGeminiErrorMessage(err) || "Failed to generate teaching plan",
    });
  }
};

exports.getPlan = async (req, res) => {
  const { batchId } = req.params;

  try {
    const hasAccess = await ensureBatchAccess(batchId, req.user);
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

    const weeksMap = {};

    (data || []).forEach((row) => {
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

    return res.json(formatted);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: err.message });
  }
};
