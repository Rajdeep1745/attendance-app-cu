const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

const roleMiddleware = require("../middleware/roleMiddleware");

const { getStudentsBySubject } = require("../controllers/studentController");

// =========================================================
// GET STUDENTS OF A SUBJECT
// =========================================================


router.get(
  "/:subjectId",
  authMiddleware,
  roleMiddleware("teacher", "student"),
  getStudentsBySubject,
);

module.exports = router;
