import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import Layout from "./app/layout/Layout";
import Dashboard from "./app/dashboard/Dashboard";
import Attendance from "./app/attendance/Attendance";
import Students from "./app/students/Students";
import Reports from "./app/reports/Reports";
import Lectures from "./app/lectures/Lectures";
import Alert from "./components/alert/Alert";
import Profile from "./app/profile/Profile";
import Login from "./app/login/Login";
import Signup from "./app/login/Signup";
import { AuthProvider } from "./context/auth/AuthContext";
import JoinBatch from "./app/student/JoinBatch";
import ProtectedRoute from "./components/ProtectedRoute";
import StudentDashboard from "./app/student/StudentBoard";
function App() {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const defaultUserPath = user?.id ? `/${user.id}` : "/login";

  return (
    <Router>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Protected */}
        <Route
          path="/"
          element={<Navigate to={token ? defaultUserPath : "/login"} />}          <Route path="/join" element={<JoinBatch />} />

          <Route
          path="/user/:batchId/dashboard"
          element={
            <ProtectedRoute>
              <StudentDashboard />
            </ProtectedRoute>
          }
          />
        />
        <Route
          path="/:userId"
          element={token ? <Layout /> : <Navigate to="/login" />}
        >
          <Route index element={<div>Select a batch</div>} />
          <Route path=":batchId/dashboard" element={<Dashboard />} />
          <Route path=":batchId/attendance" element={<Attendance />} />
          <Route path=":batchId/students" element={<Students />} />
          <Route path=":batchId/reports" element={<Reports />} />
          <Route path=":batchId/lectures" element={<Lectures />} />
        </Route>

        <Route path="/profile" element={<Profile />} />
      </Routes>
      <Alert />
    </Router>
  );
}

export default App;
