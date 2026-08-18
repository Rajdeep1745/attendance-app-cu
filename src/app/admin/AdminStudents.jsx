import { useEffect, useMemo, useState } from "react";

import { PROGRAMMES } from "../../data/programmes";

import "./Admin.css";

const AdminStudents = () => {
  const [students, setStudents] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  const [programFilter, setProgramFilter] = useState("");

  const [semesterFilter, setSemesterFilter] = useState("");

  const [editingStudent, setEditingStudent] = useState(null);

  const [saving, setSaving] = useState(false);

  const adminToken = localStorage.getItem("adminToken");

  // =======================================================
  // LOAD STUDENTS
  // =======================================================

  const loadStudents = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}api/admin/students`,
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
      console.error(err);

      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, []);

  // =======================================================
  // FILTER OPTIONS
  // =======================================================

  const programs = useMemo(() => Object.keys(PROGRAMMES), []);

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();

    return students.filter((student) => {
      const matchesSearch =
        !query ||
        student.name?.toLowerCase().includes(query) ||
        student.email?.toLowerCase().includes(query) ||
        student.roll_no?.toLowerCase().includes(query);

      const matchesProgram =
        !programFilter || student.program === programFilter;

      const matchesSemester =
        !semesterFilter || String(student.semester) === String(semesterFilter);

      return matchesSearch && matchesProgram && matchesSemester;
    });
  }, [students, search, programFilter, semesterFilter]);

  // =======================================================
  // OPEN EDIT
  // =======================================================

  const openEdit = (student) => {
    setEditingStudent({
      studentId: student.id,

      name: student.name,

      email: student.email,

      roll_no: student.roll_no || "",

      program: student.program,

      semester: String(student.semester),
    });
  };

  // =======================================================
  // EDIT CHANGE
  // =======================================================

  const handleEditChange = (e) => {
    const { name, value } = e.target;

    setEditingStudent((previous) => ({
      ...previous,
      [name]: value,

      // Reset semester whenever
      // program changes.
      ...(name === "program"
        ? {
            semester: "",
          }
        : {}),
    }));
  };

  // =======================================================
  // SAVE
  // =======================================================

  const handleSave = async () => {
    if (!editingStudent) {
      return;
    }

    setSaving(true);

    try {
      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}api/admin/students/${editingStudent.studentId}`,
        {
          method: "PATCH",

          headers: {
            "Content-Type": "application/json",

            Authorization: `Bearer ${adminToken}`,
          },

          body: JSON.stringify({
            roll_no: editingStudent.roll_no,

            program: editingStudent.program,

            semester: Number(editingStudent.semester),
          }),
        },
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update student");
      }

      setStudents((previous) =>
        previous.map((student) =>
          student.id === editingStudent.studentId
            ? {
                ...student,

                roll_no: data.student.roll_no,

                program: data.student.program,

                semester: data.student.semester,
              }
            : student,
        ),
      );

      setEditingStudent(null);
    } catch (err) {
      console.error(err);

      alert(err.message);
    } finally {
      setSaving(false);
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
    <div className="admin-students-page">
      {/* =================================================
          HEADER
      ================================================= */}

      <div className="admin-page-heading">
        <div>
          <h1>Students</h1>

          <p>Manage student academic information</p>
        </div>

        <div className="admin-page-count">
          {filteredStudents.length} students
        </div>
      </div>

      {/* =================================================
          FILTER BAR
      ================================================= */}

      <div className="admin-filter-card">
        <div className="admin-search-wrapper">
          <span className="admin-search-icon">⌕</span>

          <input
            type="text"
            placeholder="Search by name, email or roll number"
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

          {Array.from({ length: 8 }, (_, index) => index + 1).map(
            (semester) => (
              <option key={semester} value={semester}>
                Semester {semester}
              </option>
            ),
          )}
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
          TABLE
      ================================================= */}

      <div className="admin-table-card">
        {loading ? (
          <div className="admin-table-state">Loading students...</div>
        ) : filteredStudents.length === 0 ? (
          <div className="admin-table-state">
            <div className="admin-empty-icon">◉</div>

            <strong>No students found</strong>

            <span>Try changing your filters</span>
          </div>
        ) : (
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Student</th>

                  <th>Roll Number</th>

                  <th>Program</th>

                  <th>Semester</th>

                  <th>Face</th>

                  <th>Attendance</th>

                  <th>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredStudents.map((student) => (
                  <tr key={student.id}>
                    <td>
                      <div className="admin-student-cell">
                        <div className="admin-student-avatar">
                          {student.avatar ? (
                            <img src={student.avatar} alt="" />
                          ) : (
                            student.name?.charAt(0)?.toUpperCase()
                          )}
                        </div>

                        <div className="admin-student-details">
                          <strong>{student.name}</strong>

                          <span>{student.email}</span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className="admin-roll">
                        {student.roll_no || "—"}
                      </span>
                    </td>

                    <td>
                      <span className="admin-program-badge">
                        {student.program}
                      </span>
                    </td>

                    <td>
                      <span className="admin-semester-badge">
                        Sem {student.semester}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`admin-status ${
                          student.face_registered
                            ? "admin-status-success"
                            : "admin-status-muted"
                        }`}
                      >
                        {student.face_registered
                          ? "Registered"
                          : "Not registered"}
                      </span>
                    </td>

                    <td>
                      <span className="admin-attendance-value">
                        {Number(student.attendance_percentage || 0).toFixed(1)}%
                      </span>
                    </td>

                    <td>
                      <button
                        className="admin-edit-button"
                        onClick={() => openEdit(student)}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* =================================================
          EDIT MODAL
      ================================================= */}

      {editingStudent && (
        <div
          className="admin-modal-backdrop"
          onMouseDown={() => setEditingStudent(null)}
        >
          <div className="admin-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <div>
                <h2>Edit Student</h2>

                <p>Update academic information</p>
              </div>

              <button
                className="admin-modal-close"
                onClick={() => setEditingStudent(null)}
              >
                ×
              </button>
            </div>

            <div className="admin-modal-student">
              <div className="admin-student-avatar admin-student-avatar-large">
                {editingStudent.name?.charAt(0)?.toUpperCase()}
              </div>

              <div>
                <strong>{editingStudent.name}</strong>

                <span>{editingStudent.email}</span>
              </div>
            </div>

            <div className="admin-form-grid">
              <div className="admin-form-field">
                <label>Roll Number</label>

                <input
                  type="text"
                  name="roll_no"
                  value={editingStudent.roll_no}
                  onChange={handleEditChange}
                />
              </div>

              <div className="admin-form-field">
                <label>Program</label>

                <select
                  name="program"
                  value={editingStudent.program}
                  onChange={handleEditChange}
                >
                  {programs.map((program) => (
                    <option key={program} value={program}>
                      {program}
                    </option>
                  ))}
                </select>
              </div>

              <div className="admin-form-field">
                <label>Semester</label>

                <select
                  name="semester"
                  value={editingStudent.semester}
                  onChange={handleEditChange}
                  disabled={!editingStudent.program}
                >
                  <option value="">Select semester</option>

                  {editingStudent.program &&
                    Object.keys(
                      PROGRAMMES[editingStudent.program].semesters,
                    ).map((semester) => (
                      <option key={semester} value={semester}>
                        Semester {semester}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="admin-modal-footer">
              <button
                className="admin-secondary-button"
                onClick={() => setEditingStudent(null)}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                className="admin-primary-button"
                onClick={handleSave}
                disabled={
                  saving || !editingStudent.program || !editingStudent.semester
                }
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminStudents;
