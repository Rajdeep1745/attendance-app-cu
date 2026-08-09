const db = require("../config/db");

const buildInlineImageUrl = (file) =>
  `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;

// ---------------------------------------------------------
// GET CURRENT LOGGED-IN USER
// ---------------------------------------------------------

exports.getCurrentUser = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    const userResult = await db.query(
      `SELECT
          id,
          name,
          email,
          role,
          department,
          institution,
          avatar
       FROM users
       WHERE id = $1`,
      [userId],
    );

    const user = userResult.rows[0];

    if (!user) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    // -----------------------------------------------------
    // TEACHER PROFILE
    // -----------------------------------------------------

    if (role === "teacher") {
      const teacherResult = await db.query(
        `SELECT
            default_mode,
            default_threshold
         FROM teachers
         WHERE teacher_id = $1`,
        [userId],
      );

      const teacher = teacherResult.rows[0];

      return res.json({
        ...user,
        default_mode: teacher?.default_mode,
        default_threshold: teacher?.default_threshold,
      });
    }

    // -----------------------------------------------------
    // STUDENT PROFILE
    // -----------------------------------------------------

    if (role === "student") {
      const studentResult = await db.query(
        `SELECT
            student_id,
            roll_no,
            face_registered,
            attendance_percentage
         FROM students
         WHERE student_id = $1`,
        [userId],
      );

      const student = studentResult.rows[0];

      return res.json({
        ...user,
        student_id: student?.student_id,
        roll_no: student?.roll_no,
        face_registered: student?.face_registered,
        attendance_percentage: student?.attendance_percentage ?? 0,
      });
    }

    return res.json(user);
  } catch (err) {
    console.error("GET CURRENT USER ERROR:", err);

    return res.status(500).json({
      error: "Failed to fetch user profile",
    });
  }
};

// ---------------------------------------------------------
// UPDATE PROFILE
// ---------------------------------------------------------

exports.updateProfile = async (req, res) => {
  const userId = req.user.id;
  const role = req.user.role;

  const {
    name,
    department,
    institution,
    avatar,
    defaultMode,
    defaultThreshold,
  } = req.body;

  const client = await db.pool.connect();

  try {
    await client.query("BEGIN");

    // -----------------------------------------------------
    // UPDATE USERS
    // -----------------------------------------------------

    const userResult = await client.query(
      `UPDATE users
       SET
         name = COALESCE($1, name),
         department = COALESCE($2, department),
         institution = COALESCE($3, institution),
         avatar = CASE
           WHEN $4::text IS NULL THEN avatar
           ELSE $4
         END
       WHERE id = $5
       RETURNING
         id,
         name,
         email,
         role,
         department,
         institution,
         avatar`,
      [
        name ?? null,
        department ?? null,
        institution ?? null,
        avatar !== undefined ? avatar : null,
        userId,
      ],
    );

    const userData = userResult.rows[0];

    if (!userData) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        error: "User not found",
      });
    }

    // -----------------------------------------------------
    // UPDATE TEACHER PREFERENCES
    // -----------------------------------------------------

    if (role === "teacher") {
      const teacherResult = await client.query(
        `UPDATE teachers
         SET
           default_mode = COALESCE($1, default_mode),
           default_threshold = COALESCE($2, default_threshold)
         WHERE teacher_id = $3`,
        [defaultMode ?? null, defaultThreshold ?? null, userId],
      );

      if (teacherResult.rowCount === 0) {
        await client.query("ROLLBACK");

        return res.status(404).json({
          error: "Teacher profile not found",
        });
      }
    }

    await client.query("COMMIT");

    return res.json(userData);
  } catch (err) {
    await client.query("ROLLBACK");

    console.error("UPDATE PROFILE ERROR:", err);

    return res.status(500).json({
      error: "Failed to update user profile",
    });
  } finally {
    client.release();
  }
};

// ---------------------------------------------------------
// UPDATE TEACHER AVATAR
// ---------------------------------------------------------

exports.updateTeacherAvatar = async (req, res) => {
  try {
    if (req.user.role !== "teacher") {
      return res.status(403).json({
        error: "Only teachers can update teacher profile photos",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        error: "No profile photo provided",
      });
    }

    const avatar = buildInlineImageUrl(req.file);

    const result = await db.query(
      `UPDATE users
       SET avatar = $1
       WHERE id = $2
       RETURNING
         id,
         name,
         email,
         role,
         department,
         institution,
         avatar`,
      [avatar, req.user.id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    console.error("UPDATE TEACHER AVATAR ERROR:", err);

    return res.status(500).json({
      error: "Failed to update teacher profile photo",
    });
  }
};
