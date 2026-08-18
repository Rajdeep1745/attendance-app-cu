"""
Multiprocessing worker for classroom face recognition.

Each worker process owns its own FaceEngine instance.

IMPORTANT:
Do not create the FaceEngine in the parent process and pass it
to the workers. TensorFlow / ONNX model objects should remain
inside the process that uses them.
"""

from typing import Any, Dict, List

import numpy as np

import config

from face_engine import get_face_engine
from image_utils import decode_base64_image


# ============================================================
# WORKER INITIALIZATION
# ============================================================

def initialize_recognition_worker() -> None:
    """
    Initialize RetinaFace + ArcFace once inside each worker.

    ProcessPoolExecutor calls this function once when the
    worker process starts.

    Keeping the model loaded means we do NOT reload RetinaFace
    and ArcFace for every classroom image.
    """

    print(
        "[RecognitionWorker] Initializing worker process..."
    )

    engine = get_face_engine()

    print(
        "[RecognitionWorker] Worker ready."
    )


# ============================================================
# SINGLE CLASSROOM IMAGE
# ============================================================

def recognize_single_classroom_image(
    task: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Process exactly one classroom image.

    The worker performs:

        1. Base64 decoding
        2. RetinaFace detection
        3. Classroom tile recovery
        4. ArcFace embedding generation
        5. Student-template matching

    The main Flask process later combines the results from
    all workers.

    Input:

    {
        "image_index": 1,
        "image_b64": "...",
        "students": [...],
        "threshold": 0.50
    }

    Output:

    {
        "image_index": 1,
        "faces_detected": 10,
        "recognized_students": 4,
        "matches": [...]
    }
    """

    image_index = int(
        task["image_index"]
    )

    image_b64 = task[
        "image_b64"
    ]

    students = task[
        "students"
    ]

    threshold = float(
        task["threshold"]
    )

    # --------------------------------------------------------
    # DECODE IMAGE
    # --------------------------------------------------------

    try:

        image = decode_base64_image(
            image_b64
        )

    except ValueError as exc:

        return {
            "success": False,
            "image_index": image_index,
            "error": "invalid_image",
            "message": str(exc),
        }

    # --------------------------------------------------------
    # GET PROCESS-LOCAL FACE ENGINE
    # --------------------------------------------------------

    engine = get_face_engine()

    # --------------------------------------------------------
    # EXTRACT ALL FACES
    # --------------------------------------------------------

    faces = (
        engine.extract_all_face_embeddings(
            image
        )
    )

    total_faces = len(
        faces
    )

    # --------------------------------------------------------
    # BEST MATCH PER STUDENT IN THIS IMAGE
    # --------------------------------------------------------

    best_matches_this_image = {}

    for face_index, face in enumerate(
        faces
    ):

        match = (
            engine.find_best_match(
                face["embedding"],
                students,
                threshold,
            )
        )

        if match is None:
            continue

        student_id = match[
            "id"
        ]

        observation = {
            "id":
                student_id,

            "similarity":
                match[
                    "similarity"
                ],

            "matched_sample":
                match[
                    "matched_sample"
                ],

            "image_index":
                image_index,

            "face_index":
                face_index,

            "detection_score":
                round(
                    float(
                        face[
                            "detection_score"
                        ]
                    ),
                    6,
                ),

            "quality":
                face[
                    "quality"
                ],
        }

        previous = (
            best_matches_this_image.get(
                student_id
            )
        )

        if (
            previous is None
            or observation[
                "similarity"
            ]
            > previous[
                "similarity"
            ]
        ):

            best_matches_this_image[
                student_id
            ] = observation

    matches = list(
        best_matches_this_image.values()
    )

    return {
        "success": True,

        "image_index":
            image_index,

        "faces_detected":
            total_faces,

        "recognized_students":
            len(matches),

        "matches":
            matches,
    }