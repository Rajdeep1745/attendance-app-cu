const multer = require("multer");

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

const ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
];


/**
 * Face registration upload.
 *
 * IMPORTANT:
 *
 * Registration accepts a maximum of TWO images.
 *
 * The field name is:
 *
 *     faceImages
 *
 * Example multipart request:
 *
 *     faceImages = photo1.jpg
 *     faceImages = photo2.jpg
 */
const faceRegistrationUpload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 2,
  },

  fileFilter(req, file, cb) {
    if (
      ALLOWED_IMAGE_TYPES.includes(
        file.mimetype,
      )
    ) {
      cb(null, true);
      return;
    }

    cb(
      new Error(
        "Only JPEG, PNG, or WebP images are allowed for face registration",
      ),
    );
  },
});


/**
 * Kept for other existing parts of the application
 * that still use a single face image.
 */
const faceImageUpload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 5 * 1024 * 1024,
  },

  fileFilter(req, file, cb) {
    if (
      ALLOWED_IMAGE_TYPES.includes(
        file.mimetype,
      )
    ) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Only JPEG, PNG, or WebP images are allowed for face registration",
        ),
      );
    }
  },
});


const profileImageUpload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 5 * 1024 * 1024,
  },

  fileFilter(req, file, cb) {
    if (
      ALLOWED_IMAGE_TYPES.includes(
        file.mimetype,
      )
    ) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Only JPEG, PNG, or WebP images are allowed for profile photos",
        ),
      );
    }
  },
});


const faceMediaUpload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 100 * 1024 * 1024,
  },

  fileFilter(req, file, cb) {
    const allowed = [
      ...ALLOWED_IMAGE_TYPES,
      ...ALLOWED_VIDEO_TYPES,
    ];

    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Only images (JPEG/PNG/WebP) or videos (MP4/WebM/MOV) are allowed",
        ),
      );
    }
  },
});

/**
 * Classroom recognition upload.
 *
 * Phase 4:
 * Multiple classroom images only.
 *
 * Field name:
 *     faceImages
 *
 * Maximum:
 *     8 images
 *
 * Maximum per image:
 *     10 MB
 */
const classroomImageUpload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 8,
  },

  fileFilter(req, file, cb) {
    if (
      ALLOWED_IMAGE_TYPES.includes(
        file.mimetype,
      )
    ) {
      cb(null, true);
      return;
    }

    cb(
      new Error(
        "Only JPEG, PNG, or WebP classroom images are allowed",
      ),
    );
  },
});

module.exports = {
  faceRegistrationUpload,
  faceImageUpload,
  faceMediaUpload,
  classroomImageUpload,
  profileImageUpload,
};