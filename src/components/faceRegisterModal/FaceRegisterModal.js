import React, { useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import './FaceRegisterModal.css';

const FaceRegisterModal = ({ isOpen, onClose, student, onSuccess }) => {
  const [image, setImage]     = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const fileInputRef = useRef();

  if (!isOpen || !student) return null;

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImage(file);
    setError('');
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!image) {
      setError('Please select a photo first.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('faceImage', image);

      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}api/students/${student.id}/register-face`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          body: formData,
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');

      onSuccess && onSuccess(student.id);
      handleClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setImage(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setError('');
    setLoading(false);
    onClose();
  };

  return ReactDOM.createPortal(
    <>
      {/* Full-screen dimmed backdrop — sits above everything including sidebar */}
      <div className="frm-backdrop" onClick={handleClose} />

      {/* Centered modal box */}
      <div className="frm-modal" role="dialog" aria-modal="true">
        {/* Header */}
        <div className="frm-header">
          <div className="frm-header-left">
            <i className="fa fa-camera frm-header-icon"></i>
            <span className="frm-title">Register Face</span>
            <span className="frm-student-name">— {student.name}</span>
          </div>
          <button className="frm-close-btn" onClick={handleClose} aria-label="Close">
            <i className="fa fa-times"></i>
          </button>
        </div>

        {/* Body */}
        <div className="frm-body">
          <p className="frm-hint">
            Upload a clear, frontal, well-lit photo. Only one face should be visible.
          </p>

          {/* Preview */}
          {preview && (
            <div className="frm-preview-wrap">
              <img src={preview} alt="Face preview" className="frm-preview-img" />
            </div>
          )}

          {/* File input */}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="frm-file-input"
            ref={fileInputRef}
            onChange={handleFileChange}
          />
          <p className="frm-file-hint">Accepted: JPEG, PNG, WebP — max 5 MB</p>

          {/* Error */}
          {error && (
            <div className="frm-error">
              <i className="fa fa-exclamation-circle me-1"></i>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="frm-footer">
          <button className="frm-btn-cancel" onClick={handleClose} disabled={loading}>
            Cancel
          </button>
          <button
            className="frm-btn-submit"
            onClick={handleSubmit}
            disabled={loading || !image}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2"></span>
                Registering…
              </>
            ) : (
              <>
                <i className="fa fa-check me-2"></i>
                Register Face
              </>
            )}
          </button>
        </div>
      </div>
    </>,
    document.getElementById('modal-root')
  );
};

export default FaceRegisterModal;