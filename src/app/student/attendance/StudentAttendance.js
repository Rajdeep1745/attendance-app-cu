import { useEffect, useState } from "react";
import { DayPicker } from "react-day-picker";
import { useParams } from "react-router-dom";

import "react-day-picker/dist/style.css";

import useDelayedLoading from "../../../hooks/useDelayedLoading";
import {
  StudentAttendanceSkeleton,
} from "../../../components/skeletons/Skeletons";

import "./StudentAttendance.css";

const API_BASE =
  process.env.REACT_APP_BACKEND_URL;

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

const getStudentAttendanceByDate =
  async (date) => {
    const token =
      localStorage.getItem("token");

    const response = await fetch(
      `${API_BASE}api/attendance/student?date=${encodeURIComponent(
        date,
      )}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data?.error ||
          "Failed to load attendance",
      );
    }

    return data;
  };

const formatLocalDate = (date) => {
  const year =
    date.getFullYear();

  const month = String(
    date.getMonth() + 1,
  ).padStart(2, "0");

  const day = String(
    date.getDate(),
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const StudentAttendance = () => {
  const { subjectId } =
    useParams();

  const maxSelectableDate =
    new Date();

  const [selectedDate, setSelectedDate] =
    useState(maxSelectableDate);

  const [selectedRow, setSelectedRow] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const selectedKey =
    formatLocalDate(selectedDate);

  const subjectName =
    getSubjectName(subjectId);

  useEffect(() => {
    if (!subjectId) return;

    let ignore = false;

    const loadAttendance =
      async () => {
        setLoading(true);

        try {
          const data =
            await getStudentAttendanceByDate(
              selectedKey,
            );

          if (ignore) return;

          /*
           * Backend returns one row per enrolled subject.
           *
           * We only want the currently selected
           * subject.
           */
          const currentSubject =
            Array.isArray(data)
              ? data.find(
                  (item) =>
                    String(
                      item.subjectId,
                    ) ===
                    String(subjectId),
                )
              : null;

          setSelectedRow(
            currentSubject || {
              subjectId,
              status: "No Class",
              recordedAt: "-",
            },
          );

          setError("");
        } catch (err) {
          if (!ignore) {
            setError(err.message);
            setSelectedRow(null);
          }
        } finally {
          if (!ignore) {
            setLoading(false);
          }
        }
      };

    loadAttendance();

    return () => {
      ignore = true;
    };
  }, [selectedKey, subjectId]);

  const showSkeleton =
    useDelayedLoading(loading);

  const formattedHeadingDate =
    selectedDate.toLocaleDateString(
      "en-US",
      {
        month: "long",
        day: "numeric",
        year: "numeric",
      },
    );

  const selectedWeekday =
    selectedDate.toLocaleDateString(
      "en-US",
      {
        weekday: "long",
      },
    );

  if (showSkeleton) {
    return (
      <StudentAttendanceSkeleton />
    );
  }

  const status =
    selectedRow?.status ||
    "No Class";

  const statusClass =
    status === "Present"
      ? "present"
      : status === "Absent"
        ? "absent"
        : "no-class";

  return (
    <div className="container-fluid attendance-page student-attendance-page">
      {error && (
        <div className="alert alert-danger mb-4">
          {error}
        </div>
      )}

      <div className="mb-4">
        <h2 className="attendance-title">
          Attendance
        </h2>

        <p className="attendance-subtitle">
          Check your attendance for{" "}
          <strong>{subjectName}</strong>.
        </p>
      </div>

      <div className="card attendance-card mb-4">
        <div className="card-body student-date-card">
          <div className="student-calendar-shell">
            <div className="attendance-page-calendar-shell">
              <div className="premium-date-picker-calendar attendance-page-calendar">
                <DayPicker
                  mode="single"
                  selected={
                    selectedDate
                  }
                  onSelect={(date) =>
                    date &&
                    setSelectedDate(
                      date,
                    )
                  }
                  showOutsideDays
                  disabled={{
                    after:
                      maxSelectableDate,
                  }}
                />
              </div>

              <div className="premium-date-picker-footer attendance-page-calendar-footer">
                <button
                  type="button"
                  className="premium-date-picker-footer-btn primary"
                  onClick={() =>
                    setSelectedDate(
                      new Date(),
                    )
                  }
                >
                  Today
                </button>
              </div>
            </div>
          </div>

          <div className="student-date-copy">
            <div className="student-section-pill">
              <i className="fa-regular fa-calendar-days"></i>

              <span>
                Daily Snapshot
              </span>
            </div>

            <h3>
              {formattedHeadingDate}
            </h3>

            <p className="attendance-subtitle">
              Attendance status for{" "}
              {selectedWeekday} in{" "}
              {subjectName}.
            </p>

            <div className="student-date-stats">
              <div className="date-stat-card">
                <span>Status</span>

                <strong>
                  {status}
                </strong>
              </div>

              <div className="date-stat-card">
                <span>Recorded At</span>

                <strong>
                  {selectedRow?.recordedAt ||
                    "-"}
                </strong>
              </div>
            </div>

            <div className="student-date-note">
              <i className="fa-regular fa-circle-check"></i>

              <span>
                Attendance shown here is
                specific to the selected
                subject.
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
                Your Attendance for{" "}
                {formattedHeadingDate}
              </h3>

              <p className="attendance-subtitle mb-0">
                {subjectName}
              </p>
            </div>
          </div>

          <div className="student-status-table">
            <div className="student-status-head">
              <span>Subject</span>
              <span>Recorded At</span>
              <span>Status</span>
            </div>

            <div className="student-status-row">
              <div className="student-batch-cell">
                <strong>
                  {subjectName}
                </strong>
              </div>

              <div className="student-time-cell">
                {selectedRow?.recordedAt ||
                  "-"}
              </div>

              <div className="student-status-cell">
                <span
                  className={`status-pill ${statusClass}`}
                >
                  {status ===
                  "Absent" ? (
                    <i className="fa-regular fa-circle-xmark"></i>
                  ) : status ===
                    "Present" ? (
                    <i className="fa-regular fa-circle-check"></i>
                  ) : (
                    <i className="fa-regular fa-circle"></i>
                  )}

                  <span>
                    {status}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentAttendance;