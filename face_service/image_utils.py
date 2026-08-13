import base64
import binascii
from typing import Any, Dict

import cv2
import numpy as np
from PIL import Image, ImageOps


# ============================================================
# BASE64 DECODING
# ============================================================

def decode_base64_image(
    image_b64: str,
) -> np.ndarray:
    """
    Decode a base64 image into an OpenCV BGR image.

    Important:
    PIL is used first so EXIF orientation metadata is applied.

    This matters for images captured by phones where the physical
    pixel orientation and displayed orientation can differ.
    """

    if not isinstance(
        image_b64,
        str,
    ) or not image_b64.strip():
        raise ValueError(
            "image_b64 is required"
        )

    # Support data URLs:
    #
    # data:image/jpeg;base64,/9j/4AAQ...
    #
    # although the Node backend normally sends raw base64.

    if (
        "," in image_b64
        and image_b64.startswith("data:")
    ):
        image_b64 = image_b64.split(
            ",",
            1,
        )[1]

    try:
        image_bytes = base64.b64decode(
            image_b64,
            validate=True,
        )

    except (
        ValueError,
        binascii.Error,
    ) as exc:
        raise ValueError(
            "invalid_image"
        ) from exc

    if not image_bytes:
        raise ValueError(
            "invalid_image"
        )

    try:
        pil_image = Image.open(
            __import__("io").BytesIO(
                image_bytes
            )
        )

        # Apply EXIF orientation.
        pil_image = ImageOps.exif_transpose(
            pil_image
        )

        # Force normal 3-channel RGB.
        pil_image = pil_image.convert(
            "RGB"
        )

        rgb_array = np.asarray(
            pil_image
        )

        if rgb_array.size == 0:
            raise ValueError(
                "invalid_image"
            )

        # PIL gives RGB.
        # OpenCV expects BGR.
        image = cv2.cvtColor(
            rgb_array,
            cv2.COLOR_RGB2BGR,
        )

    except Exception as exc:
        raise ValueError(
            "invalid_image"
        ) from exc

    return image


# ============================================================
# BASE64 ENCODING
# ============================================================

def encode_image_to_base64(
    image: np.ndarray,
    image_format: str = ".jpg",
    quality: int = 95,
) -> str:
    """
    Utility for debugging/tests.
    """

    params = []

    if image_format.lower() in {
        ".jpg",
        ".jpeg",
    }:
        params = [
            cv2.IMWRITE_JPEG_QUALITY,
            int(quality),
        ]

    success, encoded = cv2.imencode(
        image_format,
        image,
        params,
    )

    if not success:
        raise ValueError(
            "Could not encode image"
        )

    return base64.b64encode(
        encoded.tobytes()
    ).decode("utf-8")


# ============================================================
# IMAGE DIMENSIONS
# ============================================================

def get_image_dimensions(
    image: np.ndarray,
) -> Dict[str, int]:
    """
    Return image dimensions.
    """

    height, width = image.shape[:2]

    return {
        "width": int(width),
        "height": int(height),
    }


# ============================================================
# FACE QUALITY
# ============================================================

def calculate_face_quality(
    image: np.ndarray,
    bbox: np.ndarray,
) -> Dict[str, float]:
    """
    Calculate basic quality measurements for a detected face.

    These values are quality indicators.
    They are NOT identity confidence scores.
    """

    height, width = image.shape[:2]

    x1, y1, x2, y2 = [
        int(value)
        for value in bbox
    ]

    x1 = max(
        0,
        min(
            x1,
            width - 1,
        ),
    )

    y1 = max(
        0,
        min(
            y1,
            height - 1,
        ),
    )

    x2 = max(
        x1 + 1,
        min(
            x2,
            width,
        ),
    )

    y2 = max(
        y1 + 1,
        min(
            y2,
            height,
        ),
    )

    face = image[
        y1:y2,
        x1:x2,
    ]

    if face.size == 0:
        return {
            "face_width": 0.0,
            "face_height": 0.0,
            "face_area_ratio": 0.0,
            "blur_score": 0.0,
            "brightness": 0.0,
            "contrast": 0.0,
        }

    gray = cv2.cvtColor(
        face,
        cv2.COLOR_BGR2GRAY,
    )

    blur_score = float(
        cv2.Laplacian(
            gray,
            cv2.CV_64F,
        ).var()
    )

    brightness = float(
        np.mean(gray)
    )

    contrast = float(
        np.std(gray)
    )

    face_width = float(
        x2 - x1
    )

    face_height = float(
        y2 - y1
    )

    face_area_ratio = float(
        (
            face_width
            * face_height
        )
        / max(
            float(width * height),
            1.0,
        )
    )

    return {
        "face_width": face_width,
        "face_height": face_height,
        "face_area_ratio": face_area_ratio,
        "blur_score": blur_score,
        "brightness": brightness,
        "contrast": contrast,
    }


