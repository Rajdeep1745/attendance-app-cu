import { useState } from "react";
import { NavLink, Navigate, Outlet, useNavigate } from "react-router-dom";

import "./Admin.css";

const AdminLayout = () => {
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(true);

  const adminToken = localStorage.getItem("adminToken");

  const adminUser = JSON.parse(localStorage.getItem("adminUser") || "null");

  // -------------------------------------------------------
  // AUTHENTICATION
  // -------------------------------------------------------

  if (!adminToken || !adminUser) {
    return <Navigate to="/admin/login" replace />;
  }

  // -------------------------------------------------------
  // LOGOUT
  // -------------------------------------------------------

  const handleLogout = () => {
    localStorage.removeItem("adminToken");

    localStorage.removeItem("adminUser");

    navigate("/admin/login", { replace: true });
  };

  return (
    <div className="admin-layout">
      {/* -------------------------------------------------
          SIDEBAR
      ------------------------------------------------- */}

      <aside
        className={`admin-sidebar ${
          sidebarOpen ? "admin-sidebar-open" : "admin-sidebar-closed"
        }`}
      >
        <div className="admin-sidebar-header">
          <div className="admin-brand-mark">A</div>

          {sidebarOpen && (
            <div>
              <div className="admin-brand-name">Attendify</div>

              <div className="admin-brand-label">Administration</div>
            </div>
          )}
        </div>

        <nav className="admin-navigation">
          <NavLink
            to="/admin"
            end
            className={({ isActive }) =>
              `admin-nav-item ${isActive ? "admin-nav-active" : ""}`
            }
          >
            <span className="admin-nav-icon">▦</span>

            {sidebarOpen && <span>Dashboard</span>}
          </NavLink>

          <NavLink
            to="/admin/students"
            className={({ isActive }) =>
              `admin-nav-item ${isActive ? "admin-nav-active" : ""}`
            }
          >
            <span className="admin-nav-icon">◉</span>

            {sidebarOpen && <span>Students</span>}
          </NavLink>

          <NavLink
            to="/admin/subjects"
            className={({ isActive }) =>
              `admin-nav-item ${isActive ? "admin-nav-active" : ""}`
            }
          >
            <span className="admin-nav-icon">◈</span>

            {sidebarOpen && <span>Subjects</span>}
          </NavLink>
        </nav>

        <div className="admin-sidebar-bottom">
          {sidebarOpen && (
            <div className="admin-user-card">
              <div className="admin-user-avatar">A</div>

              <div className="admin-user-info">
                <strong>Administrator</strong>

                <span>{adminUser.email}</span>
              </div>
            </div>
          )}

          <button className="admin-logout-button" onClick={handleLogout}>
            <span>↪</span>

            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* -------------------------------------------------
          MAIN
      ------------------------------------------------- */}

      <div
        className={`admin-main ${
          sidebarOpen ? "admin-main-sidebar-open" : "admin-main-sidebar-closed"
        }`}
      >
        <header className="admin-topbar">
          <button
            className="admin-sidebar-toggle"
            onClick={() => setSidebarOpen((previous) => !previous)}
          >
            ☰
          </button>

          <div className="admin-topbar-title">Administration</div>
        </header>

        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
