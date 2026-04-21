const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const {
  getAttendanceStats,
  getAttendanceGraph,
  getDailyAttendance,
  getFrequentAbsentees,
} = require("../controllers/attendanceController");

router.get(
  "/:id/stats",
  authMiddleware,
  roleMiddleware("teacher", "student"),
  getAttendanceStats,
);
router.get(
  "/:id/graph",
  authMiddleware,
  roleMiddleware("teacher"),
  getAttendanceGraph,
);
router.get(
  "/:batchId/daily",
  authMiddleware,
  roleMiddleware("teacher"),
  getDailyAttendance,
);
router.get(
  "/:id/frequent-absentees",
  authMiddleware,
  roleMiddleware("teacher"),
  getFrequentAbsentees,
);

module.exports = router;

// ── Add at the top with other requires ──────────────────────────────
const { faceMediaUpload } = require('../middleware/uploadMiddleware');
const {
  // ... existing imports ...
  markAttendanceByFace,
  overrideAttendance,
  markManualAttendance,
} = require('../controllers/attendanceController');

// ── Add after existing GET routes ──────────────────────────────────

// Auto attendance from class photo or video
router.post(
  '/:batchId/face',
  authMiddleware,
  roleMiddleware('teacher'),
  faceMediaUpload.single('faceMedia'),
  markAttendanceByFace
);

// Override individual student status after face scan
router.patch(
  '/:batchId/override',
  authMiddleware,
  roleMiddleware('teacher'),
  overrideAttendance
);

// Fully manual attendance (also fixes the missing endpoint noted in the guide)
router.post(
  '/:batchId/mark',
  authMiddleware,
  roleMiddleware('teacher'),
  markManualAttendance
);
