import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import Layout from "./app/layout/Layout";
import LandingPage from "./app/login/LandingPage";
import Profile from "./app/profile/Profile";

// Teacher pages
import TeacherDashboard from "./app/teacher/dashboard/TeacherDashboard";
import TeacherAttendance from "./app/teacher/attendance/TeacherAttendance";
import TeacherStudents from "./app/teacher/students/TeacherStudents";
import TeacherReports from "./app/teacher/reports/TeacherReports";
import StudentDashboard from "./app/student/dashboard/StudentDashboard";
import StudentAttendance from "./app/student/attendance/StudentAttendance";
import StudentStudents from "./app/student/students/StudentStudents";
import StudentReports from "./app/student/reports/StudentReports";

import Alert from "./components/alert/Alert";

import "./App.css";

function App() {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "null");

  const defaultPath = token && user ? `/${user.id}` : "/landing";

  return (
    <Router>
      <Routes>
        {/* Public */}
        <Route path="/landing" element={<LandingPage />} />

        {/* Root */}
        <Route path="/" element={<Navigate to={defaultPath} />} />

        {/* Shared Layout */}
        <Route
          path="/:userId"
          element={token ? <Layout /> : <Navigate to="/landing" />}
        >
          <Route
            index
            element={
              <div>
                {user?.role === "teacher"
                  ? "Select a subject"
                  : "Choose a joined subject"}
              </div>
            }
          />

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

          <Route
            path=":subjectId/reports"
            element={
              user?.role === "teacher" ? <TeacherReports /> : <StudentReports />
            }
          />
        </Route>

        <Route path="/profile" element={<Profile />} />
      </Routes>

      <Alert />
    </Router>
  );
}

export default App;
