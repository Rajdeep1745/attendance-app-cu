import React, { useState } from "react";
import { Outlet, useParams } from "react-router-dom";
import Navbar from "./navbar/Navbar";
import Sidebar from "./sidebar/Sidebar";
import "./Layout.css";

const Layout = () => {
  const { batchId } = useParams(); // 🔑 source of truth
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <>
      <Navbar
        toggleSidebar={() => setSidebarOpen((p) => !p)}
        isSidebarOpen={sidebarOpen}
      />

      <div className="d-flex">
        <Sidebar isOpen={sidebarOpen} />

        <main
          className="flex-grow-1 p-4"
          style={{
            marginLeft: sidebarOpen ? "280px" : "0",
            transition: "margin 0.3s ease",
          }}
        >
          {/* ✅ CONDITIONAL RENDER BASED ON URL */}
          {!batchId ? (
            <div className="empty-state">
              <h2>Select a batch</h2>
              <p>Please choose a batch from the sidebar to continue.</p>
            </div>
          ) : (
            <Outlet />
          )}
        </main>
      </div>
    </>
  );
};

export default Layout;