# ============================================================
# CLASSROOM IMAGE RECOVERY
# ============================================================

def get_image_quality(
    image: np.ndarray,
) -> Dict[str, float]:
    """
    Calculate global image-quality measurements.

    These measurements are used only to decide whether
    classroom recovery processing should be attempted.

    They are NOT identity confidence scores.
    """

    if (
        image is None
        or image.size == 0
    ):
        return {
            "brightness": 0.0,
            "contrast": 0.0,
        }

    gray = cv2.cvtColor(
        image,
        cv2.COLOR_BGR2GRAY,
    )

    return {
        "brightness": float(
            np.mean(gray)
        ),
        "contrast": float(
            np.std(gray)
        ),
    }


def enhance_low_light_image(
    image: np.ndarray,
    gamma: float = 1.5,
    clahe_clip_limit: float = 2.0,
    clahe_tile_size: int = 8,
) -> np.ndarray:
    """
    Improve visibility in dark classroom images.

    Processing:

    1. Gamma-based shadow lifting
    2. CLAHE local contrast enhancement
    3. Very mild edge-preserving sharpening

    The original image is never modified.

    This function is intended for recognition recovery,
    not registration.
    """

    if (
        image is None
        or image.size == 0
    ):
        raise ValueError(
            "invalid_image"
        )

    # --------------------------------------------------------
    # 1. Gamma correction
    # --------------------------------------------------------

    gamma = max(
        float(gamma),
        0.1,
    )

    inverse_gamma = 1.0 / gamma

    lookup_table = np.array(
        [
            (
                ((value / 255.0)
                 ** inverse_gamma)
                * 255.0
            )
            for value in range(256)
        ],
        dtype=np.uint8,
    )

    gamma_corrected = cv2.LUT(
        image,
        lookup_table,
    )

    # --------------------------------------------------------
    # 2. CLAHE on luminance
    # --------------------------------------------------------

    lab = cv2.cvtColor(
        gamma_corrected,
        cv2.COLOR_BGR2LAB,
    )

    l_channel, a_channel, b_channel = (
        cv2.split(lab)
    )

    clahe = cv2.createCLAHE(
        clipLimit=float(
            clahe_clip_limit
        ),
        tileGridSize=(
            int(clahe_tile_size),
            int(clahe_tile_size),
        ),
    )

    l_channel = clahe.apply(
        l_channel
    )

    enhanced = cv2.cvtColor(
        cv2.merge(
            [
                l_channel,
                a_channel,
                b_channel,
            ]
        ),
        cv2.COLOR_LAB2BGR,
    )

    # --------------------------------------------------------
    # 3. Very mild sharpening
    # --------------------------------------------------------

    blurred = cv2.GaussianBlur(
        enhanced,
        (0, 0),
        1.0,
    )

    sharpened = cv2.addWeighted(
        enhanced,
        1.20,
        blurred,
        -0.20,
        0,
    )

    return sharpened


def upscale_for_recognition(
    image: np.ndarray,
    scale: float = 1.5,
) -> np.ndarray:
    """
    Enlarge a classroom image for small-face recovery.

    INTER_CUBIC is used because it is generally more suitable
    than nearest-neighbor for photographic images.

    This does not create missing facial information, but it
    gives RetinaFace more pixels with which to work.
    """

    if (
        image is None
        or image.size == 0
    ):
        raise ValueError(
            "invalid_image"
        )

    scale = max(
        float(scale),
        1.0,
    )

    if scale == 1.0:
        return image.copy()

    height, width = image.shape[:2]

    new_width = max(
        int(round(width * scale)),
        1,
    )

    new_height = max(
        int(round(height * scale)),
        1,
    )

    return cv2.resize(
        image,
        (
            new_width,
            new_height,
        ),
        interpolation=cv2.INTER_CUBIC,
    )

# ============================================================
# IMAGE SIZE VALIDATION
# ============================================================

def is_reasonable_image_size(
    image: np.ndarray,
    minimum_dimension: int = 160,
) -> bool:
    """
    Reject obviously tiny input images.

    This is separate from face-size validation.
    """

    height, width = image.shape[:2]

    return (
        width >= minimum_dimension
        and height >= minimum_dimension
    )


