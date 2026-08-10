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

  /*
   * IMPORTANT:
   *
   * The frontend still calls this route parameter "batchId"
   * for compatibility with the existing React routes.
   *
   * Its actual value is now the backend subject_id.
   *
   * Example:
   *
   * batchId = "bt1_phy"
   *
   * Backend:
   * GET /api/subject/bt1_phy
   */

  // ---------------------------------------------------------
  // AVERAGE ATTENDANCE
  // ---------------------------------------------------------

  const [avgAttendance, setAvgAttendance] = useState(0);
  const [statsLoading, setStatsLoading] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);

  // ---------------------------------------------------------
  // TEMPORARY BATCH CODE
  // ---------------------------------------------------------
  //
  // batch_code no longer exists in the current backend.
  //
  // User requested a temporary default value until this
  // frontend section is removed later.
  //

  const code = "------";

  const studentCount = activeBatch?.total_students ?? 0;

  // ---------------------------------------------------------
  // STUDENT LIST
  // ---------------------------------------------------------

  const [studentList, setStudentList] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);

  // ---------------------------------------------------------
  // THRESHOLD
  // ---------------------------------------------------------

  const [threshold, setThreshold] = useState(0);
  const [savedThreshold, setSavedThreshold] = useState(0);

  // ---------------------------------------------------------
  // ATTENDANCE MODE
  // ---------------------------------------------------------

  const [mode, setMode] = useState("manual");

  // ---------------------------------------------------------
  // COPY CODE
  // ---------------------------------------------------------

  const copyCode = () => {
    if (!code) return;

    navigator.clipboard.writeText(code);

    showAlert("Copied", "Copied successfully", "success");
  };

  // ---------------------------------------------------------
  // SUBJECT NAME
  // ---------------------------------------------------------

  const batchName = activeBatch?.name || "Loading...";

  // ---------------------------------------------------------
  // SAVE THRESHOLD
  // ---------------------------------------------------------

  const saveThreshold = async () => {
    if (!batchId) return;

    try {
      const token = localStorage.getItem("token");

      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}api/subject/${batchId}/threshold`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            threshold,
          }),
        },
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data?.error || "Failed to update threshold",
        );
      }

      setSavedThreshold(threshold);

      // Refresh the selected subject
      await fetchBatchById(batchId);

      showAlert(
        "Saved",
        "Threshold updated",
        "success",
      );
    } catch (err) {
      console.error(
        "[TeacherDashboard] saveThreshold error:",
        err,
      );

      showAlert(
        "Error",
        err.message || "Failed to update threshold",
        "danger",
      );
    }
  };

  // ---------------------------------------------------------
  // FETCH ATTENDANCE STATS
  // ---------------------------------------------------------

  const fetchAverageAttendance = async (subjectId) => {
    if (!subjectId) return;

    setStatsLoading(true);

    try {
      const token = localStorage.getItem("token");

      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}api/attendance/${subjectId}/stats`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data?.error || "Failed to fetch attendance stats",
        );
      }

      setAvgAttendance(
        Number(data?.avgAttendance ?? 0),
      );
    } catch (err) {
      console.error(
        "[TeacherDashboard] fetchAverageAttendance error:",
        err,
      );

      setAvgAttendance(0);
    } finally {
      setStatsLoading(false);
    }
  };

  // ---------------------------------------------------------
  // FETCH STUDENT LIST
  // ---------------------------------------------------------

  const fetchStudentList = async (subjectId) => {
    if (!subjectId) return;

    setStudentsLoading(true);

    try {
      const token = localStorage.getItem("token");

      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}api/students/${subjectId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data?.error || "Failed to fetch students",
        );
      }

      if (!Array.isArray(data)) {
        throw new Error(
          "Invalid student list received from server",
        );
      }

      setStudentList(data);
    } catch (err) {
      console.error(
        "[TeacherDashboard] fetchStudentList error:",
        err,
      );

      setStudentList([]);
    } finally {
      setStudentsLoading(false);
    }
  };

  // ---------------------------------------------------------
  // LOAD SELECTED SUBJECT
  // ---------------------------------------------------------

  useEffect(() => {
    if (!batchId) {
      return;
    }

    setBatchLoading(true);

    fetchBatchById(batchId).finally(() => {
      setBatchLoading(false);
    });

    fetchAverageAttendance(batchId);

    fetchStudentList(batchId);

    // batchId is actually subjectId
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchId]);

  // ---------------------------------------------------------
  // LOAD THRESHOLD FROM SUBJECT
  // ---------------------------------------------------------

  useEffect(() => {
    if (!activeBatch) {
      return;
    }

    if (activeBatch.threshold !== undefined) {
      const currentThreshold = Number(
        activeBatch.threshold || 0,
      );

      setThreshold(currentThreshold);
      setSavedThreshold(currentThreshold);
    }
  }, [activeBatch]);

  // ---------------------------------------------------------
  // VERIFY THAT LOADED SUBJECT MATCHES URL
  // ---------------------------------------------------------

  /*
   * OLD:
   *
   * activeBatch.id
   *
   * NEW:
   *
   * activeBatch.subject_id
   *
   * because PostgreSQL subjects use subject_id as the
   * application-level subject identifier.
   */

  const subjectMatchesRoute =
    String(activeBatch?.subject_id || "") ===
    String(batchId || "");

  const pageLoading =
    !subjectMatchesRoute ||
    batchLoading ||
    statsLoading ||
    studentsLoading;

  const showPageSkeleton =
    useDelayedLoading(pageLoading);

  // ---------------------------------------------------------
  // PAGE SKELETON
  // ---------------------------------------------------------

  if (showPageSkeleton || !subjectMatchesRoute) {
    return <TeacherDashboardSkeleton />;
  }

  // ---------------------------------------------------------
  // PAGE
  // ---------------------------------------------------------

  return (
    <div className="container-fluid dashboard page-enter">
      {/* PAGE TITLE */}

      <div className="dashboard-hero">
        <div>
          <h1>{batchName}</h1>

          <p>
            Manage attendance, thresholds and recognition
            settings for this subject.
          </p>
        </div>
      </div>

      {/* STATS ROW */}

      <div className="row g-4 mb-4">
        {/* STUDENTS */}

        <div className="col">
          <div className="card dashboard-card h-100">
            <div className="card-body stats-card-body">
              <p className="stats-title">
                Students in Batch
              </p>

              <h2 className="stats-value">
                {studentCount}
              </h2>

              <i className="fa-solid fa-users stats-icon"></i>
            </div>
          </div>
        </div>

        {/* AVERAGE ATTENDANCE */}

        <div className="col">
          <div className="card dashboard-card h-100">
            <div className="card-body stats-card-body">
              <p className="stats-title">
                Average Attendance
              </p>

              <h2 className="stats-value">
                {avgAttendance}%
              </h2>

              <i className="fa-solid fa-percent stats-icon"></i>
            </div>
          </div>
        </div>
      </div>

      {/* TOP ROW */}

      <div className="row g-4">
        {/* TEMPORARY CODE CARD */}

        <div className="col-md-6">
          <div className="card dashboard-card d-flex flex-column h-100">
            <div className="card-body d-flex flex-column">
              <h5 className="card-title">
                Batch Join Code
              </h5>

              <p className="dashboard-subtitle small">
                Generate a unique code for students
              </p>

              <input
                type="text"
                className="form-control mb-3 text-center fw-bold join-code-display"
                value={code}
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
              <h5 className="card-title">
                Attendance Warning Threshold
              </h5>

              <p className="dashboard-subtitle small mb-4">
                Set the minimum required attendance
                percentage. Students below this threshold
                will be flagged.
              </p>

              <div className="d-flex align-items-center gap-3 mb-4">
                <input
                  type="range"
                  className="form-range flex-grow-1"
                  min="0"
                  max="100"
                  value={threshold}
                  onChange={(e) =>
                    setThreshold(
                      Number(e.target.value),
                    )
                  }
                />

                <div className="threshold-input-wrapper">
                  <input
                    type="number"
                    className="form-control text-center"
                    min="0"
                    max="100"
                    value={threshold}
                    onChange={(e) =>
                      setThreshold(
                        Number(e.target.value),
                      )
                    }
                  />

                  <span className="percent-sign">
                    %
                  </span>
                </div>
              </div>

              <div className="d-flex gap-2 card-actions">
                <button
                  className="btn btn-primary"
                  disabled={
                    threshold === savedThreshold
                  }
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
              <h5 className="card-title attendance-mode-title">
                Attendance Mode
              </h5>

              <p className="dashboard-subtitle small attendance-mode-subtitle">
                Choose how attendance will be taken
              </p>

              <div className="attendance-mode-switcher mb-4">
                {/* MANUAL */}

                <div className="form-check attendance-mode-option">
                  <input
                    className="form-check-input attendance-mode-radio"
                    type="radio"
                    name="mode"
                    id="attendance-mode-manual"
                    checked={mode === "manual"}
                    onChange={() =>
                      setMode("manual")
                    }
                  />

                  <label
                    className="form-check-label attendance-mode-label"
                    htmlFor="attendance-mode-manual"
                  >
                    <span className="attendance-mode-label-title">
                      Manual
                    </span>

                    <span className="attendance-mode-label-copy">
                      Mark students one by one with quick
                      toggles
                    </span>
                  </label>
                </div>

                {/* AUTOMATIC */}

                <div className="form-check attendance-mode-option">
                  <input
                    className="form-check-input attendance-mode-radio"
                    type="radio"
                    name="mode"
                    id="attendance-mode-auto"
                    checked={mode === "auto"}
                    onChange={() =>
                      setMode("auto")
                    }
                  />

                  <label
                    className="form-check-label attendance-mode-label"
                    htmlFor="attendance-mode-auto"
                  >
                    <span className="attendance-mode-label-title">
                      Automatic
                    </span>

                    <span className="attendance-mode-label-copy">
                      Use a class photo or video for
                      recognition
                    </span>
                  </label>
                </div>
              </div>

              {/* ATTENDANCE PANEL */}

              <div className="attendance-mode-panel">
                {/* MANUAL */}

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

                        No students found in this batch.
                        Add students first before taking
                        attendance.
                      </div>
                    ) : (
                      <ManualAttendancePanel
                        batchId={batchId}
                        students={studentList}
                        onSaved={() => {
                          fetchAverageAttendance(
                            batchId,
                          );

                          fetchStudentList(batchId);
                        }}
                        showAlert={showAlert}
                      />
                    )}
                  </>
                )}

                {/* AUTOMATIC */}

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

                        No students found in this batch.
                        Add students first before taking
                        attendance.
                      </div>
                    ) : (
                      <AutoAttendancePanel
                        batchId={batchId}
                        students={studentList}
                        onSaved={() => {
                          fetchAverageAttendance(
                            batchId,
                          );

                          fetchStudentList(batchId);
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