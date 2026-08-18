const db = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const { isValidProgrammeSemester } = require("../config/programmes");

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is missing");
}

const JWT_SECRET = process.env.JWT_SECRET;

const normalizeEmail = (email) => email?.trim().toLowerCase();

// =========================================================
// SIGNUP
// =========================================================

exports.signup = async (req, res) => {
  const { name, email, password, department, role, program, semester } =
    req.body;

  const normalizedEmail = normalizeEmail(email);
  const trimmedName = name?.trim();
  const trimmedDepartment = department?.trim() || null;

  // -------------------------------------------------------
  // BASIC VALIDATION
  // -------------------------------------------------------

  if (!trimmedName || !normalizedEmail || !password) {
    return res.status(400).json({
      error: "Name, email, and password are required",
    });
  }

  // -------------------------------------------------------
  // ROLE VALIDATION
  //
  // IMPORTANT:
  // Admin can NEVER be created through normal signup.
  // -------------------------------------------------------

  const allowedRoles = ["teacher", "student"];

  if (!allowedRoles.includes(role)) {
    return res.status(400).json({
      error: "Invalid role",
    });
  }

  // -------------------------------------------------------
  // STUDENT PROGRAMME / SEMESTER VALIDATION
  // -------------------------------------------------------

  let studentSemester = null;
  let studentProgram = null;

  if (role === "student") {
    if (!program) {
      return res.status(400).json({
        error: "Program is required for students",
      });
    }

    if (semester === undefined || semester === null || semester === "") {
      return res.status(400).json({
        error: "Semester is required for students",
      });
    }

    studentSemester = Number(semester);

    if (!Number.isInteger(studentSemester)) {
      return res.status(400).json({
        error: "Semester must be a valid integer",
      });
    }

    if (!isValidProgrammeSemester(program, studentSemester)) {
      return res.status(400).json({
        error: "Invalid program and semester combination",
      });
    }

    studentProgram = program;
  }

  // -------------------------------------------------------
  // DATABASE
  // -------------------------------------------------------

  const client = await db.pool.connect();

  try {
    await client.query("BEGIN");

    // -----------------------------------------------------
    // HASH PASSWORD
    // -----------------------------------------------------

    const hashedPassword = await bcrypt.hash(password, 10);

    // -----------------------------------------------------
    // CREATE USER
    // -----------------------------------------------------

    const result = await client.query(
      `
          INSERT INTO users (
            name,
            email,
            password,
            department,
            role,
            avatar
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6
          )
          RETURNING id
        `,
      [
        trimmedName,
        normalizedEmail,
        hashedPassword,
        trimmedDepartment,
        role,
        "https://i.pravatar.cc/150",
      ],
    );

    const userId = result.rows[0].id;

    // -----------------------------------------------------
    // CREATE TEACHER PROFILE
    // -----------------------------------------------------

    if (role === "teacher") {
      await client.query(
        `
          INSERT INTO teachers (
            teacher_id,
            default_mode,
            default_threshold
          )
          VALUES (
            $1,
            $2,
            $3
          )
        `,
        [userId, "manual", 75],
      );
    }

    // -----------------------------------------------------
    // CREATE STUDENT PROFILE
    // -----------------------------------------------------

    if (role === "student") {
      await client.query(
        `
          INSERT INTO students (
            student_id,
            program,
            semester
          )
          VALUES (
            $1,
            $2,
            $3
          )
        `,
        [userId, studentProgram, studentSemester],
      );
    }

    // -----------------------------------------------------
    // COMMIT
    // -----------------------------------------------------

    await client.query("COMMIT");

    return res.status(201).json({
      message: "User created",
      userId,
      role,
    });
  } catch (err) {
    await client.query("ROLLBACK");

    // Duplicate email
    if (err.code === "23505") {
      return res.status(409).json({
        error: "An account with this email already exists",
      });
    }

    console.error("SIGNUP ERROR:", err);

    return res.status(500).json({
      error: "Failed to create account",
    });
  } finally {
    client.release();
  }
};

// =========================================================
// LOGIN
// =========================================================

exports.login = async (req, res) => {
  const { email, password } = req.body;

  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail || !password) {
    return res.status(400).json({
      error: "Email and password are required",
    });
  }

  try {
    const result = await db.query(
      `
          SELECT
            id,
            name,
            email,
            password,
            role,
            avatar
          FROM users
          WHERE email = $1
        `,
      [normalizedEmail],
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({
        error: "Invalid email or password",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        error: "Invalid email or password",
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
      },
      JWT_SECRET,
      {
        expiresIn: "7d",
      },
    );

    return res.json({
      token,

      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      },
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err);

    return res.status(500).json({
      error: "Failed to login",
    });
  }
};
