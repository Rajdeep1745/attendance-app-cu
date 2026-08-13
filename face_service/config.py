import os


# ============================================================
# SERVER
# ============================================================

HOST = os.getenv(
    "FACE_SERVICE_HOST",
    "0.0.0.0",
)

PORT = int(
    os.getenv(
        "FACE_SERVICE_PORT",
        os.getenv("PORT", "5001"),
    )
)


# ============================================================
# MODEL CONFIGURATION
# ============================================================

INSIGHTFACE_MODEL_PACK = os.getenv(
    "INSIGHTFACE_MODEL_PACK",
    "buffalo_l",
)

ARC_FACE_MODEL_FILE = os.getenv(
    "ARC_FACE_MODEL_FILE",
    "w600k_r50.onnx",
)

ARC_FACE_EMBEDDING_DIMENSION = 512

ARC_FACE_INPUT_SIZE = 112


# ============================================================
# RETINAFACE DETECTION
# ============================================================

# Registration is deliberately stricter because these
# embeddings become permanent identity references.

REGISTRATION_DETECTION_THRESHOLD = float(
    os.getenv(
        "REGISTRATION_DETECTION_THRESHOLD",
        "0.90",
    )
)


# Classroom recognition needs higher recall because faces
# can be small, dark, angled or partially occluded.

RECOGNITION_DETECTION_THRESHOLD = float(
    os.getenv(
        "RECOGNITION_DETECTION_THRESHOLD",
        "0.75",
    )
)


# ============================================================
# REGISTRATION QUALITY
# ============================================================

MIN_FACE_SIZE_REGISTRATION = int(
    os.getenv(
        "MIN_FACE_SIZE_REGISTRATION",
        "70",
    )
)


MIN_FACE_AREA_RATIO_REGISTRATION = float(
    os.getenv(
        "MIN_FACE_AREA_RATIO_REGISTRATION",
        "0.02",
    )
)


MIN_BLUR_SCORE_REGISTRATION = float(
    os.getenv(
        "MIN_BLUR_SCORE_REGISTRATION",
        "40.0",
    )
)


MIN_BRIGHTNESS_REGISTRATION = float(
    os.getenv(
        "MIN_BRIGHTNESS_REGISTRATION",
        "35.0",
    )
)


MAX_BRIGHTNESS_REGISTRATION = float(
    os.getenv(
        "MAX_BRIGHTNESS_REGISTRATION",
        "225.0",
    )
)


MIN_CONTRAST_REGISTRATION = float(
    os.getenv(
        "MIN_CONTRAST_REGISTRATION",
        "20.0",
    )
)


# ============================================================
# CLASSROOM FACE QUALITY
# ============================================================

MIN_FACE_SIZE_RECOGNITION = int(
    os.getenv(
        "MIN_FACE_SIZE_RECOGNITION",
        "40",
    )
)

# ============================================================
# CLASSROOM FACE QUALITY
# ============================================================

MIN_FACE_SIZE_RECOGNITION = int(
    os.getenv(
        "MIN_FACE_SIZE_RECOGNITION",
        "40",
    )
)


# ============================================================
# CLASSROOM TILE DETECTION
# ============================================================

# Normal detection threshold is 0.75.
#
# Tiled recovery uses a lower threshold because the image
# region is enlarged before RetinaFace sees it.
RECOGNITION_RECOVERY_DETECTION_THRESHOLD = float(
    os.getenv(
        "RECOGNITION_RECOVERY_DETECTION_THRESHOLD",
        "0.55",
    )
)


# Minimum face size allowed specifically in the recovery
# pipeline.
#
# This is lower than MIN_FACE_SIZE_RECOGNITION because
# tiled images are enlarged before detection/embedding.
MIN_FACE_SIZE_RECOVERY = int(
    os.getenv(
        "MIN_FACE_SIZE_RECOVERY",
        "28",
    )
)


# Percentage of overlap between neighboring classroom tiles.
#
# This prevents faces near tile boundaries from being cut off.
CLASSROOM_TILE_OVERLAP = float(
    os.getenv(
        "CLASSROOM_TILE_OVERLAP",
        "0.25",
    )
)


# Maximum number of tiles generated from one classroom image.
CLASSROOM_MAX_TILES = int(
    os.getenv(
        "CLASSROOM_MAX_TILES",
        "9",
    )
)


# Each tile is enlarged by this factor before RetinaFace
# recovery detection.
CLASSROOM_TILE_SCALE = float(
    os.getenv(
        "CLASSROOM_TILE_SCALE",
        "2.0",
    )
)


# Don't generate extremely small tiles.
CLASSROOM_MIN_TILE_SIZE = int(
    os.getenv(
        "CLASSROOM_MIN_TILE_SIZE",
        "220",
    )
)


# IoU threshold used to merge the same face detected in
# overlapping tiles.
CLASSROOM_DEDUP_IOU = float(
    os.getenv(
        "CLASSROOM_DEDUP_IOU",
        "0.35",
    )
)

