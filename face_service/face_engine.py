import os

# ============================================================
# CPU THREAD CONFIGURATION
# ============================================================

# RetinaFace 0.0.18 expects the legacy Keras API when
# TensorFlow 2.16+ is used.
#
# This MUST happen before TensorFlow / RetinaFace is imported.
os.environ["TF_USE_LEGACY_KERAS"] = "1"


# Each multiprocessing worker gets a controlled number
# of TensorFlow/OpenMP CPU threads.
#
# For an 8-core VM:
#
#     4 workers × 2 threads = 8 CPU threads
#
# This prevents CPU oversubscription.
#
# IMPORTANT:
# These environment variables must be set BEFORE TensorFlow
# is imported.

try:
    import config as _cpu_config

    _threads_per_worker = str(
        _cpu_config.RECOGNITION_CPU_THREADS_PER_WORKER
    )

except Exception:
    _threads_per_worker = "2"


os.environ.setdefault(
    "TF_NUM_INTRAOP_THREADS",
    _threads_per_worker,
)

os.environ.setdefault(
    "TF_NUM_INTEROP_THREADS",
    "1",
)

os.environ.setdefault(
    "OMP_NUM_THREADS",
    _threads_per_worker,
)

os.environ.setdefault(
    "MKL_NUM_THREADS",
    _threads_per_worker,
)


import threading
from typing import Any, Dict, List, Optional

import cv2
import numpy as np

from retinaface import RetinaFace

from insightface.model_zoo.arcface_onnx import ArcFaceONNX
from insightface.utils.storage import ensure_available

import config

from image_utils import (
    calculate_face_quality,
    clamp_bbox,
    get_image_quality,
    enhance_low_light_image,
    upscale_for_recognition,
    generate_classroom_tiles,
)


# ============================================================
# ARC FACE STANDARD ALIGNMENT TEMPLATE
# ============================================================

ARC_FACE_TEMPLATE = np.array(
    [
        [38.2946, 51.6963],
        [73.5318, 51.5014],
        [56.0252, 71.7366],
        [41.5493, 92.3655],
        [70.7299, 92.2041],
    ],
    dtype=np.float32,
)


