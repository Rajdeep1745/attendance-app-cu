import React, { useState, useRef, useEffect } from "react";
import { NavLink, useParams } from "react-router-dom";

import AppLogo from "./assets/Logo.png";

import "./Navbar.css";

const Navbar = (props) => {
  const { toggleSidebar, isSidebarOpen } = props;
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { batchId } = useParams();
  const basePath = batchId ? `/user/${batchId}` : null;

  // Close dropdown on outside click
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
      {/* LEFT */}
      <div className="navbar-left">
        <NavLink to="/" className="brand">
          <img src={AppLogo} alt="logo" className="brand-logo" />
          <span className="brand-text">Smart Attendance</span>
        </NavLink>

        {/* ✅ Compact toggle button */}
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

      {/* CENTER */}
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

      {/* RIGHT */}
      <div className="navbar-right" ref={dropdownRef}>
        <div
          className="profile"
          onClick={() => setDropdownOpen((prev) => !prev)}
        >
          <img
            src="https://i.pravatar.cc/40"
            alt="profile"
            className="avatar"
          />

          {dropdownOpen && (
            <div className="dropdown">
              {/* To be made dynamic with each user and role */}
              <h6>Rajdeep - Teacher</h6>
              <p>example@gmail.com</p>
              <NavLink to="/profile" onClick={() => setDropdownOpen(false)}>
                Profile
              </NavLink>
              <button className="logout">Logout</button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
