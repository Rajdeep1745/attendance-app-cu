import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import useDelayedLoading from "../../../hooks/useDelayedLoading";
import { StudentDashboardSkeleton } from "../../../components/skeletons/Skeletons";

import "./StudentDashboard.css";

const API_BASE = process.env.REACT_APP_BACKEND_URL;

const getSubjectName = (subjectId) => {
  try {
    // eslint-disable-next-line global-require
    const { PROGRAMMES } = require("../../../data/programmes");

    for (const [programme, programmeData] of Object.entries(
      PROGRAMMES,
    )) {
      for (const [semester, subjects] of Object.entries(
        programmeData.semesters || {},
      )) {
        const subject = subjects.find(
          (item) =>
            String(item.id) === String(subjectId),
        );

        if (subject) {
          return {
            name: subject.name,
            programme,
            semester,
          };
        }
      }
    }
  } catch (error) {
    console.error(
      "Failed to resolve subject:",
      error,
    );
  }

  return {
    name: subjectId,
    programme: null,
    semester: null,
  };
};

const getStudentOverview = async (subjectId) => {
  const token = localStorage.getItem("token");

  const response = await fetch(
    `${API_BASE}api/subject/${encodeURIComponent(
      subjectId,
    )}/overview`,
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
        "Failed to load subject overview",
    );
  }

  return data;
};

