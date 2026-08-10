import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useContext } from "react";
import BatchContext from "../../../context/batch/BatchContext";

import "./Sidebar.css";
import { PROGRAMMES } from "../../../data/programmes";

const TeacherSidebar = ({ isOpen }) => {
  const { userId, batchId } = useParams();
  const navigate = useNavigate();

  const { setActiveBatch } = useContext(BatchContext);

  // Subjects actually owned by the logged-in teacher
  const [teacherSubjects, setTeacherSubjects] = useState([]);

  const [subjectsLoading, setSubjectsLoading] = useState(true);

  // Expanding folder state
  const [expandedProgrammes, setExpandedProgrammes] = useState({
    "B.Tech": true,
    "M.Tech": false,
    MSc: false,
    MCA: false,
  });

  const [expandedSemesters, setExpandedSemesters] = useState({});

  // Currently selected subject
  const [selectedSubject, setSelectedSubject] = useState(null);

  // ---------------------------------------------------------
  // FETCH TEACHER SUBJECTS
  // ---------------------------------------------------------

  useEffect(() => {
    const fetchTeacherSubjects = async () => {
      try {
        setSubjectsLoading(true);

        const token = localStorage.getItem("token");

        if (!token) {
          setTeacherSubjects([]);
          return;
        }

        const res = await fetch(
          `${process.env.REACT_APP_BACKEND_URL}api/subject/teacher`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        const data = await res.json();

        if (!res.ok) {
          throw new Error(
            data?.error || "Failed to fetch teacher subjects",
          );
        }

        if (!Array.isArray(data)) {
          throw new Error("Invalid subjects response from server");
        }

        setTeacherSubjects(data);
      } catch (err) {
        console.error(
          "[TeacherSidebar] Failed to fetch subjects:",
          err,
        );

        setTeacherSubjects([]);
      } finally {
        setSubjectsLoading(false);
      }
    };

    fetchTeacherSubjects();
  }, []);

  // ---------------------------------------------------------
  // RESTORE SELECTED SUBJECT
  // ---------------------------------------------------------

  useEffect(() => {
    if (!batchId) {
      setSelectedSubject(null);
      return;
    }

    const subject = teacherSubjects.find(
      (item) => String(item.subject_id) === String(batchId),
    );

    if (!subject) {
      return;
    }

    // Find curriculum information for display/tree position
    let curriculumSubject = null;
    let curriculumProgramme = null;
    let curriculumSemester = null;

    for (const [programme, programmeData] of Object.entries(PROGRAMMES)) {
      for (const [semester, subjects] of Object.entries(
        programmeData.semesters,
      )) {
        const match = subjects.find(
          (item) => String(item.id) === String(subject.subject_id),
        );

        if (match) {
          curriculumSubject = match;
          curriculumProgramme = programme;
          curriculumSemester = semester;
          break;
        }
      }

      if (curriculumSubject) {
        break;
      }
    }

    setSelectedSubject({
      subjectId: subject.subject_id,
      name: subject.name,
      programme: curriculumProgramme,
      semester: curriculumSemester,
    });
  }, [batchId, teacherSubjects]);

  // ---------------------------------------------------------
  // SUBJECT CLICK
  // ---------------------------------------------------------

  const handleSubjectClick = (programme, semester, curriculumSubject) => {
    /*
     * IMPORTANT:
     *
     * curriculumSubject.id is the backend subject_id.
     *
     * Example:
     * Physics -> bt1_phy
     */

    const subjectId = curriculumSubject.id;

    if (!subjectId) {
      console.error(
        "[TeacherSidebar] Subject has no ID:",
        curriculumSubject,
      );
      return;
    }

    // Make sure this subject actually belongs to this teacher.
    const backendSubject = teacherSubjects.find(
      (subject) =>
        String(subject.subject_id) === String(subjectId),
    );

    if (!backendSubject) {
      console.error(
        "[TeacherSidebar] Subject is not owned by this teacher:",
        subjectId,
      );
      return;
    }

    const selected = {
      subjectId,
      name: backendSubject.name || curriculumSubject.name,
      programme,
      semester,
    };

    // Save selected subject for UI persistence
    localStorage.setItem(
      "selectedSubject",
      JSON.stringify(selected),
    );

    setSelectedSubject(selected);

    // Clear old subject data immediately
    setActiveBatch(null);

    /*
     * The frontend route still calls this parameter "batchId",
     * but the VALUE is now the backend subject_id.
     *
     * Example:
     * /a3c08470-e01e-454b-8021-ec48a98c756b/bt1_phy/dashboard
     */
    navigate(`/${userId}/${subjectId}/dashboard`);
  };

  // ---------------------------------------------------------
  // FILTER CURRICULUM USING BACKEND SUBJECTS
  // ---------------------------------------------------------

  const teacherSubjectIds = new Set(
    teacherSubjects.map((subject) =>
      String(subject.subject_id),
    ),
  );

  // ---------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------

  return (
    <aside className={`sidebar ${isOpen ? "open" : "closed"}`}>
      <div className="sidebar-content">
        <h6 className="fw-bold mb-1">Subjects</h6>

        <small className="text-muted">
          Select a subject to manage
        </small>

        {subjectsLoading ? (
          <div className="text-muted small mt-4 px-2">
            Loading subjects...
          </div>
        ) : teacherSubjects.length === 0 ? (
          <div className="text-muted small mt-4 px-2">
            No subjects found.
          </div>
        ) : (
          <div className="list-group list-group-flush mt-3">
            {Object.entries(PROGRAMMES).map(
              ([programme, data]) => {
                /*
                 * Only keep curriculum subjects that exist
                 * in the teacher's backend subject list.
                 */
                const programmeHasSubjects = Object.values(
                  data.semesters,
                ).some((subjects) =>
                  subjects.some((subject) =>
                    teacherSubjectIds.has(String(subject.id)),
                  ),
                );

                if (!programmeHasSubjects) {
                  return null;
                }

                return (
                  <div
                    key={programme}
                    className="tree-programme"
                  >
                    {/* PROGRAMME */}
                    <div
                      className="tree-programme-header"
                      onClick={() =>
                        setExpandedProgrammes((prev) => ({
                          ...prev,
                          [programme]:
                            !prev[programme],
                        }))
                      }
                    >
                      <span>
                        {expandedProgrammes[programme]
                          ? "▼"
                          : "▶"}
                      </span>

                      <span>{programme}</span>
                    </div>

                    {/* SEMESTERS */}
                    {expandedProgrammes[programme] && (
                      <div className="tree-semester">
                        {Object.entries(data.semesters).map(
                          ([semester, subjects]) => {
                            const availableSubjects =
                              subjects.filter((subject) =>
                                teacherSubjectIds.has(
                                  String(subject.id),
                                ),
                              );

                            if (
                              availableSubjects.length === 0
                            ) {
                              return null;
                            }

                            return (
                              <div key={semester}>
                                {/* SEMESTER */}
                                <div
                                  className="tree-semester-header"
                                  onClick={() =>
                                    setExpandedSemesters(
                                      (prev) => ({
                                        ...prev,
                                        [programme + semester]:
                                          !prev[
                                            programme +
                                              semester
                                          ],
                                      }),
                                    )
                                  }
                                >
                                  <span>
                                    {expandedSemesters[
                                      programme + semester
                                    ]
                                      ? "▼"
                                      : "▶"}
                                  </span>

                                  <span>
                                    Semester {semester}
                                  </span>
                                </div>

                                {/* SUBJECTS */}
                                {expandedSemesters[
                                  programme + semester
                                ] && (
                                  <div className="tree-subject-list">
                                    {availableSubjects.map(
                                      (subject) => {
                                        const isActive =
                                          String(
                                            selectedSubject?.subjectId,
                                          ) ===
                                            String(
                                              subject.id,
                                            ) ||
                                          String(batchId) ===
                                            String(
                                              subject.id,
                                            );

                                        return (
                                          <div
                                            key={subject.id}
                                            className={`tree-subject ${
                                              isActive
                                                ? "active"
                                                : ""
                                            }`}
                                            onClick={() =>
                                              handleSubjectClick(
                                                programme,
                                                semester,
                                                subject,
                                              )
                                            }
                                          >
                                            <span>•</span>

                                            <span>
                                              {subject.name}
                                            </span>
                                          </div>
                                        );
                                      },
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          },
                        )}
                      </div>
                    )}
                  </div>
                );
              },
            )}
          </div>
        )}
      </div>
    </aside>
  );
};

export default TeacherSidebar;