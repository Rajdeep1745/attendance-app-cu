const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const { classroomImageUpload } = require("../middleware/uploadMiddleware");

const {
  getAttendanceStats,
  getAttendanceGraph,
  getDailyAttendance,
  getFrequentAbsentees,
  getStudentAttendanceByDate,
  markAttendanceByFace,
  overrideAttendance,
  markManualAttendance,
} = require("../controllers/attendanceController");

// Attendance statistics
router.get(
  "/:subjectId/stats",
  authMiddleware,
  roleMiddleware("teacher", "student"),
  getAttendanceStats,
);

// Attendance graph
router.get(
  "/:subjectId/graph",
  authMiddleware,
  roleMiddleware("teacher"),
  getAttendanceGraph,
);

// Daily attendance
router.get(
  "/:subjectId/daily",
  authMiddleware,
  roleMiddleware("teacher"),
  getDailyAttendance,
);

// Frequent absentees
router.get(
  "/:subjectId/frequent-absentees",
  authMiddleware,
  roleMiddleware("teacher"),
  getFrequentAbsentees,
);

// Student attendance by date
router.get(
  "/student",
  authMiddleware,
  roleMiddleware("student"),
  getStudentAttendanceByDate,
);

// Face attendance
router.post(
  "/:subjectId/face",
  authMiddleware,
  roleMiddleware("teacher"),
  classroomImageUpload.array("faceImages", 8),
  markAttendanceByFace,
);

// Override attendance
router.patch(
  "/:subjectId/override",
  authMiddleware,
  roleMiddleware("teacher"),
  overrideAttendance,
);

// Manual attendance
router.post(
  "/:subjectId/mark",
  authMiddleware,
  roleMiddleware("teacher"),
  markManualAttendance,
);

module.exports = router;
