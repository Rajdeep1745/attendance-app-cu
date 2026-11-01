const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

const roleMiddleware = require("../middleware/roleMiddleware");

const {
  login,

  getStudents,
  getStudent,
  updateStudent,
  deleteStudent,

  getTeachers,
  updateTeacher,
  importTeachers,
  exportTeachers,
  deleteTeacher,

  getSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
  assignTeacherToSubject,
  removeTeacherFromSubject,

  getSubjectStudents,
  enrollStudent,
  removeStudentFromSubject,
  importStudents,
  exportStudents,
} = require("../controllers/adminController");

// =========================================================
// ADMIN LOGIN
// =========================================================

router.post("/login", login);

// =========================================================
// ADMIN STUDENT MANAGEMENT
// =========================================================

router.get("/students", authMiddleware, roleMiddleware("admin"), getStudents);

router.post(
  "/students/import",
  authMiddleware,
  roleMiddleware("admin"),
  importStudents,
);
router.get(
  "/students/export",
  authMiddleware,
  roleMiddleware("admin"),
  exportStudents,
);

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

router.delete(
  "/students/:studentId",
  authMiddleware,
  roleMiddleware("admin"),
  deleteStudent,
);

// =========================================================
// TEACHERS
// =========================================================

router.get("/teachers", authMiddleware, roleMiddleware("admin"), getTeachers);

router.post(
  "/teachers/import",
  authMiddleware,
  roleMiddleware("admin"),
  importTeachers,
);

router.get(
  "/teachers/export",
  authMiddleware,
  roleMiddleware("admin"),
  exportTeachers,
);

router.delete(
  "/teachers/:teacherId",
  authMiddleware,
  roleMiddleware("admin"),
  deleteTeacher,
);

router.patch(
  "/teachers/:teacherId",
  authMiddleware,
  roleMiddleware("admin"),
  updateTeacher,
);

// =========================================================
// SUBJECTS
// =========================================================

router.get("/subjects", authMiddleware, roleMiddleware("admin"), getSubjects);
router.post("/subjects", authMiddleware, roleMiddleware("admin"), createSubject);
router.patch("/subjects/:subjectId", authMiddleware, roleMiddleware("admin"), updateSubject);
router.delete("/subjects/:subjectId", authMiddleware, roleMiddleware("admin"), deleteSubject);

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
