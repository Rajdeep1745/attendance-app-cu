import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import "../batchModal/BatchModal.css";

const modalRoot = document.getElementById("modal-root");

const JoinClassModal = ({ isOpen, onClose, onSubmit }) => {
  const [code, setCode] = useState("");

  useEffect(() => {
    if (isOpen) {
      setCode("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <h3>Join Class</h3>
        <p className="delete-text">
          Enter the batch code shared by your teacher to join a class.
        </p>

        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Enter batch code"
          autoFocus
        />

        <div className="modal-actions">
          <button className="cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            className="primary"
            disabled={!code.trim()}
            onClick={() => onSubmit(code.trim())}
          >
            Join
          </button>
        </div>
      </div>
    </div>,
    modalRoot,
  );
};

export default JoinClassModal;
