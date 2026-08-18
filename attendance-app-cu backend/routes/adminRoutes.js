const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

const roleMiddleware = require("../middleware/roleMiddleware");

const {
  login,

  getStudents,
  getStudent,
  updateStudent,

  getTeachers,

  getSubjects,
  assignTeacherToSubject,
  removeTeacherFromSubject,

  getSubjectStudents,
  enrollStudent,
  removeStudentFromSubject,
} = require("../controllers/adminController");

// =========================================================
// ADMIN LOGIN
// =========================================================

router.post("/login", login);

// =========================================================
// ADMIN STUDENT MANAGEMENT
// =========================================================

router.get("/students", authMiddleware, roleMiddleware("admin"), getStudents);

router.get(
  "/students/:studentId",
  authMiddleware,
  roleMiddleware("admin"),
  getStudent,
);

router.patch(
  "/students/:studentId",
  authMiddleware,
  roleMiddleware("admin"),
  updateStudent,
);

// =========================================================
// TEACHERS
// =========================================================

router.get("/teachers", authMiddleware, roleMiddleware("admin"), getTeachers);

// =========================================================
// SUBJECTS
// =========================================================

router.get("/subjects", authMiddleware, roleMiddleware("admin"), getSubjects);

// =========================================================
// SUBJECT → TEACHER
// =========================================================

router.patch(
  "/subjects/:subjectId/teacher",
  authMiddleware,
  roleMiddleware("admin"),
  assignTeacherToSubject,
);

router.delete(
  "/subjects/:subjectId/teacher",
  authMiddleware,
  roleMiddleware("admin"),
  removeTeacherFromSubject,
);

// =========================================================
// SUBJECT → STUDENTS
// =========================================================

router.get(
  "/subjects/:subjectId/students",
  authMiddleware,
  roleMiddleware("admin"),
  getSubjectStudents,
);

// =========================================================
// ENROLL STUDENT
// =========================================================

router.post(
  "/subjects/:subjectId/students",
  authMiddleware,
  roleMiddleware("admin"),
  enrollStudent,
);

// =========================================================
// REMOVE STUDENT
// =========================================================

router.delete(
  "/subjects/:subjectId/students/:studentId",
  authMiddleware,
  roleMiddleware("admin"),
  removeStudentFromSubject,
);

module.exports = router;
