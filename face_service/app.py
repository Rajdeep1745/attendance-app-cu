import atexit
import traceback

from concurrent.futures import (
    ProcessPoolExecutor,
    as_completed,
)

from typing import Any, Dict

from flask import (
    Flask,
    jsonify,
    request,
)

import config

from face_engine import (
    get_face_engine,
)

from image_utils import (
    decode_base64_image,
)

from recognition_worker import (
    initialize_recognition_worker,
    recognize_single_classroom_image,
)



app = Flask(__name__)

app.config[
    "MAX_CONTENT_LENGTH"
] = config.MAX_REQUEST_BYTES

# ============================================================
# CLASSROOM RECOGNITION PROCESS POOL
# ============================================================

_recognition_pool = None


def get_recognition_pool():
    """
    Lazily create the multiprocessing pool.

    Each worker initializes its own:
        RetinaFace
        ArcFace

    The pool stays alive between recognition requests so that
    model initialization happens only once per worker.
    """

    global _recognition_pool

    if _recognition_pool is None:

        worker_count = min(
            config.RECOGNITION_WORKERS,
            config.RECOGNITION_MAX_PARALLEL_IMAGES,
            config.CLASSROOM_MAX_IMAGES,
        )

        print(
            "[app] Creating recognition process pool:",
            worker_count,
            "workers",
        )

        _recognition_pool = (
            ProcessPoolExecutor(
                max_workers=worker_count,
                initializer=(
                    initialize_recognition_worker
                ),
            )
        )

    return _recognition_pool


def shutdown_recognition_pool():
    """
    Cleanly shut down worker processes when Flask exits.
    """

    global _recognition_pool

    if _recognition_pool is not None:

        print(
            "[app] Shutting down recognition workers..."
        )

        _recognition_pool.shutdown(
            wait=True,
            cancel_futures=True,
        )

        _recognition_pool = None


atexit.register(
    shutdown_recognition_pool
)

# ============================================================
# HEALTH
# ============================================================

@app.route(
    "/health",
    methods=["GET"],
)
def health():

    return jsonify(
        {
            "status": "ok",
            "service": "face-recognition",
            "detector": "RetinaFace",
            "recognizer": "ArcFace",
            "embedding_dimension": (
                config.ARC_FACE_EMBEDDING_DIMENSION
            ),
        }
    )


# ============================================================
# MODEL HEALTH
# ============================================================

@app.route(
    "/health/models",
    methods=["GET"],
)
def model_health():

    try:

        engine = (
            get_face_engine()
        )

        return jsonify(
            {
                "status": "ok",
                "retinaface_loaded": (
                    engine.retina_model
                    is not None
                ),
                "arcface_loaded": (
                    engine.arcface_model
                    is not None
                ),
                "embedding_dimension": (
                    config.ARC_FACE_EMBEDDING_DIMENSION
                ),
                "arcface_input_size": [
                    config.ARC_FACE_INPUT_SIZE,
                    config.ARC_FACE_INPUT_SIZE,
                ],
            }
        )

    except Exception as exc:

        print(
            "[app] Model health error:",
            repr(exc),
        )

        return jsonify(
            {
                "status": "error",
                "error": str(exc),
            }
        ), 503


# ============================================================
# OLD SINGLE-IMAGE EMBEDDING ENDPOINT
# ============================================================

