import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getStudentOverview } from "../studentApi";

import "./StudentDashboard.css";

const StudentDashboard = () => {
  const { batchId } = useParams();
  const [details, setDetails] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!batchId) return;

    let ignore = false;

    const loadOverview = async () => {
      try {
        const data = await getStudentOverview(batchId);
        if (!ignore) {
          setDetails(data);
          setError("");
        }
      } catch (err) {
        if (!ignore) {
          setError(err.message);
        }
      }
    };

    loadOverview();

    return () => {
      ignore = true;
    };
  }, [batchId]);

  if (error) {
    return (
      <div className="container-fluid dashboard student-dashboard">
        <div className="alert alert-danger">{error}</div>
      </div>
    );
  }

  if (!details) {
    return (
      <div className="container-fluid dashboard student-dashboard">
        <div className="text-muted">
          <span className="spinner-border spinner-border-sm me-2"></span>
          Loading batch overview...
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid dashboard student-dashboard">
      <div className="mb-4">
        <h3 className="text-center fw-semibold mb-1">{details.name}</h3>
        <h2 className="dashboard-title mt-3 mb-2">Dashboard</h2>
        <p className="dashboard-subtitle mb-0">
          Read-only overview of your batch attendance settings and class progress
        </p>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-md-4">
          <div className="card dashboard-card h-100">
            <div className="card-body stats-card-body">
              <p className="stats-title">Students in Batch</p>
              <h2 className="stats-value">{details.totalStudents}</h2>
              <i className="fa-solid fa-users stats-icon"></i>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card dashboard-card h-100">
            <div className="card-body stats-card-body">
              <p className="stats-title">Batch Average</p>
              <h2 className="stats-value">{details.avgAttendance}%</h2>
              <i className="fa-solid fa-chart-simple stats-icon"></i>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card dashboard-card h-100">
            <div className="card-body stats-card-body">
              <p className="stats-title">My Attendance</p>
              <h2 className="stats-value">{details.myAttendance}%</h2>
              <i className="fa-solid fa-user-check stats-icon"></i>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-md-6">
          <div className="card dashboard-card h-100">
            <div className="card-body student-detail-card">
              <h5 className="card-title">Batch Join Code</h5>
              <p className="dashboard-subtitle small">
                Visible to students for reference only
              </p>

              <input
                type="text"
                className="form-control mb-3 text-center fw-bold"
                value={details.code}
                readOnly
              />

              <div className="student-card-meta">
                <div className="student-meta-row">
                  <span>Teacher</span>
                  <strong>{details.teacher}</strong>
                </div>
                <div className="student-meta-row">
                  <span>Joined On</span>
                  <strong>{details.joinedOn}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card dashboard-card h-100">
            <div className="card-body student-detail-card">
              <h5 className="card-title">Attendance Warning Threshold</h5>
              <p className="dashboard-subtitle small mb-4">
                Students can view the threshold, but only teachers can change it.
              </p>

              <div className="d-flex align-items-center gap-3 mb-4">
                <input
                  type="range"
                  className="form-range flex-grow-1"
                  min="0"
                  max="100"
                  value={details.threshold}
                  disabled
                  readOnly
                />

                <div className="threshold-input-wrapper">
                  <input
                    type="number"
                    className="form-control text-center"
                    value={details.threshold}
                    disabled
                    readOnly
                  />
                  <span className="percent-sign">%</span>
                </div>
              </div>

              <div className="student-card-meta">
                <div className="student-meta-row">
                  <span>Status</span>
                  <strong>{details.currentStanding}</strong>
                </div>
                <p className="student-threshold-note mb-0">{details.thresholdNote}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
