const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const {
  getTeacherSubjects,
  getStudentSubjects,
  getSelectedSubjects,
  updateThreshold,
  getStudentSubjectOverview,
  getStudentSubjectReports,
} = require("../controllers/batchController");

router.get(
  "/teacher",
  authMiddleware,
  roleMiddleware("teacher"),
  getTeacherSubjects,
);

router.get(
  "/student",
  authMiddleware,
  roleMiddleware("student"),
  getStudentSubjects,
);

router.get(
  "/:subjectId",
  authMiddleware,
  roleMiddleware("teacher", "student"),
  getSelectedSubjects,
);

router.patch(
  "/:subjectId/threshold",
  authMiddleware,
  roleMiddleware("teacher"),
  updateThreshold,
);

router.get(
  "/:subjectId/overview",
  authMiddleware,
  roleMiddleware("student"),
  getStudentSubjectOverview,
);

router.get(
  "/:subjectId/reports",
  authMiddleware,
  roleMiddleware("student"),
  getStudentSubjectReports,
);

module.exports = router;
