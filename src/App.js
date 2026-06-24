import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import Layout from "./app/layout/Layout";
import Login from "./app/login/Login";
import Signup from "./app/login/Signup";
import Profile from "./app/profile/Profile";

// Teacher pages
import TeacherDashboard from "./app/teacher/dashboard/TeacherDashboard";
import TeacherAttendance from "./app/teacher/attendance/TeacherAttendance";
import TeacherStudents from "./app/teacher/students/TeacherStudents";
import TeacherReports from "./app/teacher/reports/TeacherReports";
import TeacherLectures from "./app/teacher/lectures/TeacherLectures";
import StudentDashboard from "./app/student/dashboard/StudentDashboard";
import StudentAttendance from "./app/student/attendance/StudentAttendance";
import StudentStudents from "./app/student/students/StudentStudents";
import StudentReports from "./app/student/reports/StudentReports";
import StudentLectures from "./app/student/lectures/StudentLectures";

import Alert from "./components/alert/Alert";

import "./App.css";

function App() {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "null");

  const defaultPath = token && user ? `/${user.id}` : "/login";

  return (
    <Router>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Root */}
        <Route path="/" element={<Navigate to={defaultPath} />} />

        {/* Shared Layout */}
        <Route
          path="/:userId"
          element={token ? <Layout /> : <Navigate to="/login" />}
        >
          <Route
            index
            element={
              <div>
                {user?.role === "teacher"
                  ? "Select a batch"
                  : "Choose a joined batch"}
              </div>
            }
          />

          <Route
            path=":batchId/dashboard"
            element={
              user?.role === "teacher" ? (
                <TeacherDashboard />
              ) : (
                <StudentDashboard />
              )
            }
          />
          <Route
            path=":batchId/attendance"
            element={
              user?.role === "teacher" ? (
                <TeacherAttendance />
              ) : (
                <StudentAttendance />
              )
            }
          />
          <Route
            path=":batchId/students"
            element={
              user?.role === "teacher" ? (
                <TeacherStudents />
              ) : (
                <StudentStudents />
              )
            }
          />
          <Route
            path=":batchId/reports"
            element={
              user?.role === "teacher" ? <TeacherReports /> : <StudentReports />
            }
          />
          <Route
            path=":batchId/lectures"
            element={
              user?.role === "teacher" ? (
                <TeacherLectures />
              ) : (
                <StudentLectures />
              )
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
