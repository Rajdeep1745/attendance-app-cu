import React, { useState, useRef, useEffect } from "react";
import { NavLink, useParams } from "react-router-dom";

import AppLogo from "./assets/Logo.png";
import dashboardLogo from "./assets/dashboardLogo.svg";
import attendanceLogo from "./assets/attendanceLogo.svg";
import studentsLogo from "./assets/studentsLogo.svg";
import reportsLogo from "./assets/reportsLogo.svg";
import lectureLogo from "./assets/lectureLogo.svg";

import "./Navbar.css";

const Navbar = (props) => {
  const { toggleSidebar } = props;
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { batchId } = useParams();

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
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
          aria-label="Toggle Sidebar"
        >
          ☰
        </button>
      </div>

      {/* CENTER */}
      <ul className="navbar-menu">
        <li>
          <NavLink to={`/user/${batchId}/dashboard`} end className="nav-item">
            <img src={dashboardLogo} alt="Dashvoard Logo" />
            Dashboard
          </NavLink>
        </li>

        <li>
          <NavLink to={`/user/${batchId}/attendance`} className="nav-item">
            <img src={attendanceLogo} alt="Attendance Logo" />
            Attendance
          </NavLink>
        </li>

        <li>
          <NavLink to={`/user/${batchId}/students`} className="nav-item">
            <img src={studentsLogo} alt="Students Logo" />
            Students
          </NavLink>
        </li>

        <li>
          <NavLink to={`/user/${batchId}/reports`} className="nav-item">
            <img src={reportsLogo} alt="Reports Logo" />
            Reports
          </NavLink>
        </li>

        <li>
          <NavLink to={`/user/${batchId}/lectures`} className="nav-item">
            <img src={lectureLogo} alt="Lecture Logo" />
            Lecture Topics
          </NavLink>
        </li>
      </ul>

      {/* RIGHT */}
      <div className="navbar-right" ref={dropdownRef}>
        <div className="profile" onClick={() => setOpen((prev) => !prev)}>
          <img
            src="https://i.pravatar.cc/40"
            alt="profile"
            className="avatar"
          />

          {open && (
            <div className="dropdown">
              {/* To be made dynamic with each user and role */}
              <h6>Rajdeep - Teacher</h6>
              <p>example@gmail.com</p>
              <NavLink to="/profile" onClick={() => setOpen(false)}>
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
