import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";

import useDelayedLoading from "../../../hooks/useDelayedLoading";
import { TeacherAttendanceSkeleton } from "../../../components/skeletons/Skeletons";

import "./TeacherAttendance.css";


// ============================================================
// DATE HELPERS
// ============================================================

const formatLocalDate = (date) => {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1,
  ).padStart(2, "0");

  const day = String(
    date.getDate(),
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
};


// ============================================================
// ATTENDANCE PAGE
// ============================================================

const Attendance = () => {
  const { subjectId } = useParams();

  const today = new Date();

  // ----------------------------------------------------------
  // Threshold
  // ----------------------------------------------------------

  const [threshold, setThreshold] = useState(0);

  // ----------------------------------------------------------
  // Selected date
  // ----------------------------------------------------------

  const [selectedDate, setSelectedDate] =
    useState(new Date());

  // ----------------------------------------------------------
  // Students
  // ----------------------------------------------------------

  const [records, setRecords] = useState([]);

  const [attendanceLoading, setAttendanceLoading] =
    useState(true);

  // ----------------------------------------------------------
  // Subject attendance statistics
  // ----------------------------------------------------------

  const [attendanceStats, setAttendanceStats] =
    useState({
      totalClasses: 0,
      avgAttendance: 0,
      bestAttendance: {},
      worstAttendance: {},
    });


  // ==========================================================
  // FETCH SUBJECT DETAILS
  // ==========================================================

  const fetchSubjectDetails = async (id) => {
    try {
      const token =
        localStorage.getItem("token");

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
        throw new Error(
          data?.error ||
            "Failed to fetch subject",
        );
      }

      setThreshold(
        Number(data?.threshold || 0),
      );
    } catch (err) {
      console.error(
        "Failed to fetch subject details:",
        err,
      );

      setThreshold(0);
    }
  };


  // ==========================================================
  // FETCH ATTENDANCE STATISTICS
  // ==========================================================

  const fetchAttendanceDetails = async (id) => {
    try {
      const token =
        localStorage.getItem("token");

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
        throw new Error(
          data?.error ||
            "Failed to fetch stats",
        );
      }

      setAttendanceStats(data);
    } catch (err) {
      console.error(
        "Failed to fetch attendance stats:",
        err,
      );
    }
  };


  // ==========================================================
  // FETCH DAILY ATTENDANCE
  // ==========================================================

  useEffect(() => {
    if (!subjectId || !selectedDate) {
      return;
    }

    const fetchDailyAttendance = async () => {
      setAttendanceLoading(true);

      try {
        const token =
          localStorage.getItem("token");

        const formattedDate =
          formatLocalDate(
            selectedDate,
          );

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
          throw new Error(
            data?.error ||
              "Failed to fetch attendance",
          );
        }

        // ----------------------------------------------------
        // Backend now provides:
        //
        // subjectPercentage
        // overallPercentage
        // present
        // ----------------------------------------------------

        const formatted = data.map(
          (student) => ({
            id: student.studentId,

            name: student.name,

            roll: student.roll,

            present:
              student.present,

            subjectPercentage:
              Number(
                student.subjectPercentage ||
                  0,
              ),

            overallPercentage:
              Number(
                student.overallPercentage ||
                  0,
              ),

            avatar:
              student.avatar ||
              null,
          }),
        );

        setRecords(formatted);

        await Promise.all([
          fetchSubjectDetails(
            subjectId,
          ),

          fetchAttendanceDetails(
            subjectId,
          ),
        ]);
      } catch (err) {
        console.error(
          "Failed to fetch daily attendance:",
          err,
        );

        setRecords([]);
      } finally {
        setAttendanceLoading(false);
      }
    };

    fetchDailyAttendance();
  }, [
    subjectId,
    selectedDate,
  ]);


  // ==========================================================
  // LOADING
  // ==========================================================

  const showPageSkeleton =
    useDelayedLoading(
      attendanceLoading,
    );


  if (showPageSkeleton) {
    return (
      <TeacherAttendanceSkeleton />
    );
  }


  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="container-fluid attendance-page page-enter">

      {/* ====================================================
          HEADER
      ==================================================== */}

      <div className="attendance-hero">

        <div>
          <h1>
            Attendance Records
          </h1>

          <p>
            View daily attendance history
            and class performance.
          </p>
        </div>

      </div>


      {/* ====================================================
          DATE + SUMMARY
      ==================================================== */}

      <div className="row g-4 mb-4">

        {/* --------------------------------------------------
            CALENDAR
        -------------------------------------------------- */}

        <div className="col-md-6">

          <div className="card attendance-card calendar-card h-100">

            <div className="card-body attendance-calendar-card-body">

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
                      after: today,
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

          </div>

        </div>


        {/* --------------------------------------------------
            SUBJECT SUMMARY
        -------------------------------------------------- */}

        <div className="col-md-6">

          <div className="card attendance-card h-100 subject-summary">

            <div className="card-body subject-summary-body">

              <div className="mx-5 summary-left">

                <p className="stats-title mb-1">
                  Average Attendance
                </p>

                <h1 className="stats-value-main">
                  {
                    attendanceStats.avgAttendance ||
                    0
                  }
                  %
                </h1>

                <small className="text-muted">
                  Based on last{" "}
                  {
                    attendanceStats.totalClasses ||
                    0
                  }{" "}
                  classes
                </small>

                <div className="analytics-progress">

                  <div
                    className="analytics-progress-bar"
                    style={{
                      width: `${Math.min(
                        Number(
                          attendanceStats.avgAttendance ||
                            0,
                        ),
                        100,
                      )}%`,
                    }}
                  />

                </div>

              </div>


              <div className="summary-right-details">

                <div className="stat-box best">

                  <p>Best</p>

                  <h4>
                    {
                      attendanceStats
                        .bestAttendance
                        ?.percentage ||
                      0
                    }
                    %
                  </h4>

                  <small>
                    {
                      attendanceStats
                        .bestAttendance
                        ?.date ||
                      "No data"
                    }
                  </small>

                </div>


                <div className="stat-box worst">

                  <p>Worst</p>

                  <h4>
                    {
                      attendanceStats
                        .worstAttendance
                        ?.percentage ||
                      0
                    }
                    %
                  </h4>

                  <small>
                    {
                      attendanceStats
                        .worstAttendance
                        ?.date ||
                      "No data"
                    }
                  </small>

                </div>

              </div>

            </div>

          </div>

        </div>

      </div>


     {/* ====================================================
    STUDENT LIST
==================================================== */}

