import { useState, useEffect, useContext } from "react";
import { Navigate, Outlet, useParams } from "react-router-dom";

import Navbar from "./navbar/Navbar";
import Footer from "./footer/Footer";
import TeacherSidebar from "./sidebar/TeacherSidebar";
import StudentSidebar from "./sidebar/StudentSidebar";

import SubjectContext from "../../context/subject/SubjectContext";

import "./Layout.css";

const LAST_ACTIVE_SUBJECT_ID_KEY = "lastActiveSubjectId";

const Layout = () => {
  const { userId, subjectId } = useParams();

  const [sidebarOpen, setSidebarOpen] = useState(true);

  /*
   * A subject exists in the URL, so initially assume that it
   * needs to be validated.
   */
  const [subjectLoading, setSubjectLoading] = useState(Boolean(subjectId));

  const [subjectValid, setSubjectValid] = useState(true);

  const { fetchSubjectById } = useContext(SubjectContext);

  const storedUser = JSON.parse(localStorage.getItem("user") || "null");

  const role = storedUser?.role;

  // ---------------------------------------------------------
  // LOAD + VALIDATE ACTIVE SUBJECT
  // ---------------------------------------------------------
  //
  // IMPORTANT:
  // This hook MUST remain before every conditional return.
  // React requires hooks to execute in the same order on
  // every render.
  //

  useEffect(() => {
    /*
     * Do nothing if the user is not authenticated.
     *
     * Authentication redirect is handled below.
     */
    if (!storedUser) {
      return;
    }

    /*
     * If the URL belongs to another user, do not make a
     * subject request for it.
     */
    if (userId && String(userId) !== String(storedUser.id)) {
      return;
    }

    let cancelled = false;

    const loadSubject = async () => {
      /*
       * No subject selected.
       *
       * Clear any previously active subject.
       */
      if (!subjectId) {
        await fetchSubjectById(null);

        if (cancelled) {
          return;
        }

        setSubjectLoading(false);
        setSubjectValid(true);

        return;
      }

      setSubjectLoading(true);
      setSubjectValid(true);

      try {
        const subject = await fetchSubjectById(subjectId);

        if (cancelled) {
          return;
        }

        /*
         * Backend rejected the subject or the subject
         * does not exist.
         */
        if (!subject) {
          setSubjectValid(false);
          return;
        }

        /*
         * Make sure the returned subject is actually the
         * subject represented by the URL.
         */
        if (String(subject.subject_id) !== String(subjectId)) {
          setSubjectValid(false);
          return;
        }

        /*
         * Remember the last valid subject.
         */
        localStorage.setItem(LAST_ACTIVE_SUBJECT_ID_KEY, subjectId);

        setSubjectValid(true);
      } catch (err) {
        console.error("[Layout] Failed to load subject:", err);

        if (!cancelled) {
          setSubjectValid(false);
        }
      } finally {
        if (!cancelled) {
          setSubjectLoading(false);
        }
      }
    };

    loadSubject();

    return () => {
      cancelled = true;
    };
  }, [subjectId, userId, role, storedUser?.id, fetchSubjectById]);

  // ---------------------------------------------------------
  // AUTHENTICATION
  // ---------------------------------------------------------

  /*
   * These returns are AFTER all hooks.
   *
   * This is required by the Rules of Hooks.
   */

  if (!storedUser) {
    return <Navigate to="/landing" replace />;
  }

  if (userId && String(userId) !== String(storedUser.id)) {
    return <Navigate to={`/${storedUser.id}`} replace />;
  }

  // ---------------------------------------------------------
  // INVALID SUBJECT
  // ---------------------------------------------------------

  if (subjectId && !subjectLoading && !subjectValid) {
    return <Navigate to={`/${storedUser.id}`} replace />;
  }

  // ---------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------

  return (
    <>
      <Navbar
        toggleSidebar={() => setSidebarOpen((previous) => !previous)}
        isSidebarOpen={sidebarOpen}
      />

      <div className="layout-wrapper">
        <div className="d-flex flex-grow-1">
          {/* SIDEBAR */}

          {role === "teacher" ? (
            <TeacherSidebar isOpen={sidebarOpen} />
          ) : (
            <StudentSidebar isOpen={sidebarOpen} />
          )}

          {/* MOBILE BACKDROP */}

          {sidebarOpen && (
            <div
              className="sidebar-backdrop"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* MAIN CONTENT */}

          <main
  className={`flex-grow-1 p-4 app-main ${
    sidebarOpen ? "sidebar-visible" : "sidebar-hidden"
  }`}
>
            {/* NO SUBJECT SELECTED */}

            {!subjectId ? (
              <div className="empty-state">
                <h2>
                  {role === "teacher" ? "Select a subject" : "Choose a subject"}
                </h2>

                <p>
                  {role === "teacher"
                    ? "Please choose a subject from the sidebar to continue."
                    : "Please choose one of your joined subjects from the sidebar to continue."}
                </p>
              </div>
            ) : subjectLoading ? (
              /* SUBJECT LOADING */

              <div className="empty-state">
                <h2>Loading subject...</h2>

                <p>Please wait while the selected subject is loaded.</p>
              </div>
            ) : (
              /* VALID SUBJECT */

              <Outlet />
            )}

            <Footer />
          </main>
        </div>
      </div>
    </>
  );
};

export default Layout;
