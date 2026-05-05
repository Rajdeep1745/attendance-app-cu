import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import BatchContext from "../../../context/batch/BatchContext";
import AlertContext from "../../../context/alert/AlertContext";

import "./TeacherLectures.css";
import LectureTopicsModal from "../../../components/lectureModal/LectureModal";

const formatCurriculumData = (data) =>
  data.map((unit, index) => ({
    id: unit.id || `unit-${index + 1}`,
    name: unit.name,
    topics: (unit.topics || []).map((topic, topicIndex) => ({
      id: topic.id || `topic-${index + 1}-${topicIndex + 1}`,
      name: topic.name,
    })),
  }));

const createEmptyTopic = () => ({
  id: Date.now() + Math.random(),
  title: "",
  objectives: "",
  classes: 1,
  topicId: "",
});

const createEmptyWeek = () => ({
  id: Date.now() + Math.random(),
  topics: [createEmptyTopic()],
});

const DEFAULT_GENERATION_SETTINGS = {
  workingWeeks: 14,
  classesPerWeek: 3,
  hoursPerClass: 1,
};

const mapPlanToWeeks = (plan = []) =>
  plan.map((week) => ({
    id: `week-${week.week}-${Math.random()}`,
    topics: (week.topics || []).map((topic, index) => ({
      id: `topic-${week.week}-${index}-${Math.random()}`,
      title: topic.title,
      objectives: topic.objectives,
      classes: topic.classes,
      topicId: topic.topicId,
    })),
  }));

const getCurriculumPreviewText = (unit) =>
  (unit.topics || []).map((topic) => topic.name).join(" • ");

const isCurriculumPreviewOverflowing = (unit) => {
  const previewText = getCurriculumPreviewText(unit);

  return (
    unit.name.length > 72 ||
    previewText.length > 110 ||
    (unit.topics || []).length > 1
  );
};

