import { useCallback, useContext, useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import BatchContext from "../../../context/batch/BatchContext";
import AlertContext from "../../../context/alert/AlertContext";

import "./TeacherLectures.css";
import LectureTopicsModal from "../../../components/lectureModal/LectureModal";

const formatCurriculumData = (data) =>
  data.map((unit, index) => ({
    id: "unit-" + index,
    name: unit.name,
    topics: unit.topics,
  }));

const Lectures = () => {
  const { activeBatch } = useContext(BatchContext);
  const { showAlert } = useContext(AlertContext);
  const { batchId } = useParams();

  const [mode, setMode] = useState("manual"); // ai | manual
  const [hasSavedPlan, setHasSavedPlan] = useState(false);
  const [isEditing, setIsEditing] = useState(true);

  const [weeks, setWeeks] = useState([
    {
      id: Date.now(),
      topics: [
        {
          id: Date.now(),
          title: "",
          objectives: "",
          classes: 1,
        },
      ],
    },
  ]);

  const [showEditTopics, setShowEditTopics] = useState(false);

  const [lectureTopics, setLectureTopics] = useState([]);

  const [showTopics, setShowTopics] = useState(false);

  /* ================= HELPERS ================= */

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

        if (Array.isArray(data) && data.length > 0) {
          setLectureTopics(formatCurriculumData(data));
        } else {
          setLectureTopics([]);
        }
      } catch (err) {
        console.error(err);
      }
    },
    [batchId],
  );

  const resetPlanState = useCallback(() => {
    setWeeks([
      {
        id: Date.now(),
        topics: [
          {
            id: Date.now() + 1,
            title: "",
            objectives: "",
            classes: 1,
          },
        ],
      },
    ]);
    setHasSavedPlan(false);
    setIsEditing(true);
    setMode("manual");
  }, []);

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
          const formattedWeeks = data.map((week) => ({
            id: Date.now() + Math.random(),
            topics: week.topics.map((t) => ({
              id: Date.now() + Math.random(),
              title: t.title,
              objectives: t.objectives,
              classes: t.classes,
              topicId: t.topicId,
            })),
          }));

          setWeeks(formattedWeeks);
          setHasSavedPlan(true);
          setIsEditing(false);
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

  const addWeek = () => {
    setWeeks((prev) => [
      ...prev,
      {
        id: Date.now(),
        topics: [
          {
            id: Date.now(),
            title: "",
            objectives: "",
            classes: 1,
          },
        ],
      },
    ]);
  };

  const removeWeek = (weekIndex) => {
    if (weeks.length === 1) return;
    setWeeks((prev) => prev.filter((_, i) => i !== weekIndex));
  };

  const addTopic = (weekIndex) => {
    const updated = [...weeks];
    updated[weekIndex].topics.push({
      id: Date.now(),
      title: "",
      objectives: "",
      classes: 1,
    });
    setWeeks(updated);
  };

  const removeTopic = (weekIndex, topicIndex) => {
    const updated = [...weeks];
    if (updated[weekIndex].topics.length === 1) return;
    updated[weekIndex].topics.splice(topicIndex, 1);
    setWeeks(updated);
  };

  const updateTopic = (weekIndex, topicIndex, field, value) => {
    const updated = [...weeks];
    updated[weekIndex].topics[topicIndex][field] = value;
    setWeeks(updated);
  };

  // Save new lecture plan
  const savePlan = async () => {
    try {
      const token = localStorage.getItem("token");

      // Validate topics
      for (const week of weeks) {
        for (const topic of week.topics) {
          if (!topic.topicId) {
            showAlert("Error", "Please select topic for all entries", "danger");
            return;
          }
        }
      }

      // Check if topics exist
      const hasTopics = lectureTopics.some((u) => u.topics.length > 0);

      if (!hasTopics) {
        showAlert(
          "No Topics",
          "Please add lecture topics before creating a teaching plan",
          "warning",
        );
        return;
      }
      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}api/lectures/plan/${batchId}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            weeks: weeks.map((w, i) => ({
              week: i + 1,
              topics: w.topics.map((t) => ({
                topicId: t.topicId,
                objectives: t.objectives,
                classes: t.classes,
              })),
            })),
          }),
        },
      );

      const data = await res.json();

      if (!res.ok) throw new Error(data?.error || "Failed to save plan");

      showAlert("Saved", "Teaching plan saved successfully", "success");

      setMode("manual");
      setHasSavedPlan(true);
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      showAlert("Error", err.message, "danger");
    }
  };

  // Save new curricullam
  const saveCurriculum = async (topicsData = lectureTopics) => {
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
            units: topicsData.map((u) => ({
              name: u.name,
              topics: u.topics.map((t) => ({
                id: t.id,
                name: t.name,
              })),
            })),
          }),
        },
      );

      const data = await res.json();

      if (!res.ok) throw new Error(data?.error || "Failed to save topics");

      await fetchCurriculum(batchId);
      await fetchPlan(batchId);
      showAlert("Saved", "Lecture topics updated", "success");
    } catch (err) {
      console.error(err);
      showAlert("Error", err.message, "danger");
    }
  };

  useEffect(() => {
    if (!activeBatch) return;

    fetchCurriculum(batchId);
  }, [activeBatch, batchId, fetchCurriculum]);

  useEffect(() => {
    if (!activeBatch) return;

    fetchPlan(batchId);
  }, [activeBatch, batchId, fetchPlan]);

  if (!activeBatch) return;

  return (
    <div className="container-fluid lectures-page">
      {/* HEADER */}
      <div className="mb-4">
        <h2 className="lectures-title">Lecture Topics</h2>
        <p className="lectures-subtitle">
          View the curriculum and create a teaching plan for the semester.
        </p>
      </div>

      {/* CURRICULUM CARD */}
      <div className="card lectures-card mb-4">
        <div className="card-body d-flex justify-content-between align-items-center">
          <div>
            <h5 className="card-title mb-1">
              Lecture Topics for {activeBatch.name}
            </h5>
            <p className="text-muted mb-0">
              Organize units and topics before planning the semester.
            </p>
          </div>

          <div className="d-flex gap-2">
            <button
              className="btn btn-outline-secondary"
              onClick={() => setShowTopics((prev) => !prev)}
            >
              <i className="fa-solid fa-eye"></i>{" "}
              {showTopics ? "Hide Topics" : "Show Topics"}
            </button>

            <button
              className="btn btn-outline-secondary"
              onClick={() => setShowEditTopics(true)}
            >
              <i className="fa-solid fa-pen"></i> Edit Topics
            </button>
          </div>
        </div>
      </div>

      {/* READ ONLY TOPICS */}
      {showTopics && (
        <div className="card lectures-card mb-4">
          <div className="card-body">
            <h5 className="card-title mb-3">Lecture Topics</h5>

            {lectureTopics.length === 0 ||
            lectureTopics.every((u) => u.topics.length === 0) ? (
              <div className="text-muted">
                No topics added yet. Please click <b>Edit Topics</b> to add
                units and topics.
              </div>
            ) : (
              lectureTopics.map((unit) => (
                <div key={unit.id} className="mb-3">
                  <h6 className="fw-semibold">{unit.name}</h6>

                  {unit.topics.length === 0 ? (
                    <p className="text-muted ms-3">No topics in this unit</p>
                  ) : (
                    <ul className="ms-3">
                      {unit.topics.map((topic) => (
                        <li key={topic.id} className="text-muted">
                          {topic.name}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TEACHING PLAN CARD */}
      <div className="card lectures-card">
        <div className="card-body">
          {/* READ ONLY VIEW */}
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
                  }}
                >
                  <i className="fa-solid fa-pen"></i> Edit Plan
                </button>
              </div>

              <div className="read-plan">
                {weeks.map((week, wIndex) => (
                  <div key={week.id} className="week-container readonly">
                    <div className="week-header">
                      <h5>Week {wIndex + 1}</h5>
                    </div>

                    {week.topics.map((topic) => (
                      <div key={topic.id} className="topic-readonly">
                        <div className="topic-read-header">
                          <h6>{topic.title || "Untitled Topic"}</h6>
                          <span className="classes-pill">
                            {topic.classes} class
                            {topic.classes > 1 ? "es" : ""}
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

          {/* EDIT MODE */}
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

              {/* AI MODE */}
              {mode === "ai" && (
                <div className="ai-plan-box text-center">
                  {/* <p className="text-muted mb-3">
                    Let AI create a balanced, week-by-week teaching plan.
                  </p>
                  <button className="btn btn-primary">
                    <i className="fa-solid fa-wand-magic-sparkles"></i> Generate
                    AI Plan
                  </button> */}
                  <p className="text-muted mb-3">AI features Coming Soon!!!</p>
                </div>
              )}

              {/* MANUAL MODE */}
              {/* MANUAL MODE */}
              {mode === "manual" &&
                isEditing &&
                (lectureTopics.some((u) => u.topics.length > 0) ? (
                  <div className="manual-plan">
                    {weeks.map((week, wIndex) => (
                      <div key={week.id} className="week-container">
                        <div className="week-header">
                          <h5>Week {wIndex + 1}</h5>
                          <i
                            className="fa-solid fa-trash delete-week"
                            onClick={() => removeWeek(wIndex)}
                          ></i>
                        </div>

                        {week.topics.map((topic, tIndex) => (
                          <div key={topic.id} className="topic-container">
                            <div className="topic-top">
                              <div className="input-group">
                                <label>Topic Title</label>
                                <select
                                  value={topic.topicId || ""}
                                  onChange={(e) => {
                                    const selectedTopicId = e.target.value;

                                    const selectedTopic = lectureTopics
                                      .flatMap((u) => u.topics)
                                      .find(
                                        (t) =>
                                          String(t.id) ===
                                          String(selectedTopicId),
                                      );

                                    if (!selectedTopic) return;

                                    updateTopic(
                                      wIndex,
                                      tIndex,
                                      "topicId",
                                      selectedTopic.id,
                                    );
                                    updateTopic(
                                      wIndex,
                                      tIndex,
                                      "title",
                                      selectedTopic.name,
                                    );
                                  }}
                                >
                                  <option value="">Select Topic</option>

                                  {lectureTopics.map((unit) =>
                                    unit.topics.map((t) => (
                                      <option key={t.id} value={t.id}>
                                        {t.name}
                                      </option>
                                    )),
                                  )}
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
                                        wIndex,
                                        tIndex,
                                        "classes",
                                        Number(e.target.value),
                                      )
                                    }
                                  />
                                  <i
                                    className="fa-solid fa-trash topic-delete"
                                    onClick={() => removeTopic(wIndex, tIndex)}
                                  ></i>
                                </div>
                              </div>
                            </div>

                            <div className="input-group">
                              <div className="floating-group">
                                <textarea
                                  value={topic.objectives}
                                  placeholder={`Write learning objectives...
• Understand concept of X
• Apply Y method
• Analyze Z problem`}
                                  onChange={(e) => {
                                    updateTopic(
                                      wIndex,
                                      tIndex,
                                      "objectives",
                                      e.target.value,
                                    );

                                    e.target.style.height = "auto";
                                    e.target.style.height =
                                      e.target.scrollHeight + "px";
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
                          onClick={() => addTopic(wIndex)}
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
                        disabled={weeks.some((w) =>
                          w.topics.some((t) => !t.topicId),
                        )}
                      >
                        <i className="fa-solid fa-save"></i> Save Plan
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-muted">
                    Please add lecture topics before creating a teaching plan.
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
