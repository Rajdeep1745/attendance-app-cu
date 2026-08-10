import { useContext, useState, useMemo, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";

import SubjectContext from "../../../context/subject/SubjectContext";
import useDelayedLoading from "../../../hooks/useDelayedLoading";
import { TeacherReportsSkeleton } from "../../../components/skeletons/Skeletons";

import "./TeacherReports.css";

const Reports = () => {
  const { activeSubject } = useContext(SubjectContext);

  const { subjectId } = useParams();

  const [weeklyAttendance, setWeeklyAttendance] = useState([]);

  const [stats, setStats] = useState({
    totalClasses: 0,
    avgAttendance: 0,
    bestAttendance: {
      percentage: 0,
      date: null,
    },
    worstAttendance: {
      percentage: 0,
      date: null,
    },
  });

  const [students, setStudents] = useState([]);

  const [statsLoading, setStatsLoading] = useState(true);

  const [studentsLoading, setStudentsLoading] = useState(true);

  const [absenteesLoading, setAbsenteesLoading] = useState(true);

  const [graphLoading, setGraphLoading] = useState(true);

  const [weekOffset, setWeekOffset] = useState(0);

  const [weekMode, setWeekMode] = useState("6");

  const [threshold, setThreshold] = useState(0);

  const [frequentAbsentees, setFrequentAbsentees] = useState([]);

  // ---------------------------------------------------------
  // UPDATE THRESHOLD FROM SUBJECT
  // ---------------------------------------------------------

  useEffect(() => {
    if (!activeSubject) {
      return;
    }

    setThreshold(Number(activeSubject.threshold || 0));
  }, [activeSubject]);

  // ---------------------------------------------------------
  // FETCH FREQUENT ABSENTEES
  // ---------------------------------------------------------

  const fetchFrequentAbsentees = useCallback(async () => {
    if (!subjectId) {
      setAbsenteesLoading(false);
      return;
    }

    setAbsenteesLoading(true);

    try {
      const token = localStorage.getItem("token");

      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}api/attendance/${subjectId}/frequent-absentees`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to fetch frequent absentees");
      }

      const absentees = Array.isArray(data)
        ? data
        : Array.isArray(data?.frequentAbsentees)
          ? data.frequentAbsentees
          : [];

      setFrequentAbsentees(absentees);
    } catch (err) {
      console.error(
        "[TeacherReports] Failed to fetch frequent absentees:",
        err,
      );

      setFrequentAbsentees([]);
    } finally {
      setAbsenteesLoading(false);
    }
  }, [subjectId]);

  // ---------------------------------------------------------
  // FETCH ATTENDANCE STATS
  // ---------------------------------------------------------

  const fetchStats = useCallback(async () => {
    if (!subjectId) {
      setStatsLoading(false);
      return;
    }

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
        throw new Error(data?.error || "Failed to fetch stats");
      }

      setStats({
        totalClasses: Number(data?.totalClasses || 0),
        avgAttendance: Number(data?.avgAttendance || 0),
        bestAttendance: data?.bestAttendance || {
          percentage: 0,
          date: null,
        },
        worstAttendance: data?.worstAttendance || {
          percentage: 0,
          date: null,
        },
      });
    } catch (err) {
      console.error("[TeacherReports] Failed to fetch stats:", err);

      setStats({
        totalClasses: 0,
        avgAttendance: 0,
        bestAttendance: {
          percentage: 0,
          date: null,
        },
        worstAttendance: {
          percentage: 0,
          date: null,
        },
      });
    } finally {
      setStatsLoading(false);
    }
  }, [subjectId]);

  // ---------------------------------------------------------
  // FETCH STUDENTS
  // ---------------------------------------------------------

  const fetchStudents = useCallback(async () => {
    if (!subjectId) {
      setStudents([]);
      setStudentsLoading(false);
      return;
    }

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

      setStudents(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("[TeacherReports] Failed to fetch students:", err);

      setStudents([]);
    } finally {
      setStudentsLoading(false);
    }
  }, [subjectId]);

  // ---------------------------------------------------------
  // LOAD REPORT DATA
  // ---------------------------------------------------------

  useEffect(() => {
    if (!subjectId) {
      return;
    }

    fetchFrequentAbsentees();
    fetchStats();
    fetchStudents();
  }, [subjectId, fetchFrequentAbsentees, fetchStats, fetchStudents]);

  // ---------------------------------------------------------
  // GET WEEK RANGE
  // ---------------------------------------------------------

  const getWeekRange = useCallback(() => {
    const start = new Date();

    start.setHours(0, 0, 0, 0);

    // Monday is first day of week
    const day = start.getDay();

    const diff = (day === 0 ? -6 : 1 - day) + weekOffset * 7;

    start.setDate(start.getDate() + diff);

    const end = new Date(start);

    end.setDate(start.getDate() + (weekMode === "5" ? 4 : 5));

    end.setHours(23, 59, 59, 999);

    return {
      start,
      end,
    };
  }, [weekOffset, weekMode]);

  // ---------------------------------------------------------
  // WEEK LABEL
  // ---------------------------------------------------------

  const weekLabel = useMemo(() => {
    const { start, end } = getWeekRange();

    const opts = {
      month: "short",
      day: "numeric",
    };

    return `${start.toLocaleDateString(
      "en-US",
      opts,
    )} - ${end.toLocaleDateString("en-US", opts)}`;
  }, [getWeekRange]);

  // ---------------------------------------------------------
  // FETCH GRAPH
  // ---------------------------------------------------------

  const fetchGraph = useCallback(async () => {
    if (!subjectId) {
      setWeeklyAttendance([]);
      setGraphLoading(false);
      return;
    }

    setGraphLoading(true);

    try {
      const token = localStorage.getItem("token");

      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}api/attendance/${subjectId}/graph`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to fetch graph data");
      }

      const { start, end } = getWeekRange();

      const filtered = Array.isArray(data)
        ? data.filter((item) => {
            const attendanceDate = new Date(item.date);

            return attendanceDate >= start && attendanceDate <= end;
          })
        : [];

      if (filtered.length === 0) {
        setWeeklyAttendance([]);
        return;
      }

      const daysOrder =
        weekMode === "5"
          ? ["Mon", "Tue", "Wed", "Thu", "Fri"]
          : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

      const dayMap = {};

      filtered.forEach((item) => {
        const day = new Date(item.date).toLocaleDateString("en-US", {
          weekday: "short",
        });

        dayMap[day] = Number(item.attendance_percentage || 0);
      });

      const formatted = daysOrder.map((day) => ({
        day,
        percent: dayMap[day] || 0,
      }));

      setWeeklyAttendance(formatted);
    } catch (err) {
      console.error("[TeacherReports] Failed to fetch graph data:", err);

      setWeeklyAttendance([]);
    } finally {
      setGraphLoading(false);
    }
  }, [subjectId, getWeekRange, weekMode]);

  // ---------------------------------------------------------
  // LOAD GRAPH WHEN WEEK CHANGES
  // ---------------------------------------------------------

  useEffect(() => {
    fetchGraph();
  }, [fetchGraph]);

  // ---------------------------------------------------------
  // SUBJECT ROUTE MATCH
  // ---------------------------------------------------------

  const subjectMatchesRoute =
    String(activeSubject?.subject_id || "") === String(subjectId || "");

  // ---------------------------------------------------------
  // PAGE LOADING
  // ---------------------------------------------------------

  const pageLoading =
    !subjectMatchesRoute ||
    statsLoading ||
    studentsLoading ||
    absenteesLoading ||
    graphLoading;

  const showPageSkeleton = useDelayedLoading(pageLoading);

  if (showPageSkeleton || !subjectMatchesRoute) {
    return <TeacherReportsSkeleton />;
  }

  // ---------------------------------------------------------
  // LOW ATTENDANCE STUDENTS
  // ---------------------------------------------------------

  const lowAttendanceStudents = students.filter(
    (student) => Number(student.attendance || 0) < threshold,
  );

  // ---------------------------------------------------------
  // SUMMARY CARDS
  // ---------------------------------------------------------

  const summaryCards = [
    {
      label: "Average Attendance",
      value: `${stats.avgAttendance || 0}%`,
    },
    {
      label: "Total Classes",
      value: stats.totalClasses || 0,
    },
    {
      label: "Below Threshold",
      value: lowAttendanceStudents.length,
    },
    {
      label: "Threshold",
      value: `${threshold || 0}%`,
    },
  ];

  return (
    <div className="container-fluid reports-page page-enter">
      {/* HEADER */}

      <div className="reports-hero">
        <div>
          <h1>Reports & Analytics</h1>

          <p>
            Attendance trends, performance insights and risk indicators for{" "}
            {activeSubject.name}
          </p>
        </div>
      </div>

      {/* SUMMARY */}

      <div className="row g-4 mb-4">
        {summaryCards.map((card) => (
          <div key={card.label} className="col-md-6 col-xl-3">
            <div className="card reports-card h-100">
              <div className="card-body">
                <p className="report-kpi-label">{card.label}</p>

                <h3 className="report-kpi-value">{card.value}</h3>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* WEEKLY ATTENDANCE GRAPH */}

      <div className="row g-4 mb-4">
        <div className="col-12">
          <div className="card reports-card">
            <div className="card-body">
              <div className="reports-graph-header">
                <div>
                  <h5 className="card-title mb-1">Weekly Attendance Rate</h5>

                  <p className="reports-subtitle small mb-0">
                    Attendance percentage throughout the week
                  </p>
                </div>

                <div className="graph-controls">
                  <button
                    className="icon-btn"
                    onClick={() => setWeekOffset((previous) => previous - 1)}
                  >
                    <i className="fa-solid fa-chevron-left"></i>
                  </button>

                  <span className="week-label">
                    <i className="fa-regular fa-calendar-days me-2"></i>
                    {weekLabel}
                  </span>

                  <button
                    className="icon-btn"
                    disabled={weekOffset >= 0}
                    onClick={() => setWeekOffset((previous) => previous + 1)}
                  >
                    <i className="fa-solid fa-chevron-right"></i>
                  </button>

                  <select
                    className="week-select"
                    value={weekMode}
                    onChange={(e) => setWeekMode(e.target.value)}
                  >
                    <option value="5">5 Day Week</option>

                    <option value="6">6 Day Week</option>
                  </select>
                </div>
              </div>

              {weeklyAttendance.length === 0 ? (
                <div className="empty-graph">
                  <i className="fa-regular fa-calendar-xmark"></i>

                  <h6>No Classes Conducted</h6>

                  <p>No attendance was recorded for this week.</p>
                </div>
              ) : (
                <div className="bar-chart improved mt-4">
                  {weeklyAttendance.map((day) => (
                    <div key={day.day} className="bar-item">
                      <div className="bar-wrapper">
                        <div
                          className={`bar-fill ${
                            day.percent < threshold ? "low" : "high"
                          }`}
                          style={{
                            height: `${day.percent}%`,
                          }}
                        >
                          <span className="bar-tooltip">
                            {day.percent === 0
                              ? "No class conducted"
                              : `${day.percent}%`}
                          </span>
                        </div>
                      </div>

                      <span className="bar-label">{day.day}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* LOWER REPORTS */}

      <div className="row g-4">
        {/* BELOW THRESHOLD */}

        <div className="col-lg-6">
          <div className="card reports-card h-100">
            <div className="card-body">
              <h5 className="card-title">Students Below Threshold</h5>

              <p className="reports-subtitle small mb-3">
                Students below the current subject threshold
              </p>

              {lowAttendanceStudents.length === 0 ? (
                <p className="text-muted mb-0">
                  No students are below the threshold right now.
                </p>
              ) : (
                <div className="absence-list">
                  {lowAttendanceStudents.map((student) => (
                    <div key={student.id} className="absence-row">
                      <span className="rank">
                        <i className="fa-solid fa-triangle-exclamation"></i>
                      </span>

                      <span className="name">{student.name}</span>

                      <span className="count">
                        {Number(student.attendance || 0)}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* FREQUENT ABSENTEES */}

        <div className="col-lg-6">
          <div className="card reports-card">
            <div className="card-body">
              <h5 className="card-title">Most Frequent Absences</h5>

              <p className="reports-subtitle small mb-3">
                Students with highest absence count
              </p>

              {frequentAbsentees.length === 0 ? (
                <p className="text-muted">No absence data available</p>
              ) : (
                <div className="absence-list">
                  {frequentAbsentees.map((student, index) => (
                    <div key={student.id || index} className="absence-row">
                      <span className="rank">#{index + 1}</span>

                      <span className="name">{student.name}</span>

                      <span className="count">{student.absences} absences</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
