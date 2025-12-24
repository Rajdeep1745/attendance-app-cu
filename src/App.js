import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Layout from "./app/layout/Layout";
import Dashboard from "./app/dashboard/Dashboard";
import Attendance from "./app/attendance/Attendance";
import Students from "./app/students/Students";
import Reports from "./app/reports/Reports";
import Lectures from "./app/lectures/Lectures";

function App() {
  return (
    <Router>
      <Routes>
        {/* ✅ NO batch selected */}
        <Route path="/" element={<Layout />} />

        {/* ✅ Batch selected */}
        <Route path="/user/:batchId" element={<Layout />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="students" element={<Students />} />
          <Route path="reports" element={<Reports />} />
          <Route path="lectures" element={<Lectures />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
