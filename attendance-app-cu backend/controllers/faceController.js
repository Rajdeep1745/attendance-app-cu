const db = require("../config/db");

const {
  extractEmbeddings,
} = require("../utils/faceService");


/* =========================================================
 * TEACHER ACCESS
 * ========================================================= */

const teacherOwnsStudent = async (
  studentId,
  teacherId,
) => {
  const result = await db.query(
    `
      SELECT 1
      FROM enrollments e
      JOIN subjects s
        ON s.subject_id = e.subject_id
      WHERE e.student_id = $1
        AND s.teacher_id = $2
      LIMIT 1
    `,
    [
      studentId,
      teacherId,
    ],
  );

  return result.rows.length > 0;
};


/* =========================================================
 * STUDENT LOOKUP
 * ========================================================= */

const getStudentById = async (
  studentId,
) => {
  const result = await db.query(
    `
      SELECT
        student_id
      FROM students
      WHERE student_id = $1
    `,
    [
      studentId,
    ],
  );

  return result.rows[0] || null;
};


const getStudentByUserId = async (
  userId,
) => {
  const result = await db.query(
    `
      SELECT
        student_id
      FROM students
      WHERE student_id = $1
    `,
    [
      userId,
    ],
  );

  return result.rows[0] || null;
};


/* =========================================================
 * AVATAR
 * ========================================================= */

/**
 * ONLY the first registration image is converted into
 * an avatar.
 *
 * The second registration image is NEVER stored as an
 * image URL.
 */
const buildInlineImageUrl = (
  file,
) => {
  return `data:${file.mimetype};base64,${file.buffer.toString(
    "base64",
  )}`;
};


/* =========================================================
 * FACE SERVICE ERROR TRANSLATION
 * ========================================================= */

const translateFaceServiceError = (
  err,
) => {
  const responseData =
    err?.response?.data || {};

  const code =
    responseData.error;


  if (
    code ===
    "no_face_detected"
  ) {
    const error = new Error(
      "No face detected in one of the registration photos. Please use a clear photo where your face is visible.",
    );

    error.statusCode = 400;

    return error;
  }


  if (
    code ===
    "multiple_faces_detected"
  ) {
    const error = new Error(
      "Multiple faces were detected in one of the registration photos. Each registration photo must contain only you.",
    );

    error.statusCode = 400;

    return error;
  }


  if (
    code ===
    "face_quality_insufficient"
  ) {
    const quality =
      responseData.quality || {};
console.log(
  "[faceController] Registration quality:",
  {
    face_width:
      quality.face_width,

    face_height:
      quality.face_height,

    face_area_ratio:
      quality.face_area_ratio,

    blur_score:
      quality.blur_score,

    brightness:
      quality.brightness,

    contrast:
      quality.contrast,

    reasons:
      quality.reasons,
  },
);
    

    const reasons =
      Array.isArray(
        quality.reasons,
      )
        ? quality.reasons
        : [];


    let message =
      "One of the registration photos does not meet the required face-quality standards.";


    if (
      reasons.includes(
        "face_too_small",
      )
    ) {
      message =
        "Your face is too small in one of the photos. Please move closer to the camera.";
    } else if (
      reasons.includes(
        "image_too_blurry",
      )
    ) {
      message =
        "One of the photos is too blurry. Please hold the camera steady and try again.";
    } else if (
      reasons.includes(
        "image_too_dark",
      )
    ) {
      message =
        "One of the photos is too dark. Please move to a better-lit area.";
    } else if (
      reasons.includes(
        "image_overexposed",
      )
    ) {
      message =
        "One of the photos is overexposed. Please use better lighting.";
    } else if (
      reasons.includes(
        "image_has_low_contrast",
      )
    ) {
      message =
        "One of the photos has insufficient contrast. Please use clearer lighting.";
    }


    const error = new Error(
      message,
    );

    error.statusCode = 400;

    return error;
  }


  if (
    code ===
    "registration_images_do_not_match"
  ) {
    const error = new Error(
      "The two registration photos do not appear to show the same person. Please upload two photos of yourself.",
    );

    error.statusCode = 400;

    error.pairSimilarity =
      Number(
        responseData.pair_similarity,
      );

    error.pairThreshold =
      Number(
        responseData.pair_threshold,
      );

    return error;
  }


  if (
    code ===
    "invalid_image"
  ) {
    const error = new Error(
      "Could not read one of the registration photos. Please upload a valid JPEG, PNG, or WebP image.",
    );

    error.statusCode = 400;

    return error;
  }


  if (
    code ===
      "embedding_failed" ||
    code ===
      "registration_failed"
  ) {
    const error = new Error(
      "Face registration could not be completed. Please try again.",
    );

    error.statusCode = 500;

    return error;
  }


  console.error(
    "[faceController] Face service error:",
    err?.response?.data ||
      err.message,
  );


  const error = new Error(
    "Face recognition service unavailable. Is the Python service running on port 5001?",
  );

  error.statusCode = 503;

  return error;
};


