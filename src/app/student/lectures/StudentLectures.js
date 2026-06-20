import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import useDelayedLoading from "../../../hooks/useDelayedLoading";
import { StudentLecturesSkeleton } from "../../../components/skeletons/Skeletons";

import "./StudentLectures.css";

const getLectureData = async (path) => {
  const token = localStorage.getItem("token");
  const response = await fetch(
    `${process.env.REACT_APP_BACKEND_URL}${path}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const data = await response.json();

  if (!response.ok) throw new Error(data?.error || "Failed to load lectures");
  return data;
};

const StudentLectures = () => {
  const { batchId } = useParams();
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!batchId) return;

    let ignore = false;

    const loadLectures = async () => {
      setLoading(true);
      try {
        const [curriculum, plan] = await Promise.all([
          getLectureData(`api/lectures/curriculum/${batchId}`),
          getLectureData(`api/lectures/plan/${batchId}`),
        ]);

        if (!ignore) {
          setDetails({
            batchName: "",
            curriculum,
            plan: plan.map((week, weekIndex) => ({
              ...week,
              id: `week-${week.week || weekIndex + 1}`,
              topics: week.topics.map((topic, topicIndex) => ({
                ...topic,
                id: topic.topicId || `topic-${weekIndex}-${topicIndex}`,
              })),
            })),
          });
          setError("");
        }
      } catch (err) {
        if (!ignore) {
          setError(err.message);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    loadLectures();

    return () => {
      ignore = true;
    };
  }, [batchId]);

  const showSkeleton = useDelayedLoading(loading || !details);

  if (error) {
    return (
      <div className="container-fluid student-lectures-page">
        <div className="alert alert-danger">{error}</div>
      </div>
    );
  }

  if (showSkeleton || !details) {
    return <StudentLecturesSkeleton />;
  }

  return (
    <div className="container-fluid student-lectures-page">
      <div className="mb-4">
        <h2 className="student-lectures-title">Lecture Topics</h2>
        <p className="student-lectures-subtitle">
          View the planned curriculum and teaching roadmap for this batch.
        </p>
      </div>

      <div className="card student-lectures-card mb-4">
        <div className="card-body">
          <div className="student-lectures-header">
            <div>
              <h5 className="card-title mb-1">Curriculum Topics</h5>
              <p className="student-lectures-subtitle mb-0">
                Topics organized by unit as prepared by the teacher.
              </p>
            </div>
          </div>

          <div className="student-unit-grid">
            {details.curriculum.map((unit, unitIndex) => (
              <div key={unit.name || `unit-${unitIndex}`} className="student-unit-card">
                <h6>{unit.name}</h6>
                <ul>
                  {unit.topics.map((topic) => (
                    <li key={topic.id}>{topic.name}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card student-lectures-card">
        <div className="card-body">
          <div className="student-lectures-header mb-3">
            <div>
              <h5 className="card-title mb-1">Teaching Plan</h5>
              <p className="student-lectures-subtitle mb-0">
                Week-by-week lecture plan published by the teacher.
              </p>
            </div>
          </div>

          <div className="student-plan-list">
            {details.plan.map((week) => (
              <div key={week.id} className="student-week-card">
                <div className="student-week-header">
                  <h5>Week {week.week}</h5>
                </div>

                {week.topics.map((topic) => (
                  <div key={topic.id} className="student-topic-card">
                    <div className="student-topic-top">
                      <h6>{topic.title}</h6>
                      <span className="student-classes-pill">
                        {topic.classes} class{topic.classes > 1 ? "es" : ""}
                      </span>
                    </div>

                    <p className="student-topic-objectives mb-0">{topic.objectives}</p>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentLectures;
