import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import Layout from "./app/layout/Layout";
import LandingPage from "./app/login/LandingPage";
import Profile from "./app/profile/Profile";

import AdminLogin from "./app/admin/AdminLogin";
import AdminLayout from "./app/admin/AdminLayout";
import AdminDashboard from "./app/admin/AdminDashboard";
import AdminStudents from "./app/admin/AdminStudents";
import AdminSubjects from "./app/admin/AdminSubjects";

// Teacher pages
import TeacherDashboard from "./app/teacher/dashboard/TeacherDashboard";
import TeacherAttendance from "./app/teacher/attendance/TeacherAttendance";
import TeacherStudents from "./app/teacher/students/TeacherStudents";
import TeacherReports from "./app/teacher/reports/TeacherReports";

// Student pages
import StudentDashboard from "./app/student/dashboard/StudentDashboard";
import StudentAttendance from "./app/student/attendance/StudentAttendance";
import StudentStudents from "./app/student/students/StudentStudents";
import StudentReports from "./app/student/reports/StudentReports";

import Alert from "./components/alert/Alert";

import "./App.css";

function App() {
  const token = localStorage.getItem("token");

  let user = null;

  try {
    user = JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    user = null;
  }

  const defaultPath = token && user ? `/${user.id}` : "/landing";

  return (
    <Router>
      <Routes>
        {/* -------------------------------------------------
                ADMIN
            ------------------------------------------------- */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />

          <Route path="students" element={<AdminStudents />} />

          <Route path="subjects" element={<AdminSubjects />} />
        </Route>

        <Route path="/admin/login" element={<AdminLogin />} />

        {/* -------------------------------------------------
            PUBLIC
        ------------------------------------------------- */}

        <Route path="/landing" element={<LandingPage />} />

        {/* -------------------------------------------------
            ROOT
        ------------------------------------------------- */}

        <Route path="/" element={<Navigate to={defaultPath} replace />} />

        {/* -------------------------------------------------
            AUTHENTICATED APPLICATION
        ------------------------------------------------- */}

        <Route
          path="/:userId"
          element={token ? <Layout /> : <Navigate to="/landing" replace />}
        >
          {/* No subject selected yet */}
          <Route
            index
            element={
              <div className="container-fluid py-4">
                <div className="text-center">
                  {user?.role === "teacher"
                    ? "Select a subject"
                    : "Loading your enrolled subjects..."}
                </div>
              </div>
            }
          />

          {/* -------------------------------------------------
              SUBJECT DASHBOARD
          ------------------------------------------------- */}

          <Route
            path=":subjectId/dashboard"
            element={
              user?.role === "teacher" ? (
                <TeacherDashboard />
              ) : (
                <StudentDashboard />
              )
            }
          />

          {/* -------------------------------------------------
              SUBJECT ATTENDANCE
          ------------------------------------------------- */}

          <Route
            path=":subjectId/attendance"
            element={
              user?.role === "teacher" ? (
                <TeacherAttendance />
              ) : (
                <StudentAttendance />
              )
            }
          />

          {/* -------------------------------------------------
              SUBJECT STUDENTS
          ------------------------------------------------- */}

          <Route
            path=":subjectId/students"
            element={
              user?.role === "teacher" ? (
                <TeacherStudents />
              ) : (
                <StudentStudents />
              )
            }
          />

          {/* -------------------------------------------------
              SUBJECT REPORTS
          ------------------------------------------------- */}

          <Route
            path=":subjectId/reports"
            element={
              user?.role === "teacher" ? <TeacherReports /> : <StudentReports />
            }
          />
        </Route>

        {/* -------------------------------------------------
            PROFILE
        ------------------------------------------------- */}

        <Route path="/profile" element={<Profile />} />

        {/* -------------------------------------------------
            FALLBACK
        ------------------------------------------------- */}

        <Route path="*" element={<Navigate to={defaultPath} replace />} />
      </Routes>

      <Alert />
    </Router>
  );
}

export default App;