class FaceEngine:
    """
    Central face-recognition engine.

    Responsibilities:

    1. RetinaFace detection
    2. Five-point landmark extraction
    3. Face quality assessment
    4. ArcFace alignment
    5. ArcFace embedding generation
    6. L2 normalization
    7. Cosine similarity
    8. Two-image registration verification
    9. Multi-face classroom extraction
    10. Student-template matching
    """

    def __init__(self) -> None:
        self._lock = threading.Lock()

        self.retina_model = None
        self.arcface_model = None

        self._initialize_models()

    # ========================================================
    # MODEL INITIALIZATION
    # ========================================================

    def _initialize_models(self) -> None:
        """
        Load RetinaFace and ArcFace once when the service starts.
        """

        print(
            "[FaceEngine] Initializing RetinaFace..."
        )

        self.retina_model = (
            RetinaFace.build_model()
        )

        print(
            "[FaceEngine] RetinaFace initialized."
        )

        print(
            "[FaceEngine] Preparing InsightFace model pack:",
            config.INSIGHTFACE_MODEL_PACK,
        )

        model_directory = ensure_available(
            "models",
            config.INSIGHTFACE_MODEL_PACK,
            root=config.MODEL_ROOT,
        )

        arcface_path = os.path.join(
            model_directory,
            config.ARC_FACE_MODEL_FILE,
        )

        if not os.path.isfile(
            arcface_path
        ):
            raise FileNotFoundError(
                "ArcFace model was not found: "
                f"{arcface_path}"
            )

        print(
            "[FaceEngine] Loading ArcFace model:",
            arcface_path,
        )

        self.arcface_model = ArcFaceONNX(
            model_file=arcface_path,
        )

        # CPU for the current deployment.
        #
        # GPU support can be added later.
        self.arcface_model.prepare(
            ctx_id=-1,
        )

        print(
            "[FaceEngine] ArcFace output shape:",
            self.arcface_model.output_shape,
        )

        print(
            "[FaceEngine] Face engine initialized successfully."
        )

    # ========================================================
    # RETINAFACE DETECTION
    # ========================================================

    def detect_faces(
        self,
        image: np.ndarray,
        detection_threshold: float,
    ) -> List[Dict[str, Any]]:
        """
        Run RetinaFace and normalize its result.

        Each returned face contains:

        {
            "bbox": [x1, y1, x2, y2],
            "score": detection confidence,
            "landmarks": five points
        }
        """

        if image is None:
            raise ValueError(
                "invalid_image"
            )

        try:
            detections = (
                RetinaFace.detect_faces(
                    image,
                    threshold=detection_threshold,
                    model=self.retina_model,
                    allow_upscaling=True,
                )
            )

        except Exception as exc:
            print(
                "[FaceEngine] RetinaFace error:",
                repr(exc),
            )

            return []

        if not detections:
            return []

        if not isinstance(
            detections,
            dict,
        ):
            return []

        faces: List[
            Dict[str, Any]
        ] = []

        for _, detection in (
            detections.items()
        ):
            if not isinstance(
                detection,
                dict,
            ):
                continue

            score = float(
                detection.get(
                    "score",
                    0.0,
                )
            )

            facial_area = detection.get(
                "facial_area"
            )

            landmarks = detection.get(
                "landmarks"
            )

            if (
                facial_area is None
                or landmarks is None
            ):
                continue

            bbox = clamp_bbox(
                np.asarray(
                    facial_area,
                    dtype=np.float32,
                ),
                image,
            )

            normalized_landmarks = (
                self._normalize_landmarks(
                    landmarks
                )
            )

            if (
                normalized_landmarks
                is None
            ):
                continue

            faces.append(
                {
                    "bbox": bbox,
                    "score": score,
                    "landmarks": (
                        normalized_landmarks
                    ),
                }
            )

        faces.sort(
            key=lambda face: face[
                "score"
            ],
            reverse=True,
        )

        return faces

    # ========================================================
    # LANDMARK NORMALIZATION
    # ========================================================

    @staticmethod
    def _normalize_landmarks(
        landmarks: Dict[str, Any],
    ) -> Optional[np.ndarray]:
        """
        Convert RetinaFace's five landmarks into the order
        required by the ArcFace alignment template.
        """

        required = [
            "right_eye",
            "left_eye",
            "nose",
            "mouth_right",
            "mouth_left",
        ]

        if not all(
            key in landmarks
            for key in required
        ):
            return None

        try:
            points = np.array(
                [
                    landmarks[
                        "right_eye"
                    ],
                    landmarks[
                        "left_eye"
                    ],
                    landmarks[
                        "nose"
                    ],
                    landmarks[
                        "mouth_right"
                    ],
                    landmarks[
                        "mouth_left"
                    ],
                ],
                dtype=np.float32,
            )

        except Exception:
            return None

        if points.shape != (
            5,
            2,
        ):
            return None

        if not np.isfinite(
            points
        ).all():
            return None

        return points

    # ========================================================
    # FACE QUALITY
    # ========================================================

    def evaluate_face_quality(
        self,
        image: np.ndarray,
        face: Dict[str, Any],
        registration: bool,
    ) -> Dict[str, Any]:
        """
        Evaluate whether the detected face is suitable
        for generating an identity embedding.
        """

        bbox = face[
            "bbox"
        ]

        quality = (
            calculate_face_quality(
                image,
                bbox,
            )
        )

        reasons: List[
            str
        ] = []

        face_width = quality[
            "face_width"
        ]

        face_height = quality[
            "face_height"
        ]

        if registration:

            if (
                face_width
                < config.MIN_FACE_SIZE_REGISTRATION
                or face_height
                < config.MIN_FACE_SIZE_REGISTRATION
            ):
                reasons.append(
                    "face_too_small"
                )

            if (
                quality[
                    "face_area_ratio"
                ]
                < config.MIN_FACE_AREA_RATIO_REGISTRATION
            ):
                reasons.append(
                    "face_occupies_too_little_image"
                )

            if (
                quality[
                    "blur_score"
                ]
                < config.MIN_BLUR_SCORE_REGISTRATION
            ):
                reasons.append(
                    "image_too_blurry"
                )

            if (
                quality[
                    "brightness"
                ]
                < config.MIN_BRIGHTNESS_REGISTRATION
            ):
                reasons.append(
                    "image_too_dark"
                )

            if (
                quality[
                    "brightness"
                ]
                > config.MAX_BRIGHTNESS_REGISTRATION
            ):
                reasons.append(
                    "image_overexposed"
                )

            if (
                quality[
                    "contrast"
                ]
                < config.MIN_CONTRAST_REGISTRATION
            ):
                reasons.append(
                    "image_has_low_contrast"
                )

        else:

            if (
                face_width
                < config.MIN_FACE_SIZE_RECOGNITION
                or face_height
                < config.MIN_FACE_SIZE_RECOGNITION
            ):
                reasons.append(
                    "face_too_small"
                )

        return {
            **quality,
            "acceptable": (
                len(reasons) == 0
            ),
            "reasons": reasons,
        }

    # ========================================================
    # ALIGNMENT
    # ========================================================

    @staticmethod
    def align_face(
        image: np.ndarray,
        landmarks: np.ndarray,
    ) -> np.ndarray:
        """
        Align the detected face to ArcFace's standard
        112x112 five-point geometry.
        """

        if landmarks.shape != (
            5,
            2,
        ):
            raise ValueError(
                "Expected five facial landmarks"
            )

        transform_matrix, _ = (
            cv2.estimateAffinePartial2D(
                landmarks,
                ARC_FACE_TEMPLATE,
                method=cv2.LMEDS,
            )
        )

        if transform_matrix is None:
            raise ValueError(
                "Could not calculate face alignment"
            )

        aligned = cv2.warpAffine(
            image,
            transform_matrix,
            (
                config.ARC_FACE_INPUT_SIZE,
                config.ARC_FACE_INPUT_SIZE,
            ),
            flags=cv2.INTER_LINEAR,
            borderMode=cv2.BORDER_CONSTANT,
            borderValue=(
                0,
                0,
                0,
            ),
        )

        if (
            aligned is None
            or aligned.size == 0
        ):
            raise ValueError(
                "Face alignment failed"
            )

        return aligned

    # ========================================================
    # ARC FACE EMBEDDING
    # ========================================================

    def generate_embedding(
        self,
        aligned_face: np.ndarray,
    ) -> np.ndarray:
        """
        Generate a 512-dimensional normalized ArcFace
        embedding from an aligned 112x112 face.
        """

        if aligned_face.shape[:2] != (
            config.ARC_FACE_INPUT_SIZE,
            config.ARC_FACE_INPUT_SIZE,
        ):
            raise ValueError(
                "ArcFace input must be 112x112"
            )

        with self._lock:
            embedding = (
                self.arcface_model.get_feat(
                    aligned_face
                )
            )

        embedding = np.asarray(
            embedding,
            dtype=np.float32,
        ).reshape(-1)

        if (
            embedding.size
            != config.ARC_FACE_EMBEDDING_DIMENSION
        ):
            raise ValueError(
                "Unexpected ArcFace embedding dimension: "
                f"{embedding.size}"
            )

        norm = np.linalg.norm(
            embedding
        )

        if norm <= 1e-12:
            raise ValueError(
                "ArcFace produced a zero embedding"
            )

        embedding = (
            embedding / norm
        )

        return embedding.astype(
            np.float32
        )

    # ========================================================
    # SINGLE FACE
    # ========================================================

    def extract_single_face_embedding(
        self,
        image: np.ndarray,
        registration: bool = True,
    ) -> Dict[str, Any]:
        """
        Extract exactly one usable face.

        This is used by the single-image endpoint and
        internally by the two-image registration flow.
        """

        threshold = (
            config.REGISTRATION_DETECTION_THRESHOLD
            if registration
            else config.RECOGNITION_DETECTION_THRESHOLD
        )

        faces = self.detect_faces(
            image,
            detection_threshold=threshold,
        )

        if len(faces) == 0:
            raise ValueError(
                "no_face_detected"
            )

        if len(faces) > 1:
            raise ValueError(
                "multiple_faces_detected"
            )

        face = faces[0]

        quality = (
            self.evaluate_face_quality(
                image,
                face,
                registration=registration,
            )
        )

        if not quality[
            "acceptable"
        ]:
            error = ValueError(
                "face_quality_insufficient"
            )

            error.quality = quality

            raise error

        aligned = self.align_face(
            image,
            face[
                "landmarks"
            ],
        )

        embedding = (
            self.generate_embedding(
                aligned
            )
        )

        return {
            "embedding": embedding,
            "bbox": face[
                "bbox"
            ],
            "detection_score": face[
                "score"
            ],
            "quality": quality,
        }

    # ========================================================
    # TWO-IMAGE REGISTRATION
    # ========================================================

    def register_two_images(
        self,
        image_one: np.ndarray,
        image_two: Optional[np.ndarray] = None,
    ) -> Dict[str, Any]:
        """
        Generate one or two registration embeddings.

        If only image_one is supplied:
            → one valid embedding

        If image_two is supplied:
            → two valid embeddings
            → verify that both belong to the same person

        The two embeddings are deliberately kept separate.

        We do NOT average them.

        Keeping separate templates lets attendance later
        compare a classroom face against the best of the
        student's registration samples.
        """

        first = (
            self.extract_single_face_embedding(
                image_one,
                registration=True,
            )
        )

        embeddings = [
            first[
                "embedding"
            ]
        ]

        image_results = [
            {
                "image_index": 1,
                "embedding": first[
                    "embedding"
                ],
                "detection_score": first[
                    "detection_score"
                ],
                "quality": first[
                    "quality"
                ],
            }
        ]

        pair_similarity = None

        if image_two is not None:

            second = (
                self.extract_single_face_embedding(
                    image_two,
                    registration=True,
                )
            )

            pair_similarity = (
                self.cosine_similarity(
                    first[
                        "embedding"
                    ],
                    second[
                        "embedding"
                    ],
                )
            )

            # Do not allow two unrelated faces to become
            # one student's identity template.
            if (
                pair_similarity
                < config.REGISTRATION_PAIR_SIMILARITY_THRESHOLD
            ):
                error = ValueError(
                    "registration_images_do_not_match"
                )

                error.pair_similarity = (
                    pair_similarity
                )

                error.threshold = (
                    config.REGISTRATION_PAIR_SIMILARITY_THRESHOLD
                )

                raise error

            embeddings.append(
                second[
                    "embedding"
                ]
            )

            image_results.append(
                {
                    "image_index": 2,
                    "embedding": second[
                        "embedding"
                    ],
                    "detection_score": second[
                        "detection_score"
                    ],
                    "quality": second[
                        "quality"
                    ],
                }
            )

        return {
            "embeddings": embeddings,
            "image_results": image_results,
            "image_count": len(
                embeddings
            ),
            "pair_similarity": (
                None
                if pair_similarity is None
                else round(
                    float(
                        pair_similarity
                    ),
                    6,
                )
            ),
            "pair_threshold": (
                config.REGISTRATION_PAIR_SIMILARITY_THRESHOLD
                if image_two is not None
                else None
            ),
        }

    # ========================================================
