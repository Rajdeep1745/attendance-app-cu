import { useContext, useEffect, useMemo, useState } from "react";
import AlertContext from "../../context/alert/AlertContext";
import ConfirmModal from "../../components/confirm/ConfirmModal";


import "./Admin.css";

const AdminStudents = () => {
  const [students, setStudents] = useState([]);
  const [academicProgrammes, setAcademicProgrammes] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  const [programFilter, setProgramFilter] = useState("");

  const [semesterFilter, setSemesterFilter] = useState("");

  const [editingStudent, setEditingStudent] = useState(null);
  const [addingStudent, setAddingStudent] = useState(false);
  const [newStudent, setNewStudent] = useState({ name: "", email: "", department: "", institution: "", roll_no: "", program: "", semester: "" });
  const [studentPendingDelete, setStudentPendingDelete] = useState(null);
  const [deletingStudent, setDeletingStudent] = useState(false);

  const [saving, setSaving] = useState(false);

  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState("");
  const [importError, setImportError] = useState("");
  const [importSummary, setImportSummary] = useState(null);
  const [importRowResults, setImportRowResults] = useState([]);
  const [importReviewOpen, setImportReviewOpen] = useState(false);
  const [importReviewRows, setImportReviewRows] = useState([]);
  const [importReviewErrors, setImportReviewErrors] = useState([]);

  const adminToken = localStorage.getItem("adminToken");
  const { showAlert } = useContext(AlertContext);

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
    fetch(`${process.env.REACT_APP_BACKEND_URL}api/academic/options`)
      .then((response) => response.json().then((data) => {
        if (!response.ok) throw new Error(data.error || "Failed to load academic options");
        setAcademicProgrammes(data.programmes || []);
      }))
      .catch((error) => showAlert("Error", error.message, "danger"));
  }, []);

  // =======================================================
  // FILTER OPTIONS
  // =======================================================

  const programs = useMemo(() => academicProgrammes.map((item) => item.program), [academicProgrammes]);
  const semestersForProgram = (program) => academicProgrammes.find((item) => item.program === program)?.semesters || [];

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

      showAlert("Error", err.message, "danger");
    } finally {
      setSaving(false);
    }
  };

  const addStudent = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}api/admin/students/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ students: [{ ...newStudent, semester: Number(newStudent.semester) }] }),
      });
      const data = await res.json();
      const failed = data.rows?.find((row) => row.status === "failed");
      if (!res.ok || failed || data.summary?.failed) throw new Error(failed?.message || data.error || "Could not add student.");
      setAddingStudent(false);
      setNewStudent({ name: "", email: "", department: "", institution: "", roll_no: "", program: "", semester: "" });
      await loadStudents();
      showAlert("Student added", "Student account created successfully. Default password: 12345678.", "success");
    } catch (err) {
      showAlert("Could not add student", err.message, "danger");
    } finally { setSaving(false); }
  };

  const deleteStudent = async () => {
    if (!studentPendingDelete) return;
    setDeletingStudent(true);
    try {
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}api/admin/students/${studentPendingDelete.id}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete student.");
      setStudents((previous) => previous.filter((student) => student.id !== studentPendingDelete.id));
      setStudentPendingDelete(null);
      showAlert("Student deleted", data.message || "Student deleted successfully.", "success");
    } catch (err) {
      showAlert("Could not delete student", err.message, "danger");
    } finally { setDeletingStudent(false); }
  };

  // =======================================================
  // STUDENT CSV TEMPLATE / EXPORT / IMPORT
  // CSV is Excel-compatible and avoids requiring an extra
  // spreadsheet library in the React app.
  // =======================================================

  // Keep this list aligned with public/student_import_template.csv.
  // Avatar is intentionally excluded: new students use the app's default
  // avatar, and imports must not overwrite an existing student's avatar.
  const spreadsheetColumns = [
    "name",
    "email",
    "department",
    "institution",
    "roll_no",
    "program",
    "semester",
  ];

  const csvCell = (value) => {
    const text = value === null || value === undefined ? "" : String(value);
    return `"${text.replace(/"/g, '""')}"`;
  };

  const downloadCsv = (filename, rows) => {
    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF", csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const downloadTemplate = () => {
    // Create React App serves files in /public from the site root.
    // PUBLIC_URL also supports deployments hosted under a subpath.
    const publicBase = (process.env.PUBLIC_URL || "").replace(/\/+$/, "");
    const anchor = document.createElement("a");
    anchor.href = `${publicBase}/student_import_template.csv`;
    anchor.download = "student_import_template.csv";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  };

  const exportStudents = () => {
    const rows = students.map((student) => [
      student.name,
      student.email,
      student.department,
      student.institution,
      student.roll_no,
      student.program,
      student.semester,
    ]);
    downloadCsv("students_export.csv", [spreadsheetColumns, ...rows]);
  };

  const parseCsv = (text) => {
    const rows = [];
    let row = [];
    let cell = "";
    let quoted = false;
    const input = text.replace(/^\uFEFF/, "");

    for (let i = 0; i < input.length; i += 1) {
      const char = input[i];
      if (quoted) {
        if (char === '"' && input[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else if (char === '"') {
          quoted = false;
        } else {
          cell += char;
        }
      } else if (char === '"') {
        quoted = true;
      } else if (char === ",") {
        row.push(cell);
        cell = "";
      } else if (char === "\n") {
        row.push(cell.replace(/\r$/, ""));
        if (row.some((value) => value.trim() !== "")) rows.push(row);
        row = [];
        cell = "";
      } else {
        cell += char;
      }
    }

    if (quoted) throw new Error("CSV has an unclosed quoted field.");
    row.push(cell.replace(/\r$/, ""));
    if (row.some((value) => value.trim() !== "")) rows.push(row);
    if (rows.length < 2)
      throw new Error(
        "The CSV must include a header and at least one student.",
      );

    const headers = rows[0].map((header) => header.trim().toLowerCase());
    const missing = spreadsheetColumns.filter(
      (column) => !headers.includes(column),
    );
    if (missing.length) {
      throw new Error(
        `Missing required template columns: ${missing.join(", ")}`,
      );
    }

    return rows.slice(1).map((values) => {
      const result = {};
      headers.forEach((header, index) => {
        result[header] = (values[index] || "").trim();
      });
      return result;
    });
  };

  const submitImportRows = async (rows, { fromReview = false } = {}) => {
    setImporting(true);
    setImportMessage("");
    setImportError("");
    setImportSummary(null);
    setImportRowResults([]);

    try {
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}api/admin/students/import`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({ students: rows }),
        },
      );
      const data = await response.json();

      const rowErrors = Array.isArray(data.rowErrors) ? data.rowErrors : [];
      const failedRows = Array.isArray(data.rows)
        ? data.rows.filter((row) => row.status === "failed")
        : [];

      if (!response.ok || rowErrors.length || failedRows.length) {
        const failures = [...rowErrors, ...failedRows].map((item) => ({
          row: Number(item.row) || 0,
          email: item.email || "",
          error:
            item.error ||
            item.message ||
            data.error ||
            "Please check this row.",
        }));

        if (failures.length) {
          // Show only rows the backend identified as inconsistent.
          // Keep the original CSV row number so the user can locate them.
          const reviewRows = rows
            .map((student, index) => {
              const csvRowNumber = index + 2;
              const matchingErrors = failures.filter((failure) => {
                if (failure.row && failure.row === csvRowNumber) return true;
                // Fall back to email matching if the backend's row numbering differs.
                return Boolean(
                  failure.email &&
                  student.email &&
                  failure.email.trim().toLowerCase() ===
                    student.email.trim().toLowerCase(),
                );
              });

              return {
                ...student,
                _row: csvRowNumber,
                _errors: [
                  ...new Set(matchingErrors.map((failure) => failure.error)),
                ],
              };
            })
            .filter((student) => student._errors.length > 0);

          setImportReviewRows(reviewRows);
          setImportReviewErrors(failures);
          setImportReviewOpen(true);
          setImportError(
            data.error ||
              "Some rows need correction. Review them in the dialog, then submit again.",
          );
          return;
        }

        throw new Error(
          data.error || "Import failed. Please check the CSV and try again.",
        );
      }

      setImportReviewOpen(false);
      setImportReviewRows([]);
      setImportReviewErrors([]);
      setImportSummary(data.summary || null);
      setImportRowResults(data.rows || []);
      setImportMessage(data.message || "Import completed.");
      setImportError("");
      await loadStudents();
    } catch (err) {
      console.error("STUDENT CSV IMPORT ERROR:", err);
      setImportError(err.message || "Failed to import students.");
      if (fromReview) {
        setImportReviewOpen(true);
      }
    } finally {
      setImporting(false);
    }
  };

  const handleImportFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      if (!file.name.toLowerCase().endsWith(".csv")) {
        throw new Error(
          "Please upload the downloaded CSV template. Excel files should be saved as CSV UTF-8 before importing.",
        );
      }
      const rows = parseCsv(await file.text());
      await submitImportRows(rows);
    } catch (err) {
      console.error("STUDENT CSV IMPORT ERROR:", err);
      setImportError(err.message || "Failed to import students.");
    }
  };

  const updateReviewCell = (rowIndex, field, value) => {
    setImportReviewRows((previous) =>
      previous.map((row, index) =>
        index === rowIndex ? { ...row, [field]: value } : row,
      ),
    );
  };

  const retryReviewedImport = async () => {
    const rows = importReviewRows.map(
      ({ _row, _errors, ...student }) => student,
    );
    await submitImportRows(rows, { fromReview: true });
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

      <div className="admin-spreadsheet-toolbar">
        <div className="admin-spreadsheet-copy">
          <strong>Bulk student management</strong>
          <span>
            Download a template, import student records, or export the current
            list.
          </span>
        </div>
        <div className="admin-spreadsheet-actions">
          <button type="button" className="admin-primary-button" onClick={() => setAddingStudent(true)}>
            + Add student
          </button>
          <button
            type="button"
            className="admin-secondary-button"
            onClick={downloadTemplate}
          >
            Download template
          </button>
          <label
            className={`admin-secondary-button admin-file-button ${importing ? "is-disabled" : ""}`}
          >
            {importing ? "Importing..." : "Import CSV"}
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleImportFile}
              disabled={importing}
              hidden
            />
          </label>
          <button
            type="button"
            className="admin-primary-button"
            onClick={exportStudents}
            disabled={!students.length}
          >
            Export students
          </button>
        </div>
      </div>

      {importMessage && (
        <div className="admin-import-result">
          <strong>{importMessage}</strong>
          {importSummary && (
            <span>
              Created: {importSummary.created} · Updated:{" "}
              {importSummary.updated} · Failed: {importSummary.failed}
            </span>
          )}
          {importRowResults.some((row) => row.status === "failed") && (
            <ul className="admin-import-row-errors">
              {importRowResults
                .filter((row) => row.status === "failed")
                .map((row) => (
                  <li key={`${row.row}-${row.email || "unknown"}`}>
                    Row {row.row}
                    {row.email ? ` (${row.email})` : ""}: {row.message}
                  </li>
                ))}
            </ul>
          )}
        </div>
      )}
      {importError && (
        <div className="admin-error admin-import-error">
          {importError.split("\n").map((line, index) => (
            <div key={`${index}-${line}`}>{line}</div>
          ))}
        </div>
      )}

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
                      <div className="admin-spreadsheet-actions admin-student-row-actions">
                        <button type="button" className="admin-edit-button" onClick={() => openEdit(student)}>Edit</button>
                        <button type="button" className="admin-danger-button" onClick={() => setStudentPendingDelete(student)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {importReviewOpen && (
        <div
          className="admin-modal-backdrop"
          onMouseDown={() => !importing && setImportReviewOpen(false)}
        >
          <div
            className="admin-modal admin-import-review-modal"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="admin-modal-header">
              <div>
                <h2>Fix import inconsistencies</h2>
                <p>Correct the highlighted fields, then try importing again.</p>
              </div>
              <button
                type="button"
                className="admin-modal-close"
                onClick={() => setImportReviewOpen(false)}
                disabled={importing}
                aria-label="Close import review"
              >
                ×
              </button>
            </div>

            {importReviewErrors.length > 0 && (
              <div className="admin-import-review-errors">
                {importReviewErrors.map((item, index) => (
                  <div key={`${item.row}-${index}`}>
                    <strong>
                      CSV row {item.row || "?"}
                      {item.email ? ` (${item.email})` : ""}:
                    </strong>{" "}
                    {item.error}
                  </div>
                ))}
              </div>
            )}

            <div className="admin-import-review-table-wrap">
              <table className="admin-table admin-import-review-table">
                <thead>
                  <tr>
                    <th>CSV row</th>
                    {spreadsheetColumns.map((column) => (
                      <th key={column}>{column.replaceAll("_", " ")}</th>
                    ))}
                    <th>Issue</th>
                  </tr>
                </thead>
                <tbody>
                  {importReviewRows.map((row, rowIndex) => (
                    <tr key={row._row}>
                      <td>{row._row}</td>
                      {spreadsheetColumns.map((column) => (
                        <td key={column}>
                          {column === "program" ? (
                            <select
                              value={row[column] || ""}
                              onChange={(event) =>
                                updateReviewCell(
                                  rowIndex,
                                  column,
                                  event.target.value,
                                )
                              }
                            >
                              <option value="">Select program</option>
                              {programs.map((program) => (
                                <option key={program} value={program}>
                                  {program}
                                </option>
                              ))}
                            </select>
                          ) : column === "semester" ? (
                            <select
                              value={row[column] || ""}
                              onChange={(event) =>
                                updateReviewCell(
                                  rowIndex,
                                  column,
                                  event.target.value,
                                )
                              }
                            >
                              <option value="">Select semester</option>
                              {Array.from({ length: 8 }, (_, index) =>
                                String(index + 1),
                              ).map((semester) => (
                                <option key={semester} value={semester}>
                                  {semester}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type="text"
                              value={row[column] || ""}
                              onChange={(event) =>
                                updateReviewCell(
                                  rowIndex,
                                  column,
                                  event.target.value,
                                )
                              }
                              aria-label={`Row ${row._row} ${column}`}
                            />
                          )}
                        </td>
                      ))}
                      <td className="admin-import-review-issue">
                        {row._errors?.join("; ") ||
                          "Review and correct if needed"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="admin-modal-footer">
              <button
                type="button"
                className="admin-secondary-button"
                onClick={() => setImportReviewOpen(false)}
                disabled={importing}
              >
                Cancel
              </button>
              <button
                type="button"
                className="admin-primary-button"
                onClick={retryReviewedImport}
                disabled={importing || !importReviewRows.length}
              >
                {importing ? "Importing..." : "Save corrections & retry"}
              </button>
            </div>
          </div>
        </div>
      )}

      {addingStudent && (
        <div className="admin-modal-backdrop" onMouseDown={() => !saving && setAddingStudent(false)}>
          <form className="admin-modal admin-edit-teacher-modal admin-add-student-modal" onSubmit={addStudent} onMouseDown={(event) => event.stopPropagation()}>
            <div className="admin-modal-header"><div><h2>Add student</h2><p>Create one student account and set their academic details.</p></div>
              <button type="button" className="admin-modal-close" onClick={() => setAddingStudent(false)} disabled={saving}>×</button>
            </div>
            <div className="admin-modal-body">
              <label>Name<input required value={newStudent.name} onChange={(e) => setNewStudent((p) => ({ ...p, name: e.target.value }))} /></label>
              <label>Email<input required type="email" value={newStudent.email} onChange={(e) => setNewStudent((p) => ({ ...p, email: e.target.value }))} /></label>
              <label>Roll number<input required value={newStudent.roll_no} onChange={(e) => setNewStudent((p) => ({ ...p, roll_no: e.target.value }))} /></label>
              <label>Programme<select required value={newStudent.program} onChange={(e) => setNewStudent((p) => ({ ...p, program: e.target.value, semester: "" }))}><option value="">Select programme</option>{programs.map((program) => <option key={program} value={program}>{program}</option>)}</select></label>
              <label>Semester<select required value={newStudent.semester} disabled={!newStudent.program} onChange={(e) => setNewStudent((p) => ({ ...p, semester: e.target.value }))}><option value="">Select semester</option>{semestersForProgram(newStudent.program).map((semester) => <option key={semester} value={semester}>{semester}</option>)}</select></label>
              <label>Department<input value={newStudent.department} onChange={(e) => setNewStudent((p) => ({ ...p, department: e.target.value }))} /></label>
              <label>Institution<input value={newStudent.institution} onChange={(e) => setNewStudent((p) => ({ ...p, institution: e.target.value }))} /></label>
              <p className="admin-form-help">New accounts use the default password: 12345678.</p>
            </div>
            <div className="admin-modal-footer"><button type="button" className="admin-secondary-button" onClick={() => setAddingStudent(false)} disabled={saving}>Cancel</button><button type="submit" className="admin-primary-button" disabled={saving}>{saving ? "Adding…" : "Add student"}</button></div>
          </form>
        </div>
      )}

      <ConfirmModal open={Boolean(studentPendingDelete)} title="Delete student account?" message={studentPendingDelete ? `Delete ${studentPendingDelete.name} (${studentPendingDelete.email})? This action cannot be undone.` : ""} confirmText="Delete student" onCancel={() => !deletingStudent && setStudentPendingDelete(null)} onConfirm={deleteStudent} busy={deletingStudent} />

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
                    semestersForProgram(editingStudent.program).map((semester) => (
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