@app.route(
    "/extract-embedding",
    methods=["POST"],
)
def extract_embedding():

    data = request.get_json(
        silent=True
    )

    if not data:

        return jsonify(
            {
                "error": "No data provided"
            }
        ), 400

    image_b64 = data.get(
        "image_b64"
    )

    if not image_b64:

        return jsonify(
            {
                "error": "image_b64 required"
            }
        ), 400

    try:

        image = (
            decode_base64_image(
                image_b64
            )
        )

    except ValueError:

        return jsonify(
            {
                "error": "invalid_image"
            }
        ), 400

    try:

        engine = (
            get_face_engine()
        )

        result = (
            engine.extract_single_face_embedding(
                image,
                registration=True,
            )
        )

        embedding = (
            result["embedding"]
            .astype(float)
            .tolist()
        )

        return jsonify(
            {
                "embedding": embedding,
                "dimension": len(
                    embedding
                ),
                "detector": "RetinaFace",
                "recognizer": "ArcFace",
                "detection_score": round(
                    float(
                        result[
                            "detection_score"
                        ]
                    ),
                    6,
                ),
                "quality": result[
                    "quality"
                ],
            }
        )

    except ValueError as exc:

        error_code = str(exc)

        if (
            error_code
            == "no_face_detected"
        ):

            return jsonify(
                {
                    "error": "no_face_detected"
                }
            ), 400

        if (
            error_code
            == "multiple_faces_detected"
        ):

            return jsonify(
                {
                    "error":
                    "multiple_faces_detected"
                }
            ), 400

        if (
            error_code
            == "face_quality_insufficient"
        ):

            return jsonify(
                {
                    "error":
                    "face_quality_insufficient",
                    "quality": getattr(
                        exc,
                        "quality",
                        {},
                    ),
                }
            ), 400

        return jsonify(
            {
                "error": "embedding_failed"
            }
        ), 500

    except Exception as exc:

        print(
            "[app] Unexpected embedding error:",
            repr(exc),
        )

        traceback.print_exc()

        return jsonify(
            {
                "error": "embedding_failed"
            }
        ), 500


# ============================================================
# NEW TWO-IMAGE REGISTRATION ENDPOINT
# ============================================================

@app.route(
    "/extract-embeddings",
    methods=["POST"],
)
def extract_embeddings():

    """
    Generate one or two registration embeddings.

    Request:

    {
        "images": [
            "<base64 image 1>",
            "<base64 image 2>"
        ]
    }

    Maximum:
        2 images

    Each image must contain:
        exactly one face

    If two images are provided:
        both faces must belong to the same person.

    Response:

    {
        "embeddings": [
            [512 floats],
            [512 floats]
        ],

        "dimension": 512,

        "image_count": 2,

        "pair_similarity": 0.72,

        "pair_threshold": 0.60
    }
    """

    data = request.get_json(
        silent=True
    )

    if not data:

        return jsonify(
            {
                "error": "No data provided"
            }
        ), 400

    images = data.get(
        "images"
    )

    if not isinstance(
        images,
        list,
    ):

        return jsonify(
            {
                "error":
                "images must be an array"
            }
        ), 400

    # --------------------------------------------------------
    # HARD LIMIT
    # --------------------------------------------------------

    if len(images) == 0:

        return jsonify(
            {
                "error":
                "At least one registration image is required"
            }
        ), 400

    if len(images) > 2:

        return jsonify(
            {
                "error":
                "A maximum of 2 registration images is allowed"
            }
        ), 400

    # --------------------------------------------------------
    # DECODE ALL IMAGES FIRST
    # --------------------------------------------------------

    decoded_images = []

    for index, image_b64 in enumerate(
        images,
        start=1,
    ):

        try:

            decoded = (
                decode_base64_image(
                    image_b64
                )
            )

            decoded_images.append(
                decoded
            )

        except ValueError:

            return jsonify(
                {
                    "error":
                    "invalid_image",
                    "image_index":
                    index,
                }
            ), 400

    # --------------------------------------------------------
    # GENERATE REGISTRATION TEMPLATE
    # --------------------------------------------------------

    try:

        engine = (
            get_face_engine()
        )

        image_two = (
            decoded_images[1]
            if len(
                decoded_images
            ) == 2
            else None
        )

        result = (
            engine.register_two_images(
                decoded_images[0],
                image_two,
            )
        )

        embeddings = [
            embedding.astype(
                float
            ).tolist()
            for embedding in result[
                "embeddings"
            ]
        ]

        return jsonify(
            {
                "embeddings":
                    embeddings,

                "dimension":
                    config.ARC_FACE_EMBEDDING_DIMENSION,

                "image_count":
                    result[
                        "image_count"
                    ],

                "pair_similarity":
                    result[
                        "pair_similarity"
                    ],

                "pair_threshold":
                    result[
                        "pair_threshold"
                    ],

                "images":
                    [
                        {
                            "image_index":
                                item[
                                    "image_index"
                                ],

                            "detection_score":
                                round(
                                    float(
                                        item[
                                            "detection_score"
                                        ]
                                    ),
                                    6,
                                ),

                            "quality":
                                item[
                                    "quality"
                                ],
                        }
                        for item in result[
                            "image_results"
                        ]
                    ],

                "detector":
                    "RetinaFace",

                "recognizer":
                    "ArcFace",
            }
        )

    except ValueError as exc:

        error_code = str(
            exc
        )

        if (
            error_code
            == "no_face_detected"
        ):

            return jsonify(
                {
                    "error":
                    "no_face_detected"
                }
            ), 400

        if (
            error_code
            == "multiple_faces_detected"
        ):

            return jsonify(
                {
                    "error":
                    "multiple_faces_detected"
                }
            ), 400

        if (
            error_code
            == "face_quality_insufficient"
        ):

            return jsonify(
                {
                    "error":
                    "face_quality_insufficient",

                    "quality":
                        getattr(
                            exc,
                            "quality",
                            {},
                        ),
                }
            ), 400

        if (
            error_code
            == "registration_images_do_not_match"
        ):

            return jsonify(
                {
                    "error":
                    "registration_images_do_not_match",

                    "pair_similarity":
                        round(
                            float(
                                getattr(
                                    exc,
                                    "pair_similarity",
                                    0.0,
                                )
                            ),
                            6,
                        ),

                    "pair_threshold":
                        getattr(
                            exc,
                            "threshold",
                            config.REGISTRATION_PAIR_SIMILARITY_THRESHOLD,
                        ),
                }
            ), 400

        return jsonify(
            {
                "error":
                "registration_failed"
            }
        ), 500

    except Exception as exc:

        print(
            "[app] Registration error:",
            repr(exc),
        )

        traceback.print_exc()

        return jsonify(
            {
                "error":
                "registration_failed"
            }
        ), 500


# ============================================================
# CLASSROOM MULTI-IMAGE RECOGNITION
# ============================================================

# ============================================================
# CLASSROOM MULTI-IMAGE RECOGNITION
# ============================================================

@app.route(
    "/recognize",
    methods=["POST"],
)
def recognize():

    """
    Recognize students from multiple classroom images.

    MULTIPROCESSING VERSION

    Each classroom image is processed independently by a
    separate CPU worker.

    Attendance rule:

        If a student is recognized in ANY ONE of the
        uploaded classroom images, that student is present.

    Request:

    {
        "images": [
            "<base64 image 1>",
            "<base64 image 2>"
        ],
        "students": [
            {
                "id": "...",
                "embeddings": [
                    [512 floats],
                    [512 floats]
                ]
            }
        ],
        "threshold": 0.50
    }
    """

    data = request.get_json(
        silent=True
    )

    if not data:

        return jsonify(
            {
                "error":
                "No data provided"
            }
        ), 400

    images = data.get(
        "images"
    )

    if not isinstance(
        images,
        list,
    ):

        return jsonify(
            {
                "error":
                "images must be an array"
            }
        ), 400

    if len(images) == 0:

        return jsonify(
            {
                "error":
                "At least one classroom image is required"
            }
        ), 400

    if len(images) > config.CLASSROOM_MAX_IMAGES:

        return jsonify(
            {
                "error":
                "too_many_classroom_images",

                "max_images":
                    config.CLASSROOM_MAX_IMAGES,
            }
        ), 400

    students = data.get(
        "students",
        [],
    )

    if (
        not isinstance(
            students,
            list,
        )
        or not students
    ):

        return jsonify(
            {
                "error":
                "No students provided"
            }
        ), 400

    # --------------------------------------------------------
    # THRESHOLD
    # --------------------------------------------------------

    try:

        threshold = float(
            data.get(
                "threshold",
                config.CLASSROOM_MATCH_THRESHOLD,
            )
        )

    except (
        TypeError,
        ValueError,
    ):

        return jsonify(
            {
                "error":
                "Invalid threshold"
            }
        ), 400

    if (
        threshold < -1.0
        or threshold > 1.0
    ):

        return jsonify(
            {
                "error":
                "threshold must be between -1 and 1"
            }
        ), 400

    # --------------------------------------------------------
    # IMPORTANT:
    #
    # We intentionally DO NOT run face recognition here.
    #
    # We only validate/decode the images enough to make sure
    # the request contains valid image data.
    #
    # The actual expensive RetinaFace + ArcFace processing
    # happens inside the worker processes.
    # --------------------------------------------------------

    for image_index, image_b64 in enumerate(
        images,
        start=1,
    ):

        try:

            decode_base64_image(
                image_b64
            )

        except ValueError:

            return jsonify(
                {
                    "error":
                    "invalid_image",

                    "image_index":
                        image_index,
                }
            ), 400

    # --------------------------------------------------------
    # CREATE / GET WORKER POOL
    # --------------------------------------------------------

    pool = get_recognition_pool()

    # --------------------------------------------------------
    # CREATE TASKS
    # --------------------------------------------------------

    futures = {}

    for image_index, image_b64 in enumerate(
        images,
        start=1,
    ):

        task = {
            "image_index":
                image_index,

            "image_b64":
                image_b64,

            "students":
                students,

            "threshold":
                threshold,
        }

        future = pool.submit(
            recognize_single_classroom_image,
            task,
        )

        futures[
            future
        ] = image_index

    # --------------------------------------------------------
    # COLLECT RESULTS
    # --------------------------------------------------------

    worker_results = []

    try:

        for future in as_completed(
            futures
        ):

            image_index = futures[
                future
            ]

            try:

                result = future.result()

            except Exception as exc:

                print(
                    "[app] Worker failed for image",
                    image_index,
                    ":",
                    repr(exc),
                )

                traceback.print_exc()

                return jsonify(
                    {
                        "error":
                        "recognition_failed",

                        "image_index":
                            image_index,

                        "message":
                            str(exc),
                    }
                ), 500

            if not result.get(
                "success",
                False,
            ):

                return jsonify(
                    {
                        "error":
                        result.get(
                            "error",
                            "recognition_failed",
                        ),

                        "image_index":
                            image_index,

                        "message":
                            result.get(
                                "message"
                            ),
                    }
                ), 400

            worker_results.append(
                result
            )

    except Exception as exc:

        print(
            "[app] Recognition pool error:",
            repr(exc),
        )

        traceback.print_exc()

        return jsonify(
            {
                "error":
                "recognition_failed"
            }
        ), 500

    # --------------------------------------------------------
    # SORT RESULTS BY ORIGINAL IMAGE ORDER
    # --------------------------------------------------------

    worker_results.sort(
        key=lambda result:
            result[
                "image_index"
            ]
    )

    # --------------------------------------------------------
    # AGGREGATE ALL IMAGE RESULTS
    # --------------------------------------------------------

    evidence = {}

    image_results = []

    total_faces = 0

    for result in worker_results:

        image_index = result[
            "image_index"
        ]

        faces_detected = result[
            "faces_detected"
        ]

        total_faces += (
            faces_detected
        )

        matches = result[
            "matches"
        ]

        # ----------------------------------------------------
        # IMAGE SUMMARY
        # ----------------------------------------------------

        image_results.append(
            {
                "image_index":
                    image_index,

                "faces_detected":
                    faces_detected,

                "recognized_students":
                    len(matches),
            }
        )

        # ----------------------------------------------------
        # MERGE STUDENT EVIDENCE
        # ----------------------------------------------------

        for observation in matches:

            student_id = observation[
                "id"
            ]

            if student_id not in evidence:

                evidence[
                    student_id
                ] = {
                    "id":
                        student_id,

                    "similarity":
                        observation[
                            "similarity"
                        ],

                    "matched_sample":
                        observation[
                            "matched_sample"
                        ],

                    "best_image_index":
                        image_index,

                    "observations":
                        0,

                    "image_indices":
                        [],

                    "matches":
                        [],
                }

            student_evidence = (
                evidence[
                    student_id
                ]
            )

            student_evidence[
                "observations"
            ] += 1

            if (
                image_index
                not in student_evidence[
                    "image_indices"
                ]
            ):

                student_evidence[
                    "image_indices"
                ].append(
                    image_index
                )

            student_evidence[
                "matches"
            ].append(
                observation
            )

            # ------------------------------------------------
            # KEEP STRONGEST OBSERVATION
            # ------------------------------------------------

            if (
                observation[
                    "similarity"
                ]
                > student_evidence[
                    "similarity"
                ]
            ):

                student_evidence[
                    "similarity"
                ] = (
                    observation[
                        "similarity"
                    ]
                )

                student_evidence[
                    "matched_sample"
                ] = (
                    observation[
                        "matched_sample"
                    ]
                )

                student_evidence[
                    "best_image_index"
                ] = image_index

    # --------------------------------------------------------
    # FINAL UNIQUE STUDENTS
    # --------------------------------------------------------

    recognized = []

    for student in evidence.values():

        recognized.append(
            {
                "id":
                    student[
                        "id"
                    ],

                "similarity":
                    round(
                        float(
                            student[
                                "similarity"
                            ]
                        ),
                        6,
                    ),

                "matched_sample":
                    student[
                        "matched_sample"
                    ],

                "best_image_index":
                    student[
                        "best_image_index"
                    ],

                "observations":
                    student[
                        "observations"
                    ],

                "image_indices":
                    student[
                        "image_indices"
                    ],

                "matches":
                    student[
                        "matches"
                    ],
            }
        )

    # --------------------------------------------------------
    # SORT BY STRONGEST MATCH
    # --------------------------------------------------------

    recognized.sort(
        key=lambda item:
            item[
                "similarity"
            ],
        reverse=True,
    )

    # --------------------------------------------------------
    # RESPONSE
    # --------------------------------------------------------

    return jsonify(
        {
            "recognized":
                recognized,

            "images_processed":
                len(
                    worker_results
                ),

            "faces_detected":
                total_faces,

            "image_results":
                image_results,

            "detector":
                "RetinaFace",

            "recognizer":
                "ArcFace",

            "embedding_dimension":
                config.ARC_FACE_EMBEDDING_DIMENSION,

            "threshold":
                threshold,

            "processing":
                {
                    "mode":
                        "multiprocessing",

                    "workers":
                        min(
                            config.RECOGNITION_WORKERS,
                            config.RECOGNITION_MAX_PARALLEL_IMAGES,
                        ),

                    "cpu_threads_per_worker":
                        config.RECOGNITION_CPU_THREADS_PER_WORKER,
                },
        }
    )
    
# ============================================================
# GLOBAL ERROR HANDLERS
# ============================================================

@app.errorhandler(
    413
)
def request_too_large(
    error,
):

    return jsonify(
        {
            "error":
            "request_too_large"
        }
    ), 413


@app.errorhandler(
    Exception
)
def handle_unexpected_error(
    error,
):

    print(
        "[app] Unhandled exception:",
        repr(error),
    )

    traceback.print_exc()

    return jsonify(
        {
            "error":
            "internal_server_error"
        }
    ), 500


# ============================================================
# START SERVER
# ============================================================

if __name__ == "__main__":

    print(
        "Starting face recognition service..."
    )

    print(
        f"Host: {config.HOST}"
    )

    print(
        f"Port: {config.PORT}"
    )

    print(
        "Detector: RetinaFace"
    )

    print(
        "Recognizer: ArcFace / WebFace600K"
    )

    print(
        "Embedding dimension:",
        config.ARC_FACE_EMBEDDING_DIMENSION,
    )

    print(
        "Recognition workers:",
        config.RECOGNITION_WORKERS,
    )

    print(
        "CPU threads per worker:",
        config.RECOGNITION_CPU_THREADS_PER_WORKER,
    )

    # --------------------------------------------------------
    # Load the normal face engine for:
    #
    # /health/models
    # /extract-embedding
    # /extract-embeddings
    #
    # Classroom recognition workers have their own engines.
    # --------------------------------------------------------

    get_face_engine()

    # --------------------------------------------------------
    # Pre-create the recognition workers.
    #
    # This means RetinaFace + ArcFace are loaded before the
    # first classroom recognition request instead of making
    # the teacher wait for model initialization.
    # --------------------------------------------------------

    get_recognition_pool()

    app.run(
        host=config.HOST,
        port=config.PORT,
        debug=False,
    )