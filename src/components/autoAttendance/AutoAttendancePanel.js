import React, { useState } from 'react';
import PremiumDatePicker from '../premiumDatePicker/PremiumDatePicker';
import './AutoAttendancePanel.css';

const formatLocalDate = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const readApiResponse = async (response) => {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    return response.json();
  }

  const text = await response.text();
  const preview = text.replace(/\s+/g, ' ').trim().slice(0, 120);
  throw new Error(
    preview
      ? `Server returned a non-JSON response: ${preview}`
      : 'Server returned an empty response',
  );
};

/**
 * AutoAttendancePanel
 *
 * Props:
 *   batchId       - string
 *   students      - array of { id, name, roll, faceRegistered }
 *   onSaved       - called after attendance is saved, so parent can refresh
 *   showAlert     - from AlertContext
 */
const AutoAttendancePanel = ({ subjectId, students = [], onSaved, showAlert }) => {
  const today = formatLocalDate();

  const [date, setDate]           = useState(today);
  const [files, setFiles] = useState([]);
  const [filePreviews, setFilePreviews] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');

  // attendanceMap: { student_id → { present, auto_recognized, has_face } }
  const [attendanceMap, setAttendanceMap] = useState(null);

  const registeredCount = students.filter(s => s.faceRegistered).length;

  // ── File selection ────────────────────────────────────────────────
  const handleFileChange = (e) => {
  const selectedFiles = Array.from(
    e.target.files || [],
  );

  setError("");
  setAttendanceMap(null);

  if (selectedFiles.length === 0) {
    setFiles([]);
    setFilePreviews([]);
    return;
  }

  if (selectedFiles.length > 8) {
    setError(
      "You can upload a maximum of 8 classroom images.",
    );
    e.target.value = "";
    return;
  }

  const invalidFile = selectedFiles.find(
    (file) =>
      ![
        "image/jpeg",
        "image/png",
        "image/webp",
      ].includes(file.type),
  );

  if (invalidFile) {
    setError(
      "Only JPEG, PNG, or WebP classroom images are allowed.",
    );
    e.target.value = "";
    return;
  }

  const oversizedFile =
    selectedFiles.find(
      (file) =>
        file.size >
        10 * 1024 * 1024,
    );

  if (oversizedFile) {
    setError(
      `"${oversizedFile.name}" is larger than 10 MB.`,
    );
    e.target.value = "";
    return;
  }

  filePreviews.forEach((url) =>
    URL.revokeObjectURL(url),
  );

  const previews =
    selectedFiles.map((file) =>
      URL.createObjectURL(file),
    );

  setFiles(selectedFiles);
  setFilePreviews(previews);
};

  // ── Submit to backend ─────────────────────────────────────────────
  const handleProcess = async () => {
  if (!files.length) {
    setError(
      "Please select at least one classroom image.",
    );
    return;
  }

  if (!date) {
    setError(
      "Please select a date.",
    );
    return;
  }

  setProcessing(true);
  setError("");
  setAttendanceMap(null);

  try {
    const formData =
      new FormData();

    files.forEach((file) => {
      formData.append(
        "faceImages",
        file,
      );
    });

    formData.append(
      "date",
      date,
    );

    const res =
      await fetch(
        `${process.env.REACT_APP_BACKEND_URL}api/attendance/${subjectId}/face`,
        {
          method: "POST",

          headers: {
            Authorization:
              `Bearer ${localStorage.getItem("token")}`,
          },

          body: formData,
        },
      );

    const data =
      await readApiResponse(res);

    if (!res.ok) {
      throw new Error(
        data.error ||
          "Processing failed",
      );
    }

    const map = {};

    for (
      const row of data.attendance
    ) {
      map[row.student_id] = {
        present:
          row.present,

        auto_recognized:
          row.auto_recognized,

        has_face:
          row.has_face,

        similarity:
          row.similarity,

        observations:
          row.observations,

        image_indices:
          row.image_indices || [],
      };
    }

    setAttendanceMap(map);

    showAlert &&
      showAlert(
        true,
        `Recognized ${data.present_count} of ${data.total_count} students across ${data.images_processed} classroom images.`,
        "success",
      );

  } catch (err) {
    setError(
      err.message,
    );
  } finally {
    setProcessing(false);
  }
};

  // ── Toggle a single student ───────────────────────────────────────
  const toggleStudent = (studentId) => {
    setAttendanceMap(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        present: !prev[studentId].present
      }
    }));
  };

  // ── Save overrides ────────────────────────────────────────────────
  const handleSave = async () => {
    if (!attendanceMap) return;
    setSaving(true);
    setError('');

    const overrides = Object.entries(attendanceMap).map(([student_id, info]) => ({
      student_id,
      present: info.present
    }));

    try {
      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}api/attendance/${subjectId}/override`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ date, overrides })
        }
      );
      const data = await readApiResponse(res);
      if (!res.ok) throw new Error(data.error || 'Save failed');

      showAlert && showAlert(true, 'Attendance saved!', 'success');
      onSaved && onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Present/absent counts from override map ───────────────────────
  const presentCount = attendanceMap
    ? Object.values(attendanceMap).filter(v => v.present).length
    : 0;
  const totalCount = students.length;

  return (
    <div className="auto-attendance-panel">
      {/* ── Registration status warning ── */}
      {registeredCount < totalCount && (
        <div className="alert alert-warning py-2 small mb-3">
          <i className="fa fa-exclamation-triangle me-1"></i>
          {registeredCount}/{totalCount} students have registered faces.
          Students without registered faces will be marked absent automatically.
        </div>
      )}

      {/* ── Date + file selectors ── */}
      <div className="row g-2 mb-3">
        <div className="col-sm-5">
          <PremiumDatePicker
            label="Date"
            value={date}
            maxDate={today}
            onChange={(nextDate) => {
              setDate(nextDate);
              setAttendanceMap(null);
            }}
          />
        </div>
        <div className="col-sm-7">
          <label className="form-label small fw-semibold mb-1">
  Upload Classroom Images
</label>

<input
  type="file"
  accept="image/jpeg,image/png,image/webp"
  multiple
  className="form-control form-control-sm auto-file-input"
  onChange={handleFileChange}
/>

<div className="form-text">
  Upload up to 8 classroom photos. A student found in
  any one photo will be marked present.
</div>
        </div>
      </div>

      {/* ── Image preview ── */}
      {filePreviews.length > 0 && (
  <div className="auto-att-preview-grid mb-3">
    {filePreviews.map(
      (preview, index) => (
        <div
          key={preview}
          className="auto-att-preview-item"
        >
          <img
            src={preview}
            alt={`Classroom ${index + 1}`}
            className="auto-att-preview"
          />

          <div className="small text-muted mt-1">
            Classroom photo {index + 1}
          </div>
        </div>
      ),
    )}
  </div>
)}

      {error && (
        <div className="alert alert-danger py-2 small mb-3">
          <i className="fa fa-times-circle me-1"></i>{error}
        </div>
      )}

      <button
        className="btn btn-primary btn-sm w-100 mb-3"
        onClick={handleProcess}
        disabled={
  processing ||
  files.length === 0
}
      >
        {processing
  ? (
    <>
      <span className="spinner-border spinner-border-sm me-2"></span>
      Analyzing {files.length} image
      {files.length !== 1 ? "s" : ""}…
    </>
  )
  : (
    <>
      <i className="fa fa-magic me-2"></i>
      Run Classroom Recognition
    </>
  )
}
      </button>

      {/* ── Override list — shown after recognition ── */}
      {attendanceMap && (
        <div className="override-section">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <span className="fw-semibold small">
              Review & Override — {presentCount}/{totalCount} Present
            </span>
            <div className="d-flex gap-2">
              <button
                className="btn btn-outline-success btn-xs"
                onClick={() => {
                  const all = {};
                  students.forEach(s => {
                    all[s.id] = { ...attendanceMap[s.id], present: true };
                  });
                  setAttendanceMap(all);
                }}
              >
                Mark All Present
              </button>
              <button
                className="btn btn-outline-danger btn-xs"
                onClick={() => {
                  const all = {};
                  students.forEach(s => {
                    all[s.id] = { ...attendanceMap[s.id], present: false };
                  });
                  setAttendanceMap(all);
                }}
              >
                Mark All Absent
              </button>
            </div>
          </div>

          <div className="override-list">
            {students.map(student => {
              const info = attendanceMap[student.id] || { present: false };
              return (
                <div
                  key={student.id}
                  className={`override-row ${info.present ? 'present' : 'absent'}`}
                  onClick={() => toggleStudent(student.id)}
                >
                  <div className="override-avatar">
                    {student.avatar ? (
                      <img src={student.avatar} alt={student.name} />
                    ) : (
                      student.name?.[0]?.toUpperCase() || '?'
                    )}
                  </div>
                  <div className="override-info">
                    <div className="override-name">{student.name}</div>
                    <div className="override-meta">
                      {student.roll}
                      {!info.has_face && (
                        <span className="badge bg-secondary ms-2" style={{ fontSize: 9 }}>
                          No face registered
                        </span>
                      )}
                      {info.auto_recognized && (
                        <span className="badge bg-primary ms-2" style={{ fontSize: 9 }}>
                          Auto-recognized
                        </span>
                      )}
                      {info.auto_recognized &&
                        info.observations > 0 && (
                          <span
                            className="badge bg-success ms-2"
                            style={{ fontSize: 9 }}
                          >
                            Seen in {info.observations} photo
                            {info.observations !== 1 ? "s" : ""}
                          </span>
                        )}
                    </div>
                  </div>
                  <div className="override-toggle">
                    <span className={`badge ${info.present ? 'bg-success' : 'bg-danger'}`}>
                      {info.present ? 'Present' : 'Absent'}
                    </span>
                    <i className={`fa fa-toggle-${info.present ? 'on text-success' : 'off text-secondary'} ms-2`}></i>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            className="btn btn-success btn-sm w-100 mt-3"
            onClick={handleSave}
            disabled={saving}
          >
            {saving
              ? <><span className="spinner-border spinner-border-sm me-2"></span>Saving…</>
              : <><i className="fa fa-save me-2"></i>Save Attendance</>
            }
          </button>
        </div>
      )}
    </div>
  );
};

export default AutoAttendancePanel;
