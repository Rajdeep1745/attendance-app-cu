import { useContext, useState, useMemo, useEffect } from "react";
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

  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(true);

  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);

  const [showDetails, setShowDetails] = useState(false);
  const [showFaceRegister, setShowFaceRegister] = useState(false);

  const handleAddStudent = async (student) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}api/students`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...student,
            batchId: batchId,
          }),
        },
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to add student");
      }

      setStudents((prev) => [...prev, data]);
      await fetchBatchById(batchId);

      showAlert("Added", "New student was added", "success");
    } catch (err) {
      console.error(err);
      showAlert("Error", err.message, "danger");
    }
  };

  const handleDeleteStudent = async (id) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}api/students/${id}/${batchId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!res.ok) {
        throw new Error("Failed to delete student");
      }

      setStudents((prev) => prev.filter((s) => s.id !== id));
      setOpenMenuId(null);
      await fetchBatchById(batchId);

      showAlert("Deleted", "Student was deleted", "danger");
    } catch (err) {
      console.error(err);
      showAlert("Error", err.message, "danger");
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

      if (!res.ok) throw new Error(data?.error || "Failed to fetch students");

      setStudents(data);
    } catch (err) {
      console.error(err);
      showAlert("Error", "Failed to load students", "danger");
    } finally {
      setStudentsLoading(false);
    }
  };

  const batchMatchesRoute =
    String(activeBatch?.id || "") === String(batchId || "");

  useEffect(() => {
    if (!batchMatchesRoute) return;

    fetchStudents();
    //eslint-disable-next-line
  }, [batchMatchesRoute, batchId]);

  const handleRefresh = () => {
    fetchStudents();
    showAlert("Refreshed", "Student data refreshed", "primary");
  };

  const isEmpty = students.length === 0;

  useEffect(() => {
    const handleClickOutside = (e) => {
      // If click is NOT inside any student actions menu
      if (!e.target.closest(".actions")) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // useMemo ALWAYS runs (safe)
  const stats = useMemo(() => {
    const total = students.length;
    const registered = students.filter((s) => s.faceRegistered).length;
    const completion = total === 0 ? 0 : Math.round((registered / total) * 100);

    return { total, registered, completion };
  }, [students]);

  // conditional return AFTER hooks
  const showPageSkeleton = useDelayedLoading(
    !batchMatchesRoute || studentsLoading,
  );

  if (showPageSkeleton || !batchMatchesRoute)
    return <TeacherStudentsSkeleton />;

  return (
    <div className="container-fluid students-page page-enter">
      {/* PAGE HEADER */}
      <div className="students-hero">
        <div>
          <h1>Students</h1>

          <p>Manage roster, attendance health and face registration.</p>
        </div>
      </div>

      {/* FACE REGISTRATION STATUS CARD */}
      <div className="card students-card mb-4">
        <div className="card-body">
          <h5 className="card-title">Face Registration Status</h5>

          {isEmpty ? (
            <div className="empty-card-state">
              <i className="fa-solid fa-users"></i>
              <p>No students added yet</p>
              <small>Add students to enable face registration</small>
            </div>
          ) : (
            <>
              <p className="text-muted mb-4">
                An overview of face registration completion for this batch.
              </p>

              <div className="row text-center">
                <div className="col">
                  <h3>{stats.total}</h3>
                  <p className="text-muted">Total Students</p>
                </div>

                <div className="col">
                  <h3>{stats.registered}</h3>
                  <p className="text-muted">Faces Registered</p>
                </div>

                <div className="col">
                  <h3>{stats.completion}%</h3>
                  <p className="text-muted">Completion</p>
                </div>
              </div>

              <button
                className="btn btn-outline-secondary mt-3"
                onClick={handleRefresh}
              >
                <i className="fa-solid fa-rotate"></i> Refresh
              </button>
            </>
          )}
        </div>
      </div>

      {/* STUDENT ROSTER CARD */}
      <div className="card students-card">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h5 className="card-title mb-1">
                Student Roster for {activeBatch.name}
              </h5>
              <p className="students-subtitle mb-0">
                Manage your class roster. Add, edit, or view student details.
              </p>
            </div>

            <button
              className="btn btn-primary"
              onClick={() => setIsStudentModalOpen(true)}
            >
              <i className="fa-solid fa-user-plus"></i> Add Students
            </button>
          </div>

          {isEmpty ? (
            <div className="empty-table-state">
              <i className="fa-solid fa-user-plus"></i>
              <p>No students in this batch</p>
              <small>
                Click <strong>Add Students</strong> to start managing attendance
              </small>
            </div>
          ) : (
            <div className="students-table">
              <div className="students-table-header">
                <span>Student</span>
                <span>Roll No.</span>
                <span>Attendance</span>
                <span>Face Status</span>
                <span></span>
              </div>

              {students.map((s) => (
                <div key={s.id} className="students-table-row">
                  <div className="student-info">
                    <img
                      src={s.avatar || "https://i.pravatar.cc/40?u=" + s.id}
                      alt={s.name}
                    />
                    <span>{s.name}</span>
                  </div>

                  <span>{s.roll}</span>

                  <span className="attendance-percent">{s.attendance}%</span>

                  <span
                    className={`face-status ${
                      s.faceRegistered ? "ok" : "missing"
                    }`}
                  >
                    {s.faceRegistered ? (
                      <i className="fa-solid fa-circle-check"></i>
                    ) : (
                      <i className="fa-solid fa-circle-xmark"></i>
                    )}
                  </span>

                  <span
                    className="actions"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <i
                      className="fa-solid fa-ellipsis-vertical"
                      onClick={() =>
                        setOpenMenuId(openMenuId === s.id ? null : s.id)
                      }
                    ></i>

                    {openMenuId === s.id && (
                      <div className="student-dropdown">
                        <button
                          onClick={() => {
                            setSelectedStudent(s);
                            setShowDetails(true);
                            setOpenMenuId(null);
                          }}
                        >
                          <i className="fa-solid fa-eye"></i> View Details
                        </button>

                        <button
                          onClick={() => {
                            setSelectedStudent(s);
                            setShowFaceRegister(true);
                            setOpenMenuId(null);
                          }}
                        >
                          <i className="fa-solid fa-camera"></i> Register Face
                        </button>

                        <button
                          className="danger"
                          onClick={() => handleDeleteStudent(s.id)}
                        >
                          <i className="fa-solid fa-trash"></i> Delete
                        </button>
                      </div>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <StudentModal
        isOpen={isStudentModalOpen}
        onClose={() => setIsStudentModalOpen(false)}
        onSubmit={handleAddStudent}
      />
      <StudentDetailsModal
        isOpen={showDetails}
        student={selectedStudent}
        onClose={() => setShowDetails(false)}
      />

      <FaceRegisterModal
        isOpen={showFaceRegister}
        student={selectedStudent}
        onClose={() => setShowFaceRegister(false)}
        onSuccess={(payload) => {
          setStudents((prev) =>
            prev.map((s) =>
              s.id === payload.studentId
                ? { ...s, faceRegistered: true, avatar: payload.avatar }
                : s,
            ),
          );
          setSelectedStudent((prev) =>
            prev && prev.id === payload.studentId
              ? { ...prev, faceRegistered: true, avatar: payload.avatar }
              : prev,
          );
          showAlert(true, "Face registered successfully!", "success");
        }}
      />
    </div>
  );
};

export default Students;
