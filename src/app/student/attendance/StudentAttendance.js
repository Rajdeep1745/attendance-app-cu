import { useEffect, useState } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { getStudentAttendanceByDate } from "../studentApi";

import "./StudentAttendance.css";

const formatLocalDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const StudentAttendance = () => {
  const maxSelectableDate = new Date();
  const [selectedDate, setSelectedDate] = useState(maxSelectableDate);
  const [selectedRows, setSelectedRows] = useState([]);
  const [error, setError] = useState("");

  const selectedKey = formatLocalDate(selectedDate);

  useEffect(() => {
    let ignore = false;

    const loadAttendance = async () => {
      try {
        const data = await getStudentAttendanceByDate(selectedKey);
        if (!ignore) {
          setSelectedRows(data);
          setError("");
        }
      } catch (err) {
        if (!ignore) {
          setError(err.message);
        }
      }
    };

    loadAttendance();

    return () => {
      ignore = true;
    };
  }, [selectedKey]);

  const formattedHeadingDate = selectedDate.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const selectedWeekday = selectedDate.toLocaleDateString("en-US", {
    weekday: "long",
  });

  const summary = {
    present: selectedRows.filter((item) => item.status === "Present").length,
    absent: selectedRows.filter((item) => item.status === "Absent").length,
    noClass: selectedRows.filter((item) => item.status === "No Class").length,
  };

  return (
    <div className="container-fluid attendance-page student-attendance-page">
      {error && <div className="alert alert-danger mb-4">{error}</div>}
      <div className="mb-4">
        <h2 className="attendance-title">Attendance</h2>
        <p className="attendance-subtitle">
          Check your attendance status across all joined classes for a selected
          day.
        </p>
      </div>

      <div className="card attendance-card mb-4">
        <div className="card-body student-date-card">
          <div className="student-calendar-shell">
            <div className="attendance-page-calendar-shell">
              <div className="premium-date-picker-calendar attendance-page-calendar">
                <DayPicker
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  showOutsideDays
                  disabled={{ after: maxSelectableDate }}
                />
              </div>

              <div className="premium-date-picker-footer attendance-page-calendar-footer">
                <button
                  type="button"
                  className="premium-date-picker-footer-btn primary"
                  onClick={() => setSelectedDate(new Date())}
                >
                  Today
                </button>
              </div>
            </div>
          </div>

          <div className="student-date-copy">
            <div className="student-section-pill">
              <i className="fa-regular fa-calendar-days"></i>
              <span>Daily Snapshot</span>
            </div>

            <h3>{formattedHeadingDate}</h3>
            <p className="attendance-subtitle">
              Attendance summary for {selectedWeekday} across all joined classes.
            </p>

            <div className="student-date-stats">
              <div className="date-stat-card">
                <span>Present</span>
                <strong>{summary.present}</strong>
              </div>
              <div className="date-stat-card">
                <span>Absent</span>
                <strong>{summary.absent}</strong>
              </div>
              <div className="date-stat-card">
                <span>No Class</span>
                <strong>{summary.noClass}</strong>
              </div>
            </div>

            <div className="student-date-note">
              <i className="fa-regular fa-circle-check"></i>
              <span>
                Use the calendar to jump between dates and review your batch-wise status for each day.
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="card attendance-card">
        <div className="card-body">
          <div className="student-attendance-header">
            <div>
              <h3 className="mb-2">
                Your Attendance for {formattedHeadingDate}
              </h3>
              <p className="attendance-subtitle mb-0">
                Your attendance status across all classes for this day.
              </p>
            </div>
          </div>

          {selectedRows.length === 0 ? (
            <div className="student-empty-state">
              <i className="fa-regular fa-calendar-xmark"></i>
              <h5>No attendance records for this date</h5>
              <p className="mb-0">
                Once attendance is recorded for your batches, it will appear
                here.
              </p>
            </div>
          ) : (
            <div className="student-status-table">
              <div className="student-status-head">
                <span>Batch</span>
                <span>Recorded At</span>
                <span>Status</span>
              </div>

              {selectedRows.map((row) => (
                <div
                  key={`${selectedKey}-${row.batchId}`}
                  className="student-status-row"
                >
                  <div className="student-batch-cell">
                    <strong>{row.batchName}</strong>
                  </div>

                  <div className="student-time-cell">{row.recordedAt}</div>

                  <div className="student-status-cell">
                    <span
                      className={`status-pill ${
                        row.status === "Present"
                          ? "present"
                          : row.status === "Absent"
                            ? "absent"
                            : "no-class"
                      }`}
                    >
                      {row.status === "Absent" ? (
                        <i className="fa-regular fa-circle-xmark"></i>
                      ) : row.status === "Present" ? (
                        <i className="fa-regular fa-circle-check"></i>
                      ) : (
                        <i className="fa-regular fa-circle"></i>
                      )}
                      <span>{row.status}</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentAttendance;
