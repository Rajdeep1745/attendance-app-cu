import { useState, useContext, useEffect } from "react";
import AlertContext from "../../../context/alert/AlertContext";
import SubjectContext from "../../../context/subject/SubjectContext";
import { useParams } from "react-router-dom";
import AutoAttendancePanel from "../../../components/autoAttendance/AutoAttendancePanel";
import ManualAttendancePanel from "../../../components/manualAttendance/ManualAttendancePanel";
import useDelayedLoading from "../../../hooks/useDelayedLoading";
import { TeacherDashboardSkeleton } from "../../../components/skeletons/Skeletons";

import "./TeacherDashboard.css";

const Dashboard = () => {
  const { showAlert } = useContext(AlertContext);
  const { activeSubject, fetchSubjectById } = useContext(SubjectContext);
  const { subjectId } = useParams();

  // ---------------------------------------------------------
  // AVERAGE ATTENDANCE
  // ---------------------------------------------------------

  const [avgAttendance, setAvgAttendance] = useState(0);
  const [statsLoading, setStatsLoading] = useState(false);

  const studentCount = activeSubject?.total_students ?? 0;

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
  const [modeSaving, setModeSaving] = useState(false);

  // ---------------------------------------------------------
  // SUBJECT NAME
  // ---------------------------------------------------------

  const subjectName = activeSubject?.name || "Loading...";

  // ---------------------------------------------------------
  // SAVE THRESHOLD
  // ---------------------------------------------------------

  const saveThreshold = async () => {
    if (!subjectId) return;

    try {
      const token = localStorage.getItem("token");

      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}api/subject/${subjectId}/threshold`,
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
        throw new Error(data?.error || "Failed to update threshold");
      }

      setSavedThreshold(threshold);

      // Refresh the selected subject
      await fetchSubjectById(subjectId);

      showAlert("Saved", "Threshold updated", "success");
    } catch (err) {
      console.error("[TeacherDashboard] saveThreshold error:", err);

      showAlert("Error", err.message || "Failed to update threshold", "danger");
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
        throw new Error(data?.error || "Failed to fetch attendance stats");
      }

      setAvgAttendance(Number(data?.avgAttendance ?? 0));
    } catch (err) {
      console.error("[TeacherDashboard] fetchAverageAttendance error:", err);

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
        throw new Error(data?.error || "Failed to fetch students");
      }

      if (!Array.isArray(data)) {
        throw new Error("Invalid student list received from server");
      }

      setStudentList(data);
    } catch (err) {
      console.error("[TeacherDashboard] fetchStudentList error:", err);

      setStudentList([]);
    } finally {
      setStudentsLoading(false);
    }
  };

  // ---------------------------------------------------------
  // CHANGE ATTENDANCE MODE
  // ---------------------------------------------------------

  const handleModeChange = async (nextMode) => {
    if (!["manual", "auto"].includes(nextMode)) {
      return;
    }

    const previousMode = mode;

    setMode(nextMode);
    setModeSaving(true);

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error("Authentication token not found");
      }

      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}api/users/me`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            defaultMode: nextMode,
          }),
        },
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to save attendance mode");
      }

      /*
       * Keep the authenticated user in sync so the preference
       * is also available elsewhere in the frontend.
       */
      const currentUser = JSON.parse(localStorage.getItem("user") || "null");

      const updatedUser = {
        ...(currentUser || {}),
        ...data,
        default_mode: data?.default_mode || nextMode,
      };

      localStorage.setItem("user", JSON.stringify(updatedUser));

      showAlert(
        "Saved",
        `Attendance mode set to ${
          nextMode === "auto" ? "Automatic" : "Manual"
        }`,
        "success",
      );
    } catch (err) {
      console.error("[TeacherDashboard] Failed to save attendance mode:", err);

      /*
       * Roll back the UI if the backend rejected the change.
       */
      setMode(previousMode);

      showAlert(
        "Error",
        err.message || "Failed to save attendance mode",
        "danger",
      );
    } finally {
      setModeSaving(false);
    }
  };

  // ---------------------------------------------------------
  // LOAD DEFAULT ATTENDANCE MODE
  // ---------------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    const loadDefaultMode = async () => {
      try {
        const token = localStorage.getItem("token");

        if (!token) {
          return;
        }

        const res = await fetch(
          `${process.env.REACT_APP_BACKEND_URL}api/users/me`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.error || "Failed to load attendance mode");
        }

        if (cancelled) {
          return;
        }

        const savedMode = data?.default_mode === "auto" ? "auto" : "manual";

        setMode(savedMode);
      } catch (err) {
        console.error(
          "[TeacherDashboard] Failed to load default attendance mode:",
          err,
        );
      }
    };

    loadDefaultMode();

    return () => {
      cancelled = true;
    };
  }, []);

  // ---------------------------------------------------------
  // LOAD SELECTED SUBJECT
  // ---------------------------------------------------------

  useEffect(() => {
    if (!subjectId) {
      return;
    }

    fetchAverageAttendance(subjectId);
    fetchStudentList(subjectId);

    // Subject loading is handled centrally by Layout.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectId]);

  // ---------------------------------------------------------
  // LOAD THRESHOLD FROM SUBJECT
  // ---------------------------------------------------------

  useEffect(() => {
    if (!activeSubject) {
      return;
    }

    if (activeSubject.threshold !== undefined) {
      const currentThreshold = Number(activeSubject.threshold || 0);

      setThreshold(currentThreshold);
      setSavedThreshold(currentThreshold);
    }
  }, [activeSubject]);

  // ---------------------------------------------------------
  // VERIFY THAT LOADED SUBJECT MATCHES URL
  // ---------------------------------------------------------

  /*
   * OLD:
   *
   * activeSubject.id
   *
   * NEW:
   *
   * activeSubject.subject_id
   *
   * because PostgreSQL subjects use subject_id as the
   * application-level subject identifier.
   */

  const subjectMatchesRoute =
    String(activeSubject?.subject_id || "") === String(subjectId || "");

  const pageLoading = !subjectMatchesRoute || statsLoading || studentsLoading;

  const showPageSkeleton = useDelayedLoading(pageLoading);

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
          <h1>{subjectName}</h1>

          <p>
            Manage attendance, thresholds and recognition settings for this
            subject.
          </p>
        </div>
      </div>

      {/* DASHBOARD STATS */}

      <div className="row g-4 mb-4">
        {/* STUDENTS */}

        <div className="col-md-4">
          <div className="card dashboard-card h-100">
            <div className="card-body stats-card-body">
              <p className="stats-title">Students in Subject</p>

              <h2 className="stats-value">{studentCount}</h2>

              <i className="fa-solid fa-users stats-icon"></i>
            </div>
          </div>
        </div>

        {/* AVERAGE ATTENDANCE */}

        <div className="col-md-4">
          <div className="card dashboard-card h-100">
            <div className="card-body stats-card-body">
              <p className="stats-title">Average Attendance</p>

              <h2 className="stats-value">{avgAttendance}%</h2>

              <i className="fa-solid fa-percent stats-icon"></i>
            </div>
          </div>
        </div>

        {/* ATTENDANCE THRESHOLD */}

        <div className="col-md-4">
          <div className="card dashboard-card h-100">
            <div className="card-body">
              <h5 className="card-title">Attendance Threshold</h5>

              <p className="dashboard-subtitle small mb-4">
                Minimum attendance required before students are flagged.
              </p>

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
                    onChange={() => handleModeChange("manual")}
                    disabled={modeSaving}
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

                {/* AUTOMATIC */}

                <div className="form-check attendance-mode-option">
                  <input
                    className="form-check-input attendance-mode-radio"
                    type="radio"
                    name="mode"
                    id="attendance-mode-auto"
                    checked={mode === "auto"}
                    onChange={() => handleModeChange("auto")}
                    disabled={modeSaving}
                  />

                  <label
                    className="form-check-label attendance-mode-label"
                    htmlFor="attendance-mode-auto"
                  >
                    <span className="attendance-mode-label-title">
                      Automatic
                    </span>

                    <span className="attendance-mode-label-copy">
                      Use a class photo or video for recognition
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
                        No students found in this subject. Add students first
                        before taking attendance.
                      </div>
                    ) : (
                      <ManualAttendancePanel
                        subjectId={subjectId}
                        students={studentList}
                        onSaved={() => {
                          fetchAverageAttendance(subjectId);

                          fetchStudentList(subjectId);
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
                        No students found in this subject. Add students first
                        before taking attendance.
                      </div>
                    ) : (
                      <AutoAttendancePanel
                        subjectId={subjectId}
                        students={studentList}
                        onSaved={() => {
                          fetchAverageAttendance(subjectId);

                          fetchStudentList(subjectId);
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
