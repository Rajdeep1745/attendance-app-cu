import { useEffect, useState } from "react";

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    students: 0,
    teachers: 0,
    subjects: 0,
  });

  const [loading, setLoading] = useState(true);

  const adminToken = localStorage.getItem("adminToken");

  const fetchCount = async (endpoint, key) => {
    const res = await fetch(
      `${process.env.REACT_APP_BACKEND_URL}api/admin/${endpoint}`,
      {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      },
    );

    if (!res.ok) {
      throw new Error(`Failed to fetch ${key}`);
    }

    const data = await res.json();

    return data[key]?.length || 0;
  };

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [students, teachers, subjects] = await Promise.all([
          fetchCount("students", "students"),

          fetchCount("teachers", "teachers"),

          fetchCount("subjects", "subjects"),
        ]);

        setStats({
          students,
          teachers,
          subjects,
        });
      } catch (err) {
        console.error("Failed to load admin stats:", err);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  return (
    <div className="admin-dashboard">
      <div className="admin-page-heading">
        <div>
          <h1>Dashboard</h1>

          <p>Overview of your attendance system</p>
        </div>
      </div>

      <div className="admin-stat-grid">
        <div className="admin-stat-card">
          <div className="admin-stat-label">Students</div>

          <div className="admin-stat-value">
            {loading ? "—" : stats.students}
          </div>

          <div className="admin-stat-description">Registered students</div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-label">Teachers</div>

          <div className="admin-stat-value">
            {loading ? "—" : stats.teachers}
          </div>

          <div className="admin-stat-description">Registered teachers</div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-label">Subjects</div>

          <div className="admin-stat-value">
            {loading ? "—" : stats.subjects}
          </div>

          <div className="admin-stat-description">Available subjects</div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
