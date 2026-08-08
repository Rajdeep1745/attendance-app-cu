const db = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is missing");
}

const JWT_SECRET = process.env.JWT_SECRET;

const normalizeEmail = (email) => email?.trim().toLowerCase();

// SIGNUP
exports.signup = async (req, res) => {
  const { name, email, password, department, role } = req.body;
  const normalizedEmail = normalizeEmail(email);
  const trimmedName = name?.trim();
  const trimmedDepartment = department?.trim() || null;

  if (!trimmedName || !normalizedEmail || !password) {
    return res
      .status(400)
      .json({ error: "Name, email, and password are required" });
  }

  const allowedRoles = ["teacher", "student"];

  if (!allowedRoles.includes(role)) {
    return res.status(400).json({
      error: "Invalid role",
    });
  }

  const client = await db.pool.connect();

  try {
    await client.query("BEGIN");

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await client.query(
      `INSERT INTO users (name,email,password,department,role,avatar)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id`,
      [
        trimmedName,
        normalizedEmail,
        hashedPassword,
        trimmedDepartment,
        role,
        "https://i.pravatar.cc/150",
      ],
    );

    const data = result.rows[0];

    if (role === "teacher") {
      await client.query(
        `INSERT INTO teachers (teacher_id, default_mode, default_threshold)
         VALUES ($1, $2, $3)`,
        [data.id, "manual", 75],
      );
    } else if (role === "student") {
      await client.query(
        `INSERT INTO students (student_id)
        VALUES ($1)`,
        [data.id],
      );
    }

    await client.query("COMMIT");

    res.status(201).json({
      message: "User created",
      userId: data.id,
      role,
    });
  } catch (err) {
    await client.query("ROLLBACK");

    if (err.code === "23505") {
      return res.status(409).json({
        error: "An account with this email already exists",
      });
    }

    res.status(500).json({
      error: err.message,
    });
  } finally {
    client.release();
  }
};

// LOGIN
exports.login = async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    const result = await db.query(
      `SELECT id, name, email, password, role, avatar
      FROM users
      WHERE email = $1`,
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
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({
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
    res.status(500).json({ error: err.message });
  }
};
