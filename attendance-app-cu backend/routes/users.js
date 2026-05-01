const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const { profileImageUpload } = require("../middleware/uploadMiddleware");
const {
  getCurrentUser,
  updateProfile,
  updateTeacherAvatar,
} = require("../controllers/usersController");

const uploadProfileAvatar = (req, res, next) => {
  profileImageUpload.single("avatar")(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    next();
  });
};

// GET profile
router.get("/me", auth, getCurrentUser);

// UPDATE profile
router.patch("/me", auth, updateProfile);

// UPDATE teacher profile photo
router.patch(
  "/me/avatar",
  auth,
  roleMiddleware("teacher"),
  uploadProfileAvatar,
  updateTeacherAvatar,
);

module.exports = router;