/* =========================================================
 * EMBEDDING VALIDATION
 * ========================================================= */

const validateEmbeddings = (
  embeddings,
) => {
  if (
    !Array.isArray(
      embeddings,
    )
  ) {
    throw new Error(
      "Face service returned invalid embeddings.",
    );
  }


  if (
    embeddings.length < 1 ||
    embeddings.length > 2
  ) {
    throw new Error(
      "Face service returned an invalid number of embeddings.",
    );
  }


  return embeddings.map(
    (
      embedding,
      index,
    ) => {
      if (
        !Array.isArray(
          embedding,
        )
      ) {
        throw new Error(
          `Invalid embedding at sample ${index + 1}.`,
        );
      }


      if (
        embedding.length !== 512
      ) {
        throw new Error(
          `Embedding ${index + 1} does not contain 512 values.`,
        );
      }


      const numeric =
        embedding.map(
          Number,
        );


      if (
        numeric.some(
          (value) =>
            !Number.isFinite(
              value,
            ),
        )
      ) {
        throw new Error(
          `Embedding ${index + 1} contains invalid values.`,
        );
      }


      return numeric;
    },
  );
};


/* =========================================================
 * PERSIST REGISTRATION
 * ========================================================= */

const persistRegisteredFace =
  async (
    student,
    files,
  ) => {

    /* -----------------------------------------------------
     * FILE VALIDATION
     * --------------------------------------------------- */

    if (
      !Array.isArray(files) ||
      files.length === 0
    ) {
      const error = new Error(
        "At least one face registration image is required.",
      );

      error.statusCode = 400;

      throw error;
    }


    if (
      files.length > 2
    ) {
      const error = new Error(
        "A maximum of 2 face registration images is allowed.",
      );

      error.statusCode = 400;

      throw error;
    }


    /* -----------------------------------------------------
     * PYTHON FACE SERVICE
     * --------------------------------------------------- */

    let faceResult;


    try {
      faceResult =
        await extractEmbeddings(
          files.map(
            (file) =>
              file.buffer,
          ),
        );

    } catch (err) {
      throw translateFaceServiceError(
        err,
      );
    }


    /* -----------------------------------------------------
     * VALIDATE PYTHON RESPONSE
     * --------------------------------------------------- */

    let embeddings;


    try {
      embeddings =
        validateEmbeddings(
          faceResult.embeddings,
        );

    } catch (err) {

      console.error(
        "[faceController] Invalid embedding response:",
        err.message,
      );


      const error = new Error(
        "Face recognition service returned invalid registration data.",
      );

      error.statusCode = 502;

      throw error;
    }


    if (
      embeddings.length !==
      files.length
    ) {
      const error = new Error(
        "The face recognition service did not return one embedding per registration image.",
      );

      error.statusCode = 502;

      throw error;
    }


    /* -----------------------------------------------------
     * FIRST IMAGE → AVATAR
     * --------------------------------------------------- */

    const avatarUrl =
      buildInlineImageUrl(
        files[0],
      );


    /* -----------------------------------------------------
     * DATABASE TRANSACTION
     * --------------------------------------------------- */

    const client =
      await db.pool.connect();


    try {

      await client.query(
        "BEGIN",
      );


      /* ---------------------------------------------------
       * Remove the student's previous face templates.
       *
       * We are replacing the registration rather than
       * accumulating old templates.
       * ------------------------------------------------- */

      await client.query(
        `
          DELETE FROM student_face_data
          WHERE student_id = $1
        `,
        [
          student.student_id,
        ],
      );


      /* ---------------------------------------------------
       * Insert one database row per ArcFace template.
       *
       * sample_index:
       *
       *     1 → first registration image
       *     2 → second registration image
       *
       * image_url:
       *
       *     ALWAYS NULL
       *
       * The first image is already stored in users.avatar.
       * The second image is intentionally never stored.
       * ------------------------------------------------- */

      for (
        let index = 0;
        index < embeddings.length;
        index++
      ) {

        await client.query(
          `
            INSERT INTO student_face_data (
              student_id,
              sample_index,
              image_url,
              embedding,
              created_at,
              updated_at
            )
            VALUES (
              $1,
              $2,
              NULL,
              $3::jsonb,
              NOW(),
              NOW()
            )
          `,
          [
            student.student_id,

            index + 1,

            JSON.stringify(
              embeddings[index],
            ),
          ],
        );
      }


      /* ---------------------------------------------------
       * FIRST IMAGE → users.avatar
       * ------------------------------------------------- */

      const avatarResult =
        await client.query(
          `
            UPDATE users
            SET avatar = $1
            WHERE id = $2
            RETURNING id
          `,
          [
            avatarUrl,
            student.student_id,
          ],
        );


      if (
        avatarResult.rowCount === 0
      ) {
        throw new Error(
          "Could not update the student's profile avatar.",
        );
      }


      /* ---------------------------------------------------
       * MARK FACE REGISTERED
       * ------------------------------------------------- */

      const flagResult =
        await client.query(
          `
            UPDATE students
            SET face_registered = TRUE
            WHERE student_id = $1
            RETURNING student_id
          `,
          [
            student.student_id,
          ],
        );


      if (
        flagResult.rowCount === 0
      ) {
        throw new Error(
          "Could not update face registration status.",
        );
      }


      /* ---------------------------------------------------
       * COMMIT
       * ------------------------------------------------- */

      await client.query(
        "COMMIT",
      );


      return {
        message:
          "Face registered successfully",

        studentId:
          student.student_id,

        avatar:
          avatarUrl,

        imageCount:
          embeddings.length,

        embeddingDimension:
          512,

        pairSimilarity:
          faceResult.pair_similarity ??
          null,

        pairThreshold:
          faceResult.pair_threshold ??
          null,
      };


    } catch (err) {

      try {
        await client.query(
          "ROLLBACK",
        );
      } catch (
        rollbackError
      ) {
        console.error(
          "[faceController] Rollback failed:",
          rollbackError.message,
        );
      }


      console.error(
        "========================================",
      );

      console.error(
        "[faceController] DATABASE ERROR",
      );

      console.error(
        "message:",
        err.message,
      );

      console.error(
        "code:",
        err.code,
      );

      console.error(
        "detail:",
        err.detail,
      );

      console.error(
        "constraint:",
        err.constraint,
      );

      console.error(
        "table:",
        err.table,
      );

      console.error(
        "column:",
        err.column,
      );

      console.error(
        "========================================",
      );


      const error = new Error(
        "Failed to save face registration data.",
      );

      error.statusCode = 500;

      throw error;


    } finally {

      client.release();

    }
  };


