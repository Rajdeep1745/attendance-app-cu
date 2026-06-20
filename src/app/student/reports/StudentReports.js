import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import useDelayedLoading from "../../../hooks/useDelayedLoading";
import { StudentReportsSkeleton } from "../../../components/skeletons/Skeletons";

import "./StudentReports.css";

const getStudentReports = async (batchId) => {
  const token = localStorage.getItem("token");
  const response = await fetch(
    `${process.env.REACT_APP_BACKEND_URL}api/students/me/batches/${batchId}/reports`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const data = await response.json();

  if (!response.ok) throw new Error(data?.error || "Failed to load reports");
  return data;
};

const StudentReports = () => {
  const { batchId } = useParams();
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!batchId) return;

    let ignore = false;

    const loadReports = async () => {
      setLoading(true);
      try {
        const data = await getStudentReports(batchId);
        if (!ignore) {
          setDetails(data);
          setError("");
        }
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

    loadReports();

    return () => {
      ignore = true;
    };
  }, [batchId]);

  const showSkeleton = useDelayedLoading(loading || !details);

  if (error) {
    return (
      <div className="container-fluid student-reports-page">
        <div className="alert alert-danger">{error}</div>
      </div>
    );
  }

  if (showSkeleton || !details) {
    return <StudentReportsSkeleton />;
  }

  const attendanceHistory = details.recentAttendance || [];
  const presentCount = attendanceHistory.filter(
    (item) => item.status === "Present",
  ).length;
  const absentCount = attendanceHistory.filter(
    (item) => item.status === "Absent",
  ).length;
  const noClassCount = attendanceHistory.filter(
    (item) => item.status === "No Class",
  ).length;
  const thresholdGap = details.myAttendance - details.threshold;

  const overviewCards = [
    {
      label: "My Attendance",
      value: `${details.myAttendance}%`,
    },
    {
      label: "Batch Average",
      value: `${details.batchAverage}%`,
    },
    {
      label: "Classes Attended",
      value: `${details.attendedClasses}/${details.totalClasses}`,
    },
    {
      label: "Threshold Gap",
      value: `${thresholdGap >= 0 ? "+" : ""}${thresholdGap}%`,
    },
  ];

  return (
    <div className="container-fluid student-reports-page">
      <div className="mb-4">
        <h2 className="student-reports-title">Reports</h2>
        <p className="student-reports-subtitle">
          Read-only attendance summary for {details.batchName}.
        </p>
      </div>

      <div className="row g-4 mb-4">
        {overviewCards.map((item) => (
          <div key={item.label} className="col-md-6 col-xl-3">
            <div className="card student-reports-card h-100">
              <div className="card-body">
                <p className="student-reports-label">{item.label}</p>
                <h3 className="student-reports-value">{item.value}</h3>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="row g-4">
        <div className="col-12">
          <div className="card student-reports-card h-100">
            <div className="card-body">
              <h5 className="card-title mb-1">Complete Attendance Breakdown</h5>
              <p className="student-reports-subtitle small mb-4">
                Full attendance summary across all recorded class dates since
                the beginning.
              </p>

              <div className="student-breakdown-grid">
                <div className="student-breakdown-box present">
                  <span>Present</span>
                  <strong>{presentCount}</strong>
                </div>
                <div className="student-breakdown-box absent">
                  <span>Absent</span>
                  <strong>{absentCount}</strong>
                </div>
                <div className="student-breakdown-box neutral">
                  <span>No Class</span>
                  <strong>{noClassCount}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12">
          <div className="card student-reports-card h-100">
            <div className="card-body student-records-card-body">
              <h5 className="card-title mb-1">All Attendance Records</h5>
              <p className="student-reports-subtitle small mb-4">
                Date-wise attendance history for every recorded class since the
                beginning.
              </p>

              <div className="student-record-list">
                {attendanceHistory.map((item) => (
                  <div
                    key={`${item.date}-${item.status}`}
                    className="student-record-row"
                  >
                    <div>
                      <strong>
                        {new Date(item.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </strong>
                      <small className="text-muted d-block">
                        {new Date(item.date).toLocaleDateString("en-US", {
                          weekday: "long",
                        })}
                      </small>
                    </div>

                    <span
                      className={`student-record-pill ${
                        item.status === "Present"
                          ? "present"
                          : item.status === "Absent"
                            ? "absent"
                            : "neutral"
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentReports;
