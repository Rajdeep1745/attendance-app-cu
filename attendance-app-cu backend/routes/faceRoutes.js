const express = require("express");

const router = express.Router();

const authMiddleware = require(
  "../middleware/authMiddleware",
);

const roleMiddleware = require(
  "../middleware/roleMiddleware",
);

const {
  faceRegistrationUpload,
} = require(
  "../middleware/uploadMiddleware",
);

const {
  registerStudentFace,
  registerMyFace,
} = require(
  "../controllers/faceController",
);


/**
 * STUDENT:
 *
 * Student registers their own face.
 *
 * Maximum 2 images.
 *
 * Multipart field:
 *
 *     faceImages
 */
router.post(
  "/students/me/register-face",

  authMiddleware,

  roleMiddleware("student"),

  faceRegistrationUpload.array(
    "faceImages",
    2,
  ),

  registerMyFace,
);


/**
 * TEACHER:
 *
 * Teacher registers a student's face.
 *
 * Maximum 2 images.
 *
 * Multipart field:
 *
 *     faceImages
 */
router.post(
  "/students/:id/register-face",

  authMiddleware,

  roleMiddleware("teacher"),

  faceRegistrationUpload.array(
    "faceImages",
    2,
  ),

  registerStudentFace,
);


module.exports = router;