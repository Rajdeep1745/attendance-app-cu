import { useEffect, useState } from "react";
import PremiumDatePicker from "../premiumDatePicker/PremiumDatePicker";
import "./ManualAttendancePanel.css";

const formatLocalDate = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const ManualAttendancePanel = ({
  batchId,
  students = [],
  onSaved,
  showAlert,
}) => {
  const today = formatLocalDate();
  const [date, setDate] = useState(today);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!students.length) {
      setAttendanceMap({});
      return;
    }

    let ignore = false;

    const loadDailyAttendance = async () => {
      setLoading(true);
      setError("");

      try {
        const token = localStorage.getItem("token");
        const res = await fetch(
          `${process.env.REACT_APP_BACKEND_URL}api/attendance/${batchId}/daily?date=${date}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error || "Failed to load attendance");
        }

        if (ignore) return;

        const nextMap = {};
        for (const student of students) {
          const existing = data.find((row) => row.id === student.id);
          nextMap[student.id] = {
            present:
              typeof existing?.present === "boolean" ? existing.present : false,
          };
        }

        setAttendanceMap(nextMap);
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

    loadDailyAttendance();

    return () => {
      ignore = true;
    };
  }, [batchId, date, students]);

  const toggleStudent = (studentId) => {
    setAttendanceMap((prev) => ({
      ...prev,
      [studentId]: {
        present: !prev[studentId]?.present,
      },
    }));
  };

  const setAllStudents = (present) => {
    const nextMap = {};
    for (const student of students) {
      nextMap[student.id] = { present };
    }
    setAttendanceMap(nextMap);
  };

  const handleSave = async () => {
    if (!students.length) return;

    setSaving(true);
    setError("");

    try {
      const token = localStorage.getItem("token");
      const attendance = students.map((student) => ({
        student_id: student.id,
        present: Boolean(attendanceMap[student.id]?.present),
      }));

      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}api/attendance/${batchId}/mark`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ date, attendance }),
        },
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Failed to save attendance");
      }

      showAlert?.("Saved", "Manual attendance saved successfully", "success");
      onSaved?.();
    } catch (err) {
      setError(err.message);
      showAlert?.("Error", err.message, "danger");
    } finally {
      setSaving(false);
    }
  };

  const presentCount = Object.values(attendanceMap).filter(
    (entry) => entry.present,
  ).length;

  return (
    <div className="manual-attendance-panel">
      <div className="row g-2 mb-3">
        <div className="col-sm-5">
          <PremiumDatePicker
            label="Date"
            value={date}
            maxDate={today}
            onChange={setDate}
          />
        </div>
        <div className="col-sm-7 d-flex align-items-end">
          <div className="manual-summary-pill">
            {presentCount}/{students.length} students marked present
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger py-2 small mb-3">
          <i className="fa fa-times-circle me-1"></i>
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-muted small py-2">
          <span className="spinner-border spinner-border-sm me-2"></span>
          Loading attendance for the selected date...
        </div>
      ) : (
        <>
          <div className="manual-attendance-section">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="fw-semibold small">Student List</span>
              <div className="d-flex gap-2">
                <button
                  type="button"
                  className="btn btn-outline-success btn-xs"
                  onClick={() => setAllStudents(true)}
                >
                  Mark All Present
                </button>
                <button
                  type="button"
                  className="btn btn-outline-danger btn-xs"
                  onClick={() => setAllStudents(false)}
                >
                  Mark All Absent
                </button>
              </div>
            </div>

            <div className="manual-attendance-list">
              {students.map((student) => {
                const isPresent = Boolean(attendanceMap[student.id]?.present);

                return (
                  <div
                    key={student.id}
                    className={`manual-attendance-row ${
                      isPresent ? "present" : "absent"
                    }`}
                    onClick={() => toggleStudent(student.id)}
                  >
                    <div className="manual-attendance-avatar">
                      {student.name?.[0]?.toUpperCase() || "?"}
                    </div>

                    <div className="manual-attendance-info">
                      <div className="manual-attendance-name">
                        {student.name}
                      </div>
                      <div className="manual-attendance-meta">
                        {student.roll}
                      </div>
                    </div>

                    <div className="manual-attendance-toggle">
                      <span
                        className={`badge ${
                          isPresent ? "bg-success" : "bg-danger"
                        }`}
                      >
                        {isPresent ? "Present" : "Absent"}
                      </span>
                      <i
                        className={`fa fa-toggle-${
                          isPresent ? "on text-success" : "off text-secondary"
                        } ms-2`}
                      ></i>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              className="btn btn-success btn-sm w-100 mt-3"
              disabled={saving || loading || !students.length}
              onClick={handleSave}
            >
              {saving ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2"></span>
                  Saving...
                </>
              ) : (
                <>
                  <i className="fa fa-save me-2"></i>
                  Submit Attendance
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default ManualAttendancePanel;
