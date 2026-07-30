const axios = require('axios');

const FACE_SERVICE_URL = process.env.FACE_SERVICE_URL || 'http://127.0.0.1:5001';

/**
 * Send an image buffer to Python service and get back a 128-dim embedding.
 * Use this during face registration (one student, one clear photo).
 *
 * @param {Buffer} imageBuffer - raw image bytes from multer's memoryStorage
 * @returns {number[]} 128-element array
 * @throws if no face found, multiple faces, or service unavailable
 */
async function extractEmbedding(imageBuffer) {
  const response = await axios.post(
    `${FACE_SERVICE_URL}/extract-embedding`,
    { image_b64: imageBuffer.toString('base64') },
    { timeout: 30_000 }
  );
  return response.data.embedding;
}

/**
 * Send a class photo or video to Python service.
 * Returns which students were recognized.
 *
 * @param {Buffer} fileBuffer     - raw bytes from multer
 * @param {string} mimeType       - file.mimetype (e.g. 'image/jpeg' or 'video/mp4')
 * @param {Array}  students       - [{ id, embedding }] for all enrolled students with faces
 * @param {number} [threshold]    - 0.0–1.0, lower = stricter. Default 0.5
 * @returns {{ recognized: [{id, confidence}], frames_processed, faces_found }}
 */
async function recognizeFaces(fileBuffer, mimeType, students, threshold = 0.5) {
  const isVideo = mimeType.startsWith('video/');
  const payload = {
    students,
    threshold,
    [isVideo ? 'video_b64' : 'image_b64']: fileBuffer.toString('base64')
  };

  const response = await axios.post(
    `${FACE_SERVICE_URL}/recognize`,
    payload,
    { timeout: 120_000 }  // 2 min — videos can be large
  );
  return response.data;
}

module.exports = { extractEmbedding, recognizeFaces };