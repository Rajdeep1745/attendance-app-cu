import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import "./BatchModal.css";

const modalRoot = document.getElementById("modal-root");

const BatchModal = ({ isOpen, onClose, mode, batch, onSubmit }) => {
  const [name, setName] = useState("");

  useEffect(() => {
    setName(batch?.name || "");
  }, [batch]);

  if (!isOpen) return null;

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <h3>
          {mode === "add" && "Add New Batch"}
          {mode === "rename" && "Rename Batch"}
          {mode === "delete" && "Delete Batch"}
        </h3>

        {mode === "delete" ? (
          <p className="delete-text">
            Are you sure you want to delete <strong>{batch?.name}</strong>?
            <br />
            This action cannot be undone.
          </p>
        ) : (
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Batch name"
            autoFocus
          />
        )}

        <div className="modal-actions">
          <button className="cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            className={`primary ${mode === "delete" ? "danger" : ""}`}
            disabled={mode !== "delete" && !name.trim()}
            onClick={() => onSubmit(mode === "delete" ? batch.id : name.trim())}
          >
            {mode === "add" && "Add"}
            {mode === "rename" && "Save"}
            {mode === "delete" && "Delete"}
          </button>
        </div>
      </div>
    </div>,
    modalRoot
  );
};

export default BatchModal;
