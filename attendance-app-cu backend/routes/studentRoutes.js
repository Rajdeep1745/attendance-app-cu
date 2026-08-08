const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const {
  getStudentsBySubject,
  addStudentToSubject,
  removeStudentFromSubject,
} = require("../controllers/studentController");

router.get(
  "/:subjectId",
  authMiddleware,
  roleMiddleware("teacher", "student"),
  getStudentsBySubject,
);

router.post(
  "/",
  authMiddleware,
  roleMiddleware("teacher"),
  addStudentToSubject,
);

router.delete(
  "/:studentId/:subjectId",
  authMiddleware,
  roleMiddleware("teacher"),
  removeStudentFromSubject,
);

module.exports = router;
