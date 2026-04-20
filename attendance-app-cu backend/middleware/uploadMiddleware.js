const multer = require('multer');

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];

// For face registration — single image only
const faceImageUpload = multer({
  storage: multer.memoryStorage(),         // keep file in memory buffer, no disk write
  limits: { fileSize: 5 * 1024 * 1024 },  // 5 MB max
  fileFilter(req, file, cb) {
    if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, or WebP images are allowed for face registration'));
    }
  }
});

// For attendance marking — image or video
const faceMediaUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB max (for videos)
  fileFilter(req, file, cb) {
    const allowed = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only images (JPEG/PNG/WebP) or videos (MP4/WebM/MOV) are allowed'));
    }
  }
});

module.exports = { faceImageUpload, faceMediaUpload };