const StudentDashboard = () => {
  const { subjectId } = useParams();

  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const subjectDetails =
    getSubjectName(subjectId);

  useEffect(() => {
    if (!subjectId) return;

    let ignore = false;

    const loadOverview = async () => {
      setLoading(true);

      try {
        const data =
          await getStudentOverview(
            subjectId,
          );

        if (!ignore) {
          setDetails(data);
          setError("");
        }
      } catch (err) {
        if (!ignore) {
          setError(err.message);
          setDetails(null);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    loadOverview();

    return () => {
      ignore = true;
    };
  }, [subjectId]);

  const showSkeleton =
    useDelayedLoading(
      loading || !details,
    );

  if (error) {
    return (
      <div className="container-fluid dashboard student-dashboard">
        <div className="alert alert-danger">
          {error}
        </div>
      </div>
    );
  }

  if (showSkeleton || !details) {
    return <StudentDashboardSkeleton />;
  }

  const myAttendance = Number(
    details.myAttendance || 0,
  );

  const threshold = Number(
    details.threshold || 0,
  );

  const thresholdGap = Number(
    details.thresholdGap ??
      myAttendance - threshold,
  );

  const isAboveThreshold =
    myAttendance >= threshold;

  return (
    <div className="container-fluid dashboard student-dashboard">
      {/* -------------------------------------------------
          PAGE HEADER
      ------------------------------------------------- */}

      <div className="student-dashboard-heading mb-4">
  <div className="student-subject-heading">
    <div className="student-subject-heading-icon">
      <i className="fa-solid fa-book-open"></i>
    </div>

    <div className="student-subject-heading-content">
      <span className="student-subject-heading-label">
        Current Subject
      </span>

      <h1 className="student-subject-heading-title">
        {subjectDetails.name}
      </h1>
    </div>
  </div>

  <div className="student-dashboard-heading-divider"></div>

  <div className="student-dashboard-heading-bottom">
    <div>
      <h2 className="dashboard-title mb-1">
        Dashboard
      </h2>

      <p className="dashboard-subtitle mb-0">
        Your attendance overview for this subject.
      </p>
    </div>

    <div className="student-subject-heading-badge">
      <i className="fa-solid fa-chart-line"></i>
      <span>Overview</span>
    </div>
  </div>
</div>

      {/* -------------------------------------------------
          STAT CARDS
      ------------------------------------------------- */}

      <div className="row g-4 mb-4">
        <div className="col-md-4">
          <div className="card dashboard-card h-100">
            <div className="card-body stats-card-body">
              <p className="stats-title">
                Students in Subject
              </p>

              <h2 className="stats-value">
                {details.totalStudents}
              </h2>

              <i className="fa-solid fa-users stats-icon"></i>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card dashboard-card h-100">
            <div className="card-body stats-card-body">
              <p className="stats-title">
                Overall Attendance
              </p>

              <h2 className="stats-value">
                {details.avgAttendance}%
              </h2>

              <i className="fa-solid fa-chart-simple stats-icon"></i>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card dashboard-card h-100">
            <div className="card-body stats-card-body">
              <p className="stats-title">
                Subject Attendance
              </p>

              <h2 className="stats-value">
                {details.myAttendance}%
              </h2>

              <i className="fa-solid fa-user-check stats-icon"></i>
            </div>
          </div>
        </div>
      </div>

      {/* -------------------------------------------------
          PREMIUM INFORMATION CARDS
      ------------------------------------------------- */}

      <div className="row g-4">
        {/* =================================================
            SUBJECT INFORMATION
        ================================================= */}

        <div className="col-md-6">
          <div className="card dashboard-card student-premium-card h-100">
            <div className="card-body student-premium-card-body">
              <div className="student-premium-header">
                <div className="student-premium-icon subject-icon">
                  <i className="fa-solid fa-book-open"></i>
                </div>

                <div>
                  <h5 className="student-premium-title">
                    Subject Information
                  </h5>

                  <p className="student-premium-subtitle">
                    Your enrollment details
                  </p>
                </div>
              </div>

              <div className="student-subject-identity">
                <div className="student-subject-identity-icon">
                  <i className="fa-solid fa-layer-group"></i>
                </div>

                <div className="student-subject-identity-copy">
                  <span>Currently viewing</span>

                  <strong>
                    {subjectDetails.name}
                  </strong>
                </div>
              </div>

              <div className="student-information-grid">
                {subjectDetails.programme && (
                  <div className="student-information-item">
                    <div className="student-information-icon">
                      <i className="fa-solid fa-graduation-cap"></i>
                    </div>

                    <div className="student-information-copy">
                      <span>Programme</span>

                      <strong>
                        {subjectDetails.programme}
                      </strong>
                    </div>
                  </div>
                )}

                {subjectDetails.semester && (
                  <div className="student-information-item">
                    <div className="student-information-icon">
                      <i className="fa-solid fa-calendar-days"></i>
                    </div>

                    <div className="student-information-copy">
                      <span>Semester</span>

                      <strong>
                        {subjectDetails.semester}
                      </strong>
                    </div>
                  </div>
                )}

                <div className="student-information-item">
                  <div className="student-information-icon">
                    <i className="fa-solid fa-chalkboard-user"></i>
                  </div>

                  <div className="student-information-copy">
                    <span>Teacher</span>

                    <strong>
                      {details.teacher}
                    </strong>
                  </div>
                </div>

                <div className="student-information-item">
                  <div className="student-information-icon">
                    <i className="fa-regular fa-calendar-check"></i>
                  </div>

                  <div className="student-information-copy">
                    <span>Enrolled On</span>

                    <strong>
                      {details.joinedOn}
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* =================================================
            ATTENDANCE THRESHOLD
        ================================================= */}

        <div className="col-md-6">
          <div className="card dashboard-card student-premium-card student-threshold-card h-100">
            <div className="card-body student-premium-card-body">
              <div className="student-premium-header">
                <div className="student-premium-icon threshold-icon">
                  <i className="fa-solid fa-shield-halved"></i>
                </div>

                <div>
                  <h5 className="student-premium-title">
                    Attendance Threshold
                  </h5>

                  <p className="student-premium-subtitle">
                    Minimum attendance requirement
                  </p>
                </div>
              </div>

              <div className="student-threshold-display">
                <div className="student-threshold-value">
                  <span>
                    {details.threshold}
                  </span>

                  <small>%</small>
                </div>

                <div className="student-threshold-copy">
                  <span>Required attendance</span>

                  <strong>
                    {isAboveThreshold
                      ? "Requirement currently met"
                      : "Requirement currently not met"}
                  </strong>
                </div>
              </div>

              <div
                className={`student-threshold-status ${
                  isAboveThreshold
                    ? "is-safe"
                    : "is-warning"
                }`}
              >
                <div className="student-threshold-status-icon">
                  <i
                    className={`fa-solid ${
                      isAboveThreshold
                        ? "fa-circle-check"
                        : "fa-triangle-exclamation"
                    }`}
                  ></i>
                </div>

                <div className="student-threshold-status-copy">
                  <span>
                    Your attendance
                  </span>

                  <strong>
                    {myAttendance}%
                  </strong>
                </div>

                <div className="student-threshold-gap">
                  <span>
                    {thresholdGap >= 0
                      ? "+"
                      : ""}
                    {thresholdGap.toFixed(1)}%
                  </span>

                  <small>
                    {thresholdGap >= 0
                      ? "above requirement"
                      : "below requirement"}
                  </small>
                </div>
              </div>

              <div className="student-threshold-note">
                <i className="fa-solid fa-circle-info"></i>

                <span>
                  This threshold is set by your
                  teacher and cannot be changed
                  from the student account.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;