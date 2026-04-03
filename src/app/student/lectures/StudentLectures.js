import { useParams } from "react-router-dom";
import { getStudentLecturesData } from "../studentDataService";

import "./StudentLectures.css";

const StudentLectures = () => {
  const { batchId } = useParams();
  const details = getStudentLecturesData(batchId);

  return (
    <div className="container-fluid student-lectures-page">
      <div className="mb-4">
        <h2 className="student-lectures-title">Lecture Topics</h2>
        <p className="student-lectures-subtitle">
          View the planned curriculum and teaching roadmap for {details.batchName}.
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
            {details.curriculum.map((unit) => (
              <div key={unit.id} className="student-unit-card">
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
