import React from "react";

export default function ConfirmModal({
  open,
  title = "Are you sure?",
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  busy = false,
}) {
  if (!open) return null;

  return (
    <div
      className="app-confirm-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel?.();
      }}
    >
      <section
        className="app-confirm-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="app-confirm-title"
        aria-describedby="app-confirm-message"
      >
        <div className="app-confirm-icon" aria-hidden="true">!</div>
        <h2 id="app-confirm-title">{title}</h2>
        <p id="app-confirm-message">{message}</p>
        <div className="app-confirm-actions">
          <button type="button" className="admin-secondary-button" onClick={onCancel} disabled={busy}>
            {cancelText}
          </button>
          <button type="button" className="admin-danger-button" onClick={onConfirm} disabled={busy}>
            {busy ? "Working…" : confirmText}
          </button>
        </div>
      </section>
    </div>
  );
}
