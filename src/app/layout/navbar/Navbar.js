import { useState, useRef, useEffect, useContext } from "react";
import { NavLink, useParams } from "react-router-dom";
import AuthContext from "../../../context/auth/AuthContext";

import AppLogo from "./assets/Logo.png";

import "./Navbar.css";

const Navbar = (props) => {
  const { toggleSidebar, isSidebarOpen } = props;
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { userId, batchId } = useParams();
  const { user: storedUser, setUser } = useContext(AuthContext);

  const homePath = userId ? `/${userId}` : "/";

  let basePath = "";

  if (userId && batchId) {
    basePath = `/${userId}/${batchId}`;
  } else if (userId) {
    basePath = `/${userId}`;
  }

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <nav className="navbar custom-navbar">
      <div className="navbar-left">
        <NavLink to={homePath} className="brand">
          <img src={AppLogo} alt="logo" className="brand-logo" />
          <span className="brand-text">Smart Attendance</span>
        </NavLink>

        <button
          className="sidebar-toggle"
          onClick={toggleSidebar}
          disabled={!batchId}
          aria-label="Toggle Sidebar"
        >
          {isSidebarOpen ? (
            <i className="fa-solid fa-angles-left"></i>
          ) : (
            <i className="fa-solid fa-angles-right"></i>
          )}
        </button>
      </div>

      <ul className="navbar-menu">
        <li>
          <NavLink
            to={basePath ? `${basePath}/dashboard` : "#"}
            className={({ isActive }) =>
              `nav-item ${isActive ? "active" : ""} ${
                !batchId ? "disabled" : ""
              }`
            }
          >
            <i className="fa-solid fa-display"></i>
            Dashboard
          </NavLink>
        </li>

        <li>
          <NavLink
            to={basePath ? `${basePath}/attendance` : "#"}
            className={({ isActive }) =>
              `nav-item ${isActive ? "active" : ""} ${
                !batchId ? "disabled" : ""
              }`
            }
          >
            <i className="fa-solid fa-clipboard-check"></i>
            Attendance
          </NavLink>
        </li>

        <li>
          <NavLink
            to={basePath ? `${basePath}/students` : "#"}
            className={({ isActive }) =>
              `nav-item ${isActive ? "active" : ""} ${
                !batchId ? "disabled" : ""
              }`
            }
          >
            <i className="fa-solid fa-child"></i>
            Students
          </NavLink>
        </li>

        <li>
          <NavLink
            to={basePath ? `${basePath}/reports` : "#"}
            className={({ isActive }) =>
              `nav-item ${isActive ? "active" : ""} ${
                !batchId ? "disabled" : ""
              }`
            }
          >
            <i className="fa-solid fa-chart-line"></i>
            Reports
          </NavLink>
        </li>

        <li>
          <NavLink
            to={basePath ? `${basePath}/lectures` : "#"}
            className={({ isActive }) =>
              `nav-item ${isActive ? "active" : ""} ${
                !batchId ? "disabled" : ""
              }`
            }
          >
            <i className="fa-solid fa-book-open"></i>
            Lecture Topics
          </NavLink>
        </li>
      </ul>

      <div className="navbar-right" ref={dropdownRef}>
        <div
          className="profile"
          onClick={() => setDropdownOpen((prev) => !prev)}
        >
          <img
            src={storedUser?.avatar || "https://i.pravatar.cc/40"}
            alt="profile"
            className="avatar"
          />

          {dropdownOpen && (
            <div className="dropdown">
              <h6>
                {storedUser?.name || "User"} - {storedUser?.role || "Member"}
              </h6>
              <p>{storedUser?.email || ""}</p>
              <NavLink to="/profile" onClick={() => setDropdownOpen(false)}>
                Profile
              </NavLink>
              <button
                className="logout"
                onClick={() => {
                  localStorage.removeItem("token");
                  setUser(null);
                  window.location.href = "/login";
                }}
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
