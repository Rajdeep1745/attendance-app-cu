import { useEffect, useMemo, useState } from "react";

import "./Admin.css";

const AdminSubjects = () => {
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [programFilter, setProgramFilter] = useState("");
  const [semesterFilter, setSemesterFilter] = useState("");

  const [teacherModal, setTeacherModal] = useState(null);

  const [studentsModal, setStudentsModal] = useState(null);

  const [selectedTeacher, setSelectedTeacher] = useState("");

  const [savingTeacher, setSavingTeacher] = useState(false);

  const adminToken = localStorage.getItem("adminToken");

  // =======================================================
  // LOAD SUBJECTS + TEACHERS
  // =======================================================

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const headers = {
        Authorization: `Bearer ${adminToken}`,
      };

      const [subjectsRes, teachersRes] = await Promise.all([
        fetch(`${process.env.REACT_APP_BACKEND_URL}api/admin/subjects`, {
          headers,
        }),

        fetch(`${process.env.REACT_APP_BACKEND_URL}api/admin/teachers`, {
          headers,
        }),
      ]);

      const subjectsData = await subjectsRes.json();

      const teachersData = await teachersRes.json();

      if (!subjectsRes.ok) {
        throw new Error(subjectsData.error || "Failed to load subjects");
      }

      if (!teachersRes.ok) {
        throw new Error(teachersData.error || "Failed to load teachers");
      }

      setSubjects(subjectsData.subjects || []);

      setTeachers(teachersData.teachers || []);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // =======================================================
  // FILTER OPTIONS
  // =======================================================

  const programs = useMemo(() => {
    return [
      ...new Set(subjects.map((subject) => subject.program).filter(Boolean)),
    ];
  }, [subjects]);

  const semesters = useMemo(() => {
    return [
      ...new Set(subjects.map((subject) => subject.semester).filter(Boolean)),
    ].sort((a, b) => a - b);
  }, [subjects]);

  // =======================================================
  // FILTERED SUBJECTS
  // =======================================================

  const filteredSubjects = useMemo(() => {
    const query = search.trim().toLowerCase();

    return subjects.filter((subject) => {
      const matchesSearch =
        !query ||
        subject.name?.toLowerCase().includes(query) ||
        subject.subject_id?.toLowerCase().includes(query) ||
        subject.teacher_name?.toLowerCase().includes(query);

      const matchesProgram =
        !programFilter || subject.program === programFilter;

      const matchesSemester =
        !semesterFilter || String(subject.semester) === String(semesterFilter);

      return matchesSearch && matchesProgram && matchesSemester;
    });
  }, [subjects, search, programFilter, semesterFilter]);

  // =======================================================
  // TEACHER MODAL
  // =======================================================

  const openTeacherModal = (subject) => {
    setTeacherModal(subject);

    setSelectedTeacher(subject.teacher_id || "");
  };

  const closeTeacherModal = () => {
    if (savingTeacher) {
      return;
    }

    setTeacherModal(null);
    setSelectedTeacher("");
  };

  // =======================================================
  // ASSIGN TEACHER
  // =======================================================

  const saveTeacher = async () => {
    if (!teacherModal || !selectedTeacher) {
      return;
    }

    setSavingTeacher(true);

    try {
      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}api/admin/subjects/${teacherModal.subject_id}/teacher`,
        {
          method: "PATCH",

          headers: {
            "Content-Type": "application/json",

            Authorization: `Bearer ${adminToken}`,
          },

          body: JSON.stringify({
            teacherId: selectedTeacher,
          }),
        },
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to assign teacher");
      }

      setSubjects((previous) =>
        previous.map((subject) =>
          subject.subject_id === teacherModal.subject_id
            ? {
                ...subject,

                teacher_id: data.subject.teacher_id,

                teacher_name: data.subject.teacher_name,

                teacher_email: data.subject.teacher_email,
              }
            : subject,
        ),
      );

      closeTeacherModal();
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingTeacher(false);
    }
  };

  // =======================================================
  // REMOVE TEACHER
  // =======================================================

  const removeTeacher = async () => {
    if (!teacherModal) {
      return;
    }

    setSavingTeacher(true);

    try {
      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}api/admin/subjects/${teacherModal.subject_id}/teacher`,
        {
          method: "DELETE",

          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        },
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to remove teacher");
      }

      setSubjects((previous) =>
        previous.map((subject) =>
          subject.subject_id === teacherModal.subject_id
            ? {
                ...subject,

                teacher_id: null,
                teacher_name: null,
                teacher_email: null,
              }
            : subject,
        ),
      );

      closeTeacherModal();
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingTeacher(false);
    }
  };

  // =======================================================
  // CLEAR FILTERS
  // =======================================================

  const clearFilters = () => {
    setSearch("");
    setProgramFilter("");
    setSemesterFilter("");
  };

  // =======================================================
  // RENDER
  // =======================================================

  return (
    <div className="admin-subjects-page">
      <div className="admin-page-heading">
        <div>
          <h1>Subjects</h1>

          <p>Manage teachers and student enrollment</p>
        </div>

        <div className="admin-page-count">
          {filteredSubjects.length} subjects
        </div>
      </div>

      {/* =================================================
          FILTERS
      ================================================= */}

      <div className="admin-filter-card">
        <div className="admin-search-wrapper">
          <span className="admin-search-icon">⌕</span>

          <input
            type="text"
            placeholder="Search subject or teacher"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          value={programFilter}
          onChange={(e) => setProgramFilter(e.target.value)}
        >
          <option value="">All Programs</option>

          {programs.map((program) => (
            <option key={program} value={program}>
              {program}
            </option>
          ))}
        </select>

        <select
          value={semesterFilter}
          onChange={(e) => setSemesterFilter(e.target.value)}
        >
          <option value="">All Semesters</option>

          {semesters.map((semester) => (
            <option key={semester} value={semester}>
              Semester {semester}
            </option>
          ))}
        </select>

        {(search || programFilter || semesterFilter) && (
          <button className="admin-clear-button" onClick={clearFilters}>
            Clear
          </button>
        )}
      </div>

      {/* =================================================
          ERROR
      ================================================= */}

      {error && <div className="admin-error">{error}</div>}

      {/* =================================================
          SUBJECT LIST
      ================================================= */}

      {loading ? (
        <div className="admin-table-card">
          <div className="admin-table-state">Loading subjects...</div>
        </div>
      ) : filteredSubjects.length === 0 ? (
        <div className="admin-table-card">
          <div className="admin-table-state">
            <div className="admin-empty-icon">◈</div>

            <strong>No subjects found</strong>

            <span>Try changing your filters</span>
          </div>
        </div>
      ) : (
        <div className="admin-subject-list">
          {filteredSubjects.map((subject) => (
            <div key={subject.subject_id} className="admin-subject-card">
              {/* -----------------------------------------
                    SUBJECT INFORMATION
                ----------------------------------------- */}

              <div className="admin-subject-main">
                <div className="admin-subject-icon">◈</div>

                <div className="admin-subject-info">
                  <div className="admin-subject-title-row">
                    <h3>{subject.name}</h3>

                    <span className="admin-subject-id">
                      {subject.subject_id}
                    </span>
                  </div>

                  <div className="admin-subject-meta">
                    <span>{subject.program}</span>

                    <span className="admin-meta-dot">•</span>

                    <span>Semester {subject.semester}</span>
                  </div>
                </div>
              </div>

              {/* -----------------------------------------
                    TEACHER
                ----------------------------------------- */}

              <div className="admin-subject-teacher">
                <div className="admin-subject-section-label">Teacher</div>

                {subject.teacher_id ? (
                  <div className="admin-teacher-info">
                    <div className="admin-teacher-avatar">
                      {subject.teacher_name?.charAt(0)?.toUpperCase()}
                    </div>

                    <div>
                      <strong>{subject.teacher_name}</strong>

                      <span>{subject.teacher_email}</span>
                    </div>
                  </div>
                ) : (
                  <div className="admin-unassigned">
                    <span>Unassigned</span>
                  </div>
                )}
              </div>

              {/* -----------------------------------------
                    STUDENTS
                ----------------------------------------- */}

              <div className="admin-subject-students">
                <div className="admin-subject-section-label">Students</div>

                <div className="admin-student-count">
                  <strong>{subject.total_students}</strong>

                  <span>enrolled</span>
                </div>
              </div>

              {/* -----------------------------------------
                    ACTIONS
                ----------------------------------------- */}

              <div className="admin-subject-actions">
                <button
                  className="admin-secondary-button"
                  onClick={() => openTeacherModal(subject)}
                >
                  {subject.teacher_id ? "Change Teacher" : "Assign Teacher"}
                </button>

                <button
                  className="admin-primary-button"
                  onClick={() => setStudentsModal(subject)}
                >
                  Manage Students
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* =================================================
          TEACHER MODAL
      ================================================= */}

      {teacherModal && (
        <div className="admin-modal-backdrop" onMouseDown={closeTeacherModal}>
          <div className="admin-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <div>
                <h2>Assign Teacher</h2>

                <p>{teacherModal.name}</p>
              </div>

              <button className="admin-modal-close" onClick={closeTeacherModal}>
                ×
              </button>
            </div>

            <div className="admin-teacher-selector">
              <label>Teacher</label>

              <select
                value={selectedTeacher}
                onChange={(e) => setSelectedTeacher(e.target.value)}
              >
                <option value="">Select a teacher</option>

                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name}
                    {" — "}
                    {teacher.email}
                  </option>
                ))}
              </select>
            </div>

            <div className="admin-modal-footer">
              {teacherModal.teacher_id && (
                <button
                  className="admin-danger-button"
                  onClick={removeTeacher}
                  disabled={savingTeacher}
                >
                  Remove Teacher
                </button>
              )}

              <div className="admin-modal-footer-right">
                <button
                  className="admin-secondary-button"
                  onClick={closeTeacherModal}
                  disabled={savingTeacher}
                >
                  Cancel
                </button>

                <button
                  className="admin-primary-button"
                  onClick={saveTeacher}
                  disabled={savingTeacher || !selectedTeacher}
                >
                  {savingTeacher ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================================================
          STUDENTS MODAL
      ================================================= */}

      {studentsModal && (
        <AdminSubjectStudentsModal
          subject={studentsModal}
          adminToken={adminToken}
          onClose={() => setStudentsModal(null)}
          onCountChange={(subjectId, count) => {
            setSubjects((previous) =>
              previous.map((subject) =>
                subject.subject_id === subjectId
                  ? {
                      ...subject,
                      total_students: count,
                    }
                  : subject,
              ),
            );
          }}
        />
      )}
    </div>
  );
};

// =========================================================
// SUBJECT STUDENTS MODAL
// =========================================================

const AdminSubjectStudentsModal = ({
  subject,
  adminToken,
  onClose,
  onCountChange,
}) => {
  const [students, setStudents] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [savingStudent, setSavingStudent] = useState(null);

  const loadStudents = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}api/admin/subjects/${subject.subject_id}/students`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        },
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load students");
      }

      setStudents(data.students || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, [subject.subject_id]);

  // =======================================================
  // TOGGLE ENROLLMENT
  // =======================================================

  const toggleEnrollment = async (student) => {
    setSavingStudent(student.id);

    try {
      const url = student.enrolled
        ? `${process.env.REACT_APP_BACKEND_URL}api/admin/subjects/${subject.subject_id}/students/${student.id}`
        : `${process.env.REACT_APP_BACKEND_URL}api/admin/subjects/${subject.subject_id}/students`;

      const res = await fetch(url, {
        method: student.enrolled ? "DELETE" : "POST",

        headers: {
          "Content-Type": "application/json",

          Authorization: `Bearer ${adminToken}`,
        },

        ...(student.enrolled
          ? {}
          : {
              body: JSON.stringify({
                studentId: student.id,
              }),
            }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update enrollment");
      }

      setStudents((previous) =>
        previous.map((item) =>
          item.id === student.id
            ? {
                ...item,

                enrolled: !student.enrolled,
              }
            : item,
        ),
      );

      const newCount =
        students.filter((item) => item.enrolled).length +
        (student.enrolled ? -1 : 1);

      onCountChange(subject.subject_id, newCount);
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingStudent(null);
    }
  };

  return (
    <div className="admin-modal-backdrop" onMouseDown={onClose}>
      <div
        className="admin-modal admin-students-modal"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="admin-modal-header">
          <div>
            <h2>Manage Students</h2>

            <p>
              {subject.name}
              {" · "}
              {subject.program}
              {" · Semester "}
              {subject.semester}
            </p>
          </div>

          <button className="admin-modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="admin-student-modal-info">
          <span>Eligible students</span>

          <strong>{students.length}</strong>
        </div>

        {error && <div className="admin-error">{error}</div>}

        {loading ? (
          <div className="admin-table-state">Loading students...</div>
        ) : students.length === 0 ? (
          <div className="admin-table-state">
            <strong>No students available</strong>

            <span>There are no students in this program and semester.</span>
          </div>
        ) : (
          <div className="admin-enrollment-list">
            {students.map((student) => (
              <div
                key={student.id}
                className={`admin-enrollment-row ${
                  student.enrolled ? "admin-enrollment-active" : ""
                }`}
              >
                <div className="admin-student-cell">
                  <div className="admin-student-avatar">
                    {student.name?.charAt(0)?.toUpperCase()}
                  </div>

                  <div className="admin-student-details">
                    <strong>{student.name}</strong>

                    <span>Roll {student.roll_no || "—"}</span>
                  </div>
                </div>

                <button
                  className={
                    student.enrolled
                      ? "admin-enrolled-button"
                      : "admin-enroll-button"
                  }
                  onClick={() => toggleEnrollment(student)}
                  disabled={savingStudent === student.id}
                >
                  {savingStudent === student.id
                    ? "..."
                    : student.enrolled
                      ? "Enrolled"
                      : "Enroll"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSubjects;
