const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const {
  getBatches,
  getSelectedBatches,
  getBatchBySubject,
  updateThreshold,
} = require("../controllers/batchController");

router.get("/", authMiddleware, roleMiddleware("teacher"), getBatches);
router.get(
  "/:id",
  authMiddleware,
  roleMiddleware("teacher", "student"),
  getSelectedBatches,
);
router.get(
  "/subject/:subjectId",
  authMiddleware,
  roleMiddleware("teacher", "student"),
  getBatchBySubject,
);
router.patch(
  "/:id/threshold",
  authMiddleware,
  roleMiddleware("teacher"),
  updateThreshold,
);

module.exports = router;
