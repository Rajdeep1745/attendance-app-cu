import { useContext, useEffect, useMemo, useState } from "react";
import ConfirmModal from "../../components/confirm/ConfirmModal";
import "./Admin.css";

const API = `${process.env.REACT_APP_BACKEND_URL}api/admin`;
const COLUMNS = ["name", "email", "department", "institution"];

function csvEscape(value) {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}
function downloadCsv(filename, rows) {
  const blob = new Blob(
    ["\uFEFF", rows.map((r) => r.map(csvEscape).join(",")).join("\r\n")],
    { type: "text/csv;charset=utf-8;" },
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
function parseCsv(text) {
  const input = text.replace(/^\uFEFF/, "");
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (quoted) {
      if (c === '"' && input[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n") {
      row.push(cell.replace(/\r$/, ""));
      if (row.some((v) => v.trim())) rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (quoted) throw new Error("CSV contains an unclosed quoted field.");
  row.push(cell.replace(/\r$/, ""));
  if (row.some((v) => v.trim())) rows.push(row);
  if (rows.length < 2)
    throw new Error("CSV needs a header and at least one teacher.");
  const headers = rows[0].map((v) => v.trim().toLowerCase());
  const missing = COLUMNS.filter((c) => !headers.includes(c));
  if (missing.length) throw new Error(`Missing columns: ${missing.join(", ")}`);
  return rows
    .slice(1)
    .map((values) =>
      Object.fromEntries(headers.map((h, i) => [h, (values[i] || "").trim()])),
    );
}

export default function AdminTeachers() {
  const [teachers, setTeachers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [teacherPendingDelete, setTeacherPendingDelete] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reviewRows, setReviewRows] = useState([]);
  const [reviewErrors, setReviewErrors] = useState([]);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [addingTeacher, setAddingTeacher] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    department: "",
    institution: "",
  });
  const token = localStorage.getItem("adminToken");
  const headers = { Authorization: `Bearer ${token}` };

  const loadTeachers = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/teachers`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load teachers.");
      setTeachers(data.teachers || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    loadTeachers();
  }, []);

  const visibleTeachers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return teachers.filter(
      (t) =>
        !q ||
        [t.name, t.email, t.department, t.institution].some((v) =>
          String(v || "")
            .toLowerCase()
            .includes(q),
        ),
    );
  }, [teachers, search]);

  const downloadTemplate = () => {
    // Download the existing template from public/data instead of generating a new one.
    const link = document.createElement("a");
    link.href = `${process.env.PUBLIC_URL || ""}/data/teacher_import_template.csv`;
    link.download = "teacher_import_template.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const openEditTeacher = (teacher) => {
    setEditingTeacher(teacher);
    setEditForm({
      name: teacher.name || "",
      email: teacher.email || "",
      department: teacher.department || "",
      institution: teacher.institution || "",
    });
    setError("");
    setNotice("");
  };

  const saveTeacher = async (e) => {
    e.preventDefault();
    if (!editingTeacher && !addingTeacher) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const res = addingTeacher
        ? await fetch(`${API}/teachers/import`, {
            method: "POST",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({ teachers: [editForm] }),
          })
        : await fetch(`${API}/teachers/${encodeURIComponent(editingTeacher.id)}`, {
            method: "PATCH",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify(editForm),
          });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Could not ${addingTeacher ? "add" : "update"} teacher.`);
      if (addingTeacher && (data.summary?.failed || data.rows?.some((row) => row.status === "failed"))) {
        throw new Error(data.rows?.find((row) => row.status === "failed")?.message || "Could not add teacher.");
      }
      setEditingTeacher(null);
      setAddingTeacher(false);
      setNotice(addingTeacher ? "Teacher added successfully. Default password: 12345678." : (data.message || "Teacher updated successfully."));
      await loadTeachers();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteTeacher = async () => {
    const teacher = teacherPendingDelete;
    if (!teacher) return;
    setTeacherPendingDelete(null);
    setError("");
    setNotice("");
    try {
      const res = await fetch(
        `${API}/teachers/${encodeURIComponent(teacher.id)}`,
        { method: "DELETE", headers },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not delete teacher.");
      setNotice(data.message || `Deleted ${teacher.name}.`);
      await loadTeachers();
    } catch (e) {
      setError(e.message);
    }
  };
  const exportTeachers = async () => {
    try {
      const res = await fetch(`${API}/teachers/export`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Export failed.");
      downloadCsv("teachers_export.csv", [
        COLUMNS,
        ...(data.teachers || []).map((t) => COLUMNS.map((c) => t[c] || "")),
      ]);
    } catch (e) {
      setError(e.message);
    }
  };
  const importRows = async (rows) => {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch(`${API}/teachers/import`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ teachers: rows }),
      });
      const data = await res.json();
      if (
        data.rows?.some((r) => r.status === "failed") ||
        data.rowErrors?.length
      ) {
        const failed = data.rows?.filter((r) => r.status === "failed") || [];
        const mapped = failed.map((r) => ({
          ...(rows[(r.row || 2) - 2] || {}),
          _row: r.row,
          _error: r.message || r.error,
        }));
        const rowErrors = data.rowErrors || [];
        const all = [
          ...mapped,
          ...rowErrors.map((r) => ({
            ...(rows[(r.row || 2) - 2] || {}),
            _row: r.row,
            _error: r.error,
          })),
        ];
        setReviewRows(
          all.filter((r, i, a) => a.findIndex((x) => x._row === r._row) === i),
        );
        setNotice(data.message || "Some rows need correction.");
        if (!res.ok && !all.length) setError(data.error || "Import failed.");
      } else if (!res.ok) throw new Error(data.error || "Import failed.");
      else {
        setNotice(
          data.message ||
            `Import complete. Created: ${data.summary?.created || 0}, updated: ${data.summary?.updated || 0}.`,
        );
        setReviewRows([]);
      }
      await loadTeachers();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };
  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      if (!file.name.toLowerCase().endsWith(".csv"))
        throw new Error("Upload a CSV file.");
      await importRows(parseCsv(await file.text()));
    } catch (err) {
      setError(err.message);
    }
  };
  const changeReview = (index, key, value) =>
    setReviewRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [key]: value } : r)),
    );
  const retryFailed = () =>
    importRows(reviewRows.map(({ _row, _error, ...row }) => row));

  return (
    <section className="admin-students-page">
      <div className="admin-page-heading">
        <div>
          <h1>Teachers</h1>
          <p>Manage teacher accounts and bulk-upload staff records</p>
        </div>
        <div className="admin-page-count">
          {visibleTeachers.length} teachers
        </div>
      </div>
      <div className="admin-spreadsheet-toolbar">
        <div className="admin-spreadsheet-copy">
          <strong>Bulk teacher management</strong>
          <span>Import or export teacher details using a CSV file.</span>
        </div>
        <div className="admin-spreadsheet-actions">
          <button
            className="admin-primary-button"
            type="button"
            onClick={() => {
              setAddingTeacher(true);
              setEditingTeacher({ id: null });
              setEditForm({ name: "", email: "", department: "", institution: "" });
              setError("");
              setNotice("");
            }}
          >
            + Add teacher
          </button>
          <button
            className="admin-secondary-button"
            type="button"
            onClick={downloadTemplate}
          >
            Download template
          </button>
          <label
            className={`admin-secondary-button admin-file-button ${saving ? "is-disabled" : ""}`}
          >
            {saving ? "Importing..." : "Import CSV"}
            <input
              key={fileInputKey}
              type="file"
              accept=".csv,text/csv"
              hidden
              disabled={saving}
              onChange={onFile}
            />
          </label>
          <button
            className="admin-primary-button"
            type="button"
            onClick={exportTeachers}
          >
            Export teachers
          </button>
        </div>
      </div>
      {notice && (
        <div className="admin-import-result">
          <strong>{notice}</strong>
        </div>
      )}
      {error && <div className="admin-error">{error}</div>}
      <div className="admin-filter-card">
        <div className="admin-search-wrapper">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or department"
          />
        </div>
      </div>
      <div className="admin-table-card">
        {loading ? (
          <div className="admin-table-state">Loading teachers...</div>
        ) : visibleTeachers.length === 0 ? (
          <div className="admin-table-state">No teachers found.</div>
        ) : (
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Teacher</th>
                  <th>Department</th>
                  <th>Institution</th>
                  <th>Default mode</th>
                  <th>Threshold</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleTeachers.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <div className="admin-student-cell">
                        <div className="admin-student-avatar">
                          {t.avatar ? (
                            <img src={t.avatar} alt="" />
                          ) : (
                            t.name?.charAt(0)?.toUpperCase()
                          )}
                        </div>
                        <div className="admin-student-details">
                          <strong>{t.name}</strong>
                          <span>{t.email}</span>
                        </div>
                      </div>
                    </td>
                    <td>{t.department || "—"}</td>
                    <td>{t.institution || "—"}</td>
                    <td>{t.default_mode || "—"}</td>
                    <td>{t.default_threshold ?? "—"}</td>
                    <td>
                      <div className="admin-spreadsheet-actions">
                        <button
                          className="admin-secondary-button"
                          type="button"
                          onClick={() => openEditTeacher(t)}
                        >
                          Edit
                        </button>
                        <button
                          className="admin-danger-button"
                          type="button"
                          onClick={() => setTeacherPendingDelete(t)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {editingTeacher && (
        <div
          className="admin-modal-backdrop"
          onMouseDown={() => { if (!saving) { setEditingTeacher(null); setAddingTeacher(false); } }}
        >
          <form
            className="admin-modal admin-edit-teacher-modal"
            onSubmit={saveTeacher}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="admin-modal-header">
              <div>
                <h2>{addingTeacher ? "Add teacher" : "Edit teacher"}</h2>
                <p>{addingTeacher ? "Create an individual teacher account." : "Update the teacher's profile details."}</p>
              </div>
              <button
                className="admin-modal-close"
                type="button"
                onClick={() => setEditingTeacher(null)}
              >
                ×
              </button>
            </div>
            <div className="admin-modal-body">
              <label>
                Name
                <input
                  required
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, name: e.target.value }))
                  }
                />
              </label>
              <label>
                Email
                <input
                  required
                  type="email"
                  value={editForm.email}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, email: e.target.value }))
                  }
                />
              </label>
              <label>
                Department
                <input
                  value={editForm.department}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, department: e.target.value }))
                  }
                />
              </label>
              <label>
                Institution
                <input
                  value={editForm.institution}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, institution: e.target.value }))
                  }
                />
              </label>
            </div>
            <div className="admin-modal-footer">
              <button
                className="admin-secondary-button"
                type="button"
                onClick={() => { setEditingTeacher(null); setAddingTeacher(false); }}
              >
                Cancel
              </button>
              <button
                className="admin-primary-button"
                type="submit"
                disabled={saving}
              >
                {saving ? "Saving..." : addingTeacher ? "Add teacher" : "Save changes"}
              </button>
            </div>
          </form>
        </div>
      )}
      {reviewRows.length > 0 && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal admin-teacher-review-modal">
            <div className="admin-modal-header">
              <div>
                <h2>Correct teacher import</h2>
                <p>Only rows with inconsistencies are shown.</p>
              </div>
              <button
                className="admin-modal-close"
                onClick={() => setReviewRows([])}
              >
                ×
              </button>
            </div>
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    {COLUMNS.map((c) => (
                      <th key={c}>{c}</th>
                    ))}
                    <th>Error</th>
                  </tr>
                </thead>
                <tbody>
                  {reviewRows.map((r, i) => (
                    <tr key={`${r._row}-${i}`}>
                      {COLUMNS.map((c) => (
                        <td key={c}>
                          <input
                            value={r[c] || ""}
                            onChange={(e) => changeReview(i, c, e.target.value)}
                          />
                        </td>
                      ))}
                      <td>{r._error || "Please review this row."}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="admin-modal-footer">
              <button
                className="admin-secondary-button"
                onClick={() => setReviewRows([])}
              >
                Cancel
              </button>
              <button
                className="admin-primary-button"
                disabled={saving}
                onClick={retryFailed}
              >
                {saving ? "Retrying..." : "Save corrections & retry"}
              </button>
            </div>
          </div>
        </div>
      )}
      <ConfirmModal
        open={Boolean(teacherPendingDelete)}
        title="Delete teacher account?"
        message={teacherPendingDelete ? `Delete ${teacherPendingDelete.name} (${teacherPendingDelete.email})? Any assigned subjects will become unassigned. This action cannot be undone.` : ""}
        confirmText="Delete teacher"
        onCancel={() => setTeacherPendingDelete(null)}
        onConfirm={deleteTeacher}
      />
    </section>
  );
}
