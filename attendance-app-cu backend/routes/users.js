const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const {
  getCurrentUser,
  updateProfile,
} = require("../controllers/usersController");

// GET profile
router.get("/me", auth, getCurrentUser);

// UPDATE profile
router.patch("/me", auth, updateProfile);

module.exports = router;