# ============================================================
# BOUNDING BOX
# ============================================================

def clamp_bbox(
    bbox: np.ndarray,
    image: np.ndarray,
) -> np.ndarray:
    """
    Clamp a RetinaFace bounding box to image boundaries.
    """

    height, width = image.shape[:2]

    x1, y1, x2, y2 = [
        int(
            round(
                float(value)
            )
        )
        for value in bbox
    ]

    x1 = max(
        0,
        min(
            x1,
            width - 1,
        ),
    )

    y1 = max(
        0,
        min(
            y1,
            height - 1,
        ),
    )

    x2 = max(
        x1 + 1,
        min(
            x2,
            width,
        ),
    )

    y2 = max(
        y1 + 1,
        min(
            y2,
            height,
        ),
    )

    return np.array(
        [
            x1,
            y1,
            x2,
            y2,
        ],
        dtype=np.float32,
    )
    
    # ============================================================
# CLASSROOM TILING
# ============================================================

def generate_classroom_tiles(
    image: np.ndarray,
    overlap: float = 0.25,
    max_tiles: int = 9,
    min_tile_size: int = 220,
):
    """
    Generate overlapping regions for classroom face detection.

    Why tiles?

    Faces in classroom images can be extremely small relative
    to the complete photograph.

    Instead of asking RetinaFace to detect a 25-40 px face in
    an entire 1200 px image, we detect it inside a smaller
    local region.

    Returns:

        [
            {
                "image": tile,
                "x": x_offset,
                "y": y_offset,
            },
            ...
        ]
    """

    if (
        image is None
        or image.size == 0
    ):
        return []

    height, width = image.shape[:2]

    overlap = float(
        np.clip(
            overlap,
            0.0,
            0.75,
        )
    )

    max_tiles = max(
        int(max_tiles),
        1,
    )

    min_tile_size = max(
        int(min_tile_size),
        64,
    )

    # --------------------------------------------------------
    # Determine grid.
    #
    # For landscape classroom images:
    #     3 columns × 2 rows
    #
    # For portrait classroom images:
    #     2 columns × 3 rows
    #
    # For smaller images:
    #     2 × 2
    # --------------------------------------------------------

    aspect_ratio = (
        width / max(
            height,
            1,
        )
    )

    if aspect_ratio >= 1.35:

        columns = 3
        rows = 2

    elif aspect_ratio <= 0.75:

        columns = 2
        rows = 3

    else:

        columns = 2
        rows = 2

    while columns * rows > max_tiles:

        if columns >= rows:
            columns -= 1
        else:
            rows -= 1

    tile_width = int(
        np.ceil(
            width / columns
        )
    )

    tile_height = int(
        np.ceil(
            height / rows
        )
    )

    # If the calculated tile is already tiny, use a
    # simpler grid rather than making it even smaller.
    if (
        tile_width < min_tile_size
        or tile_height < min_tile_size
    ):

        columns = 2
        rows = 2

        tile_width = int(
            np.ceil(
                width / columns
            )
        )

        tile_height = int(
            np.ceil(
                height / rows
            )
        )

    stride_x = max(
        int(
            tile_width
            * (1.0 - overlap)
        ),
        1,
    )

    stride_y = max(
        int(
            tile_height
            * (1.0 - overlap)
        ),
        1,
    )

    tiles = []

    y_positions = list(
        range(
            0,
            max(
                height - tile_height + 1,
                1,
            ),
            stride_y,
        )
    )

    x_positions = list(
        range(
            0,
            max(
                width - tile_width + 1,
                1,
            ),
            stride_x,
        )
    )

    # Always make sure the final edge of the image is covered.
    last_y = max(
        height - tile_height,
        0,
    )

    last_x = max(
        width - tile_width,
        0,
    )

    if last_y not in y_positions:
        y_positions.append(
            last_y
        )

    if last_x not in x_positions:
        x_positions.append(
            last_x
        )

    for y in y_positions:

        for x in x_positions:

            x2 = min(
                x + tile_width,
                width,
            )

            y2 = min(
                y + tile_height,
                height,
            )

            tile = image[
                y:y2,
                x:x2,
            ]

            if (
                tile.shape[1]
                < min_tile_size
                or tile.shape[0]
                < min_tile_size
            ):
                continue

            tiles.append(
                {
                    "image": tile,
                    "x": int(x),
                    "y": int(y),
                }
            )

            if len(tiles) >= max_tiles:
                return tiles

    return tiles