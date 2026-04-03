import { useState } from "react";
import { createPortal } from "react-dom";
import "../studentModal/StudentModal.css";

const modalRoot = document.getElementById("modal-root");

const FaceRegisterModal = ({ isOpen, student, onClose }) => {
  const [image, setImage] = useState(null);

  if (!isOpen || !student) return null;

  const handleSubmit = () => {
    if (!image) return;

    // 🔮 Future: send image to backend
    console.log("Face image uploaded for:", student.name, image);

    onClose();
  };

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div className="student-modal" onClick={(e) => e.stopPropagation()}>
        <div className="student-modal-header">
          <div>
            <h3>Register Face</h3>
            <p>Upload a clear face image for {student.name}</p>
          </div>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="student-modal-body">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImage(e.target.files[0])}
          />
        </div>

        <div className="student-modal-actions">
          <button className="cancel-text" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            disabled={!image}
            onClick={handleSubmit}
          >
            Upload Face
          </button>
        </div>
      </div>
    </div>,
    modalRoot,
  );
};

export default FaceRegisterModal;
