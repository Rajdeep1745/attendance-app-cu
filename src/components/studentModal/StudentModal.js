import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import "./StudentModal.css";

const modalRoot = document.getElementById("modal-root");

const EMPTY_FORM = {
  name: "",
  email: "",
  roll: "",
  department: "",
  institution: "",
};

const StudentModal = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] =
    useState(false);

  useEffect(() => {
    if (!isOpen) {
      setForm(EMPTY_FORM);
      setSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async () => {
    const name = form.name.trim();
    const email = form.email.trim();
    const roll = form.roll.trim();
    const department = form.department.trim();
    const institution = form.institution.trim();

    if (
      !name ||
      !email ||
      !roll ||
      !department ||
      !institution
    ) {
      return;
    }

    try {
      setSubmitting(true);

      /*
       * Only send the form data.
       *
       * TeacherStudents.js adds the current subjectId
       * before calling the backend.
       */
      await onSubmit({
        name,
        email,
        roll,
        department,
        institution,
      });

      onClose();
    } catch (err) {
      /*
       * TeacherStudents normally handles the API error
       * itself, but keep this here so the modal does not
       * silently close if the parent throws.
       */
      console.error(
        "[StudentModal] Submit error:",
        err,
      );
    } finally {
      setSubmitting(false);
    }
  };

  const isDisabled =
    submitting ||
    !form.name.trim() ||
    !form.email.trim() ||
    !form.roll.trim() ||
    !form.department.trim() ||
    !form.institution.trim();

  return createPortal(
    <div
      className="modal-backdrop"
      onClick={onClose}
    >
      <div
        className="student-modal"
        onClick={(e) =>
          e.stopPropagation()
        }
      >
        {/* HEADER */}

        <div className="student-modal-header">
          <div>
            <h3>Add New Student</h3>

            <p>
              Enter the details for the new student
              to enroll them in this subject.
            </p>
          </div>

          <button
            className="close-btn"
            onClick={onClose}
            disabled={submitting}
          >
            ✕
          </button>
        </div>

        {/* BODY */}

        <div className="student-modal-body">
          <label>
            Student Name

            <input
              type="text"
              name="name"
              placeholder="John Doe"
              value={form.name}
              onChange={handleChange}
              disabled={submitting}
            />
          </label>

          <label>
            Email

            <input
              type="email"
              name="email"
              placeholder="john.doe@example.com"
              value={form.email}
              onChange={handleChange}
              disabled={submitting}
            />
          </label>

          <label>
            Roll Number

            <input
              type="text"
              name="roll"
              placeholder="20CS101"
              value={form.roll}
              onChange={handleChange}
              disabled={submitting}
            />
          </label>

          <label>
            Department

            <input
              type="text"
              name="department"
              placeholder="Computer Science"
              value={form.department}
              onChange={handleChange}
              disabled={submitting}
            />
          </label>

          <label>
            Institution

            <input
              type="text"
              name="institution"
              placeholder="ABC College"
              value={form.institution}
              onChange={handleChange}
              disabled={submitting}
            />
          </label>
        </div>

        {/* FOOTER */}

        <div className="student-modal-actions">
          <button
            className="cancel-text"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>

          <button
            className="btn btn-primary"
            disabled={isDisabled}
            onClick={handleSubmit}
          >
            {submitting ? (
              <>
                <span className="spinner-border spinner-border-sm me-2"></span>
                Adding...
              </>
            ) : (
              <>
                <i className="fa-solid fa-user-plus"></i>{" "}
                Add Student
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    modalRoot,
  );
};

export default StudentModal;