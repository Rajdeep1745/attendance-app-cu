import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";

import useDelayedLoading from "../../../hooks/useDelayedLoading";
import { TeacherAttendanceSkeleton } from "../../../components/skeletons/Skeletons";
import "./TeacherAttendance.css";

const formatLocalDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const Attendance = () => {
  const { subjectId } = useParams();

  const today = new Date();

  // Subject attendance threshold
  const [threshold, setThreshold] = useState(0);

  // Selected calendar date
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Student attendance records
  const [records, setRecords] = useState([]);
  const [attendanceLoading, setAttendanceLoading] = useState(true);

  // Attendance statistics
  const [attendanceStats, setAttendanceStats] = useState({
    totalClasses: 0,
    avgAttendance: 0,
    bestAttendance: {},
    worstAttendance: {},
  });

  // Fetch selected subject
  const fetchSubjectDetails = async (id) => {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}api/subject/${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to fetch subject");
      }

      setThreshold(Number(data?.threshold || 0));
    } catch (err) {
      console.error("Failed to fetch subject details:", err);
      setThreshold(0);
    }
  };

  // Fetch attendance statistics
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
        throw new Error(data?.error || "Failed to fetch stats");
      }

      setAttendanceStats(data);
    } catch (err) {
      console.error("Failed to fetch attendance stats:", err);
    }
  };

  // Fetch daily attendance for the selected subject/date
  useEffect(() => {
    if (!subjectId || !selectedDate) return;

    const fetchDailyAttendance = async () => {
      setAttendanceLoading(true);

      try {
        const token = localStorage.getItem("token");
        const formattedDate = formatLocalDate(selectedDate);

        const res = await fetch(
          `${process.env.REACT_APP_BACKEND_URL}api/attendance/${subjectId}/daily?date=${formattedDate}`,
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

        // Backend sends studentId, not id.
        const formatted = data.map((student) => ({
          id: student.studentId,
          name: student.name,
          roll: student.roll,
          present: student.present,
          percentage: Number(student.percentage || 0),
          avatar: student.avatar || null,
        }));

        setRecords(formatted);

        await Promise.all([
          fetchSubjectDetails(subjectId),
          fetchAttendanceDetails(subjectId),
        ]);
      } catch (err) {
        console.error("Failed to fetch daily attendance:", err);
        setRecords([]);
      } finally {
        setAttendanceLoading(false);
      }
    };

    fetchDailyAttendance();
  }, [subjectId, selectedDate]);

  const showPageSkeleton = useDelayedLoading(attendanceLoading);

  if (showPageSkeleton) {
    return <TeacherAttendanceSkeleton />;
  }

  return (
    <div className="container-fluid attendance-page page-enter">
      {/* HEADER */}
      <div className="attendance-hero">
        <div>
          <h1>Attendance Records</h1>

          <p>View daily attendance history and class performance.</p>
        </div>
      </div>

      {/* DATE + SUMMARY ROW */}
      <div className="row g-4 mb-4">
        {/* CALENDAR */}
        <div className="col-md-6">
          <div className="card attendance-card calendar-card h-100">
            <div className="card-body attendance-calendar-card-body">
              <div className="attendance-page-calendar-shell">
                <div className="premium-date-picker-calendar attendance-page-calendar">
                  <DayPicker
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    showOutsideDays
                    disabled={{ after: today }}
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
          </div>
        </div>

        {/* SUBJECT SUMMARY */}
        <div className="col-md-6">
          <div className="card attendance-card h-100 subject-summary">
            <div className="card-body subject-summary-body">
              {/* LEFT MAIN AVG */}
              <div className="mx-5 summary-left">
                <p className="stats-title mb-1">Average Attendance</p>

                <h1 className="stats-value-main">
                  {attendanceStats.avgAttendance || 0}%
                </h1>

                <small className="text-muted">
                  Based on last {attendanceStats.totalClasses || 0} classes
                </small>

                <div className="analytics-progress">
                  <div
                    className="analytics-progress-bar"
                    style={{
                      width: `${attendanceStats.avgAttendance || 0}%`,
                    }}
                  />
                </div>
              </div>

              {/* RIGHT SIDE STATS */}
              <div className="summary-right-details">
                <div className="stat-box best">
                  <p>Best</p>

                  <h4>{attendanceStats.bestAttendance?.percentage || 0}%</h4>

                  <small>
                    {attendanceStats.bestAttendance?.date || "yyyy-mm-dd"}
                  </small>
                </div>

                <div className="stat-box worst">
                  <p>Worst</p>

                  <h4>{attendanceStats.worstAttendance?.percentage || 0}%</h4>

                  <small>
                    {attendanceStats.worstAttendance?.date || "yyyy-mm-dd"}
                  </small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* STUDENT LIST */}
      <div className="card attendance-card">
        <div className="card-body">
          <div className="students-header">
            <h5 className="students-title">Students</h5>

            <span className="students-count">{records.length} Students</span>
          </div>

          {records.length === 0 ? (
            <p className="text-muted">No students enrolled in this subject</p>
          ) : (
            <div className="attendance-list">
              {records.map((student) => (
                <div key={student.id} className="attendance-row">
                  <div className="student-info">
                    <img
                      src={student.avatar || "https://i.pravatar.cc/150"}
                      alt={student.name}
                      className="student-avatar"
                    />

                    <div>
                      <p className="student-name">{student.name}</p>

                      <small className="text-muted">
                        Roll No: {student.roll}
                      </small>
                    </div>
                  </div>

                  <div className="student-metrics">
                    {/* Low attendance marker */}
                    {student.percentage < threshold && (
                      <span
                        className="low-attendance-badge"
                        title={`Attendance below ${threshold}%`}
                      >
                        ⚠️
                      </span>
                    )}

                    <span className="student-percent">
                      {student.percentage}%
                    </span>

                    <span
                      className={`status-pill ${
                        student.present === null
                          ? "no-class"
                          : student.present
                            ? "present"
                            : "absent"
                      }`}
                    >
                      {student.present === null
                        ? "No Class"
                        : student.present
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
