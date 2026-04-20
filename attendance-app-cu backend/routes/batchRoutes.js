const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const {
  getBatches,
  getSelectedBatches,
  addBatch,
  deleteBatch,
  renameBatch,
  updateThreshold,
} = require("../controllers/batchController");

router.get("/", authMiddleware, roleMiddleware("teacher"), getBatches);
router.get(
  "/:id",
  authMiddleware,
  roleMiddleware("teacher", "student"),
  getSelectedBatches,
);
router.post("/", authMiddleware, roleMiddleware("teacher"), addBatch);
router.delete("/:id", authMiddleware, roleMiddleware("teacher"), deleteBatch);
router.patch("/:id", authMiddleware, roleMiddleware("teacher"), renameBatch);
router.patch(
  "/:id/threshold",
  authMiddleware,
  roleMiddleware("teacher"),
  updateThreshold,
);

module.exports = router;
