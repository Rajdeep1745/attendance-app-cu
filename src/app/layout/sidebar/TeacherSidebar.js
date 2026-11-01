import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useContext, useMemo } from "react";
import SubjectContext from "../../../context/subject/SubjectContext";
import "./Sidebar.css";

const TeacherSidebar = ({ isOpen }) => {
  const { userId, subjectId } = useParams();
  const navigate = useNavigate();
  const { setActiveSubject } = useContext(SubjectContext);

  const [teacherSubjects, setTeacherSubjects] = useState([]);
  const [subjectsLoading, setSubjectsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [expandedPrograms, setExpandedPrograms] = useState({});
  const [expandedSemesters, setExpandedSemesters] = useState({});

  useEffect(() => {
    let ignore = false;

    const loadTeacherSubjects = async () => {
      setSubjectsLoading(true);
      setLoadError("");

      try {
        const token = localStorage.getItem("token");
        if (!token) {
          throw new Error("Your session has expired. Please sign in again.");
        }

        const baseUrl = process.env.REACT_APP_BACKEND_URL;
        if (!baseUrl) {
          throw new Error("Backend URL is not configured.");
        }

        const response = await fetch(
          `${baseUrl.replace(/\/?$/, "/")}api/subject/teacher`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || "Failed to fetch assigned subjects.");
        }

        if (!Array.isArray(data)) {
          throw new Error("The server returned an invalid subjects response.");
        }

        if (!ignore) {
          setTeacherSubjects(
            data.map((subject) => ({
              ...subject,
              subject_id: String(subject.subject_id),
              name: subject.name || "Unnamed subject",
              program: subject.program || "Program not set",
              semester: subject.semester,
            })),
          );
        }
      } catch (error) {
        console.error("[TeacherSidebar] Failed to fetch subjects:", error);

        if (!ignore) {
          setTeacherSubjects([]);
          setLoadError(error.message || "Unable to load subjects.");
        }
      } finally {
        if (!ignore) setSubjectsLoading(false);
      }
    };

    loadTeacherSubjects();

    return () => {
      ignore = true;
    };
  }, []);

  const getSemesterLabel = (semester) => {
    if (
      semester === null ||
      semester === undefined ||
      String(semester).trim() === ""
    ) {
      return "Semester not set";
    }

    const value = String(semester).trim();

    return /^semester\s/i.test(value) ? value : `Semester ${value}`;
  };

  const groupedSubjects = useMemo(() => {
    const programs = new Map();

    teacherSubjects.forEach((subject) => {
      const program = String(subject.program || "Program not set").trim();

      const semesterLabel = getSemesterLabel(subject.semester);
      const semesterKey = `${program}__${semesterLabel}`;

      if (!programs.has(program)) {
        programs.set(program, {
          program,
          semesters: new Map(),
        });
      }

      const programGroup = programs.get(program);

      if (!programGroup.semesters.has(semesterKey)) {
        const semesterNumber = Number(
          String(subject.semester ?? "").replace(/[^0-9]/g, ""),
        );

        programGroup.semesters.set(semesterKey, {
          key: semesterKey,
          label: semesterLabel,
          order:
            Number.isFinite(semesterNumber) && semesterNumber > 0
              ? semesterNumber
              : 999,
          subjects: [],
        });
      }

      programGroup.semesters.get(semesterKey).subjects.push(subject);
    });

    return Array.from(programs.values())
      .sort((a, b) => a.program.localeCompare(b.program))
      .map((programGroup) => ({
        ...programGroup,
        semesters: Array.from(programGroup.semesters.values())
          .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label))
          .map((semesterGroup) => ({
            ...semesterGroup,
            subjects: semesterGroup.subjects.sort((a, b) =>
              a.name.localeCompare(b.name),
            ),
          })),
      }));
  }, [teacherSubjects]);

  useEffect(() => {
    if (!subjectId) return;

    const activeSubject = teacherSubjects.find(
      (subject) => String(subject.subject_id) === String(subjectId),
    );

    if (!activeSubject) return;

    const program = String(activeSubject.program || "Program not set").trim();

    const semesterLabel = getSemesterLabel(activeSubject.semester);
    const semesterKey = `${program}__${semesterLabel}`;

    setExpandedPrograms((previous) => ({
      ...previous,
      [program]: true,
    }));

    setExpandedSemesters((previous) => ({
      ...previous,
      [semesterKey]: true,
    }));
  }, [subjectId, teacherSubjects]);

  const handleSubjectClick = (subject) => {
    localStorage.setItem(
      "selectedSubject",
      JSON.stringify({
        subjectId: subject.subject_id,
        name: subject.name,
        program: subject.program,
        semester: subject.semester,
      }),
    );

    setActiveSubject(null);
    navigate(`/${userId}/${subject.subject_id}/dashboard`);
  };

  return (
    <aside className={`sidebar teacher-sidebar ${isOpen ? "open" : "closed"}`}>
      <div className="sidebar-content">
        <h6 className="fw-bold mb-1">Subjects</h6>
        <small className="text-muted">Organized by program and semester</small>

        {subjectsLoading ? (
          <div className="text-muted small mt-4 px-2">Loading subjects...</div>
        ) : loadError ? (
          <div className="sidebar-empty-state mt-3" role="alert">
            <strong>Could not load subjects</strong>
            <small>{loadError}</small>
          </div>
        ) : teacherSubjects.length === 0 ? (
          <div className="sidebar-empty-state mt-4">
            <strong>No subjects assigned</strong>
            <small>
              Contact the administrator if you should have subjects assigned.
            </small>
          </div>
        ) : (
          <div className="list-group list-group-flush teacher-subject-tree mt-3">
            {groupedSubjects.map((programGroup) => {
              const programExpanded = Boolean(
                expandedPrograms[programGroup.program],
              );

              return (
                <section className="tree-programme" key={programGroup.program}>
                  <button
                    type="button"
                    className="tree-programme-header w-100 text-start"
                    onClick={() =>
                      setExpandedPrograms((previous) => ({
                        ...previous,
                        [programGroup.program]: !previous[programGroup.program],
                      }))
                    }
                    aria-expanded={programExpanded}
                  >
                    <span aria-hidden="true">
                      {programExpanded ? "▾" : "▸"}
                    </span>
                    <span>{programGroup.program}</span>
                    <span className="ms-auto teacher-tree-count">
                      {programGroup.semesters.reduce(
                        (total, semester) => total + semester.subjects.length,
                        0,
                      )}
                    </span>
                  </button>

                  {programExpanded &&
                    programGroup.semesters.map((semesterGroup) => {
                      const semesterExpanded = Boolean(
                        expandedSemesters[semesterGroup.key],
                      );

                      return (
                        <div className="tree-semester" key={semesterGroup.key}>
                          <button
                            type="button"
                            className="tree-semester-header w-100 text-start"
                            onClick={() =>
                              setExpandedSemesters((previous) => ({
                                ...previous,
                                [semesterGroup.key]:
                                  !previous[semesterGroup.key],
                              }))
                            }
                            aria-expanded={semesterExpanded}
                          >
                            <span aria-hidden="true">
                              {semesterExpanded ? "▾" : "▸"}
                            </span>
                            <span>{semesterGroup.label}</span>
                            <span className="ms-auto teacher-tree-count">
                              {semesterGroup.subjects.length}
                            </span>
                          </button>

                          {semesterExpanded && (
                            <div className="tree-subject-list">
                              {semesterGroup.subjects.map((subject) => {
                                const active =
                                  String(subjectId) === subject.subject_id;

                                return (
                                  <button
                                    type="button"
                                    key={subject.subject_id}
                                    className={`tree-subject ${
                                      active ? "active" : ""
                                    }`}
                                    onClick={() => handleSubjectClick(subject)}
                                    aria-current={active ? "page" : undefined}
                                    title={`${subject.name} — ${programGroup.program}, ${semesterGroup.label}`}
                                  >
                                    <span aria-hidden="true">•</span>
                                    <span className="tree-subject-name">
                                      {subject.name}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </section>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
};

export default TeacherSidebar;
