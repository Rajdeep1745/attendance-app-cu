import { useState, useContext, useEffect } from "react";
import AlertContext from "../../../context/alert/AlertContext";
import BatchContext from "../../../context/batch/BatchContext";
import { useParams } from "react-router-dom";
import AutoAttendancePanel from "../../../components/autoAttendance/AutoAttendancePanel";
import ManualAttendancePanel from "../../../components/manualAttendance/ManualAttendancePanel";
import useDelayedLoading from "../../../hooks/useDelayedLoading";
import { TeacherDashboardSkeleton } from "../../../components/skeletons/Skeletons";

import "./TeacherDashboard.css";

const Dashboard = () => {
  const { showAlert } = useContext(AlertContext);
  const { activeBatch, fetchBatchById } = useContext(BatchContext);
  const { batchId } = useParams();

  // Average attendance
  const [avgAttendance, setAvgAttendance] = useState(0);
  const [statsLoading, setStatsLoading] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);

  // Attendance code
  const code = activeBatch?.batch_code;

  // Student COUNT for the stats card (from activeBatch)
  const studentCount = activeBatch?.total_students ?? 0;

  // Student ARRAY for AutoAttendancePanel — fetched separately
  const [studentList, setStudentList] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);

  // Threshold
  const [threshold, setThreshold] = useState(0);
  const [savedThreshold, setSavedThreshold] = useState(0);

  // Mode
  const [mode, setMode] = useState("manual");

  const copyCode = () => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    showAlert("Copied", "Copied successfully", "success");
  };

  // Batch name
  const batchName = activeBatch?.name || "Loading...";

  // Save new threshold
  const saveThreshold = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}api/batches/${batchId}/threshold`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ threshold }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSavedThreshold(threshold);
      await fetchBatchById(batchId);
      showAlert("Saved", "Threshold updated", "success");
    } catch (err) {
      showAlert("Error", err.message, "danger");
    }
  };

  // Fetch Average Attendance
  const fetchAverageAttendance = async (id) => {
    if (!id) return;
    setStatsLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}api/attendance/${id}/stats`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to fetch stats");
      setAvgAttendance(data.avgAttendance);
    } catch (err) {
      console.error(err);
    } finally {
      setStatsLoading(false);
    }
  };

  // Fetch student list for AutoAttendancePanel
  // The existing GET /api/students/:batchId endpoint returns:
  // [{ id, name, roll, faceRegistered, ... }]
  // Note: the backend studentController returns the students table's student_id
  // as "id" in the JSON response — so this matches what AutoAttendancePanel expects
  const fetchStudentList = async (id) => {
    if (!id) return;
    setStudentsLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}api/students/${id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to fetch students");
      setStudentList(data);
    } catch (err) {
      console.error("[Dashboard] fetchStudentList error:", err.message);
      setStudentList([]);
    } finally {
      setStudentsLoading(false);
    }
  };

  useEffect(() => {
    if (!batchId) return;
    setBatchLoading(true);
    fetchBatchById(batchId).finally(() => setBatchLoading(false));
    fetchAverageAttendance(batchId);
    fetchStudentList(batchId);
    //eslint-disable-next-line
  }, [batchId]);

  useEffect(() => {
    if (activeBatch?.threshold !== undefined) {
      setThreshold(activeBatch.threshold);
      setSavedThreshold(activeBatch.threshold);
    }
  }, [activeBatch]);

  const batchMatchesRoute = String(activeBatch?.id || "") === String(batchId || "");
  const pageLoading =
    !batchMatchesRoute || batchLoading || statsLoading || studentsLoading;
  const showPageSkeleton = useDelayedLoading(pageLoading);

  if (showPageSkeleton || !batchMatchesRoute) {
    return <TeacherDashboardSkeleton />;
  }

  return (
    <div className="container-fluid dashboard">
      {/* PAGE TITLE */}
      <div className="mb-4">
        <h3 className="text-center fw-semibold mb-1">{batchName}</h3>
        <h2 className="dashboard-title mt-3 mb-2">Dashboard</h2>
        <p className="dashboard-subtitle mb-0">
          Configure attendance for this batch
        </p>
      </div>

      {/* STATS ROW */}
      <div className="row g-4 mb-4">
        {/* Students in batch */}
        <div className="col">
          <div className="card dashboard-card h-100">
            <div className="card-body stats-card-body">
              <p className="stats-title">Students in Batch</p>
              <h2 className="stats-value">{studentCount || 0}</h2>
              <i className="fa-solid fa-users stats-icon"></i>
            </div>
          </div>
        </div>

        {/* Average attendance */}
        <div className="col">
          <div className="card dashboard-card h-100">
            <div className="card-body stats-card-body">
              <p className="stats-title">Average Attendance</p>
              <h2 className="stats-value">{avgAttendance}%</h2>
              <i className="fa-solid fa-percent stats-icon"></i>
            </div>
          </div>
        </div>
      </div>

      {/* TOP ROW */}
      <div className="row g-4">
        {/* CODE GENERATOR */}
        <div className="col-md-6">
          <div className="card dashboard-card d-flex flex-column h-100">
            <div className="card-body d-flex flex-column">
              <h5 className="card-title">Batch Join Code</h5>
              <p className="dashboard-subtitle small">
                Generate a unique code for students
              </p>
              <input
                type="text"
                className="form-control mb-3 text-center fw-bold"
                value={code || "Loading..."}
                readOnly
              />
              <div className="d-flex gap-2 card-actions">
                <button
                  className="btn btn-primary"
                  disabled={!code}
                  onClick={copyCode}
                >
                  Copy
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* THRESHOLD */}
        <div className="col-md-6">
          <div className="card dashboard-card h-100">
            <div className="card-body">
              <h5 className="card-title">Attendance Warning Threshold</h5>
              <p className="dashboard-subtitle small mb-4">
                Set the minimum required attendance percentage. Students below
                this threshold will be flagged.
              </p>

              {/* Slider + Input */}
              <div className="d-flex align-items-center gap-3 mb-4">
                <input
                  type="range"
                  className="form-range flex-grow-1"
                  min="0"
                  max="100"
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                />
                <div className="threshold-input-wrapper">
                  <input
                    type="number"
                    className="form-control text-center"
                    min="0"
                    max="100"
                    value={threshold}
                    onChange={(e) => setThreshold(Number(e.target.value))}
                  />
                  <span className="percent-sign">%</span>
                </div>
              </div>

              {/* Actions */}
              <div className="d-flex gap-2 card-actions">
                <button
                  className="btn btn-primary"
                  disabled={threshold === savedThreshold}
                  onClick={saveThreshold}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODE SELECTOR */}
      <div className="row mt-4">
        <div className="col-12">
          <div className="card dashboard-card attendance-mode-card shadow-sm">
            <div className="card-body attendance-mode-body">
              <h5 className="card-title attendance-mode-title">Attendance Mode</h5>
              <p className="dashboard-subtitle small attendance-mode-subtitle">
                Choose how attendance will be taken
              </p>

              <div className="attendance-mode-switcher mb-4">
                <div className="form-check attendance-mode-option">
                  <input
                    className="form-check-input attendance-mode-radio"
                    type="radio"
                    name="mode"
                    id="attendance-mode-manual"
                    checked={mode === "manual"}
                    onChange={() => setMode("manual")}
                  />
                  <label
                    className="form-check-label attendance-mode-label"
                    htmlFor="attendance-mode-manual"
                  >
                    <span className="attendance-mode-label-title">Manual</span>
                    <span className="attendance-mode-label-copy">
                      Mark students one by one with quick toggles
                    </span>
                  </label>
                </div>

                <div className="form-check attendance-mode-option">
                  <input
                    className="form-check-input attendance-mode-radio"
                    type="radio"
                    name="mode"
                    id="attendance-mode-auto"
                    checked={mode === "auto"}
                    onChange={() => setMode("auto")}
                  />
                  <label
                    className="form-check-label attendance-mode-label"
                    htmlFor="attendance-mode-auto"
                  >
                    <span className="attendance-mode-label-title">Automatic</span>
                    <span className="attendance-mode-label-copy">
                      Use a class photo or video for recognition
                    </span>
                  </label>
                </div>
              </div>

              <div className="attendance-mode-panel">
                {mode === "manual" && (
                  <>
                    {studentsLoading ? (
                      <div className="text-muted small py-2 attendance-mode-state">
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Loading student list...
                      </div>
                    ) : studentList.length === 0 ? (
                      <div className="alert alert-warning py-2 small mb-0 attendance-mode-state">
                        <i className="fa fa-exclamation-triangle me-1"></i>
                        No students found in this batch. Add students first before
                        taking attendance.
                      </div>
                    ) : (
                      <ManualAttendancePanel
                        batchId={batchId}
                        students={studentList}
                        onSaved={() => {
                          fetchAverageAttendance(batchId);
                          fetchStudentList(batchId);
                        }}
                        showAlert={showAlert}
                      />
                    )}
                  </>
                )}

                {mode === "auto" && (
                  <>
                    {studentsLoading ? (
                      <div className="text-muted small py-2 attendance-mode-state">
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Loading student list...
                      </div>
                    ) : studentList.length === 0 ? (
                      <div className="alert alert-warning py-2 small mb-0 attendance-mode-state">
                        <i className="fa fa-exclamation-triangle me-1"></i>
                        No students found in this batch. Add students first before
                        taking attendance.
                      </div>
                    ) : (
                      <AutoAttendancePanel
                        batchId={batchId}
                        students={studentList}
                        onSaved={() => {
                          fetchAverageAttendance(batchId);
                          fetchStudentList(batchId); // refresh face-registered status too
                        }}
                        showAlert={showAlert}
                      />
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
