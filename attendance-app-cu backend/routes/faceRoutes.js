const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const { faceImageUpload } = require('../middleware/uploadMiddleware');
const { registerStudentFace } = require('../controllers/faceController');

router.post(
  '/students/:id/register-face',
  authMiddleware,
  roleMiddleware('teacher'),
  faceImageUpload.single('faceImage'),
  registerStudentFace
);

module.exports = router;