import { useContext, useState, useMemo, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import BatchContext from "../../../context/batch/BatchContext";
import AlertContext from "../../../context/alert/AlertContext";

import StudentModal from "../../../components/studentModal/StudentModal";
import StudentDetailsModal from "../../../components/studentDetailsModal/StudentDetailsModal";
import FaceRegisterModal from "../../../components/faceRegisterModal/FaceRegisterModal";
import useDelayedLoading from "../../../hooks/useDelayedLoading";
import { TeacherStudentsSkeleton } from "../../../components/skeletons/Skeletons";
import "./TeacherStudents.css";

const Students = () => {
  const { activeBatch, fetchBatchById } = useContext(BatchContext);
  const { showAlert } = useContext(AlertContext);
  const { batchId } = useParams();

  /*
   * The frontend route still calls this parameter "batchId"
   * for compatibility with the existing router.
   *
   * Its actual value is now the backend subjectId.
   *
   * Example:
   *
   * /userId/bt1_phy/students
   *
   * batchId === "bt1_phy"
   * subjectId === "bt1_phy"
   */

  const subjectId = batchId;

  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(true);

  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);

  const [showDetails, setShowDetails] = useState(false);
  const [showFaceRegister, setShowFaceRegister] = useState(false);

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

      if (!token) {
        throw new Error("Authentication token not found");
      }

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
        throw new Error(
          data?.error || "Failed to fetch students",
        );
      }

      if (!Array.isArray(data)) {
        throw new Error(
          "Invalid student list received from server",
        );
      }

      setStudents(data);
    } catch (err) {
      console.error(
        "[TeacherStudents] Failed to fetch students:",
        err,
      );

      setStudents([]);

      showAlert?.(
        "Error",
        err.message || "Failed to load students",
        "danger",
      );
    } finally {
      setStudentsLoading(false);
    }
  }, [subjectId, showAlert]);

  // ---------------------------------------------------------
  // ENSURE SELECTED SUBJECT IS LOADED
  // ---------------------------------------------------------

  useEffect(() => {
    if (!subjectId) {
      setStudents([]);
      setStudentsLoading(false);
      return;
    }

    /*
     * If BatchState has not loaded this subject yet,
     * load it here.
     *
     * This makes the Students tab independent and prevents
     * it from getting stuck on the skeleton.
     */
    const loadSubjectAndStudents = async () => {
      try {
        const currentSubjectId = activeBatch?.subject_id;

        if (
          String(currentSubjectId || "") !==
          String(subjectId)
        ) {
          await fetchBatchById(subjectId);
        }

        await fetchStudents();
      } catch (err) {
        console.error(
          "[TeacherStudents] Failed to load subject/student data:",
          err,
        );

        setStudentsLoading(false);
      }
    };

    loadSubjectAndStudents();

    // We intentionally respond to subject changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectId]);

  // ---------------------------------------------------------
  // ADD STUDENT
  // ---------------------------------------------------------

  const handleAddStudent = async (student) => {
    if (!subjectId) {
      showAlert?.(
        "Error",
        "No subject selected",
        "danger",
      );
      return;
    }

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error(
          "Authentication token not found",
        );
      }

      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}api/students`,
        {
          method: "POST",

          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },

          /*
           * IMPORTANT:
           *
           * Backend expects subjectId.
           * It does NOT expect batchId.
           */
          body: JSON.stringify({
            name: student.name,
            email: student.email,
            roll: student.roll,
            department: student.department,
            institution: student.institution,
            subjectId,
          }),
        },
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data?.error || "Failed to add student",
        );
      }

      /*
       * The backend can return:
       *
       * 1. A newly enrolled student
       *
       * OR
       *
       * 2. { message: "Student already enrolled..." }
       *
       * Therefore we do NOT append `data` directly to the
       * frontend state.
       *
       * Instead, reload the authoritative roster.
       */
      await fetchStudents();

      // Update total_students in activeBatch
      await fetchBatchById(subjectId);

      if (data?.message) {
        showAlert?.(
          "Information",
          data.message,
          "primary",
        );
      } else {
        showAlert?.(
          "Added",
          "New student was added",
          "success",
        );
      }
    } catch (err) {
      console.error(
        "[TeacherStudents] Add student error:",
        err,
      );

      showAlert?.(
        "Error",
        err.message || "Failed to add student",
        "danger",
      );
    }
  };

  // ---------------------------------------------------------
  // DELETE / REMOVE STUDENT FROM SUBJECT
  // ---------------------------------------------------------

  const handleDeleteStudent = async (studentId) => {
    if (!subjectId || !studentId) {
      return;
    }

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error(
          "Authentication token not found",
        );
      }

      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}api/students/${studentId}/${subjectId}`,
        {
          method: "DELETE",

          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data?.error || "Failed to delete student",
        );
      }

      /*
       * Reload the authoritative roster instead of only
       * filtering local state.
       */
      await fetchStudents();

      // Refresh total_students in activeBatch
      await fetchBatchById(subjectId);

      setOpenMenuId(null);

      showAlert?.(
        "Deleted",
        "Student was removed from this subject",
        "danger",
      );
    } catch (err) {
      console.error(
        "[TeacherStudents] Delete student error:",
        err,
      );

      showAlert?.(
        "Error",
        err.message || "Failed to delete student",
        "danger",
      );
    }
  };

  // ---------------------------------------------------------
  // REFRESH
  // ---------------------------------------------------------

  const handleRefresh = async () => {
    await fetchStudents();

    showAlert?.(
      "Refreshed",
      "Student data refreshed",
      "primary",
    );
  };

  // ---------------------------------------------------------
  // CLOSE DROPDOWN WHEN CLICKING OUTSIDE
  // ---------------------------------------------------------

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest(".actions")) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener(
      "mousedown",
      handleClickOutside,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside,
      );
    };
  }, []);

  // ---------------------------------------------------------
  // STATS
  // ---------------------------------------------------------

  const stats = useMemo(() => {
    const total = students.length;

    const registered = students.filter(
      (student) => student.faceRegistered,
    ).length;

    const completion =
      total === 0
        ? 0
        : Math.round((registered / total) * 100);

    return {
      total,
      registered,
      completion,
    };
  }, [students]);

  const isEmpty = students.length === 0;

  // ---------------------------------------------------------
  // SUBJECT MATCH
  // ---------------------------------------------------------

  /*
   * OLD:
   *
   * activeBatch.id
   *
   * NEW:
   *
   * activeBatch.subject_id
   *
   * because subject_id is the backend identifier.
   */

  const subjectMatchesRoute =
    String(activeBatch?.subject_id || "") ===
    String(subjectId || "");

  /*
   * We don't block the entire page forever just because the
   * subject context is momentarily updating.
   *
   * fetchStudents is tied directly to subjectId.
   */
  const pageLoading =
    studentsLoading ||
    (!activeBatch && Boolean(subjectId));

  const showPageSkeleton =
    useDelayedLoading(pageLoading);

  if (showPageSkeleton) {
    return <TeacherStudentsSkeleton />;
  }

  // ---------------------------------------------------------
  // PAGE
  // ---------------------------------------------------------

  return (
    <div className="container-fluid students-page page-enter">
      {/* PAGE HEADER */}

      <div className="students-hero">
        <div>
          <h1>Students</h1>

          <p>
            Manage roster, attendance health and face
            registration.
          </p>
        </div>
      </div>

      {/* FACE REGISTRATION STATUS */}

      <div className="card students-card mb-4">
        <div className="card-body">
          <h5 className="card-title">
            Face Registration Status
          </h5>

          {isEmpty ? (
            <div className="empty-card-state">
              <i className="fa-solid fa-users"></i>

              <p>No students added yet</p>

              <small>
                Add students to enable face registration
              </small>
            </div>
          ) : (
            <>
              <p className="text-muted mb-4">
                An overview of face registration completion
                for this subject.
              </p>

              <div className="row text-center">
                <div className="col">
                  <h3>{stats.total}</h3>

                  <p className="text-muted">
                    Total Students
                  </p>
                </div>

                <div className="col">
                  <h3>{stats.registered}</h3>

                  <p className="text-muted">
                    Faces Registered
                  </p>
                </div>

                <div className="col">
                  <h3>{stats.completion}%</h3>

                  <p className="text-muted">
                    Completion
                  </p>
                </div>
              </div>

              <button
                className="btn btn-outline-secondary mt-3"
                onClick={handleRefresh}
              >
                <i className="fa-solid fa-rotate"></i>{" "}
                Refresh
              </button>
            </>
          )}
        </div>
      </div>

      {/* STUDENT ROSTER */}

      <div className="card students-card">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h5 className="card-title mb-1">
                Student Roster for{" "}
                {activeBatch?.name || "Subject"}
              </h5>

              <p className="students-subtitle mb-0">
                Manage your class roster. Add, view,
                or remove students.
              </p>
            </div>

            <button
              className="btn btn-primary"
              onClick={() =>
                setIsStudentModalOpen(true)
              }
            >
              <i className="fa-solid fa-user-plus"></i>{" "}
              Add Students
            </button>
          </div>

          {isEmpty ? (
            <div className="empty-table-state">
              <i className="fa-solid fa-user-plus"></i>

              <p>No students in this subject</p>

              <small>
                Click{" "}
                <strong>Add Students</strong> to start
                managing attendance
              </small>
            </div>
          ) : (
            <div className="students-table">
              {/* TABLE HEADER */}

              <div className="students-table-header">
                <span>Student</span>
                <span>Roll No.</span>
                <span>Attendance</span>
                <span>Face Status</span>
                <span></span>
              </div>

              {/* STUDENTS */}

              {students.map((student) => {
                const attendance =
                  Number(student.attendance || 0);

                const faceRegistered =
                  Boolean(
                    student.faceRegistered,
                  );

                return (
                  <div
                    key={student.id}
                    className="students-table-row"
                  >
                    {/* STUDENT */}

                    <div className="student-info">
                      <img
                        src={
                          student.avatar ||
                          `https://i.pravatar.cc/40?u=${student.id}`
                        }
                        alt={student.name}
                      />

                      <span>
                        {student.name}
                      </span>
                    </div>

                    {/* ROLL */}

                    <span>
                      {student.roll || "-"}
                    </span>

                    {/* ATTENDANCE */}

                    <span className="attendance-percent">
                      {attendance}%
                    </span>

                    {/* FACE STATUS */}

                    <span
                      className={`face-status ${
                        faceRegistered
                          ? "ok"
                          : "missing"
                      }`}
                    >
                      {faceRegistered ? (
                        <>
                          <i className="fa-solid fa-circle-check"></i>{" "}
                        </>
                      ) : (
                        <>
                          <i className="fa-solid fa-circle-xmark"></i>{" "}
                        </>
                      )}
                    </span>

                    {/* ACTIONS */}

                    <span
                      className="actions"
                      onClick={(e) =>
                        e.stopPropagation()
                      }
                    >
                      <i
                        className="fa-solid fa-ellipsis-vertical"
                        onClick={() =>
                          setOpenMenuId(
                            openMenuId ===
                              student.id
                              ? null
                              : student.id,
                          )
                        }
                      ></i>

                      {openMenuId ===
                        student.id && (
                        <div className="student-dropdown">
                          {/* DETAILS */}

                          <button
                            onClick={() => {
                              setSelectedStudent(
                                student,
                              );

                              setShowDetails(true);
                              setOpenMenuId(null);
                            }}
                          >
                            <i className="fa-solid fa-eye"></i>{" "}
                            View Details
                          </button>

                          {/* FACE */}

                          <button
                            onClick={() => {
                              setSelectedStudent(
                                student,
                              );

                              setShowFaceRegister(
                                true,
                              );

                              setOpenMenuId(null);
                            }}
                          >
                            <i className="fa-solid fa-camera"></i>{" "}
                            {faceRegistered
                              ? "Update Face"
                              : "Register Face"}
                          </button>

                          {/* DELETE */}

                          <button
                            className="danger"
                            onClick={() =>
                              handleDeleteStudent(
                                student.id,
                              )
                            }
                          >
                            <i className="fa-solid fa-trash"></i>{" "}
                            Remove
                          </button>
                        </div>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ADD STUDENT MODAL */}

      <StudentModal
        isOpen={isStudentModalOpen}
        onClose={() =>
          setIsStudentModalOpen(false)
        }
        onSubmit={handleAddStudent}
      />

      {/* DETAILS MODAL */}

      <StudentDetailsModal
        isOpen={showDetails}
        student={selectedStudent}
        onClose={() =>
          setShowDetails(false)
        }
      />

      {/* FACE REGISTRATION */}

      <FaceRegisterModal
        isOpen={showFaceRegister}
        student={selectedStudent}
        onClose={() =>
          setShowFaceRegister(false)
        }
        onSuccess={async (payload) => {
          /*
           * Backend returns:
           *
           * {
           *   message,
           *   studentId,
           *   avatar,
           *   imageUrl
           * }
           */

          if (!payload?.studentId) {
            return;
          }

          /*
           * Update immediately for responsive UI.
           */
          setStudents((prev) =>
            prev.map((student) =>
              String(student.id) ===
              String(payload.studentId)
                ? {
                    ...student,
                    faceRegistered: true,
                    avatar:
                      payload.avatar ||
                      student.avatar,
                  }
                : student,
            ),
          );

          setSelectedStudent((prev) =>
            prev &&
            String(prev.id) ===
              String(payload.studentId)
              ? {
                  ...prev,
                  faceRegistered: true,
                  avatar:
                    payload.avatar ||
                    prev.avatar,
                }
              : prev,
          );

          /*
           * Then reload from backend so the UI is guaranteed
           * to match PostgreSQL.
           */
          await fetchStudents();

          showAlert?.(
            "Success",
            "Face registered successfully!",
            "success",
          );
        }}
      />
    </div>
  );
};

export default Students;