# MULTI-FACE CLASSROOM EXTRACTION
# ========================================================

    # ============================================================
# TILE COORDINATE CONVERSION
# ============================================================

    @staticmethod
    def _move_face_to_full_image(
        face: Dict[str, Any],
        offset_x: int,
        offset_y: int,
        scale: float,
    ) -> Dict[str, Any]:
        """
        Convert a detection from an enlarged classroom tile
        back into the coordinate system of the original image.
        """

        bbox = (
            np.asarray(
                face["bbox"],
                dtype=np.float32,
            )
            / float(scale)
        )

        bbox[0] += offset_x
        bbox[1] += offset_y
        bbox[2] += offset_x
        bbox[3] += offset_y

        landmarks = (
            np.asarray(
                face["landmarks"],
                dtype=np.float32,
            )
            / float(scale)
        )

        landmarks[:, 0] += offset_x
        landmarks[:, 1] += offset_y

        return {
            **face,
            "bbox": bbox,
            "landmarks": landmarks,
            "source": "tile",
        }
        
    # ============================================================
# BOUNDING BOX IOU
# ============================================================

    @staticmethod
    def _bbox_iou(
        bbox_a: np.ndarray,
        bbox_b: np.ndarray,
    ) -> float:
        """
        Intersection-over-union between two bounding boxes.
        """

        ax1, ay1, ax2, ay2 = bbox_a
        bx1, by1, bx2, by2 = bbox_b

        ix1 = max(
            ax1,
            bx1,
        )

        iy1 = max(
            ay1,
            by1,
        )

        ix2 = min(
            ax2,
            bx2,
        )

        iy2 = min(
            ay2,
            by2,
        )

        iw = max(
            0.0,
            ix2 - ix1,
        )

        ih = max(
            0.0,
            iy2 - iy1,
        )

        intersection = (
            iw * ih
        )

        area_a = max(
            0.0,
            (ax2 - ax1)
            * (ay2 - ay1),
        )

        area_b = max(
            0.0,
            (bx2 - bx1)
            * (by2 - by1),
        )

        union = (
            area_a
            + area_b
            - intersection
        )

        if union <= 1e-12:
            return 0.0

        return float(
            intersection / union
        )

    # ============================================================
    # MULTI-FACE CLASSROOM EXTRACTION
    # ============================================================

    def extract_all_face_embeddings(
        self,
        image: np.ndarray,
    ) -> List[Dict[str, Any]]:
        """
        Extract all usable faces from a classroom image.

        Detection strategy:

        PASS 1
            Full-resolution original image.

        PASS 2
            Overlapping local tiles.
            Each tile is enlarged before RetinaFace.

        PASS 3
            Optional enhanced tiles for difficult lighting.

        Tile detections are mapped back to the original image
        and duplicate detections are removed.

        This is specifically designed for classroom/group
        photographs where faces occupy a small portion of the
        complete image.
        """

        if (
            image is None
            or image.size == 0
        ):
            return []

        # ========================================================
        # PASS 1 — ORIGINAL IMAGE
        # ========================================================

        original_faces = self.detect_faces(
            image,
            detection_threshold=(
                config.RECOGNITION_DETECTION_THRESHOLD
            ),
        )

        candidates = []

        for face in original_faces:

            candidates.append(
                {
                    "face": face,
                    "source": "original",
                    "embedding_image": image,
                }
            )

        # ========================================================
        # PASS 2 — OVERLAPPING TILES
        # ========================================================

        tiles = generate_classroom_tiles(
            image,
            overlap=(
                config.CLASSROOM_TILE_OVERLAP
            ),
            max_tiles=(
                config.CLASSROOM_MAX_TILES
            ),
            min_tile_size=(
                config.CLASSROOM_MIN_TILE_SIZE
            ),
        )

        for tile_index, tile_info in enumerate(
            tiles,
            start=1,
        ):

            tile = tile_info["image"]

            offset_x = tile_info["x"]
            offset_y = tile_info["y"]

            try:

                scale = (
                    config.CLASSROOM_TILE_SCALE
                )

                enlarged_tile = cv2.resize(
                    tile,
                    None,
                    fx=scale,
                    fy=scale,
                    interpolation=cv2.INTER_CUBIC,
                )

                tile_faces = self.detect_faces(
                    enlarged_tile,
                    detection_threshold=(
                        config.RECOGNITION_RECOVERY_DETECTION_THRESHOLD
                    ),
                )

            except Exception as exc:

                print(
                    "[FaceEngine] Tile detection failed:",
                    repr(exc),
                )

                continue

            for face in tile_faces:

                mapped_face = (
                    self._move_face_to_full_image(
                        face,
                        offset_x,
                        offset_y,
                        scale,
                    )
                )

                # Keep the enlarged tile as the embedding source.
                #
                # This is important.
                #
                # We do NOT detect a 30 px face in the tile and
                # then immediately throw away the extra pixels.
                #
                # ArcFace gets the enlarged tile.
                candidates.append(
                    {
                        "face":
                            face,

                        "mapped_face":
                            mapped_face,

                        "source":
                            f"tile_{tile_index}",

                        "embedding_image":
                            enlarged_tile,

                        "offset_x":
                            offset_x,

                        "offset_y":
                            offset_y,

                        "scale":
                            scale,
                    }
                )

        # ========================================================
        # DEDUPLICATE
        # ========================================================

        unique = []

        for candidate in candidates:

            if "mapped_face" in candidate:

                face_for_compare = (
                    candidate[
                        "mapped_face"
                    ]
                )

            else:

                face_for_compare = (
                    candidate["face"]
                )

            bbox = np.asarray(
                face_for_compare["bbox"],
                dtype=np.float32,
            )

            duplicate_index = None

            for index, existing in enumerate(
                unique
            ):

                existing_bbox = np.asarray(
                    existing[
                        "face_full"
                    ]["bbox"],
                    dtype=np.float32,
                )

                iou = self._bbox_iou(
                    bbox,
                    existing_bbox,
                )

                if (
                    iou
                    >= config.CLASSROOM_DEDUP_IOU
                ):

                    duplicate_index = index

                    break

            if duplicate_index is None:

                unique.append(
                    {
                        "candidate":
                            candidate,

                        "face_full":
                            face_for_compare,
                    }
                )

            else:

                existing = unique[
                    duplicate_index
                ]

                existing_score = float(
                    existing[
                        "face_full"
                    ]["score"]
                )

                candidate_score = float(
                    face_for_compare[
                        "score"
                    ]
                )

                if (
                    candidate_score
                    > existing_score
                ):

                    unique[
                        duplicate_index
                    ] = {
                        "candidate":
                            candidate,

                        "face_full":
                            face_for_compare,
                    }

        # ========================================================
        # EMBEDDINGS
        # ========================================================

        results = []

        for item in unique:

            candidate = item[
                "candidate"
            ]

            full_face = item[
                "face_full"
            ]

            source_image = candidate[
                "embedding_image"
            ]

            # ----------------------------------------------------
            # If detection came from the original image
            # ----------------------------------------------------

            if (
                candidate["source"]
                == "original"
            ):

                embedding_face = (
                    candidate["face"]
                )

                embedding_bbox = (
                    embedding_face["bbox"]
                )

                embedding_landmarks = (
                    embedding_face[
                        "landmarks"
                    ]
                )

            # ----------------------------------------------------
            # If detection came from a tile
            # ----------------------------------------------------

            else:

                embedding_face = (
                    candidate["face"]
                )

                embedding_bbox = (
                    embedding_face["bbox"]
                )

                embedding_landmarks = (
                    embedding_face[
                        "landmarks"
                    ]
                )

            # ----------------------------------------------------
            # Quality check
            #
            # For tiled detections, quality is measured on the
            # enlarged tile, because that is what ArcFace sees.
            # ----------------------------------------------------

            quality = (
                self.evaluate_face_quality(
                    source_image,
                    {
                        **embedding_face,
                        "bbox":
                            embedding_bbox,
                    },
                    registration=False,
                )
            )

            # Tiled recovery may intentionally work with faces
            # smaller than the normal 40px rule.
            #
            # Therefore only reject extremely tiny detections.
            if (
                quality["face_width"]
                < config.MIN_FACE_SIZE_RECOVERY
                or
                quality["face_height"]
                < config.MIN_FACE_SIZE_RECOVERY
            ):
                continue

            try:

                aligned = self.align_face(
                    source_image,
                    embedding_landmarks,
                )

                embedding = (
                    self.generate_embedding(
                        aligned
                    )
                )

            except Exception as exc:

                print(
                    "[FaceEngine] Failed to embed classroom face:",
                    repr(exc),
                )

                continue

            results.append(
                {
                    "embedding":
                        embedding,

                    # Always report coordinates in the
                    # ORIGINAL classroom image.
                    "bbox":
                        full_face[
                            "bbox"
                        ],

                    "detection_score":
                        float(
                            full_face[
                                "score"
                            ]
                        ),

                    "quality":
                        quality,

                    "source":
                        candidate[
                            "source"
                        ],
                }
            )

        return results
    
    # ========================================================
    # COSINE SIMILARITY
    # ========================================================

    @staticmethod
    def cosine_similarity(
        embedding_a: np.ndarray,
        embedding_b: np.ndarray,
    ) -> float:
        """
        Calculate cosine similarity between two embeddings.

        Both embeddings are normalized before comparison.
        """

        a = np.asarray(
            embedding_a,
            dtype=np.float32,
        ).reshape(-1)

        b = np.asarray(
            embedding_b,
            dtype=np.float32,
        ).reshape(-1)

        if (
            a.size
            != config.ARC_FACE_EMBEDDING_DIMENSION
            or b.size
            != config.ARC_FACE_EMBEDDING_DIMENSION
        ):
            raise ValueError(
                "Embeddings must be 512-dimensional"
            )

        a_norm = np.linalg.norm(
            a
        )

        b_norm = np.linalg.norm(
            b
        )

        if a_norm <= 1e-12:
            raise ValueError(
                "First embedding is zero"
            )

        if b_norm <= 1e-12:
            raise ValueError(
                "Second embedding is zero"
            )

        return float(
            np.dot(
                a / a_norm,
                b / b_norm,
            )
        )

    # ========================================================
    # BEST STUDENT MATCH
    # ========================================================

    def find_best_match(
        self,
        query_embedding: np.ndarray,
        students: List[
            Dict[str, Any]
        ],
        threshold: float,
    ) -> Optional[
        Dict[str, Any]
    ]:
        """
        Compare one classroom face against all registered
        student templates.

        Each student can contain:

        {
            "id": "...",
            "embeddings": [
                [512 values],
                [512 values]
            ]
        }

        The best similarity across the student's registration
        images is used.
        """

        best_student = None
        best_similarity = -1.0
        best_sample_index = None

        for student in students:

            student_id = student.get(
                "id"
            )

            if not student_id:
                continue

            raw_embeddings = (
                student.get(
                    "embeddings"
                )
            )

            # Backward compatibility for one embedding.
            if raw_embeddings is None:

                single_embedding = (
                    student.get(
                        "embedding"
                    )
                )

                if (
                    single_embedding
                    is None
                ):
                    continue

                raw_embeddings = [
                    single_embedding
                ]

            for (
                sample_index,
                raw_embedding,
            ) in enumerate(
                raw_embeddings,
                start=1,
            ):

                try:

                    reference = np.asarray(
                        raw_embedding,
                        dtype=np.float32,
                    ).reshape(-1)

                    if (
                        reference.size
                        != config.ARC_FACE_EMBEDDING_DIMENSION
                    ):
                        continue

                    similarity = (
                        self.cosine_similarity(
                            query_embedding,
                            reference,
                        )
                    )

                except Exception:
                    continue

                if (
                    similarity
                    > best_similarity
                ):
                    best_similarity = (
                        similarity
                    )

                    best_student = (
                        student_id
                    )

                    best_sample_index = (
                        sample_index
                    )

        if (
            best_student is None
            or best_similarity
            < threshold
        ):
            return None

        return {
            "id": best_student,
            "similarity": round(
                best_similarity,
                6,
            ),
            "matched_sample": (
                best_sample_index
            ),
        }


# ============================================================
# SINGLETON
# ============================================================

_engine: Optional[
    FaceEngine
] = None

_engine_lock = threading.Lock()


def get_face_engine() -> FaceEngine:
    """
    Lazily initialize the face engine once.
    """

    global _engine

    if _engine is None:

        with _engine_lock:

            if _engine is None:
                _engine = (
                    FaceEngine()
                )

    return _engine