import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import useDelayedLoading from "../../../hooks/useDelayedLoading";
import { StudentStudentsSkeleton } from "../../../components/skeletons/Skeletons";

import "./StudentStudents.css";

const API_BASE =
  process.env.REACT_APP_BACKEND_URL;

const getSubjectName = (subjectId) => {
  try {
    // eslint-disable-next-line global-require
    const { PROGRAMMES } = require("../../../data/programmes");

    for (const programmeData of Object.values(
      PROGRAMMES,
    )) {
      for (const subjects of Object.values(
        programmeData.semesters || {},
      )) {
        const subject = subjects.find(
          (item) =>
            String(item.id) ===
            String(subjectId),
        );

        if (subject) {
          return subject.name;
        }
      }
    }
  } catch (error) {
    console.error(
      "Failed to resolve subject name:",
      error,
    );
  }

  return subjectId;
};

const getStudentRoster = async (
  subjectId,
) => {
  const token =
    localStorage.getItem("token");

  const response = await fetch(
    `${API_BASE}api/students/${encodeURIComponent(
      subjectId,
    )}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.error ||
        "Failed to load students",
    );
  }

  return data;
};

const StudentStudents = () => {
  const { subjectId } =
    useParams();

  const [students, setStudents] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const subjectName =
    getSubjectName(subjectId);

  useEffect(() => {
    if (!subjectId) return;

    let ignore = false;

    const loadRoster = async () => {
      setLoading(true);

      try {
        const data =
          await getStudentRoster(
            subjectId,
          );

        if (!ignore) {
          setStudents(
            Array.isArray(data)
              ? data
              : [],
          );

          setError("");
        }
      } catch (err) {
        if (!ignore) {
          setError(err.message);
          setStudents([]);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    loadRoster();

    return () => {
      ignore = true;
    };
  }, [subjectId]);

  const showSkeleton =
    useDelayedLoading(
      loading || !subjectId,
    );

  if (error) {
    return (
      <div className="container-fluid student-roster-page">
        <div className="alert alert-danger">
          {error}
        </div>
      </div>
    );
  }

  if (showSkeleton) {
    return <StudentStudentsSkeleton />;
  }

  return (
    <div className="container-fluid student-roster-page">
      <div className="mb-4">
        <h2 className="student-roster-title">
          Students
        </h2>

        <p className="student-roster-subtitle">
          Class roster for{" "}
          <strong>{subjectName}</strong>.
        </p>
      </div>

      <div className="card student-roster-card mb-4">
        <div className="card-body student-roster-summary">
          <div>
            <p className="student-summary-label">
              Subject
            </p>

            <h4 className="mb-1">
              {subjectName}
            </h4>

            {students[0]?.teacher && (
              <p className="text-muted mb-0">
                <strong>Teacher:{" "}
                {students[0].teacher}</strong>
              </p>
            )}
          </div>

          <div className="student-summary-metrics">
            <div className="student-summary-chip">
              <span>
                Total Students
              </span>

              <strong>
                {students.length}
              </strong>
            </div>

            <div className="student-summary-chip">
              <span>
                Registered Faces
              </span>

              <strong>
                {
                  students.filter(
                    (student) =>
                      student.faceRegistered,
                  ).length
                }
              </strong>
            </div>
          </div>
        </div>
      </div>

      <div className="card student-roster-card">
        <div className="card-body">
          {students.length === 0 ? (
            <div className="text-muted py-4 text-center">
              No students are currently
              enrolled in this subject.
            </div>
          ) : (
            <div className="student-roster-table">
              <div className="student-roster-head">
                <span>Student</span>
                <span>Roll No.</span>
                <span>Attendance</span>
                <span>Face Status</span>
              </div>

              {students.map(
                (student) => (
                  <div
                    key={student.id}
                    className="student-roster-row"
                  >
                    <div className="student-roster-info">
                      <img
                        src={
                          student.avatar ||
                          `https://i.pravatar.cc/48?u=${student.id}`
                        }
                        alt={student.name}
                      />

                      <div>
                        <strong>
                          {student.name}
                        </strong>

                        <small className="text-muted d-block">
                          Classmate
                        </small>
                      </div>
                    </div>

                    <span>
                      {student.roll}
                    </span>

                    <span className="student-attendance-pill">
                      {student.attendance}%
                    </span>

                    <span
                      className={`student-face-pill ${
                        student.faceRegistered
                          ? "ok"
                          : "missing"
                      }`}
                    >
                      <i
                        className={`fa-solid ${
                          student.faceRegistered
                            ? "fa-circle-check"
                            : "fa-circle-xmark"
                        }`}
                      ></i>

                      {student.faceRegistered
                        ? "Registered"
                        : "Pending"}
                    </span>
                  </div>
                ),
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentStudents;