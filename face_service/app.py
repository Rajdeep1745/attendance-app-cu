import traceback
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


app = Flask(__name__)

app.config[
    "MAX_CONTENT_LENGTH"
] = config.MAX_REQUEST_BYTES


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

@app.route(
    "/recognize",
    methods=["POST"],
)
def recognize():

    """
    Recognize students from multiple classroom images.

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
                "error": "No data provided"
            }
        ), 400

    images = data.get("images")

    if not isinstance(images, list):
        return jsonify(
            {
                "error": "images must be an array"
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
        not isinstance(students, list)
        or not students
    ):
        return jsonify(
            {
                "error":
                "No students provided"
            }
        ), 400

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
    # DECODE ALL IMAGES FIRST
    # --------------------------------------------------------

    decoded_images = []

    for image_index, image_b64 in enumerate(
        images,
        start=1,
    ):

        try:

            decoded_images.append(
                decode_base64_image(
                    image_b64
                )
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

    try:

        engine = get_face_engine()

        # student_id -> aggregated evidence
        evidence = {}

        image_results = []

        total_faces = 0

        # ----------------------------------------------------
        # PROCESS EACH CLASSROOM IMAGE
        # ----------------------------------------------------

        for image_index, image in enumerate(
            decoded_images,
            start=1,
        ):

            faces = (
                engine.extract_all_face_embeddings(
                    image
                )
            )

            total_faces += len(faces)

            # Only keep the strongest observation of the
            # same student within this particular image.
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

                student_id = match["id"]

                observation = {
                    "id":
                        student_id,

                    "similarity":
                        match["similarity"],

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

            # ------------------------------------------------
            # AGGREGATE IMAGE RESULTS
            # ------------------------------------------------

            for (
                student_id,
                observation,
            ) in best_matches_this_image.items():

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

                # Keep the strongest observation across
                # ALL classroom images.
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

            image_results.append(
                {
                    "image_index":
                        image_index,

                    "faces_detected":
                        len(faces),

                    "recognized_students":
                        len(
                            best_matches_this_image
                        ),
                }
            )

        # ----------------------------------------------------
        # FINAL UNIQUE RECOGNIZED STUDENTS
        # ----------------------------------------------------

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

        recognized.sort(
            key=lambda item:
                item[
                    "similarity"
                ],
            reverse=True,
        )

        return jsonify(
            {
                "recognized":
                    recognized,

                "images_processed":
                    len(
                        decoded_images
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
            }
        )

    except Exception as exc:

        print(
            "[app] Recognition error:",
            repr(exc),
        )

        traceback.print_exc()

        return jsonify(
            {
                "error":
                "recognition_failed"
            }
        ), 500

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

    get_face_engine()

    app.run(
        host=config.HOST,
        port=config.PORT,
        debug=False,
    )