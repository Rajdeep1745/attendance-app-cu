import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import useDelayedLoading from "../../../hooks/useDelayedLoading";
import { StudentReportsSkeleton } from "../../../components/skeletons/Skeletons";

import "./StudentReports.css";

const API_BASE = process.env.REACT_APP_BACKEND_URL;

const getSubjectName = (subjectId) => {
  try {
    // eslint-disable-next-line global-require
    const { PROGRAMMES } = require("../../../data/programmes");

    for (const programmeData of Object.values(
      PROGRAMMES,
    )) {
      for (const subjects of Object.values(
        programmeData.semesters || {},
      )) {
        const subject = subjects.find(
          (item) =>
            String(item.id) ===
            String(subjectId),
        );

        if (subject) {
          return subject.name;
        }
      }
    }
  } catch (error) {
    console.error(
      "Failed to resolve subject name:",
      error,
    );
  }

  return subjectId;
};

const getStudentReports = async (
  subjectId,
) => {
  const token =
    localStorage.getItem("token");

  const response = await fetch(
    `${API_BASE}api/subject/${encodeURIComponent(
      subjectId,
    )}/reports`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.error ||
        "Failed to load reports",
    );
  }

  return data;
};

const StudentReports = () => {
  const { subjectId } = useParams();

  const [details, setDetails] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    if (!subjectId) return;

    let ignore = false;

    const loadReports = async () => {
      setLoading(true);

      try {
        const data =
          await getStudentReports(
            subjectId,
          );

        if (!ignore) {
          setDetails(data);
          setError("");
        }
      } catch (err) {
        if (!ignore) {
          setError(err.message);
          setDetails(null);
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
  }, [subjectId]);

  const showSkeleton =
    useDelayedLoading(
      loading || !details,
    );

  if (error) {
    return (
      <div className="container-fluid student-reports-page">
        <div className="alert alert-danger">
          {error}
        </div>
      </div>
    );
  }

  if (showSkeleton || !details) {
    return <StudentReportsSkeleton />;
  }

  const attendanceHistory =
    details.recentAttendance || [];

  const presentCount =
    attendanceHistory.filter(
      (item) =>
        item.status === "Present",
    ).length;

  const absentCount =
    attendanceHistory.filter(
      (item) =>
        item.status === "Absent",
    ).length;

  const notRecordedCount =
    attendanceHistory.filter(
      (item) =>
        item.status ===
        "Attendance not recorded",
    ).length;

  const thresholdGap =
    Number(details.myAttendance || 0) -
    Number(details.threshold || 0);

  const subjectName =
    getSubjectName(subjectId);

  const overviewCards = [
    {
      label: "My Attendance",
      value: `${details.myAttendance}%`,
    },
    {
      label: "Subject Average",
      value: `${details.subjectAverage}%`,
    },
    {
      label: "Classes Attended",
      value: `${details.attendedClasses}/${details.totalClasses}`,
    },
    {
      label: "Threshold Gap",
      value: `${
        thresholdGap >= 0 ? "+" : ""
      }${thresholdGap.toFixed(1)}%`,
    },
  ];

  return (
    <div className="container-fluid student-reports-page">
      <div className="mb-4">
        <h2 className="student-reports-title">
          Reports
        </h2>

        <p className="student-reports-subtitle">
          Attendance report for{" "}
          <strong>{subjectName}</strong>.
        </p>
      </div>

      <div className="row g-4 mb-4">
        {overviewCards.map((item) => (
          <div
            key={item.label}
            className="col-md-6 col-xl-3"
          >
            <div className="card student-reports-card h-100">
              <div className="card-body">
                <p className="student-reports-label">
                  {item.label}
                </p>

                <h3 className="student-reports-value">
                  {item.value}
                </h3>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="row g-4">
        <div className="col-12">
          <div className="card student-reports-card h-100">
            <div className="card-body">
              <h5 className="card-title mb-1">
                Attendance Breakdown
              </h5>

              <p className="student-reports-subtitle small mb-4">
                Attendance summary for every
                recorded class date.
              </p>

              <div className="student-breakdown-grid">
                <div className="student-breakdown-box present">
                  <span>Present</span>
                  <strong>
                    {presentCount}
                  </strong>
                </div>

                <div className="student-breakdown-box absent">
                  <span>Absent</span>
                  <strong>
                    {absentCount}
                  </strong>
                </div>

                <div className="student-breakdown-box neutral">
                  <span>Not Recorded</span>
                  <strong>
                    {notRecordedCount}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12">
          <div className="card student-reports-card h-100">
            <div className="card-body student-records-card-body">
              <h5 className="card-title mb-1">
                Attendance Records
              </h5>

              <p className="student-reports-subtitle small mb-4">
                Date-wise attendance history
                for this subject.
              </p>

              {attendanceHistory.length ===
              0 ? (
                <div className="text-muted">
                  No attendance records are
                  available yet.
                </div>
              ) : (
                <div className="student-record-list">
                  {attendanceHistory.map(
                    (item) => (
                      <div
                        key={`${item.date}-${item.status}`}
                        className="student-record-row"
                      >
                        <div>
                          <strong>
                            {new Date(
                              item.date,
                            ).toLocaleDateString(
                              "en-US",
                              {
                                month:
                                  "short",
                                day: "numeric",
                                year:
                                  "numeric",
                              },
                            )}
                          </strong>

                          <small className="text-muted d-block">
                            {new Date(
                              item.date,
                            ).toLocaleDateString(
                              "en-US",
                              {
                                weekday:
                                  "long",
                              },
                            )}
                          </small>
                        </div>

                        <span
                          className={`student-record-pill ${
                            item.status ===
                            "Present"
                              ? "present"
                              : item.status ===
                                  "Absent"
                                ? "absent"
                                : "neutral"
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>
                    ),
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentReports;