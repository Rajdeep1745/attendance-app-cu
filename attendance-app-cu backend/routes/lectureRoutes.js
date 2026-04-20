const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const {
  getCurriculum,
  saveCurriculum,
  getPlan,
  savePlan,
} = require("../controllers/lectureController");

// Curriculum
router.get(
  "/curriculum/:batchId",
  authMiddleware,
  roleMiddleware("teacher", "student"),
  getCurriculum,
);
router.post(
  "/curriculum/:batchId",
  authMiddleware,
  roleMiddleware("teacher"),
  saveCurriculum,
);

// Teaching Plan
router.get(
  "/plan/:batchId",
  authMiddleware,
  roleMiddleware("teacher", "student"),
  getPlan,
);
router.post(
  "/plan/:batchId",
  authMiddleware,
  roleMiddleware("teacher"),
  savePlan,
);

module.exports = router;
