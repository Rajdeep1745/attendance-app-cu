import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import "./Sidebar.css";

const API_BASE = process.env.REACT_APP_BACKEND_URL;

const getSubjectName = (subjectId) => {
  if (!subjectId) return "Subject";

  try {
    // eslint-disable-next-line global-require
    const { PROGRAMMES } = require("../../../data/programmes");

    for (const programmeData of Object.values(PROGRAMMES)) {
      for (const subjects of Object.values(programmeData.semesters || {})) {
        const subject = subjects.find(
          (item) => String(item.id) === String(subjectId),
        );

        if (subject) {
          return subject.name;
        }
      }
    }
  } catch (error) {
    console.error("Failed to load programme subject name:", error);
  }

  return subjectId;
};

const studentRequest = async (path, options = {}) => {
  const token = localStorage.getItem("token");

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error || "Request failed");
  }

  return data;
};

const StudentSidebar = ({ isOpen }) => {
  const { userId, subjectId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  /*
   * Current page:
   *
   * /user/subject/dashboard   -> dashboard
   * /user/subject/attendance  -> attendance
   * /user/subject/students    -> students
   * /user/subject/reports     -> reports
   */
  const currentPage = location.pathname.split("/")[3] || "dashboard";

  /*
   * -------------------------------------------------------
   * LOAD STUDENT'S ENROLLED SUBJECTS
   * -------------------------------------------------------
   *
   * The backend determines membership from:
   *
   * enrollments.student_id = logged-in user
   *
   * No batch code is involved.
   */
  useEffect(() => {
    let ignore = false;

    const loadSubjects = async () => {
      setLoading(true);

      try {
        const data = await studentRequest("api/subject/student");

        if (ignore) return;

        const normalizedSubjects = Array.isArray(data)
          ? data.map((subject) => ({
              ...subject,
              subjectId: String(subject.subjectId),
              name: getSubjectName(subject.subjectId),
            }))
          : [];

        setSubjects(normalizedSubjects);
      } catch (error) {
        console.error(
          "Failed to load enrolled subjects:",
          error,
        );

        if (!ignore) {
          setSubjects([]);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    loadSubjects();

    return () => {
      ignore = true;
    };
  }, []);

  /*
   * -------------------------------------------------------
   * AUTOMATIC SUBJECT SELECTION
   * -------------------------------------------------------
   *
   * If the student visits /:userId without a subject,
   * automatically open the first enrolled subject.
   *
   * If a stored subject exists and is still enrolled,
   * restore it.
   */
  useEffect(() => {
    if (loading || !userId) return;

    if (subjects.length === 0) {
      if (subjectId) {
        navigate(`/${userId}`, { replace: true });
      }

      return;
    }

    const isCurrentSubjectValid = subjects.some(
      (subject) => subject.subjectId === String(subjectId),
    );

    if (!subjectId || !isCurrentSubjectValid) {
      const storedSubjectId = localStorage.getItem(
        "lastActiveSubjectId",
      );

      const preferredSubject =
        subjects.find(
          (subject) =>
            subject.subjectId === String(storedSubjectId),
        ) || subjects[0];

      localStorage.setItem(
        "lastActiveSubjectId",
        preferredSubject.subjectId,
      );

      navigate(
        `/${userId}/${preferredSubject.subjectId}/${currentPage}`,
        { replace: true },
      );
    }
  }, [
    loading,
    subjects,
    subjectId,
    userId,
    currentPage,
    navigate,
  ]);

  /*
   * -------------------------------------------------------
   * HANDLE SUBJECT SELECTION
   * -------------------------------------------------------
   */
  const handleSubjectSelect = (selectedSubjectId) => {
    localStorage.setItem(
      "lastActiveSubjectId",
      selectedSubjectId,
    );

    navigate(
      `/${userId}/${selectedSubjectId}/${currentPage}`,
    );
  };

  return (
    <aside
      className={`sidebar student-sidebar ${
        isOpen ? "open" : "closed"
      }`}
    >
      <div className="sidebar-content">
        <h6 className="fw-bold mb-1">
          My Subjects
        </h6>

        <p className="sidebar-subtitle mb-0">
          Select a subject to continue
        </p>

        <div className="list-group list-group-flush mt-3">
          {loading ? (
            <div className="sidebar-empty-state text-muted">
              <span className="spinner-border spinner-border-sm me-2"></span>
              Loading your subjects...
            </div>
          ) : subjects.length === 0 ? (
            <div className="sidebar-empty-state">
              <strong>No enrolled subjects</strong>

              <small>
                You are not currently enrolled in any subjects.
              </small>
            </div>
          ) : (
            subjects.map((subject) => {
              const isActive =
                String(subject.subjectId) ===
                String(subjectId);

              return (
                <div
                  key={subject.subjectId}
                  className={`list-group-item batch-item batch-card text-start ${
                    isActive ? "active" : ""
                  }`}
                  onClick={() =>
                    handleSubjectSelect(
                      subject.subjectId,
                    )
                  }
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter" ||
                      event.key === " "
                    ) {
                      handleSubjectSelect(
                        subject.subjectId,
                      );
                    }
                  }}
                >
                  <div className="batch-card-main">
                    <div className="batch-name">
                      {subject.name}
                    </div>

                    <small className="text-muted d-block mt-1">
                      {subject.teacher
                        ? `Teacher: ${subject.teacher}`
                        : `Subject ID: ${subject.subjectId}`}
                    </small>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </aside>
  );
};

export default StudentSidebar;