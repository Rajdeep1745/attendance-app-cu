import { useState } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { getStudentAttendanceByDate } from "../studentDataService";

import "./StudentAttendance.css";

const StudentAttendance = () => {
  const [selectedDate, setSelectedDate] = useState(new Date(2026, 3, 3));

  const formatKey = (date) => date.toISOString().split("T")[0];
  const selectedKey = formatKey(selectedDate);
  const selectedRows = getStudentAttendanceByDate(selectedKey);

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
            <DayPicker
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              showOutsideDays
              disabled={{ after: new Date(2026, 3, 30) }}
            />
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
