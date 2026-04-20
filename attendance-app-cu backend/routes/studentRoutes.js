const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const {
  getStudentsByBatch,
  addStudent,
  removeStudentFromBatch,
  deleteStudent,
  getMyBatches,
  joinBatchByCode,
  leaveMyBatch,
  getMyBatchOverview,
  getMyBatchReports,
  getMyAttendanceByDate,
} = require("../controllers/studentController");

router.get(
  "/me/batches",
  authMiddleware,
  roleMiddleware("student"),
  getMyBatches,
);
router.post(
  "/me/join",
  authMiddleware,
  roleMiddleware("student"),
  joinBatchByCode,
);
router.delete(
  "/me/batches/:batchId",
  authMiddleware,
  roleMiddleware("student"),
  leaveMyBatch,
);
router.get(
  "/me/batches/:batchId/overview",
  authMiddleware,
  roleMiddleware("student"),
  getMyBatchOverview,
);
router.get(
  "/me/batches/:batchId/reports",
  authMiddleware,
  roleMiddleware("student"),
  getMyBatchReports,
);
router.get(
  "/me/attendance",
  authMiddleware,
  roleMiddleware("student"),
  getMyAttendanceByDate,
);

router.get(
  "/:batchId",
  authMiddleware,
  roleMiddleware("teacher", "student"),
  getStudentsByBatch,
);
router.post("/", authMiddleware, roleMiddleware("teacher"), addStudent);
router.delete(
  "/:id/:batchId",
  authMiddleware,
  roleMiddleware("teacher"),
  removeStudentFromBatch,
);
router.delete("/:id", authMiddleware, roleMiddleware("teacher"), deleteStudent);

module.exports = router;
