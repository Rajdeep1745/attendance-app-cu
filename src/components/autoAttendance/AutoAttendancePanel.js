import React, { useState } from 'react';
import PremiumDatePicker from '../premiumDatePicker/PremiumDatePicker';
import './AutoAttendancePanel.css';

const formatLocalDate = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
const AutoAttendancePanel = ({ batchId, students = [], onSaved, showAlert }) => {
  const today = formatLocalDate();

  const [date, setDate]           = useState(today);
  const [file, setFile]           = useState(null);
  const [filePreview, setPreview] = useState(null);
  const [isVideo, setIsVideo]     = useState(false);
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');

  // attendanceMap: { student_id → { present, auto_recognized, has_face } }
  const [attendanceMap, setAttendanceMap] = useState(null);

  const registeredCount = students.filter(s => s.faceRegistered).length;

  // ── File selection ────────────────────────────────────────────────
  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setError('');
    setAttendanceMap(null);
    const isVid = f.type.startsWith('video/');
    setIsVideo(isVid);
    if (filePreview) URL.revokeObjectURL(filePreview);
    setPreview(isVid ? null : URL.createObjectURL(f));
  };

  // ── Submit to backend ─────────────────────────────────────────────
  const handleProcess = async () => {
    if (!file) { setError('Please select an image or video first.'); return; }
    if (!date) { setError('Please select a date.'); return; }

    setProcessing(true);
    setError('');
    setAttendanceMap(null);

    try {
      const formData = new FormData();
      formData.append('faceMedia', file);
      formData.append('date', date);

      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}api/attendance/${batchId}/face`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          body: formData
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Processing failed');

      // Build a map for the override UI
      const map = {};
      for (const row of data.attendance) {
        map[row.student_id] = {
          present: row.present,
          auto_recognized: row.auto_recognized,
          has_face: row.has_face
        };
      }
      setAttendanceMap(map);

      showAlert && showAlert(true,
        `Recognized ${data.present_count} of ${data.total_count} students.`,
        'success'
      );
    } catch (err) {
      setError(err.message);
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
        `${process.env.REACT_APP_BACKEND_URL}api/attendance/${batchId}/override`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ date, overrides })
        }
      );
      const data = await res.json();
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
            Upload Class Photo or Video
          </label>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
            className="form-control form-control-sm auto-file-input"
            onChange={handleFileChange}
          />
        </div>
      </div>

      {/* ── Image preview ── */}
      {filePreview && !isVideo && (
        <div className="text-center mb-3">
          <img
            src={filePreview}
            alt="Upload preview"
            className="auto-att-preview"
          />
        </div>
      )}
      {isVideo && file && (
        <div className="alert alert-info py-2 small mb-3">
          <i className="fa fa-film me-1"></i>
          Video selected: <strong>{file.name}</strong> ({(file.size / 1024 / 1024).toFixed(1)} MB).
          Frames will be sampled every 2 seconds.
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
        disabled={processing || !file}
      >
        {processing
          ? <><span className="spinner-border spinner-border-sm me-2"></span>Processing…</>
          : <><i className="fa fa-magic me-2"></i>Run Face Recognition</>
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
