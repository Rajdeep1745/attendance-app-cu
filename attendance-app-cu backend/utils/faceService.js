const axios = require("axios");

const FACE_SERVICE_URL =
  process.env.FACE_SERVICE_URL ||
  "http://127.0.0.1:5001";

const FACE_SERVICE_TIMEOUT =
  Number(process.env.FACE_SERVICE_TIMEOUT) || 120000;


/**
 * Extract one or two ArcFace registration embeddings.
 *
 * The Python service expects:
 *
 * {
 *   images: [
 *     "<base64 image 1>",
 *     "<base64 image 2>"
 *   ]
 * }
 *
 * Maximum: 2 images.
 *
 * Returns:
 *
 * {
 *   embeddings: [
 *     [512 numbers],
 *     [512 numbers]
 *   ],
 *   dimension: 512,
 *   image_count: 2,
 *   pair_similarity: 0.73,
 *   pair_threshold: 0.60
 * }
 *
 * @param {Buffer[]} imageBuffers
 * @returns {Promise<object>}
 */
async function extractEmbeddings(imageBuffers) {
  if (!Array.isArray(imageBuffers)) {
    throw new Error(
      "imageBuffers must be an array",
    );
  }

  if (
    imageBuffers.length < 1 ||
    imageBuffers.length > 2
  ) {
    throw new Error(
      "A maximum of 2 face registration images is allowed",
    );
  }

  const images = imageBuffers.map((buffer) => {
    if (!Buffer.isBuffer(buffer)) {
      throw new Error(
        "Invalid face image buffer",
      );
    }

    return buffer.toString("base64");
  });

  const response = await axios.post(
    `${FACE_SERVICE_URL}/extract-embeddings`,
    {
      images,
    },
    {
      timeout: FACE_SERVICE_TIMEOUT,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    },
  );

  return response.data;
}


/**
 * Backward-compatible single-image helper.
 *
 * This is useful while the rest of the application is being
 * migrated from the old one-image registration flow.
 *
 * It deliberately calls the new Python endpoint rather than
 * the old face-recognition implementation.
 *
 * @param {Buffer} imageBuffer
 * @returns {Promise<number[]>}
 */
async function extractEmbedding(imageBuffer) {
  const result = await extractEmbeddings([
    imageBuffer,
  ]);

  if (
    !Array.isArray(result.embeddings) ||
    result.embeddings.length !== 1
  ) {
    throw new Error(
      "Face service returned an invalid embedding response",
    );
  }

  return result.embeddings[0];
}


/**
 * Send a classroom image/video to the Python service.
 *
 * IMPORTANT:
 *
 * The current Phase 3 Python service supports image recognition.
 * Multi-image classroom/video aggregation is Phase 4.
 *
 * The function keeps the existing interface so the attendance
 * controller does not need to be rewritten in this phase.
 *
 * @param {Buffer} fileBuffer
 * @param {string} mimeType
 * @param {Array} students
 * @param {number} threshold
 * @returns {Promise<object>}
 */


async function recognizeFaces(
  imageBuffers,
  mimeTypes,
  students,
  threshold = 0.5,
) {
  if (!Array.isArray(students)) {
    throw new Error(
      "students must be an array",
    );
  }

  const buffers = Array.isArray(imageBuffers)
    ? imageBuffers
    : [imageBuffers];

  const types = Array.isArray(mimeTypes)
    ? mimeTypes
    : [mimeTypes];

  if (
    buffers.length < 1 ||
    buffers.length > 8
  ) {
    throw new Error(
      "Between 1 and 8 classroom images are required",
    );
  }

  const images = buffers.map(
    (buffer, index) => {
      if (!Buffer.isBuffer(buffer)) {
        throw new Error(
          "Invalid classroom image buffer",
        );
      }

      const mimeType = types[index];

      if (
        typeof mimeType !== "string" ||
        !mimeType.startsWith("image/")
      ) {
        throw new Error(
          "Only classroom images are supported",
        );
      }

      return buffer.toString("base64");
    },
  );

  const response = await axios.post(
    `${FACE_SERVICE_URL}/recognize`,
    {
      images,
      students,
      threshold,
    },
    {
      timeout: FACE_SERVICE_TIMEOUT,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    },
  );

  return response.data;
}

module.exports = {
  extractEmbeddings,
  extractEmbedding,
  recognizeFaces,
};