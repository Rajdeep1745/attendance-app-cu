import { useContext, useState, useMemo, useEffect } from "react";
import { useParams } from "react-router-dom";
import BatchContext from "../../../context/subject/SubjectContext";
import useDelayedLoading from "../../../hooks/useDelayedLoading";
import { TeacherReportsSkeleton } from "../../../components/skeletons/Skeletons";
import "./TeacherReports.css";

const Reports = () => {
  const { activeBatch } = useContext(BatchContext);
  const { batchId } = useParams();

  const [weeklyAttendance, setWeeklyAttendance] = useState([]);
  const [stats, setStats] = useState({
    totalClasses: 0,
    avgAttendance: 0,
    bestAttendance: { percentage: 0, date: null },
    worstAttendance: { percentage: 0, date: null },
  });
  const [students, setStudents] = useState([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [absenteesLoading, setAbsenteesLoading] = useState(true);
  const [graphLoading, setGraphLoading] = useState(true);

  const [weekOffset, setWeekOffset] = useState(0); // 0 = current week
  const [weekMode, setWeekMode] = useState("6"); // "5" or "6"

  // Attendance threshold
  const [threshold, setThreshold] = useState(0);

  // Frequent absentees
  const [frequentAbsentees, setFrequentAbsentees] = useState([]);

  const batchMatchesRoute =
    String(activeBatch?.id || "") === String(batchId || "");

  const fetchFrequentAbsentees = async () => {
    if (!batchId) return;
    setAbsenteesLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}api/attendance/${batchId}/frequent-absentees`,
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
      console.error(err);
      setFrequentAbsentees([]);
    } finally {
      setAbsenteesLoading(false);
    }
  };

  const fetchStats = async () => {
    if (!batchId) return;
    setStatsLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}api/attendance/${batchId}/stats`,
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

      setStats(data);
    } catch (err) {
      console.error(err);
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchStudents = async () => {
    if (!batchId) return;
    setStudentsLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}api/students/${batchId}`,
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
      console.error(err);
      setStudents([]);
    } finally {
      setStudentsLoading(false);
    }
  };

  useEffect(() => {
    if (!batchMatchesRoute) return;

    fetchFrequentAbsentees();
    fetchStats();
    fetchStudents();
    //eslint-disable-next-line
  }, [batchMatchesRoute, batchId]);

  // Get week range
  const getWeekRange = () => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    // Make Monday the first day
    const day = start.getDay(); // 0 = Sun, 1 = Mon, ...
    const diff = (day === 0 ? -6 : 1 - day) + weekOffset * 7;

    start.setDate(start.getDate() + diff);

    const end = new Date(start);
    end.setDate(start.getDate() + (weekMode === "5" ? 4 : 5));
    end.setHours(23, 59, 59, 999);

    return { start, end };
  };

  // Week label
  const weekLabel = useMemo(() => {
    const { start, end } = getWeekRange();

    const opts = { month: "short", day: "numeric" };
    return `${start.toLocaleDateString("en-US", opts)} - ${end.toLocaleDateString("en-US", opts)}`;
    //eslint-disable-next-line
  }, [weekOffset, weekMode]);

  // Fetch graph data
  const fetchGraph = async () => {
    if (!batchId) return;
    setGraphLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}api/attendance/${batchId}/graph`,
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

      const filtered = data.filter((d) => {
        const attendanceDate = new Date(d.date);
        return attendanceDate >= start && attendanceDate <= end;
      });

      if (filtered.length === 0) {
        setWeeklyAttendance([]);
        return;
      }

      // If no classes happened this week → show empty state
      if (filtered.length === 0) {
        setWeeklyAttendance([]);
        return;
      }

      // Convert to graph format
      const daysOrder =
        weekMode === "5"
          ? ["Mon", "Tue", "Wed", "Thu", "Fri"]
          : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

      const dayMap = {};

      filtered.forEach((d) => {
        const day = new Date(d.date).toLocaleDateString("en-US", {
          weekday: "short",
        });
        dayMap[day] = d.attendance_percentage;
      });

      const formatted = daysOrder.map((day) => ({
        day,
        percent: dayMap[day] || 0,
      }));

      setWeeklyAttendance(formatted);
    } catch (err) {
      console.error("Failed to fetch graph data", err);
      setWeeklyAttendance([]);
    } finally {
      setGraphLoading(false);
    }
  };

  useEffect(() => {
    if (!batchMatchesRoute) return;

    fetchGraph();
    setThreshold(activeBatch.threshold);
    //eslint-disable-next-line
  }, [batchMatchesRoute, batchId, weekOffset, weekMode]);

  const showPageSkeleton = useDelayedLoading(
    !batchMatchesRoute ||
      statsLoading ||
      studentsLoading ||
      absenteesLoading ||
      graphLoading,
  );

  if (showPageSkeleton || !batchMatchesRoute) return <TeacherReportsSkeleton />;

  const lowAttendanceStudents = students.filter(
    (student) => student.attendance < threshold,
  );

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
            {activeBatch.name}
          </p>
        </div>
      </div>

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
              {/* GRAPH HEADER */}
              <div className="reports-graph-header">
                <div>
                  <h5 className="card-title mb-1">Weekly Attendance Rate</h5>
                  <p className="reports-subtitle small mb-0">
                    Atendance percentage throughout the week
                  </p>
                </div>

                <div className="graph-controls">
                  <button
                    className="icon-btn"
                    onClick={() => setWeekOffset((p) => p - 1)}
                  >
                    <i className="fa-solid fa-chevron-left"></i>
                  </button>

                  <span className="week-label">
                    <i className="fa-regular fa-calendar-days me-2"></i>
                    {weekLabel}
                  </span>

                  {/* prevent future weeks */}
                  <button
                    className="icon-btn"
                    disabled={weekOffset >= 0}
                    onClick={() => setWeekOffset((p) => p + 1)}
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

              {/* GRAPH / EMPTY STATE */}
              {weeklyAttendance.length === 0 ? (
                <div className="empty-graph">
                  <i className="fa-regular fa-calendar-xmark"></i>
                  <h6>No Classes Conducted</h6>
                  <p>No attendance was recorded for this week.</p>
                </div>
              ) : (
                <div className="bar-chart improved mt-4">
                  {weeklyAttendance.map((d) => (
                    <div key={d.day} className="bar-item">
                      <div className="bar-wrapper">
                        <div
                          className={`bar-fill ${
                            d.percent < threshold ? "low" : "high"
                          }`}
                          style={{ height: `${d.percent}%` }}
                        >
                          <span className="bar-tooltip">
                            {d.percent === 0
                              ? "No class conducted"
                              : `${d.percent}%`}
                          </span>
                        </div>
                      </div>
                      <span className="bar-label">{d.day}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-lg-6">
          <div className="card reports-card h-100">
            <div className="card-body">
              <h5 className="card-title">Students Below Threshold</h5>
              <p className="reports-subtitle small mb-3">
                Students below the current batch threshold
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
                      <span className="count">{student.attendance}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

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
                  {frequentAbsentees.map((s, index) => (
                    <div key={s.id || index} className="absence-row">
                      <span className="rank">#{index + 1}</span>
                      <span className="name">{s.name}</span>
                      <span className="count">{s.absences} absences</span>
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
