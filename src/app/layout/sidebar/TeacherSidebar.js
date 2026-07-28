import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useContext } from "react";
import AlertContext from "../../../context/alert/AlertContext";
import BatchContext from "../../../context/batch/BatchContext";

import "./Sidebar.css";
import { PROGRAMMES } from "../../../data/programmes";

const TeacherSidebar = ({ isOpen }) => {
  const { userId, batchId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Alert
  const { showAlert } = useContext(AlertContext);
  const { setActiveBatch, fetchBatchBySubject } = useContext(BatchContext);

  // const [batches, setBatches] = useState([]);
  const [defaultThreshold, setDefaultThreshold] = useState(75);

  // Expanding folder state
  const [expandedProgrammes, setExpandedProgrammes] = useState({
    "B.Tech": true,
    "M.Tech": false,
    MSc: false,
  });

  const [expandedSemesters, setExpandedSemesters] = useState({});

  const [selectedSubject, setSelectedSubject] = useState({
    id: null,
    programme: null,
    semester: null,
    subject: null,
  });

  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        const saved = localStorage.getItem("selectedSubject");

        if (saved) {
          setSelectedSubject(JSON.parse(saved));
        }

        const token = localStorage.getItem("token");

        const res = await fetch(
          `${process.env.REACT_APP_BACKEND_URL}api/users/me`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        setDefaultThreshold(data.default_threshold || 75);
      } catch (err) {
        console.error("Failed to load default threshold", err);
      }
    };

    fetchPreferences();
  }, []);

  return (
    <aside className={`sidebar ${isOpen ? "open" : "closed"}`}>
      <div className="sidebar-content">
        <h6 className="fw-bold mb-1">Subjects</h6>
        <small className="text-muted">Select a subject to manage</small>

        <div className="list-group list-group-flush mt-3">
          {Object.entries(PROGRAMMES).map(([programme, data]) => (
            <div key={programme} className="tree-programme">
              <div
                className="tree-programme-header"
                onClick={() =>
                  setExpandedProgrammes((prev) => ({
                    ...prev,
                    [programme]: !prev[programme],
                  }))
                }
              >
                <span>{expandedProgrammes[programme] ? "▼" : "▶"}</span>

                <span>{programme}</span>
              </div>

              {expandedProgrammes[programme] && (
                <div className="tree-semester">
                  {Object.entries(data.semesters).map(
                    ([semester, subjects]) => (
                      <div key={semester}>
                        <div
                          className="tree-semester-header"
                          onClick={() =>
                            setExpandedSemesters((prev) => ({
                              ...prev,
                              [programme + semester]:
                                !prev[programme + semester],
                            }))
                          }
                        >
                          <span>
                            {expandedSemesters[programme + semester]
                              ? "▼"
                              : "▶"}
                          </span>

                          <span>Semester {semester}</span>
                        </div>

                        {expandedSemesters[programme + semester] && (
                          <div className="tree-subject-list">
                            {subjects.map((subject) => (
                              <div
                                key={subject.id}
                                className={`tree-subject ${
                                  selectedSubject.subject?.id === subject.id &&
                                  selectedSubject.programme === programme &&
                                  selectedSubject.semester === semester
                                    ? "active"
                                    : ""
                                }`}
                                onClick={async () => {
                                  const selected = {
                                    programme,
                                    semester,
                                    subject,
                                  };

                                  localStorage.setItem(
                                    "selectedSubject",
                                    JSON.stringify(selected),
                                  );

                                  setSelectedSubject(selected);

                                  const batch = await fetchBatchBySubject(
                                    subject.id,
                                  );

                                  if (!batch) {
                                    showAlert("Error","Batch not found.", "danger");
                                    return;
                                  }

                                  navigate(`/${userId}/${batch.id}/dashboard`);
                                }}
                              >
                                <span>•</span>
                                <span>{subject.name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ),
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
};

export default TeacherSidebar;
