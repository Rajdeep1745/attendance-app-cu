import React, { useRef, useState, useEffect } from "react";
import PremiumDatePicker from "../premiumDatePicker/PremiumDatePicker";
import "./AutoAttendancePanel.css";

const formatLocalDate = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const readApiResponse = async (response) => {
  const contentType =
    response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();

  const preview = text
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);

  throw new Error(
    preview
      ? `Server returned a non-JSON response: ${preview}`
      : "Server returned an empty response",
  );
};

/**
 * AutoAttendancePanel
 *
 * Props:
 *   subjectId    - string
 *   students     - array of students
 *   onSaved      - called after attendance is saved
 *   showAlert    - alert helper
 *
 * Classroom image behavior:
 *
 *   - Images are added ONE AT A TIME.
 *   - Maximum 8 classroom images.
 *   - The teacher can remove any individual image.
 *   - A student found in ANY uploaded image is marked present.
 */
const AutoAttendancePanel = ({
  subjectId,
  students = [],
  onSaved,
  showAlert,
}) => {
  const today = formatLocalDate();

  // ---------------------------------------------------------
  // FILE INPUT
  // ---------------------------------------------------------

  const fileInputRef = useRef(null);

  // ---------------------------------------------------------
  // STATE
  // ---------------------------------------------------------

  const [date, setDate] = useState(today);

  const [files, setFiles] = useState([]);

  const [filePreviews, setFilePreviews] =
    useState([]);

  const [processing, setProcessing] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  // attendanceMap:
  //
  // {
  //   student_id: {
  //     present,
  //     auto_recognized,
  //     has_face,
  //     similarity,
  //     observations,
  //     image_indices
  //   }
  // }
  const [attendanceMap, setAttendanceMap] =
    useState(null);

  const registeredCount =
    students.filter(
      (student) =>
        student.faceRegistered,
    ).length;

  const MAX_IMAGES = 8;

  // ---------------------------------------------------------
  // CLEANUP PREVIEW URLS
  // ---------------------------------------------------------

  useEffect(() => {
    return () => {
      filePreviews.forEach((url) => {
        URL.revokeObjectURL(url);
      });
    };
  }, [filePreviews]);

  // ---------------------------------------------------------
  // OPEN FILE PICKER
  // ---------------------------------------------------------

  const openFilePicker = () => {
    if (files.length >= MAX_IMAGES) {
      setError(
        `You can upload a maximum of ${MAX_IMAGES} classroom images.`,
      );
      return;
    }

    setError("");

    /*
     * Reset the input value before opening it.
     *
     * This allows the teacher to select the same physical
     * file again after removing it.
     */
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  // ---------------------------------------------------------
  // ADD ONE CLASSROOM IMAGE
  // ---------------------------------------------------------

  const handleFileChange = (e) => {
    const selectedFile =
      e.target.files?.[0];

    /*
     * Because the input no longer has the `multiple`
     * attribute, we intentionally process only one file
     * per selection.
     */
    if (!selectedFile) {
      return;
    }

    setError("");
    setAttendanceMap(null);

    // -------------------------------------------------------
    // MAXIMUM IMAGE COUNT
    // -------------------------------------------------------

    if (files.length >= MAX_IMAGES) {
      setError(
        `You can upload a maximum of ${MAX_IMAGES} classroom images.`,
      );

      e.target.value = "";
      return;
    }

    // -------------------------------------------------------
    // FILE TYPE
    // -------------------------------------------------------

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (
      !allowedTypes.includes(
        selectedFile.type,
      )
    ) {
      setError(
        "Only JPEG, PNG, or WebP classroom images are allowed.",
      );

      e.target.value = "";
      return;
    }

    // -------------------------------------------------------
    // FILE SIZE
    // -------------------------------------------------------

    if (
      selectedFile.size >
      10 * 1024 * 1024
    ) {
      setError(
        `"${selectedFile.name}" is larger than 10 MB.`,
      );

      e.target.value = "";
      return;
    }

    // -------------------------------------------------------
    // DUPLICATE FILE CHECK
    // -------------------------------------------------------

    const duplicate = files.some(
      (file) =>
        file.name ===
          selectedFile.name &&
        file.size ===
          selectedFile.size &&
        file.lastModified ===
          selectedFile.lastModified,
    );

    if (duplicate) {
      setError(
        "This classroom image has already been added.",
      );

      e.target.value = "";
      return;
    }

    // -------------------------------------------------------
    // CREATE PREVIEW
    // -------------------------------------------------------

    const previewUrl =
      URL.createObjectURL(
        selectedFile,
      );

    // -------------------------------------------------------
    // APPEND — DO NOT REPLACE EXISTING FILES
    // -------------------------------------------------------

    setFiles((previousFiles) => [
      ...previousFiles,
      selectedFile,
    ]);

    setFilePreviews(
      (previousPreviews) => [
        ...previousPreviews,
        previewUrl,
      ],
    );

    /*
     * Reset the input after processing.
     *
     * This is important because selecting the same filename
     * later should still trigger onChange.
     */
    e.target.value = "";
  };

  // ---------------------------------------------------------
  // REMOVE ONE IMAGE
  // ---------------------------------------------------------

  const removeFile = (index) => {
    setError("");
    setAttendanceMap(null);

    /*
     * Revoke the object URL belonging to the removed image
     * to prevent unnecessary memory usage.
     */
    const previewToRemove =
      filePreviews[index];

    if (previewToRemove) {
      URL.revokeObjectURL(
        previewToRemove,
      );
    }

    setFiles((previousFiles) =>
      previousFiles.filter(
        (_, fileIndex) =>
          fileIndex !== index,
      ),
    );

    setFilePreviews(
      (previousPreviews) =>
        previousPreviews.filter(
          (_, previewIndex) =>
            previewIndex !== index,
        ),
    );
  };

  // ---------------------------------------------------------
  // CLEAR ALL IMAGES
  // ---------------------------------------------------------

  const clearAllFiles = () => {
    filePreviews.forEach((url) => {
      URL.revokeObjectURL(url);
    });

    setFiles([]);
    setFilePreviews([]);
    setAttendanceMap(null);
    setError("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // ---------------------------------------------------------
  // SUBMIT TO BACKEND
  // ---------------------------------------------------------

  const handleProcess = async () => {
    if (!files.length) {
      setError(
        "Please add at least one classroom image.",
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

      /*
       * IMPORTANT:
       *
       * We still send every image using the same
       * `faceImages` field.
       *
       * Therefore the backend / recognition service
       * does NOT need to change.
       */
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
        const row of
          data.attendance
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
            row.image_indices ||
            [],
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
      console.error(
        "[AutoAttendancePanel] Recognition error:",
        err,
      );

      setError(
        err.message ||
          "Recognition failed",
      );
    } finally {
      setProcessing(false);
    }
  };

  // ---------------------------------------------------------
  // TOGGLE ONE STUDENT
  // ---------------------------------------------------------

  const toggleStudent = (
    studentId,
  ) => {
    setAttendanceMap(
      (previous) => ({
        ...previous,

        [studentId]: {
          ...previous[studentId],

          present:
            !previous[
              studentId
            ].present,
        },
      }),
    );
  };

  // ---------------------------------------------------------
  // SAVE OVERRIDES
  // ---------------------------------------------------------

  const handleSave = async () => {
    if (!attendanceMap) {
      return;
    }

    setSaving(true);
    setError("");

    const overrides =
      Object.entries(
        attendanceMap,
      ).map(
        ([
          student_id,
          info,
        ]) => ({
          student_id,
          present:
            info.present,
        }),
      );

    try {
      const res =
        await fetch(
          `${process.env.REACT_APP_BACKEND_URL}api/attendance/${subjectId}/override`,
          {
            method: "PATCH",

            headers: {
              Authorization:
                `Bearer ${localStorage.getItem("token")}`,

              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              date,
              overrides,
            }),
          },
        );

      const data =
        await readApiResponse(res);

      if (!res.ok) {
        throw new Error(
          data.error ||
            "Save failed",
        );
      }

      showAlert &&
        showAlert(
          true,
          "Attendance saved!",
          "success",
        );

      onSaved &&
        onSaved();

    } catch (err) {
      console.error(
        "[AutoAttendancePanel] Save error:",
        err,
      );

      setError(
        err.message ||
          "Failed to save attendance",
      );
    } finally {
      setSaving(false);
    }
  };

  // ---------------------------------------------------------
  // PRESENT / ABSENT COUNTS
  // ---------------------------------------------------------

  const presentCount =
    attendanceMap
      ? Object.values(
          attendanceMap,
        ).filter(
          (value) =>
            value.present,
        ).length
      : 0;

  const totalCount =
    students.length;

  // ---------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------

  return (
    <div className="auto-attendance-panel">

      {/* ---------------------------------------------------
          REGISTRATION STATUS
      --------------------------------------------------- */}

      {registeredCount <
        totalCount && (
        <div className="alert alert-warning py-2 small mb-3">
          <i className="fa fa-exclamation-triangle me-1"></i>

          {registeredCount}/
          {totalCount} students
          have registered faces.

          Students without registered
          faces will be marked absent
          automatically.
        </div>
      )}

      {/* ---------------------------------------------------
          DATE + IMAGE UPLOAD
      --------------------------------------------------- */}

      <div className="row g-3 mb-3">

        {/* DATE */}

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

        {/* IMAGE UPLOAD */}

        <div className="col-sm-7">

          <label className="form-label small fw-semibold mb-1">
            Upload Classroom Images
          </label>

          {/*
            Hidden native file input.

            There is deliberately NO `multiple` attribute.
            Each click adds exactly one image.
          */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="auto-hidden-file-input"
            onChange={
              handleFileChange
            }
          />

          {/* ADD PHOTO BUTTON */}

          <button
            type="button"
            className="auto-add-photo-button"
            onClick={
              openFilePicker
            }
            disabled={
              files.length >=
              MAX_IMAGES
            }
          >
            <i className="fa fa-plus me-2"></i>

            {files.length === 0
              ? "Add classroom photo"
              : "Add another photo"}
          </button>

          {/* IMAGE COUNT */}

          <div className="auto-upload-meta">

            <span>
              {files.length}/
              {MAX_IMAGES} photos
            </span>

            <span>
              JPEG, PNG or WebP
            </span>

            <span>
              Max 10 MB each
            </span>

          </div>

          {/* DESCRIPTION */}

          <div className="form-text mt-1">
            Add photos one at a time.
            A student found in any one
            photo will be marked present.
          </div>

        </div>
      </div>

      {/* ---------------------------------------------------
          IMAGE PREVIEWS
      --------------------------------------------------- */}

      {filePreviews.length >
        0 && (
        <div className="auto-att-preview-section mb-3">

          <div className="auto-att-preview-header">

            <div>
              <div className="auto-att-preview-title">
                Classroom Photos
              </div>

              <div className="auto-att-preview-subtitle">
                {files.length}{" "}
                {files.length === 1
                  ? "photo"
                  : "photos"}{" "}
                ready for recognition
              </div>
            </div>

            <button
              type="button"
              className="auto-clear-photos-button"
              onClick={
                clearAllFiles
              }
            >
              <i className="fa fa-trash me-1"></i>
              Clear all
            </button>

          </div>

          <div className="auto-att-preview-grid">

            {filePreviews.map(
              (
                preview,
                index,
              ) => (
                <div
                  key={preview}
                  className="auto-att-preview-item"
                >

                  {/* SQUARE IMAGE FRAME */}

                  <div className="auto-att-preview-frame">

                    <img
                      src={preview}
                      alt={`Classroom ${index + 1}`}
                      className="auto-att-preview"
                    />

                    {/* IMAGE NUMBER */}

                    <div className="auto-att-preview-number">
                      Photo{" "}
                      {index + 1}
                    </div>

                    {/* REMOVE BUTTON */}

                    <button
                      type="button"
                      className="auto-att-remove-photo"
                      onClick={() =>
                        removeFile(
                          index,
                        )
                      }
                      aria-label={`Remove classroom photo ${index + 1}`}
                      title="Remove photo"
                    >
                      <i className="fa fa-times"></i>
                    </button>

                  </div>

                  <div className="auto-att-preview-file-name">
                    {files[
                      index
                    ]?.name ||
                      `Classroom photo ${
                        index + 1
                      }`}
                  </div>

                </div>
              ),
            )}

          </div>

        </div>
      )}

      {/* ---------------------------------------------------
          ERROR
      --------------------------------------------------- */}

      {error && (
        <div className="alert alert-danger py-2 small mb-3">
          <i className="fa fa-times-circle me-1"></i>
          {error}
        </div>
      )}

      {/* ---------------------------------------------------
          RECOGNITION BUTTON
      --------------------------------------------------- */}

      <button
        className="btn btn-primary btn-sm w-100 mb-3 auto-recognition-button"
        onClick={
          handleProcess
        }
        disabled={
          processing ||
          files.length === 0
        }
      >
        {processing ? (
          <>
            <span className="spinner-border spinner-border-sm me-2"></span>

            Analyzing{" "}
            {files.length} image
            {files.length !== 1
              ? "s"
              : ""}
            …
          </>
        ) : (
          <>
            <i className="fa fa-magic me-2"></i>
            Run Classroom
            Recognition
          </>
        )}
      </button>

      {/* ---------------------------------------------------
          REVIEW / OVERRIDE
      --------------------------------------------------- */}

      {attendanceMap && (
        <div className="override-section">

          <div className="d-flex justify-content-between align-items-center mb-2">

            <span className="fw-semibold small">
              Review & Override —{" "}
              {presentCount}/
              {totalCount} Present
            </span>

            <div className="d-flex gap-2">

              <button
                className="btn btn-outline-success btn-xs"
                onClick={() => {
                  const all = {};

                  students.forEach(
                    (student) => {
                      all[
                        student.id
                      ] = {
                        ...attendanceMap[
                          student.id
                        ],

                        present:
                          true,
                      };
                    },
                  );

                  setAttendanceMap(
                    all,
                  );
                }}
              >
                Mark All Present
              </button>

              <button
                className="btn btn-outline-danger btn-xs"
                onClick={() => {
                  const all = {};

                  students.forEach(
                    (student) => {
                      all[
                        student.id
                      ] = {
                        ...attendanceMap[
                          student.id
                        ],

                        present:
                          false,
                      };
                    },
                  );

                  setAttendanceMap(
                    all,
                  );
                }}
              >
                Mark All Absent
              </button>

            </div>
          </div>

          <div className="override-list">

            {students.map(
              (student) => {
                const info =
                  attendanceMap[
                    student.id
                  ] || {
                    present:
                      false,
                  };

                return (
                  <div
                    key={
                      student.id
                    }
                    className={`override-row ${
                      info.present
                        ? "present"
                        : "absent"
                    }`}
                    onClick={() =>
                      toggleStudent(
                        student.id,
                      )
                    }
                  >

                    <div className="override-avatar">

                      {student.avatar ? (
                        <img
                          src={
                            student.avatar
                          }
                          alt={
                            student.name
                          }
                        />
                      ) : (
                        student.name?.[0]?.toUpperCase() ||
                        "?"
                      )}

                    </div>

                    <div className="override-info">

                      <div className="override-name">
                        {student.name}
                      </div>

                      <div className="override-meta">

                        {student.roll}

                        {!info.has_face && (
                          <span
                            className="badge bg-secondary ms-2"
                            style={{
                              fontSize:
                                9,
                            }}
                          >
                            No face
                            registered
                          </span>
                        )}

                        {info.auto_recognized && (
                          <span
                            className="badge bg-primary ms-2"
                            style={{
                              fontSize:
                                9,
                            }}
                          >
                            Auto-recognized
                          </span>
                        )}

                        {info.auto_recognized &&
                          info.observations >
                            0 && (
                            <span
                              className="badge bg-success ms-2"
                              style={{
                                fontSize:
                                  9,
                              }}
                            >
                              Seen in{" "}
                              {
                                info.observations
                              }{" "}
                              photo
                              {info.observations !==
                              1
                                ? "s"
                                : ""}
                            </span>
                          )}

                      </div>
                    </div>

                    <div className="override-toggle">

                      <span
                        className={`badge ${
                          info.present
                            ? "bg-success"
                            : "bg-danger"
                        }`}
                      >
                        {info.present
                          ? "Present"
                          : "Absent"}
                      </span>

                      <i
                        className={`fa fa-toggle-${
                          info.present
                            ? "on text-success"
                            : "off text-secondary"
                        } ms-2`}
                      ></i>

                    </div>

                  </div>
                );
              },
            )}

          </div>

          {/* SAVE */}

          <button
            className="btn btn-success btn-sm w-100 mt-3"
            onClick={
              handleSave
            }
            disabled={saving}
          >
            {saving ? (
              <>
                <span className="spinner-border spinner-border-sm me-2"></span>
                Saving…
              </>
            ) : (
              <>
                <i className="fa fa-save me-2"></i>
                Save Attendance
              </>
            )}
          </button>

        </div>
      )}

    </div>
  );
};

export default AutoAttendancePanel;