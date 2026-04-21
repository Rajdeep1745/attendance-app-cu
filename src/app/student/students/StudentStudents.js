import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getStudentRoster } from "../studentApi";

import "./StudentStudents.css";

const StudentStudents = () => {
  const { batchId } = useParams();
  const [details, setDetails] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!batchId) return;

    let ignore = false;

    const loadRoster = async () => {
      try {
        const students = await getStudentRoster(batchId);
        if (!ignore) {
          setDetails({
            batchName: students[0]?.batchName || "",
            teacher: students[0]?.teacher || "",
            students,
          });
          setError("");
        }
      } catch (err) {
        if (!ignore) {
          setError(err.message);
        }
      }
    };

    loadRoster();

    return () => {
      ignore = true;
    };
  }, [batchId]);

  if (error) {
    return (
      <div className="container-fluid student-roster-page">
        <div className="alert alert-danger">{error}</div>
      </div>
    );
  }

  if (!details) {
    return (
      <div className="container-fluid student-roster-page">
        <div className="text-muted">
          <span className="spinner-border spinner-border-sm me-2"></span>
          Loading roster...
        </div>
      </div>
    );
  }

  const students = details.students;

  return (
    <div className="container-fluid student-roster-page">
      <div className="mb-4">
        <h2 className="student-roster-title">Students</h2>
        <p className="student-roster-subtitle">
          Read-only class roster for {details.batchName}.
        </p>
      </div>

      <div className="card student-roster-card mb-4">
        <div className="card-body student-roster-summary">
          <div>
            <p className="student-summary-label">Batch</p>
            <h4 className="mb-1">{details.batchName}</h4>
            <p className="text-muted mb-0">Teacher: {details.teacher}</p>
          </div>

          <div className="student-summary-metrics">
            <div className="student-summary-chip">
              <span>Total Students</span>
              <strong>{students.length}</strong>
            </div>
            <div className="student-summary-chip">
              <span>Registered Faces</span>
              <strong>{students.filter((student) => student.faceRegistered).length}</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="card student-roster-card">
        <div className="card-body">
          <div className="student-roster-table">
            <div className="student-roster-head">
              <span>Student</span>
              <span>Roll No.</span>
              <span>Attendance</span>
              <span>Face Status</span>
            </div>

            {students.map((student) => (
              <div key={student.id} className="student-roster-row">
                <div className="student-roster-info">
                  <img
                    src={`https://i.pravatar.cc/48?u=${student.id}`}
                    alt={student.name}
                  />
                  <div>
                    <strong>{student.name}</strong>
                    <small className="text-muted d-block">Classmate</small>
                  </div>
                </div>

                <span>{student.roll}</span>

                <span className="student-attendance-pill">{student.attendance}%</span>

                <span
                  className={`student-face-pill ${
                    student.faceRegistered ? "ok" : "missing"
                  }`}
                >
                  <i
                    className={`fa-solid ${
                      student.faceRegistered
                        ? "fa-circle-check"
                        : "fa-circle-xmark"
                    }`}
                  ></i>
                  {student.faceRegistered ? "Registered" : "Pending"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentStudents;