const Lectures = () => {
  const { activeBatch } = useContext(BatchContext);
  const { showAlert } = useContext(AlertContext);
  const { batchId } = useParams();

  const [mode, setMode] = useState("manual");
  const [hasSavedPlan, setHasSavedPlan] = useState(false);
  const [isEditing, setIsEditing] = useState(true);
  const [weeks, setWeeks] = useState([createEmptyWeek()]);
  const [lectureTopics, setLectureTopics] = useState([]);
  const [showEditTopics, setShowEditTopics] = useState(false);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [hasAiDraft, setHasAiDraft] = useState(false);
  const [generationSettings, setGenerationSettings] = useState(
    DEFAULT_GENERATION_SETTINGS,
  );
  const [planSummary, setPlanSummary] = useState(null);
  const [expandedCurriculumUnits, setExpandedCurriculumUnits] = useState({});

  const hasCurriculumTopics = useMemo(
    () => lectureTopics.some((unit) => unit.topics.length > 0),
    [lectureTopics],
  );

  const topicOptions = useMemo(
    () => lectureTopics.flatMap((unit) => unit.topics || []),
    [lectureTopics],
  );

  const resetPlanState = useCallback(() => {
    setWeeks([createEmptyWeek()]);
    setHasSavedPlan(false);
    setIsEditing(true);
    setMode("manual");
    setPlanSummary(null);
    setHasAiDraft(false);
  }, []);

  const fetchCurriculum = useCallback(
    async (targetBatchId = batchId) => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(
          `${process.env.REACT_APP_BACKEND_URL}api/lectures/curriculum/${targetBatchId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (!res.ok) {
          throw new Error("Failed to load lecture topics");
        }

        const data = await res.json();
        setLectureTopics(Array.isArray(data) ? formatCurriculumData(data) : []);
      } catch (err) {
        console.error(err);
      }
    },
    [batchId],
  );

  const fetchPlan = useCallback(
    async (targetBatchId = batchId) => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(
          `${process.env.REACT_APP_BACKEND_URL}api/lectures/plan/${targetBatchId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (!res.ok) {
          throw new Error("Failed to load teaching plan");
        }

        const data = await res.json();

        if (Array.isArray(data) && data.length > 0) {
          setWeeks(mapPlanToWeeks(data));
          setHasSavedPlan(true);
          setIsEditing(false);
          setHasAiDraft(false);
          return;
        }

        resetPlanState();
      } catch (err) {
        console.error(err);
        resetPlanState();
      }
    },
    [batchId, resetPlanState],
  );

  useEffect(() => {
    if (!activeBatch) return;
    fetchCurriculum(batchId);
  }, [activeBatch, batchId, fetchCurriculum]);

  useEffect(() => {
    if (!activeBatch) return;
    fetchPlan(batchId);
  }, [activeBatch, batchId, fetchPlan]);

  const addWeek = () => {
    setWeeks((prev) => [...prev, createEmptyWeek()]);
  };

  const removeWeek = (weekIndex) => {
    if (weeks.length === 1) return;
    setWeeks((prev) => prev.filter((_, index) => index !== weekIndex));
  };

  const addTopic = (weekIndex) => {
    setWeeks((prev) =>
      prev.map((week, index) =>
        index === weekIndex
          ? { ...week, topics: [...week.topics, createEmptyTopic()] }
          : week,
      ),
    );
  };

  const removeTopic = (weekIndex, topicIndex) => {
    setWeeks((prev) =>
      prev.map((week, index) => {
        if (index !== weekIndex || week.topics.length === 1) {
          return week;
        }

        return {
          ...week,
          topics: week.topics.filter((_, currentTopicIndex) => currentTopicIndex !== topicIndex),
        };
      }),
    );
  };

  const updateTopic = (weekIndex, topicIndex, field, value) => {
    setWeeks((prev) =>
      prev.map((week, index) => {
        if (index !== weekIndex) return week;

        return {
          ...week,
          topics: week.topics.map((topic, currentTopicIndex) =>
            currentTopicIndex === topicIndex
              ? { ...topic, [field]: value }
              : topic,
          ),
        };
      }),
    );
  };

  const saveCurriculum = async (
    topicsData = lectureTopics,
    {
      refreshPlan = true,
      successMessage = "Lecture topics updated",
    } = {},
  ) => {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}api/lectures/curriculum/${batchId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            units: topicsData.map((unit) => ({
              name: unit.name,
              topics: unit.topics.map((topic) => ({
                id: topic.id,
                name: topic.name,
              })),
            })),
          }),
        },
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Failed to save topics");
      }

      const nextTopics = Array.isArray(data.units)
        ? formatCurriculumData(data.units)
        : formatCurriculumData(topicsData);

      setLectureTopics(nextTopics);
      if (refreshPlan) {
        await fetchPlan(batchId);
      }
      showAlert("Saved", successMessage, "success");
      return true;
    } catch (err) {
      console.error(err);
      showAlert("Error", err.message, "danger");
      return false;
    }
  };

  const moveCurriculumUnit = async (unitIndex, direction) => {
    const targetIndex = unitIndex + direction;

    if (targetIndex < 0 || targetIndex >= lectureTopics.length) {
      return;
    }

    const nextTopics = [...lectureTopics];
    const [movedUnit] = nextTopics.splice(unitIndex, 1);
    nextTopics.splice(targetIndex, 0, movedUnit);
    setLectureTopics(nextTopics);

    const saved = await saveCurriculum(nextTopics, {
      refreshPlan: false,
      successMessage: "Topic sequence updated",
    });

    if (!saved) {
      setLectureTopics(lectureTopics);
    }
  };

  const toggleCurriculumUnitExpansion = (unitId) => {
    setExpandedCurriculumUnits((prev) => ({
      ...prev,
      [unitId]: !prev[unitId],
    }));
  };

  const savePlan = async () => {
    try {
      for (const week of weeks) {
        for (const topic of week.topics) {
          if (!topic.topicId) {
            showAlert("Error", "Please select topic for all entries", "danger");
            return;
          }
        }
      }

      if (!hasCurriculumTopics) {
        showAlert(
          "No Topics",
          "Please enter lecture topics and subtopics before creating a teaching plan",
          "warning",
        );
        return;
      }

      const token = localStorage.getItem("token");
      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}api/lectures/plan/${batchId}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            weeks: weeks.map((week, index) => ({
              week: index + 1,
              topics: week.topics.map((topic) => ({
                topicId: topic.topicId,
                objectives: topic.objectives,
                classes: topic.classes,
              })),
            })),
          }),
        },
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Failed to save plan");
      }

      showAlert("Saved", "Teaching plan saved successfully", "success");
      setMode("manual");
      setHasSavedPlan(true);
      setIsEditing(false);
      setHasAiDraft(false);
    } catch (err) {
      console.error(err);
      showAlert("Error", err.message, "danger");
    }
  };

  const updateGenerationSetting = (field, value) => {
    setGenerationSettings((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const generatePlanWithAI = async () => {
    try {
      if (!hasCurriculumTopics) {
        showAlert(
          "No Topics",
          "Please enter lecture topics and subtopics before generating a teaching plan",
          "warning",
        );
        return;
      }

      const workingWeeks = Number(generationSettings.workingWeeks);
      const classesPerWeek = Number(generationSettings.classesPerWeek);
      const hoursPerClass = Number(generationSettings.hoursPerClass);

      if (!workingWeeks || !classesPerWeek || !hoursPerClass) {
        showAlert(
          "Missing Details",
          "Enter working weeks, classes per week, and hours per class before generating",
          "warning",
        );
        return;
      }

      setIsGeneratingPlan(true);
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}api/lectures/plan/generate/${batchId}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            workingWeeks,
            classesPerWeek,
            hoursPerClass,
          }),
        },
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Failed to generate teaching plan");
      }

      setWeeks(mapPlanToWeeks(data.weeks || []));
      setPlanSummary(data.settings || null);
      setHasAiDraft(true);
      setHasSavedPlan(false);
      setIsEditing(true);
      setMode("ai");
      showAlert(
        "Draft Ready",
        data?.message || "A teaching-plan draft is ready. Review and edit it before saving.",
        "success",
      );
    } catch (err) {
      console.error(err);
      showAlert("Error", err.message, "danger");
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const renderPlanEditor = () => (
    <div className="manual-plan">
      {weeks.map((week, weekIndex) => (
        <div key={week.id} className="week-container">
          <div className="week-header">
            <h5>Week {weekIndex + 1}</h5>
            <i
              className="fa-solid fa-trash delete-week"
              onClick={() => removeWeek(weekIndex)}
            ></i>
          </div>

          {week.topics.map((topic, topicIndex) => (
            <div key={topic.id} className="topic-container">
              <div className="topic-top">
                <div className="input-group">
                  <label>Topic Title</label>
                  <select
                    value={topic.topicId || ""}
                    onChange={(e) => {
                      const selectedTopicId = e.target.value;
                      const selectedTopic = topicOptions.find(
                        (topicOption) =>
                          String(topicOption.id) === String(selectedTopicId),
                      );

                      if (!selectedTopic) return;

                      updateTopic(weekIndex, topicIndex, "topicId", selectedTopic.id);
                      updateTopic(weekIndex, topicIndex, "title", selectedTopic.name);
                    }}
                  >
                    <option value="">Select Topic</option>
                    {lectureTopics.map((unit) => (
                      <optgroup key={unit.id} label={unit.name}>
                        {unit.topics.map((topicOption) => (
                          <option key={topicOption.id} value={topicOption.id}>
                            {topicOption.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                <div className="input-group small">
                  <label>Classes</label>
                  <div className="classes-input-wrapper">
                    <input
                      type="number"
                      min="0"
                      value={topic.classes}
                      onChange={(e) =>
                        updateTopic(
                          weekIndex,
                          topicIndex,
                          "classes",
                          Number(e.target.value),
                        )
                      }
                    />
                    <i
                      className="fa-solid fa-trash topic-delete"
                      onClick={() => removeTopic(weekIndex, topicIndex)}
                    ></i>
                  </div>
                </div>
              </div>

              <div className="input-group">
                <div className="floating-group">
                  <textarea
                    value={topic.objectives}
                    placeholder={`Write learning objectives...
- Understand concept of X
- Apply Y method
- Analyze Z problem`}
                    onChange={(e) => {
                      updateTopic(
                        weekIndex,
                        topicIndex,
                        "objectives",
                        e.target.value,
                      );

                      e.target.style.height = "auto";
                      e.target.style.height = `${e.target.scrollHeight}px`;
                    }}
                    style={{
                      minHeight: "140px",
                      resize: "none",
                      overflow: "hidden",
                    }}
                  />
                </div>
              </div>
            </div>
          ))}

          <button
            className="btn btn-outline-secondary add-topic-btn"
            onClick={() => addTopic(weekIndex)}
          >
            <i className="fa-solid fa-plus"></i> Add Topic
          </button>
        </div>
      ))}

      <div className="manual-footer">
        <button
          className="btn btn-outline-secondary"
          onClick={addWeek}
        >
          <i className="fa-solid fa-plus"></i> Add Week
        </button>

        <button
          className="btn btn-primary"
          onClick={savePlan}
          disabled={weeks.some((week) => week.topics.some((topic) => !topic.topicId))}
        >
          <i className="fa-solid fa-save"></i> Save Plan
        </button>
      </div>
    </div>
  );

  if (!activeBatch) return null;

  return (
    <div className="container-fluid lectures-page">
      <div className="mb-4">
        <h2 className="lectures-title">Lecture Topics</h2>
        <p className="lectures-subtitle">
          Enter the semester syllabus manually, review it in a clean format, and use it while building the teaching plan.
        </p>
      </div>

      <div className="card lectures-card mb-4">
        <div className="card-body">
          <div className="lectures-section-header">
            <div>
              <h5 className="card-title mb-1">Enter Semester Syllabus</h5>
              <p className="text-muted mb-0">
                Manually add the main topics for this semester and list their subtopics under each heading.
              </p>
            </div>

            <button
              className="btn btn-primary"
              onClick={() => setShowEditTopics(true)}
            >
              <i className="fa-solid fa-pen-to-square me-2"></i>
              {hasCurriculumTopics ? "Edit Topics" : "Enter Topics"}
            </button>
          </div>
        </div>
      </div>

      <div className="card lectures-card mb-4">
        <div className="card-body">
          <div className="lectures-section-header">
            <div>
              <h5 className="card-title mb-1">Topics and Subtopics</h5>
              <p className="text-muted mb-0">
                A clean, well-organized view of the semester syllabus for {activeBatch.name}. These topics feed both AI and manual teaching-plan creation.
              </p>
            </div>
          </div>

          {!hasCurriculumTopics ? (
            <div className="empty-syllabus-state mt-4">
              <i className="fa-solid fa-book-open-reader"></i>
              <p className="mb-1">No syllabus topics available yet</p>
              <small>Use the section above to enter the semester topics and subtopics manually.</small>
            </div>
          ) : (
            <div className="mt-4">
              <div className="curriculum-sequence-note" role="note">
                <button
                  type="button"
                  className="curriculum-sequence-info"
                  aria-label="Sequence information"
                  title="These topics and subtopics will be fed to AI for plan generation in this sequence only."
                >
                  i
                </button>
                <span>
                  These topics and subtopics will be fed to AI for plan
                  generation in this sequence only.
                </span>
              </div>

              <div className="curriculum-list">
                {lectureTopics.map((unit, unitIndex) => (
                  <div
                    key={unit.id}
                    className={`curriculum-unit-row${
                      expandedCurriculumUnits[unit.id] ? " expanded" : ""
                    }`}
                  >
                    <div className="curriculum-unit-top">
                      <div className="curriculum-unit-content">
                        <h6>{unit.name}</h6>
                        {expandedCurriculumUnits[unit.id] ? (
                          <>
                            <ul>
                              {unit.topics.map((topic) => (
                                <li key={topic.id}>{topic.name}</li>
                              ))}
                            </ul>

                            {isCurriculumPreviewOverflowing(unit) && (
                              <button
                                type="button"
                                className="curriculum-more-btn"
                                onClick={() =>
                                  toggleCurriculumUnitExpansion(unit.id)
                                }
                              >
                                See less
                              </button>
                            )}
                          </>
                        ) : (
                          <div className="curriculum-preview-row">
                            <p className="curriculum-topic-preview">
                              {getCurriculumPreviewText(unit)}
                            </p>

                            {isCurriculumPreviewOverflowing(unit) && (
                              <button
                                type="button"
                                className="curriculum-more-btn"
                                onClick={() =>
                                  toggleCurriculumUnitExpansion(unit.id)
                                }
                              >
                                See more
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="sequence-controls">
                        <button
                          type="button"
                          className="sequence-btn"
                          title="Move topic earlier"
                          onClick={() => moveCurriculumUnit(unitIndex, -1)}
                          disabled={unitIndex === 0}
                        >
                          <i className="fa-solid fa-arrow-up"></i>
                        </button>
                        <button
                          type="button"
                          className="sequence-btn"
                          title="Move topic later"
                          onClick={() => moveCurriculumUnit(unitIndex, 1)}
                          disabled={unitIndex === lectureTopics.length - 1}
                        >
                          <i className="fa-solid fa-arrow-down"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="card lectures-card">
        <div className="card-body">
          {hasSavedPlan && !isEditing && (
            <>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                  <h5 className="card-title mb-1">Teaching Plan</h5>
                  <p className="text-muted mb-0">
                    Your semester teaching plan has been saved.
                  </p>
                </div>

                <button
                  className="btn btn-outline-secondary"
                  onClick={() => {
                    setIsEditing(true);
                    setHasSavedPlan(false);
                    setMode("manual");
                    setHasAiDraft(false);
                  }}
                >
                  <i className="fa-solid fa-pen"></i> Edit Plan
                </button>
              </div>

              <div className="read-plan">
                {weeks.map((week, weekIndex) => (
                  <div key={week.id} className="week-container readonly">
                    <div className="week-header">
                      <h5>Week {weekIndex + 1}</h5>
                    </div>

                    {week.topics.map((topic) => (
                      <div key={topic.id} className="topic-readonly">
                        <div className="topic-read-header">
                          <h6>{topic.title || "Untitled Topic"}</h6>
                          <span className="classes-pill">
                            {topic.classes} class{topic.classes > 1 ? "es" : ""}
                          </span>
                        </div>

                        {topic.objectives && (
                          <p className="topic-objectives">{topic.objectives}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </>
          )}

          {!hasSavedPlan && (
            <>
              <h5 className="card-title mb-1">Create a Teaching Plan</h5>
              <p className="lectures-subtitle">
                Choose how you want to structure the semester.
              </p>

              <div className="plan-mode-toggle mt-3 mb-4">
                <button
                  className={`mode-btn ${mode === "ai" ? "active" : ""}`}
                  onClick={() => setMode("ai")}
                >
                  <i className="fa-solid fa-robot"></i> Generate with AI
                </button>

                <button
                  className={`mode-btn ${mode === "manual" ? "active" : ""}`}
                  onClick={() => setMode("manual")}
                >
                  <i className="fa-solid fa-pen-to-square"></i> Create Manually
                </button>
              </div>

              {mode === "ai" && (
                <div className="ai-plan-box">
                  <div className="ai-plan-copy">
                    <div>
                      <h6 className="mb-1">Generate a weekly teaching draft</h6>
                      <p className="text-muted mb-0">
                        The AI uses the saved syllabus topics and subtopics, then distributes them week by week based on your semester schedule.
                      </p>
                    </div>

                    <button
                      className="btn btn-primary"
                      onClick={generatePlanWithAI}
                      disabled={isGeneratingPlan || !hasCurriculumTopics}
                    >
                      {isGeneratingPlan ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2"></span>
                          Generating...
                        </>
                      ) : (
                        <>
                          <i className="fa-solid fa-wand-magic-sparkles me-2"></i>
                          {hasAiDraft ? "Regenerate Draft" : "Generate Draft"}
                        </>
                      )}
                    </button>
                  </div>

                  <div className="ai-config-grid mt-4">
                    <div className="input-group">
                      <label>Working Weeks</label>
                      <input
                        type="number"
                        min="1"
                        value={generationSettings.workingWeeks}
                        onChange={(e) =>
                          updateGenerationSetting("workingWeeks", e.target.value)
                        }
                      />
                    </div>

                    <div className="input-group">
                      <label>Classes Per Week</label>
                      <input
                        type="number"
                        min="1"
                        value={generationSettings.classesPerWeek}
                        onChange={(e) =>
                          updateGenerationSetting("classesPerWeek", e.target.value)
                        }
                      />
                    </div>

                    <div className="input-group">
                      <label>Hours Per Class</label>
                      <input
                        type="number"
                        min="0.5"
                        step="0.5"
                        value={generationSettings.hoursPerClass}
                        onChange={(e) =>
                          updateGenerationSetting("hoursPerClass", e.target.value)
                        }
                      />
                    </div>
                  </div>

                  {planSummary && (
                    <div className="plan-summary-pills mt-4">
                      <div className="curriculum-stat-pill">
                        <span>Weeks</span>
                        <strong>{planSummary.workingWeeks}</strong>
                      </div>
                      <div className="curriculum-stat-pill">
                        <span>Classes/Week</span>
                        <strong>{planSummary.classesPerWeek}</strong>
                      </div>
                      <div className="curriculum-stat-pill">
                        <span>Hours/Class</span>
                        <strong>{planSummary.hoursPerClass}</strong>
                      </div>
                      <div className="curriculum-stat-pill">
                        <span>Total Hours</span>
                        <strong>{planSummary.totalTeachingHours}</strong>
                      </div>
                    </div>
                  )}

                  {hasAiDraft && isEditing && weeks.length > 0 && (
                    <div className="mt-4">
                      <div className="ai-draft-note">
                        Edit the generated draft below, then save it to publish the same teaching plan on the student lecture topics tab.
                      </div>
                      {renderPlanEditor()}
                    </div>
                  )}
                </div>
              )}

              {mode === "manual" &&
                isEditing &&
                (hasCurriculumTopics ? (
                  renderPlanEditor()
                ) : (
                  <div className="text-muted">
                    Please enter lecture topics and subtopics before creating a teaching plan.
                  </div>
                ))}
            </>
          )}
        </div>
      </div>

      {showEditTopics && (
        <LectureTopicsModal
          data={lectureTopics}
          setData={setLectureTopics}
          onCancel={() => setShowEditTopics(false)}
          onSave={async (updatedTopics) => {
            await saveCurriculum(updatedTopics);
            setShowEditTopics(false);
          }}
        />
      )}
    </div>
  );
};

export default Lectures;
