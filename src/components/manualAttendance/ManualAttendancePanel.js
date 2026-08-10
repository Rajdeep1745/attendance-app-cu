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
  /*
   * IMPORTANT:
   *
   * batchId is kept as the existing frontend prop name.
   * Its actual value is now the backend subjectId.
   *
   * Example:
   * batchId = "bt1_phy"
   */

  const subjectId = batchId;

  const today = formatLocalDate();

  const [date, setDate] = useState(today);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // ---------------------------------------------------------
  // LOAD ATTENDANCE FOR SELECTED DATE
  // ---------------------------------------------------------

  useEffect(() => {
    if (!subjectId || !students.length) {
      setAttendanceMap({});
      return;
    }

    let ignore = false;

    const loadDailyAttendance = async () => {
      setLoading(true);
      setError("");

      try {
        const token = localStorage.getItem("token");

        if (!token) {
          throw new Error("Authentication token not found");
        }

        const res = await fetch(
          `${process.env.REACT_APP_BACKEND_URL}api/attendance/${subjectId}/daily?date=${date}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        const data = await res.json();

        if (!res.ok) {
          throw new Error(
            data?.error || "Failed to load attendance",
          );
        }

        if (!Array.isArray(data)) {
          throw new Error(
            "Invalid attendance data received from server",
          );
        }

        if (ignore) return;

        /*
         * Backend response:
         *
         * {
         *   studentId: "...",
         *   name: "...",
         *   roll: "...",
         *   present: true/false/null
         * }
         *
         * IMPORTANT:
         * The backend uses studentId, NOT id.
         */

        const nextMap = {};

        for (const student of students) {
          const existing = data.find(
            (row) =>
              String(row.studentId) ===
              String(student.id),
          );

          nextMap[student.id] = {
            /*
             * null means there is no attendance record yet
             * for this student/date.
             *
             * We treat that as Absent in the UI because the
             * manual attendance form must submit a value for
             * every enrolled student.
             */
            present:
              typeof existing?.present === "boolean"
                ? existing.present
                : false,
          };
        }

        setAttendanceMap(nextMap);
      } catch (err) {
        if (!ignore) {
          console.error(
            "[ManualAttendancePanel] Failed to load attendance:",
            err,
          );

          setError(
            err.message ||
              "Failed to load attendance",
          );
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
  }, [subjectId, date, students]);

  // ---------------------------------------------------------
  // TOGGLE INDIVIDUAL STUDENT
  // ---------------------------------------------------------

  const toggleStudent = (studentId) => {
    setAttendanceMap((prev) => ({
      ...prev,
      [studentId]: {
        present: !prev[studentId]?.present,
      },
    }));
  };

  // ---------------------------------------------------------
  // MARK ALL
  // ---------------------------------------------------------

  const setAllStudents = (present) => {
    const nextMap = {};

    for (const student of students) {
      nextMap[student.id] = {
        present,
      };
    }

    setAttendanceMap(nextMap);
  };

  // ---------------------------------------------------------
  // SAVE ATTENDANCE
  // ---------------------------------------------------------

  const handleSave = async () => {
    if (!subjectId || !students.length) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error(
          "Authentication token not found",
        );
      }

      /*
       * Backend expects:
       *
       * attendance: [
       *   {
       *     student_id: "...",
       *     present: true
       *   }
       * ]
       *
       * Every enrolled student must be included.
       */

      const attendance = students.map((student) => ({
        student_id: student.id,
        present: Boolean(
          attendanceMap[student.id]?.present,
        ),
      }));

      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}api/attendance/${subjectId}/mark`,
        {
          method: "POST",

          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            date,
            attendance,
          }),
        },
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data?.error ||
            "Failed to save attendance",
        );
      }

      showAlert?.(
        "Saved",
        "Manual attendance saved successfully",
        "success",
      );

      /*
       * Let the dashboard refresh:
       *
       * - average attendance
       * - student list
       * - any other dashboard statistics
       */
      onSaved?.();
    } catch (err) {
      console.error(
        "[ManualAttendancePanel] Save error:",
        err,
      );

      setError(
        err.message ||
          "Failed to save attendance",
      );

      showAlert?.(
        "Error",
        err.message ||
          "Failed to save attendance",
        "danger",
      );
    } finally {
      setSaving(false);
    }
  };

  // ---------------------------------------------------------
  // PRESENT COUNT
  // ---------------------------------------------------------

  const presentCount = Object.values(
    attendanceMap,
  ).filter((entry) => entry.present).length;

  // ---------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------

  return (
    <div className="manual-attendance-panel">
      {/* DATE + SUMMARY */}

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
            {presentCount}/{students.length}{" "}
            students marked present
          </div>
        </div>
      </div>

      {/* ERROR */}

      {error && (
        <div className="alert alert-danger py-2 small mb-3">
          <i className="fa fa-times-circle me-1"></i>

          {error}
        </div>
      )}

      {/* LOADING */}

      {loading ? (
        <div className="text-muted small py-2">
          <span className="spinner-border spinner-border-sm me-2"></span>

          Loading attendance for the selected date...
        </div>
      ) : (
        <>
          <div className="manual-attendance-section">
            {/* HEADER */}

            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="fw-semibold small">
                Student List
              </span>

              <div className="d-flex gap-2">
                <button
                  type="button"
                  className="btn btn-outline-success btn-xs"
                  disabled={saving}
                  onClick={() =>
                    setAllStudents(true)
                  }
                >
                  Mark All Present
                </button>

                <button
                  type="button"
                  className="btn btn-outline-danger btn-xs"
                  disabled={saving}
                  onClick={() =>
                    setAllStudents(false)
                  }
                >
                  Mark All Absent
                </button>
              </div>
            </div>

            {/* STUDENT LIST */}

            <div className="manual-attendance-list">
              {students.map((student) => {
                const isPresent = Boolean(
                  attendanceMap[student.id]
                    ?.present,
                );

                return (
                  <div
                    key={student.id}
                    className={`manual-attendance-row ${
                      isPresent
                        ? "present"
                        : "absent"
                    }`}
                    onClick={() =>
                      !saving &&
                      toggleStudent(student.id)
                    }
                  >
                    {/* AVATAR */}

                    <div className="manual-attendance-avatar">
                      {student.avatar ? (
                        <img
                          src={student.avatar}
                          alt={student.name}
                        />
                      ) : (
                        student.name
                          ?.charAt(0)
                          ?.toUpperCase() || "?"
                      )}
                    </div>

                    {/* STUDENT INFO */}

                    <div className="manual-attendance-info">
                      <div className="manual-attendance-name">
                        {student.name}
                      </div>

                      <div className="manual-attendance-meta">
                        {student.roll}
                      </div>
                    </div>

                    {/* STATUS */}

                    <div className="manual-attendance-toggle">
                      <span
                        className={`badge ${
                          isPresent
                            ? "bg-success"
                            : "bg-danger"
                        }`}
                      >
                        {isPresent
                          ? "Present"
                          : "Absent"}
                      </span>

                      <i
                        className={`fa fa-toggle-${
                          isPresent
                            ? "on text-success"
                            : "off text-secondary"
                        } ms-2`}
                      ></i>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* SAVE */}

            <button
              type="button"
              className="btn btn-success btn-sm w-100 mt-3"
              disabled={
                saving ||
                loading ||
                !students.length ||
                !subjectId
              }
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