# ============================================================
# CLASSROOM LOW-QUALITY RECOVERY
# ============================================================

# Images below this average brightness are considered
# candidates for illumination enhancement.
#
# This does NOT mean the image is rejected.
# It only activates the recovery pipeline.
RECOGNITION_LOW_LIGHT_BRIGHTNESS = float(
    os.getenv(
        "RECOGNITION_LOW_LIGHT_BRIGHTNESS",
        "70.0",
    )
)


# Low contrast can make facial structure difficult for
# RetinaFace and ArcFace.
#
# Again, this is only a trigger for recovery processing.
RECOGNITION_LOW_CONTRAST = float(
    os.getenv(
        "RECOGNITION_LOW_CONTRAST",
        "28.0",
    )
)


# When a classroom face is small, run an additional
# enlarged-image detection pass.
RECOGNITION_SMALL_FACE_TRIGGER = int(
    os.getenv(
        "RECOGNITION_SMALL_FACE_TRIGGER",
        "70",
    )
)


# Enlargement factor for the small-face recovery pass.
#
# 1.5x is deliberately moderate because very aggressive
# enlargement increases computation and can amplify noise.
RECOGNITION_UPSCALE_FACTOR = float(
    os.getenv(
        "RECOGNITION_UPSCALE_FACTOR",
        "1.5",
    )
)


# CLAHE parameters used for local contrast enhancement.
RECOGNITION_CLAHE_CLIP_LIMIT = float(
    os.getenv(
        "RECOGNITION_CLAHE_CLIP_LIMIT",
        "2.0",
    )
)

RECOGNITION_CLAHE_TILE_SIZE = int(
    os.getenv(
        "RECOGNITION_CLAHE_TILE_SIZE",
        "8",
    )
)


# Gamma used for dark-image recovery.
#
# Gamma > 1 brightens shadows when applied using
# inverse-gamma mapping.
RECOGNITION_BRIGHTEN_GAMMA = float(
    os.getenv(
        "RECOGNITION_BRIGHTEN_GAMMA",
        "1.5",
    )
)


# Sharpening is intentionally mild.
#
# We do NOT want aggressive sharpening to create artificial
# facial edges that could distort ArcFace embeddings.

RECOGNITION_DEDUP_IOU = float(
    os.getenv(
        "RECOGNITION_DEDUP_IOU",
        "0.45",
    )
)


# ============================================================
# REGISTRATION TEMPLATE VERIFICATION
# ============================================================

# When two registration images are supplied, ArcFace compares
# their embeddings to make sure they represent the same person.
#
# IMPORTANT:
#
# This is a provisional threshold.
# It must be calibrated against your real images later.
#
# We intentionally make registration stricter than ordinary
# classroom matching because we are creating the student's
# identity template here.

REGISTRATION_PAIR_SIMILARITY_THRESHOLD = float(
    os.getenv(
        "REGISTRATION_PAIR_SIMILARITY_THRESHOLD",
        "0.60",
    )
)


# ============================================================
# CLASSROOM MATCHING
# ============================================================

# Provisional only.
#
# This is NOT the final attendance threshold.
#
# We will determine the real threshold using:
#
# - genuine matches
# - different-person matches
# - different poses
# - low-light images
# - classroom-distance images
# - occlusions
#
DEFAULT_COSINE_THRESHOLD = float(
    os.getenv(
        "DEFAULT_COSINE_THRESHOLD",
        "0.50",
    )
)

# ============================================================
# CLASSROOM MULTI-IMAGE RECOGNITION
# ============================================================

# Maximum number of classroom images in one recognition run.
CLASSROOM_MAX_IMAGES = int(
    os.getenv(
        "CLASSROOM_MAX_IMAGES",
        "8",
    )
)

# Maximum size of each classroom image.
CLASSROOM_IMAGE_MAX_BYTES = int(
    os.getenv(
        "CLASSROOM_IMAGE_MAX_BYTES",
        str(10 * 1024 * 1024),
    )
)

# Classroom recognition threshold.
#
# A student is marked PRESENT when they are recognized
# successfully in ANY ONE of the uploaded classroom images.
CLASSROOM_MATCH_THRESHOLD = float(
    os.getenv(
        "CLASSROOM_MATCH_THRESHOLD",
        str(DEFAULT_COSINE_THRESHOLD),
    )
)


# ============================================================
# IMAGE LIMITS
# ============================================================

MAX_IMAGE_BYTES = int(
    os.getenv(
        "MAX_IMAGE_BYTES",
        str(10 * 1024 * 1024),
    )
)


# Flask receives base64 JSON, which is considerably larger
# than the original binary image.

MAX_REQUEST_BYTES = int(
    os.getenv(
        "MAX_REQUEST_BYTES",
        str(140 * 1024 * 1024),
    )
)


# ============================================================
# MODEL STORAGE
# ============================================================

MODEL_ROOT = os.getenv(
    "INSIGHTFACE_HOME",
    os.path.expanduser("~/.insightface"),
)