<div className="card attendance-card attendance-students-card">

  <div className="card-body">

    {/* ------------------------------------------------
        HEADER
    ------------------------------------------------ */}

    <div className="students-header">

      <div>

        <h5 className="students-title">
          Students
        </h5>

        <p className="students-subtitle">
          Individual attendance performance
        </p>

      </div>

      <span className="students-count">
        {records.length} Students
      </span>

    </div>


    {/* ------------------------------------------------
        EMPTY STATE
    ------------------------------------------------ */}

    {records.length === 0 ? (

      <div className="attendance-empty-state">

        <div className="attendance-empty-icon">
          ✓
        </div>

        <h6>
          No students enrolled
        </h6>

        <p>
          There are no students enrolled in this subject.
        </p>

      </div>

    ) : (

      <div className="premium-attendance-table">

        {/* ==============================================
            TABLE HEADER
        ============================================== */}

        <div className="attendance-table-header">

          <div className="table-col-student">
            Student
          </div>

          <div className="table-col-overall">
            Overall Attendance
          </div>

          <div className="table-col-subject">
            This Subject
          </div>

          <div className="table-col-warning">
            Attendance Status
          </div>

          <div className="table-col-date">
            Selected Date
          </div>

        </div>


        {/* ==============================================
            TABLE ROWS
        ============================================== */}

        <div className="attendance-table-body">

          {records.map((student) => {

            const overall =
              Number(
                student.overallPercentage || 0,
              );

            const subject =
              Number(
                student.subjectPercentage || 0,
              );

            const isBelowThreshold =
              overall < threshold;


            return (

              <div
                key={student.id}
                className={`attendance-table-row ${
                  isBelowThreshold
                    ? "attendance-table-row-warning"
                    : ""
                }`}
              >

                {/* ======================================
                    STUDENT
                ====================================== */}

                <div className="table-col-student">

                  <div className="table-student">

                    <div className="table-avatar-wrap">

                      <img
                        src={
                          student.avatar ||
                          `https://i.pravatar.cc/150?u=${student.id}`
                        }
                        alt={student.name}
                        className="table-student-avatar"
                      />

                      {isBelowThreshold && (

                        <span
                          className="table-warning-dot"
                          title={`Overall attendance is below the ${threshold}% threshold`}
                        >
                          !
                        </span>

                      )}

                    </div>


                    <div className="table-student-details">

                      <div className="table-student-name">
                        {student.name}
                      </div>

                      <div className="table-student-roll">
                        {student.roll}
                      </div>

                    </div>

                  </div>

                </div>


                {/* ======================================
                    OVERALL ATTENDANCE
                ====================================== */}

                <div className="table-col-overall">

                  <div
                    className={`table-percentage ${
                      isBelowThreshold
                        ? "table-percentage-warning"
                        : "table-percentage-good"
                    }`}
                  >
                    {overall}%
                  </div>

                </div>


                {/* ======================================
                    SUBJECT ATTENDANCE
                ====================================== */}

                <div className="table-col-subject">

                  <div className="table-subject-percentage">
                    {subject}%
                  </div>

                </div>


                {/* ======================================
                    THRESHOLD STATUS
                ====================================== */}

                <div className="table-col-warning">

                  {isBelowThreshold ? (

                    <div
                      className="table-warning-status"
                      title={`Overall attendance is below the ${threshold}% threshold`}
                    >

                      <span className="table-warning-icon">
                        ⚠
                      </span>

                      <div className="table-warning-text">

                        <strong>
                          Below threshold
                        </strong>

                        <small>
                          Required {threshold}%
                        </small>

                      </div>

                    </div>

                  ) : (

                    <div className="table-safe-status">

                      <span className="table-safe-icon">
                        ✓
                      </span>

                      <div className="table-safe-text">

                        <strong>
                          Above threshold
                        </strong>

                        <small>
                          Required {threshold}%
                        </small>

                      </div>

                    </div>

                  )}

                </div>


                {/* ======================================
                    SELECTED DATE
                ====================================== */}

                <div className="table-col-date">

                  <div
                    className={`table-date-status ${
                      student.present === null
                        ? "table-date-no-class"
                        : student.present
                          ? "table-date-present"
                          : "table-date-absent"
                    }`}
                  >

                    <span className="table-date-dot" />

                    <span>
                      {
                        student.present === null
                          ? "No Class"
                          : student.present
                            ? "Present"
                            : "Absent"
                      }
                    </span>

                  </div>

                </div>

              </div>

            );

          })}

        </div>

      </div>

    )}

  </div>

</div>

    </div>
  );
};


export default Attendance;