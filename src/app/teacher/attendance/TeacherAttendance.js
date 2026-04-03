import { useState, useEffect, useContext } from "react";
import { useParams } from "react-router-dom";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";

import BatchContext from "../../../context/batch/BatchContext";
import "./TeacherAttendance.css";

const Attendance = () => {
  const { batchId } = useParams();
  const { activeBatch } = useContext(BatchContext);

  // Attendance threshold
  const [threshold, setThreshold] = useState(0);

  // Selected batch from calender
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Record of students
  const [records, setRecords] = useState([]);

  // Attendance stats
  const [attendanceStats, setAttendanceStats] = useState({
    totalClasses: 0,
    avgAttendance: 0,
    bestAttendance: {},
    worstAttendance: {},
  });

  // Fetch Average Attendance
  const fetchAttendanceDetails = async (id) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}api/attendance/${id}/stats`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error?.message || "Failed to fetch stats");
      }

      setAttendanceStats(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!batchId || !selectedDate) return;

    const fetchDailyAttendance = async () => {
      try {
        const token = localStorage.getItem("token");
        const formattedDate = selectedDate.toISOString().split("T")[0];

        const res = await fetch(
          `${process.env.REACT_APP_BACKEND_URL}api/attendance/${batchId}/daily?date=${formattedDate}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.error || "Failed to fetch attendance");
        }

        // Convert backend format to UI format
        const formatted = data.map((s) => ({
          id: s.id,
          name: s.name,
          roll: s.roll,
          present: s.present,
          percentage: s.percentage,
        }));

        setRecords(formatted);
        setThreshold(activeBatch?.threshold || 0);

        fetchAttendanceDetails(batchId);
      } catch (err) {
        console.error(err);
      }
    };

    fetchDailyAttendance();
  }, [activeBatch, batchId, selectedDate]);

  if (!activeBatch) return null;

  return (
    <div className="container-fluid attendance-page">
      {/* HEADER */}
      <div className="mb-4">
        <h2 className="attendance-title">Attendance Records</h2>
        <p className="attendance-subtitle">
          View attendance records for {activeBatch.name || "Loading..."}
        </p>
      </div>

      {/* DATE + SUMMARY ROW */}
      <div className="row g-4 mb-4">
        {/* CALENDAR */}
        <div className="col-md-6">
          <div className="card attendance-card h-100">
            <div className="card-body d-flex justify-content-center">
              <DayPicker
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                showOutsideDays
                disabled={{ after: new Date() }}
              />
            </div>
          </div>
        </div>

        {/* BATCH SUMMARY */}
        <div className="col-md-6">
          <div className="card attendance-card h-100 batch-summary">
            <div className="card-body batch-summary-body">
              {/* LEFT MAIN AVG */}
              <div className="summary-left">
                <p className="stats-title mb-1">Average Attendance</p>
                <h1 className="stats-value-main">
                  {attendanceStats.avgAttendance || 0}%
                </h1>
                <small className="text-muted">
                  Based on last {attendanceStats.totalClasses || 0} classes
                </small>
              </div>

              {/* RIGHT SIDE STATS */}
              <div className="summary-right-details">
                <div className="stat-box best">
                  <p>Best</p>
                  <h4>{attendanceStats.bestAttendance.percentage || 0}%</h4>
                  <small>
                    {attendanceStats.bestAttendance.date || "yyyy-mm-dd"}
                  </small>
                </div>

                <div className="stat-box worst">
                  <p>Worst</p>
                  <h4>{attendanceStats.worstAttendance.percentage || 0}%</h4>
                  <small>
                    {attendanceStats.worstAttendance.date || "yyyy-mm-dd"}
                  </small>
                </div>
              </div>
            </div>

            {/* PROGRESS BAR FOR AVERAGE */}
            <div className="progress mt-3">
              <div
                className="progress-bar"
                style={{ width: `${attendanceStats.avgAttendance || 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* STUDENT LIST */}
      <div className="card attendance-card">
        <div className="card-body">
          <h5 className="card-title mb-3">Students</h5>

          {records.length === 0 ? (
            <p className="text-muted">No students in this batch</p>
          ) : (
            <div className="attendance-list">
              {records.map((s) => (
                <div key={s.id} className="attendance-row">
                  <div className="student-info">
                    <p className="student-name">{s.name}</p>
                    <small className="text-muted">Roll No: {s.roll}</small>
                  </div>

                  <div className="student-metrics">
                    {/* ⚠️ Low attendance marker */}
                    {s.percentage < threshold && (
                      <span
                        className="low-attendance-badge"
                        title="Attendance below 75%"
                      >
                        ⚠️
                      </span>
                    )}

                    <span className="student-percent">{s.percentage}%</span>

                    <span
                      className={`status-pill ${
                        s.present === null
                          ? "no-class"
                          : s.present
                            ? "present"
                            : "absent"
                      }`}
                    >
                      {s.present === null
                        ? "No Class"
                        : s.present
                          ? "Present"
                          : "Absent"}
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

export default Attendance;
