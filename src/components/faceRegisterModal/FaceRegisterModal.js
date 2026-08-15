import React, {
  useEffect,
  useRef,
  useState,
} from "react";
import ReactDOM from "react-dom";

import "./FaceRegisterModal.css";


const MAX_IMAGES = 2;
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];


const FaceRegisterModal = ({
  isOpen,
  onClose,
  student,
  onSuccess,
  endpoint,
  title = "Register Face",
}) => {
  const [images, setImages] =
    useState([]);

  const [previews, setPreviews] =
    useState([]);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const fileInputRef =
    useRef(null);


  /* =======================================================
   * RESET
   * ===================================================== */

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setImages([]);
    setPreviews([]);
    setError("");
    setLoading(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [
    isOpen,
    student?.id,
  ]);


  /* =======================================================
   * CLEAN OBJECT URLS
   * ===================================================== */

  useEffect(() => {
    return () => {
      previews.forEach(
        (preview) => {
          URL.revokeObjectURL(
            preview,
          );
        },
      );
    };
  }, [previews]);


  /* =======================================================
   * CLOSE
   * ===================================================== */

  const handleClose = () => {
    previews.forEach(
      (preview) => {
        URL.revokeObjectURL(
          preview,
        );
      },
    );

    setImages([]);
    setPreviews([]);
    setError("");
    setLoading(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    onClose();
  };


  /* =======================================================
   * VALIDATE FILE
   * ===================================================== */

  const validateFile = (
    file,
  ) => {
    if (
      !ACCEPTED_TYPES.includes(
        file.type,
      )
    ) {
      return (
        "Only JPEG, PNG, and WebP images are allowed."
      );
    }

    if (
      file.size >
      MAX_FILE_SIZE
    ) {
      return (
        "Each image must be 5 MB or smaller."
      );
    }

    return null;
  };


  /* =======================================================
   * SELECT IMAGES
   * ===================================================== */

  const handleFileChange = (
    event,
  ) => {
    const selectedFiles =
      Array.from(
        event.target.files || [],
      );


    if (
      selectedFiles.length === 0
    ) {
      return;
    }


    setError("");


    /*
     * We never allow more than two
     * registration images.
     */
    if (
      images.length +
        selectedFiles.length >
      MAX_IMAGES
    ) {
      setError(
        "You can register with a maximum of 2 photos.",
      );

      event.target.value = "";

      return;
    }


    const validFiles = [];


    for (
      const file of selectedFiles
    ) {
      const validationError =
        validateFile(file);

      if (validationError) {
        setError(
          validationError,
        );

        event.target.value = "";

        return;
      }

      validFiles.push(file);
    }


    /*
     * Create previews only after
     * validation succeeds.
     */
    const newPreviews =
      validFiles.map(
        (file) =>
          URL.createObjectURL(
            file,
          ),
      );


    setImages(
      (previous) => [
        ...previous,
        ...validFiles,
      ],
    );


    setPreviews(
      (previous) => [
        ...previous,
        ...newPreviews,
      ],
    );


    event.target.value = "";
  };


  /* =======================================================
   * REMOVE IMAGE
   * ===================================================== */

  const handleRemoveImage = (
    index,
  ) => {
    if (loading) {
      return;
    }


    const previewToRemove =
      previews[index];


    if (
      previewToRemove
    ) {
      URL.revokeObjectURL(
        previewToRemove,
      );
    }


    setImages(
      (previous) =>
        previous.filter(
          (_, i) =>
            i !== index,
        ),
    );


    setPreviews(
      (previous) =>
        previous.filter(
          (_, i) =>
            i !== index,
        ),
    );


    setError("");
  };


  /* =======================================================
   * OPEN FILE PICKER
   * ===================================================== */

  const handleChoosePhoto =
    () => {
      if (loading) {
        return;
      }

      if (
        images.length >=
        MAX_IMAGES
      ) {
        setError(
          "You already selected the maximum of 2 photos.",
        );

        return;
      }

      fileInputRef.current?.click();
    };


  /* =======================================================
   * REGISTER FACE
   * ===================================================== */

  const handleSubmit =
    async () => {
      if (
        images.length === 0
      ) {
        setError(
          "Please select at least one photo.",
        );

        return;
      }


      if (!student?.id) {
        setError(
          "Student ID is missing.",
        );

        return;
      }


      setLoading(true);
      setError("");


      try {
        const formData =
          new FormData();


        /*
         * IMPORTANT:
         *
         * The backend expects:
         *
         * faceImages
         *
         * and accepts the field
         * multiple times.
         */
        images.forEach(
          (image) => {
            formData.append(
              "faceImages",
              image,
            );
          },
        );


        /*
         * The backend face routes
         * are mounted at /api/face.
         */
        const registerEndpoint =
          endpoint ||
          `${process.env.REACT_APP_BACKEND_URL}api/face/students/${student.id}/register-face`;


        const token =
          localStorage.getItem(
            "token",
          );


        if (!token) {
          throw new Error(
            "Authentication token not found.",
          );
        }


        const response =
          await fetch(
            registerEndpoint,
            {
              method: "POST",

              headers: {
                Authorization:
                  `Bearer ${token}`,
              },

              /*
               * DO NOT set Content-Type here.
               *
               * The browser automatically
               * creates multipart/form-data
               * with the required boundary.
               */
              body: formData,
            },
          );


        let data = {};

        try {
          data =
            await response.json();
        } catch {
          data = {};
        }


        if (!response.ok) {
          throw new Error(
            data?.error ||
              "Face registration failed.",
          );
        }


        /*
         * Notify the parent component.
         */
        onSuccess?.(data);


        handleClose();

      } catch (err) {
        console.error(
          "[FaceRegisterModal] Registration error:",
          err,
        );


        setError(
          err.message ||
            "Face registration failed.",
        );

      } finally {
        setLoading(false);
      }
    };


  /* =======================================================
   * MODAL
   * ===================================================== */

  if (
    !isOpen ||
    !student
  ) {
    return null;
  }


  return ReactDOM.createPortal(
    <>
      <div
        className="frm-backdrop"
        onClick={
          loading
            ? undefined
            : handleClose
        }
      />


      <div
        className="frm-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="face-register-title"
      >

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="frm-header">

          <div className="frm-header-left">

            <i
              className="fa fa-camera frm-header-icon"
              aria-hidden="true"
            />

            <span
              className="frm-title"
              id="face-register-title"
            >
              {title}
            </span>

            <span className="frm-student-name">
              - {student.name}
            </span>

          </div>


          <button
            type="button"
            className="frm-close-btn"
            onClick={handleClose}
            disabled={loading}
            aria-label="Close"
          >
            <i
              className="fa fa-times"
              aria-hidden="true"
            />
          </button>

        </div>


        {/* =================================================
            BODY
        ================================================= */}

        <div className="frm-body">

          <p className="frm-hint">
            Add up to 2 clear photos of the
            same person. Using two different
            views helps the recognition system
            handle changes in angle and lighting.
            <strong> The first photo will be used as your profile picture.</strong>
          </p>


          {/* ===============================================
              PHOTO GRID
          =============================================== */}

          <div className="frm-photo-grid">

            {previews.map(
              (preview, index) => (
                <div
                  className="frm-photo-card"
                  key={`${preview}-${index}`}
                >

                  <div className="frm-photo-label">
                    Photo {index + 1}
                  </div>


                  <div className="frm-preview-wrap">

                    <img
                      src={preview}
                      alt={`Face registration preview ${index + 1}`}
                      className="frm-preview-img"
                    />


                    {!loading && (
                      <button
                        type="button"
                        className="frm-photo-remove"
                        onClick={() =>
                          handleRemoveImage(
                            index,
                          )
                        }
                        aria-label={`Remove photo ${index + 1}`}
                      >
                        <i
                          className="fa fa-times"
                          aria-hidden="true"
                        />
                      </button>
                    )}

                  </div>

                </div>
              ),
            )}


            {/* =============================================
                ADD PHOTO SLOT
            ============================================= */}

            {images.length <
              MAX_IMAGES && (

              <button
                type="button"
                className="frm-add-photo"
                onClick={
                  handleChoosePhoto
                }
                disabled={loading}
              >

                <i
                  className="fa fa-plus"
                  aria-hidden="true"
                />

                <span>
                  {images.length ===
                  0
                    ? "Add photo"
                    : "Add second photo"}
                </span>

              </button>

            )}

          </div>


          {/* ===============================================
              FILE INPUT
          =============================================== */}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="frm-file-input"
            onChange={
              handleFileChange
            }
            disabled={loading}
            multiple={
              images.length === 0
            }
          />


          <p className="frm-file-hint">
            JPEG, PNG or WebP · Maximum
            5 MB per photo · Up to 2 photos
          </p>


          {/* ===============================================
              REGISTRATION GUIDANCE
          =============================================== */}

          <div className="frm-guidance">

            <div className="frm-guidance-title">
              <i
                className="fa fa-lightbulb"
                aria-hidden="true"
              />

              <span>
                For better recognition
              </span>
            </div>


            <ul>
              <li>
                Keep only one face visible
                in each photo.
              </li>

              <li>
                Use different angles when
                possible.
              </li>

              <li>
                Avoid heavy blur or faces
                that are too small.
              </li>

              <li>
                If using two photos, make
                them meaningfully different
                rather than nearly identical.
              </li>
            </ul>

          </div>


          {/* ===============================================
              ERROR
          =============================================== */}

          {error && (
            <div
              className="frm-error"
              role="alert"
            >

              <i
                className="fa fa-exclamation-circle me-1"
                aria-hidden="true"
              />

              {error}

            </div>
          )}

        </div>


        {/* =================================================
            FOOTER
        ================================================= */}

        <div className="frm-footer">

          <button
            type="button"
            className="frm-btn-cancel"
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </button>


          <button
            type="button"
            className="frm-btn-submit"
            onClick={handleSubmit}
            disabled={
              loading ||
              images.length === 0
            }
          >

            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" />

                Registering...
              </>
            ) : (
              <>
                <i
                  className="fa fa-check me-2"
                  aria-hidden="true"
                />

                Register Face
              </>
            )}

          </button>

        </div>

      </div>
    </>,
    document.getElementById(
      "modal-root",
    ),
  );
};


export default FaceRegisterModal;