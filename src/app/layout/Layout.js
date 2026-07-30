import { useState, useEffect, useContext } from "react";
import { Navigate, Outlet, useParams } from "react-router-dom";
import Navbar from "./navbar/Navbar";
import Footer from "./footer/Footer";
import TeacherSidebar from "./sidebar/TeacherSidebar";
import StudentSidebar from "./sidebar/StudentSidebar";
import BatchContext from "../../context/batch/BatchContext";
import "./Layout.css";

const LAST_ACTIVE_BATCH_ID_KEY = "lastActiveBatchId";

const Layout = () => {
  const { userId, batchId } = useParams();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { fetchBatchById } = useContext(BatchContext);
  const storedUser = JSON.parse(localStorage.getItem("user") || "null");
  const role = storedUser?.role;

  useEffect(() => {
    if (!batchId) {
      fetchBatchById(null);
      return;
    }

    fetchBatchById(batchId);
  }, [batchId, role, fetchBatchById]);

  useEffect(() => {
    if (batchId) {
      localStorage.setItem(LAST_ACTIVE_BATCH_ID_KEY, batchId);
    }
  }, [batchId]);

  if (!storedUser) {
    return <Navigate to="/login" replace />;
  }

  if (userId && String(userId) !== String(storedUser.id)) {
    return <Navigate to={`/${storedUser.id}`} replace />;
  }

  return (
    <>
      <Navbar
        toggleSidebar={() => setSidebarOpen((p) => !p)}
        isSidebarOpen={sidebarOpen}
      />

      <div className="layout-wrapper">
        <div className="d-flex flex-grow-1">
          {role === "teacher" ? (
            <TeacherSidebar isOpen={sidebarOpen} />
          ) : (
            <StudentSidebar isOpen={sidebarOpen} />
          )}

          {sidebarOpen && (
            <div
              className="sidebar-backdrop"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          <main
            className={`flex-grow-1 p-4 app-main ${
              sidebarOpen ? "sidebar-visible" : ""
            }`}
          >
            {!batchId ? (
              <div className="empty-state">
                <h2>
                  {role === "teacher" ? "Select a subject" : "Choose a batch"}
                </h2>
                <p>
                  {role === "teacher"
                    ? "Please choose a subject from the sidebar to continue."
                    : "Join a batch using a valid batch code, or choose one of your real joined batches from the sidebar."}
                </p>
              </div>
            ) : (
              <>
                <Outlet />
              </>
            )}
            <Footer />
          </main>
        </div>
      </div>
    </>
  );
};

export default Layout;