/* =========================================================
 * TEACHER REGISTRATION
 * ========================================================= */

exports.registerStudentFace =
  async (
    req,
    res,
  ) => {

    const {
      id: studentId,
    } = req.params;

    const teacherId =
      req.user.id;

    const files =
      req.files;


    if (
      !Array.isArray(files) ||
      files.length === 0
    ) {
      return res.status(400).json(
        {
          error:
            "At least one face registration image is required.",
        },
      );
    }


    try {

      const student =
        await getStudentById(
          studentId,
        );


      if (!student) {
        return res.status(404).json(
          {
            error:
              "Student not found",
          },
        );
      }


      const hasAccess =
        await teacherOwnsStudent(
          studentId,
          teacherId,
        );


      if (!hasAccess) {
        return res.status(403).json(
          {
            error:
              "Access denied for this student",
          },
        );
      }


      const payload =
        await persistRegisteredFace(
          student,
          files,
        );


      return res.json(
        payload,
      );


    } catch (err) {

      return res
        .status(
          err.statusCode ||
            500,
        )
        .json(
          {
            error:
              err.message ||
              "Failed to register face",

            pairSimilarity:
              err.pairSimilarity ??
              undefined,

            pairThreshold:
              err.pairThreshold ??
              undefined,
          },
        );
    }
  };


/* =========================================================
 * STUDENT SELF REGISTRATION
 * ========================================================= */

exports.registerMyFace =
  async (
    req,
    res,
  ) => {

    const files =
      req.files;


    if (
      !Array.isArray(files) ||
      files.length === 0
    ) {
      return res.status(400).json(
        {
          error:
            "At least one face registration image is required.",
        },
      );
    }


    try {

      const student =
        await getStudentByUserId(
          req.user.id,
        );


      if (!student) {
        return res.status(404).json(
          {
            error:
              "Student profile not found",
          },
        );
      }


      const payload =
        await persistRegisteredFace(
          student,
          files,
        );


      return res.json(
        payload,
      );


    } catch (err) {

      return res
        .status(
          err.statusCode ||
            500,
        )
        .json(
          {
            error:
              err.message ||
              "Failed to register face",

            pairSimilarity:
              err.pairSimilarity ??
              undefined,

            pairThreshold:
              err.pairThreshold ??
              undefined,
          },
        );
    }
  };